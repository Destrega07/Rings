// A 端修复 Wizard：意图→情绪→语料→注入(自动)→渴望→NVC真心话→发送成功(LLM安慰)
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import WoodRing from '../../components/WoodRing';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useRepairStore } from '../../store/useRepairStore';
import { EMOTION_TAGS, mockDistill, mockComfortA, mockRefineWhisper } from '../../data/mockData';
import { sendIceBreakMail } from '../../data/mailbox';
import { getPairing, appendRingsLog } from '../../utils/storage';
import { globalData } from '../../appGlobal';
import { useSequentialTypewriter } from '../../utils/useTypewriter';
import { useTypewriter } from '../../utils/useTypewriter';
import type { DistillResult } from '../../types/repair';
import styles from './index.module.scss';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const RepairPage: React.FC = () => {
  console.log('[Repair] component render');
  const pairing = getPairing();
  const angelName = pairing?.angelName || '心晴';
  const selfName = pairing?.selfName || '林向阳';
  const partnerName = pairing?.partnerName || '沈月亮';

  const [step, setStep] = useState<Step>(1);
  const [mailId, setMailId] = useState<string>('');
  const [distillLoading, setDistillLoading] = useState(false);
  const [distilledNvc, setDistilledNvc] = useState<DistillResult | null>(null);
  const [comfortText, setComfortText] = useState('');
  const [comfortLoading, setComfortLoading] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [refineLoading, setRefineLoading] = useState(false);

  const {
    intent, emotionKeys, rawText, injecting, injectResult,
    selectedDesireKey,
    setIntent, toggleEmotion, setRawText, inject, selectDesire,
    getSelectedDesire, setDistilled, setMailSent
  } = useRepairStore();

  // NVC 打字机（步骤6）
  const { results: nvcResults, start: startNvc, reset: resetNvc, done: nvcDone } = useSequentialTypewriter(38, 240);
  // 安慰话打字机（步骤7）
  const { text: comfortTyped, typing: comfortTyping, type: typeComfort } = useTypewriter({ charDelay: 50 });

  const selectedDesire = getSelectedDesire();
  const canInject = !!intent && emotionKeys.length > 0 && rawText.trim().length > 0;

  // H5 Demo：沙盒模式下从 sessionStorage 读取白金剧本前置词，预填 Step 3 录入语料
  useEffect(() => {
    if (process.env.TARO_ENV === 'h5' && globalData.sandboxScriptMode && !rawText) {
      try {
        const defaultRaw = sessionStorage.getItem('rings_sandbox_default_raw');
        if (defaultRaw) {
          setRawText(defaultRaw);
          console.info('[Repair] sandbox default raw text pre-filled');
        }
      } catch (e) {
        console.warn('[Repair] sessionStorage read failed:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 步骤 3 → 步骤 4：点"下一步，注入年轮"立刻发起 LLM 请求 + 进入加载动画
  const handleStartInject = useCallback(async () => {
    if (!canInject) return;
    setStep(4);
    // 立刻发起大模型请求（不阻塞 UI，inject 内部走 store）
    await inject();
  }, [canInject, inject]);

  // 步骤 4 → 步骤 5：inject 完成后自动进入渴望提炼
  useEffect(() => {
    if (step === 4 && !injecting && injectResult) {
      setStep(5);
    }
  }, [step, injecting, injectResult]);

  // 步骤 6：提炼真心话（接入 LLM distill action）
  const handleDistill = useCallback(async () => {
    if (!selectedDesire || !intent) return;
    setDistillLoading(true);
    setDistilled(true);
    try {
      const result = await mockDistill(intent, emotionKeys, rawText, selectedDesire, selfName);
      setDistilledNvc(result);  // 保存 LLM 提炼结果，供 handleSendCard 打包上传
      setStep(6);
      startNvc([
        { id: 'observation', text: result.observation },
        { id: 'feeling', text: result.feeling.feeling_text },
        { id: 'need', text: result.need },
        { id: 'request', text: result.request }
      ]);
    } catch (e) {
      console.error('[Repair] distill failed, fallback to desire.nvc:', e);
      // 兜底：直接用 selectedDesire.nvc
      const primary = emotionKeys[0] || 'wronged';
      const fallback: DistillResult = {
        observation: selectedDesire.nvc.observation,
        feeling: { feeling_text: `我觉得有些 ${primary} 和 ${primary}。`, highlight_words: [primary] },
        need: selectedDesire.nvc.need,
        request: selectedDesire.nvc.request
      };
      setDistilledNvc(fallback);
      setStep(6);
      startNvc([
        { id: 'observation', text: fallback.observation },
        { id: 'feeling', text: fallback.feeling.feeling_text },
        { id: 'need', text: fallback.need },
        { id: 'request', text: fallback.request }
      ]);
    } finally {
      setDistillLoading(false);
    }
  }, [selectedDesire, intent, emotionKeys, rawText, selfName, setDistilled, startNvc]);

  // 步骤 6：与心晴对话微调（调用 refine_whisper 云函数，重新触发打字机）
  const handleRefine = useCallback(async () => {
    if (!distilledNvc || !refineInput.trim() || refineLoading || !intent) return;
    setRefineLoading(true);
    try {
      const result = await mockRefineWhisper(distilledNvc, refineInput.trim(), intent);
      setDistilledNvc(result);  // 更新源数据（即时覆盖 distilledNvc）
      setRefineInput('');
      // 重新触发打字机渲染，让用户看见 AI 润色后的逐字效果
      startNvc([
        { id: 'observation', text: result.observation },
        { id: 'feeling', text: result.feeling.feeling_text },
        { id: 'need', text: result.need },
        { id: 'request', text: result.request }
      ]);
      Taro.showToast({ title: '心晴已为你润色', icon: 'success' });
    } catch (e) {
      console.error('[Repair] refine_whisper failed:', e);
      Taro.showToast({ title: '微调失败，请稍后再试', icon: 'none' });
    } finally {
      setRefineLoading(false);
    }
  }, [distilledNvc, refineInput, refineLoading, intent, startNvc]);

  // 步骤 6 终点：生成破冰卡 → 投递信箱 → 进入步骤7（LLM 安慰话）
  const handleSendCard = useCallback(async () => {
    if (!selectedDesire || !intent) return;
    const mail = sendIceBreakMail({
      fromName: selfName,
      toName: partnerName,
      intent,
      emotionKeys,
      rawText,
      desire: selectedDesire,
      distilledNvc: distilledNvc || undefined  // Step 6 LLM 提炼后的真心话，B 端优先显示此版本
    });
    appendRingsLog({
      type: 'A_inject',
      intent,
      emotionKeys,
      rawText,
      desireKey: selectedDesire.key,
      mailId: mail.mailId
    });
    setMailId(mail.mailId);
    setMailSent(true);
    setStep(7);
    Taro.showToast({ title: '破冰卡已生成', icon: 'success' });

    // 异步拉取 LLM 安慰话
    setComfortLoading(true);
    try {
      const text = await mockComfortA(intent, emotionKeys, rawText, selectedDesire, selfName, distilledNvc, partnerName);
      setComfortText(text);
      typeComfort(text);
    } catch (e) {
      console.error('[Repair] comfort_a failed:', e);
      setComfortText(`${selfName}，你愿意把心里话写下来，这本身就很了不起。今晚好好睡，年轮正在悄悄生长。`);
      typeComfort(comfortText);
    } finally {
      setComfortLoading(false);
    }
  }, [selectedDesire, intent, selfName, partnerName, emotionKeys, rawText, distilledNvc, setMailSent, typeComfort, comfortText]);

  // 返回上一步
  const handleBack = useCallback(() => {
    if (step > 1) setStep((step - 1) as Step);
  }, [step]);

  // 完成整个流程 → 回首页
  const handleFinish = useCallback(() => {
    Taro.switchTab({ url: '/pages/home/index' });
  }, []);

  return (
    <View className={styles.container}>
      {/* 进度指示（步骤7不在进度条内） */}
      {step !== 7 && (
        <View className={styles.steps}>
          {[1, 2, 3, 4, 5, 6].map(s => (
            <View
              key={s}
              className={classnames(styles.dot, s === step && styles.active)}
            />
          ))}
        </View>
      )}

      {/* Step 1：意图分流 */}
      <View className={classnames(styles.step, step === 1 && styles.active)}>
        <View className={styles.angelRow}>
          <View className={styles.angelAvatar}>{angelName[0]}</View>
          <View className={styles.angelBubble}>
            守护你们的爱情双生树，{angelName}准备好啦。你希望主动关心对方，还是邀请对方关心你？
          </View>
        </View>
        <View className={styles.intentGrid}>
          <View
            className={styles.intentCard}
            onClick={() => { setIntent('care_other'); setStep(2); }}
          >
            <Text className={styles.intentCardTitle}>主动关心对方</Text>
            <Text className={styles.intentCardDesc}>
              我先识别 Ta 的情绪，把我的歉意/在意翻译成 Ta 能听见的话。
            </Text>
          </View>
          <View
            className={styles.intentCard}
            onClick={() => { setIntent('care_me'); setStep(2); }}
          >
            <Text className={styles.intentCardTitle}>邀请对方关心我</Text>
            <Text className={styles.intentCardDesc}>
              我先识别自己的情绪，把我没说出口的委屈翻译给 Ta 听。
            </Text>
          </View>
        </View>
      </View>

      {/* Step 2：情绪命名（多选） */}
      <View className={classnames(styles.step, step === 2 && styles.active)}>
        <View className={styles.angelRow}>
          <View className={styles.angelAvatar}>{angelName[0]}</View>
          <View className={styles.angelBubble}>
            {intent === 'care_other'
              ? `我们先识别${partnerName}的情绪，这里有几张情绪卡片，你选就行。`
              : `我们先识别你此刻的情绪，这里有几张情绪卡片，你选就行。`}
          </View>
        </View>
        <Text className={styles.sectionTitle}>情绪命名（可多选）</Text>
        <Text className={styles.sectionHint}>勾选你/对方此刻最强烈的几张卡片</Text>
        <View className={styles.emotionGrid}>
          {EMOTION_TAGS.map(tag => (
            <View
              key={tag.key}
              className={classnames(styles.emotionChip, emotionKeys.includes(tag.key) && styles.active)}
              onClick={() => toggleEmotion(tag.key)}
            >
              <Text>{tag.label}</Text>
            </View>
          ))}
        </View>
        <View
          className={classnames(styles.btnPrimary, emotionKeys.length === 0 && styles.disabled)}
          onClick={() => emotionKeys.length > 0 && setStep(3)}
        >
          <Text>下一步，说事件</Text>
        </View>
        <View className={styles.btnGhost} onClick={handleBack}><Text>← 换个意图</Text></View>
      </View>

      {/* Step 3：原始语料 → 点"下一步"自动触发注入 */}
      <View className={classnames(styles.step, step === 3 && styles.active)}>
        <View className={styles.angelRow}>
          <View className={styles.angelAvatar}>{angelName[0]}</View>
          <View className={styles.angelBubble}>
            请跟我分享一下事件始末，让我从中寻找修复关系的线索。
          </View>
        </View>
        <Text className={styles.sectionTitle}>原始语料</Text>
        <Text className={styles.sectionHint}>想到什么写什么，{angelName}不会批评你</Text>
        <Textarea
          className={styles.rawInput}
          placeholder="例如：那天我加班回家直接进房间关了门，没跟她聊天…"
          value={rawText}
          maxlength={500}
          onInput={e => setRawText(e.detail.value)}
        />
        <Text className={styles.rawCount}>{rawText.length}/500</Text>
        <View
          className={classnames(styles.btnPrimary, !canInject && styles.disabled)}
          onClick={handleStartInject}
        >
          <Text>下一步，注入年轮</Text>
        </View>
        <View className={styles.btnGhost} onClick={handleBack}><Text>← 重选情绪</Text></View>
      </View>

      {/* Step 4：注入年轮（纯加载动画，无按钮，自动进入步骤5） */}
      <View className={classnames(styles.step, step === 4 && styles.active)}>
        <View className={styles.loadingBox}>
          <View className={styles.loadingRing} />
          <Text className={styles.loadingText}>
            {angelName}正在你的年轮里{'\n'}寻找修复的线索…
          </Text>
        </View>
        <WoodRing size={200} />
      </View>

      {/* Step 5：渴望提炼 */}
      <View className={classnames(styles.step, step === 5 && styles.active)}>
        <View className={styles.angelRow}>
          <View className={styles.angelAvatar}>{angelName[0]}</View>
          <View className={styles.angelBubble}>
            {injectResult?.guidePrompt || `${angelName}看到你的在意了。下面哪一条最接近你真正想要的？`}
          </View>
        </View>
        <Text className={styles.sectionTitle}>渴望提炼</Text>
        <Text className={styles.sectionHint}>三选一，{angelName}会据此生成你的真心话</Text>
        <View className={styles.desireList}>
          {injectResult?.desireOptions.map(opt => (
            <View
              key={opt.key}
              className={classnames(styles.desireCard, selectedDesireKey === opt.key && styles.active)}
              onClick={() => selectDesire(opt.key)}
            >
              <Text className={styles.desireKey}>{opt.key}</Text>
              <Text className={styles.desireText}>{opt.text.replace(/^我猜你渴望/, 'TA渴望')}</Text>
            </View>
          ))}
        </View>
        <View
          className={classnames(styles.btnPrimary, (!selectedDesireKey || distillLoading) && styles.disabled)}
          onClick={() => selectedDesireKey && !distillLoading && handleDistill()}
        >
          <Text>{distillLoading ? '正在提炼…' : '提炼真心话'}</Text>
        </View>
        <View className={styles.btnGhost} onClick={() => { resetNvc(); setStep(4); handleBack(); }}>
          <Text>← 重新注入</Text>
        </View>
      </View>

      {/* Step 6：NVC 真心话 + 生成破冰卡 */}
      <View className={classnames(styles.step, step === 6 && styles.active)}>
        <View className={styles.angelRow}>
          <View className={styles.angelAvatar}>{angelName[0]}</View>
          <View className={styles.angelBubble}>
            这是{angelName}替你翻译的真心话，被你藏在冰山下的。
          </View>
        </View>

        <View className={styles.nvcCard}>
          {nvcDone && (
            <Text className={styles.editHint}>可点击文字直接修改，或用下方对话框让心晴帮你润色</Text>
          )}
          <View className={classnames(styles.nvcField, nvcResults.observation !== undefined && styles.visible)}>
            <Text className={styles.nvcLabel}>观察</Text>
            {nvcDone && distilledNvc ? (
              <Textarea
                className={styles.nvcTextarea}
                value={distilledNvc.observation}
                maxlength={200}
                autoHeight
                onInput={e => setDistilledNvc(prev => prev ? { ...prev, observation: e.detail.value } : prev)}
              />
            ) : (
              <Text className={styles.nvcText}>{nvcResults.observation}</Text>
            )}
          </View>
          <View className={classnames(styles.nvcField, nvcResults.feeling !== undefined && styles.visible)}>
            <Text className={styles.nvcLabel}>感受</Text>
            {nvcDone && distilledNvc ? (
              <Textarea
                className={styles.nvcTextarea}
                value={distilledNvc.feeling.feeling_text}
                maxlength={200}
                autoHeight
                onInput={e => setDistilledNvc(prev => prev ? { ...prev, feeling: { ...prev.feeling, feeling_text: e.detail.value } } : prev)}
              />
            ) : (
              <Text className={styles.nvcText}>
                {nvcResults.feeling ? renderFeeling(nvcResults.feeling, distilledNvc?.feeling?.highlight_words || [], styles) : ''}
              </Text>
            )}
          </View>
          <View className={classnames(styles.nvcField, nvcResults.need !== undefined && styles.visible)}>
            <Text className={styles.nvcLabel}>需求</Text>
            {nvcDone && distilledNvc ? (
              <Textarea
                className={styles.nvcTextarea}
                value={distilledNvc.need}
                maxlength={200}
                autoHeight
                onInput={e => setDistilledNvc(prev => prev ? { ...prev, need: e.detail.value } : prev)}
              />
            ) : (
              <Text className={styles.nvcText}>{nvcResults.need}</Text>
            )}
          </View>
          <View className={classnames(styles.nvcField, nvcResults.request !== undefined && styles.visible)}>
            <Text className={styles.nvcLabel}>请求</Text>
            {nvcDone && distilledNvc ? (
              <Textarea
                className={styles.nvcTextarea}
                value={distilledNvc.request}
                maxlength={200}
                autoHeight
                onInput={e => setDistilledNvc(prev => prev ? { ...prev, request: e.detail.value } : prev)}
              />
            ) : (
              <Text className={styles.nvcText}>{nvcResults.request}</Text>
            )}
          </View>
        </View>

        {nvcDone && (
          <View className={styles.refineBox}>
            <Text className={styles.refineTitle}>还想微调？对心晴说</Text>
            <Textarea
              className={styles.refineInput}
              placeholder="对心晴说：把请求改成今晚一起去散步…"
              value={refineInput}
              maxlength={100}
              autoHeight
              onInput={e => setRefineInput(e.detail.value)}
            />
            <View
              className={classnames(styles.refineButton, (!refineInput.trim() || refineLoading) && styles.disabled)}
              onClick={handleRefine}
            >
              <Text>{refineLoading ? '心晴正在润色…' : '让心晴重写'}</Text>
            </View>
          </View>
        )}

        {nvcDone && !refineLoading && (
          <View className={styles.bottomBar}>
            <View className={styles.btnPrimary} onClick={handleSendCard}>
              <Text>生成破冰微信小卡片</Text>
            </View>
          </View>
        )}
      </View>

      {/* Step 7：发送成功页（LLM 安慰话，替换开发者测试浮窗） */}
      <View className={classnames(styles.step, step === 7 && styles.active)}>
        <View className={styles.loadingBox}>
          <WoodRing size={240} />
          <Text className={styles.loadingText}>
            破冰卡已悄悄飞向{partnerName}{'\n'}提取码 {mailId}
          </Text>
        </View>
        <View className={styles.angelRow}>
          <View className={styles.angelAvatar}>{angelName[0]}</View>
          <View className={styles.angelBubble}>
            {comfortLoading ? `${angelName}正在给你一个抱抱…` : comfortTyped}
            {comfortTyping && <Text className={styles.replyCursor}>|</Text>}
          </View>
        </View>
        {!comfortTyping && comfortText && (
          <View className={styles.bottomBar}>
            <View className={styles.btnPrimary} onClick={handleFinish}>
              <Text>回到年轮树</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

// 渲染感受字段：用 LLM 返回的 highlight_words 动态正则切分染色（废除硬编码白名单）
function renderFeeling(text: string, highlightWords: string[], styles: any): React.ReactNode {
  if (!text) return null;
  const words = (highlightWords || []).filter(w => w && typeof w === 'string');
  if (words.length === 0) return <Text>{text}</Text>;
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = text.split(re);
  return parts.map((p, i) =>
    words.includes(p)
      ? <Text key={i} className={styles.feelingTag}>{p}</Text>
      : <Text key={i}>{p}</Text>
  );
}

export default function () {
  return (
    <ErrorBoundary label="repair页面">
      <RepairPage />
    </ErrorBoundary>
  );
}
