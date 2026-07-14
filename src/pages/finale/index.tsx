// 结算页：B 视角看真心话 + 祝福；A 视角收通知 + 线索；次日反馈打赏
// 全环节 LLM 接管：
//   B 视角入口  → guide_b            （心晴引导语，替换固定文案）
//   B 选线下聊  → finale_blessing_b  （祝福 + 小 Tips）
//   A 视角入口  → generate_insight   （次日线索复盘 + 小 Tips）
//   B 选择时    → writeBackBChoice   （写回云端，供 A 端合流）
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import WoodRing from '../../components/WoodRing';
import { receiveIceBreakMail, extractContextSnapshot, writeBackBChoice, fetchBStatusDirect } from '../../data/mailbox';
import {
  mockGuideB,
  mockFinaleBlessingB,
  mockGenerateInsight,
  getEmotionLabel,
  getEmotionSecondary
} from '../../data/mockData';
import { getPairing, markFinaleShown, clearFinaleFlag, appendRingsLog, getLatestVentLog } from '../../utils/storage';
import { useSequentialTypewriter, useTypewriter } from '../../utils/useTypewriter';
import type { IceBreakMail, FinaleView, FinaleBlessing, FinaleInsight, ContextSnapshot, PuppetVentLog, FeelingField } from '../../types/repair';
import styles from './index.module.scss';

type Phase = 'B_guide' | 'B_nvc' | 'B_choose' | 'B_growing' | 'B_blessing' | 'A_waiting' | 'A_insight' | 'A_feedback' | 'A_reward';

const FinalePage: React.FC = () => {
  const router = useRouter();
  const [view, setView] = useState<FinaleView>('B');
  const [phase, setPhase] = useState<Phase>('B_guide');
  const [mail, setMail] = useState<IceBreakMail | null>(null);
  const [rewardChoice, setRewardChoice] = useState<0 | 520 | 1314>(0);

  // B 视角：心晴引导语（LLM）
  const [guideText, setGuideText] = useState('');
  const [guideLoading, setGuideLoading] = useState(false);
  const { text: guideTyped, typing: guideTyping, type: typeGuide } = useTypewriter({ charDelay: 45 });

  // B 视角：NVC 打字机
  const { results: nvcResults, start: startNvc, done: nvcDone } = useSequentialTypewriter(38, 240);

  // B 视角：祝福 + Tips（LLM）
  const [blessing, setBlessing] = useState<FinaleBlessing | null>(null);
  const [blessingLoading, setBlessingLoading] = useState(false);

  // A 视角：线索 + Tips（LLM） + 打字机
  const [insight, setInsight] = useState<FinaleInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [checkingB, setCheckingB] = useState(false);
  const { results: insightResults, start: startInsightSeq, done: insightSeqDone } = useSequentialTypewriter(38, 240);

  const pairing = getPairing();
  const angelName = pairing?.angelName || '心晴';
  const selfName = pairing?.selfName || '林向阳';
  const partnerName = pairing?.partnerName || '沈月亮';

  // 初始化：根据 view 分流
  useEffect(() => {
    const { view: v, path } = router.params;
    const initView = (v === 'A' ? 'A' : 'B') as FinaleView;
    setView(initView);

    if (initView === 'B') {
      // B 视角：读信箱，准备 guide_b + NVC
      const m = receiveIceBreakMail();
      if (m) {
        setMail(m);
        setPhase('B_guide');
        setGuideLoading(true);
        const ctx = extractContextSnapshot(m);
        // 指令16：B 端直接点击"冷静了"（path=calm）时，传递 isCalm: true 让心晴切换正向肯定分支
        const existingVentLog = (getLatestVentLog() as PuppetVentLog | null) || undefined;
        const ventLog = path === 'calm'
          ? { userText: '', angelReply: '', at: Date.now(), isCalm: true }
          : existingVentLog;
        // 调 LLM 心晴引导语（结合 B 端宣泄历史）
        mockGuideB(ctx, m.toName || partnerName, ventLog)
          .then((text) => {
            setGuideText(text);
            typeGuide(text);
          })
          .catch((e) => {
            console.error('[Finale] guide_b failed:', e);
            const fallback = `${m.toName || partnerName}，你刚才把火气倒出来，这很勇敢。现在，来看看${m.fromName || selfName}藏在冰山下的那句话吧。`;
            setGuideText(fallback);
            typeGuide(fallback);
          })
          .finally(() => setGuideLoading(false));
      } else {
        console.warn('[Finale] B view but no mail');
      }
    } else {
      // A 视角：拉取 B 端选择 + 调 LLM 线索复盘
      setPhase('A_insight');
      handleAInsight();
    }
    console.info('[Finale] init view:', initView, 'path:', path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.params]);

  // A 视角：主动反查云端 B 端 status → 分流 generate_insight / chat_sandbox / 等待
  const handleAInsight = useCallback(async () => {
    const m = receiveIceBreakMail();
    if (!m) {
      console.warn('[Finale] A view but no mail');
      setPhase('A_waiting');
      return;
    }
    setMail(m);
    setCheckingB(true);
    try {
      // 指令11 任务二 1：强制发起云端读取，绕过 test_mode 短路
      const bStatus = await fetchBStatusDirect(m.mailId);
      // Debug 指令2 任务一：云端 status 为空时，强行赋予 'resolved_offline' 以便 100% 触发大模型联调
      let currentStatus = bStatus?.status;
      if (!currentStatus) {
        console.info('[DevDebug] 云端 status 为空，本地沙盒强行进入 offline 状态进行 LLM 联调测试');
        currentStatus = 'resolved_offline';
      }
      if (currentStatus === 'resolved_online') {
        // 指令11 任务二 3：线上聊 → 跳转 chat_sandbox
        Taro.showToast({ title: 'Ta 想先线上聊聊', icon: 'none' });
        setTimeout(() => Taro.navigateTo({ url: `/pages/chat_sandbox/index?mailId=${m.mailId}&view=A` }), 800);
        return;
      }
      // resolved_offline → 调 generate_insight，弹出《见面相拥和好指南》
      setPhase('A_insight');
      setInsightLoading(true);
      const ventLog = (getLatestVentLog() as PuppetVentLog | null) || undefined;
      const ctx = extractContextSnapshot(m);
      const result = await mockGenerateInsight(ctx, 'offline', ventLog, m.fromName || selfName, m.toName || partnerName);
      setInsight(result);
      // 打字机流式渲染 insight + tips
      startInsightSeq([
        { id: 'insight', text: result.insight },
        { id: 'tips', text: result.tips }
      ]);
    } catch (e) {
      console.error('[Finale] generate_insight failed:', e);
    } finally {
      setInsightLoading(false);
      setCheckingB(false);
    }
  }, [selfName, partnerName, startInsightSeq]);

  // B 视角：guide 打字机结束 → 自动开始 NVC 打字机
  // 优先用 A 端打包的 distilledNvc（Step 6 LLM 提炼版），回退到 desire.nvc + emotionKeys 重算
  useEffect(() => {
    if (view === 'B' && phase === 'B_guide' && !guideTyping && guideText) {
      // 引导语打完，进入 NVC 阶段
      setPhase('B_nvc');
      const m = mail;
      if (m) {
        let observation: string;
        let feeling: FeelingField;
        let need: string;
        let request: string;
        if (m.distilledNvc) {
          // 优先用 A 端 Step 6 LLM 提炼的真心话（保证 B 看到的与 A 发送的一致）
          observation = m.distilledNvc.observation;
          feeling = m.distilledNvc.feeling;
          need = m.distilledNvc.need;
          request = m.distilledNvc.request;
        } else {
          // 回退：用 Step 4 inject 的 desire.nvc + 基于 emotionKeys 重算 feeling
          const primary = getEmotionLabel(m.emotionKeys[0] || 'wronged');
          const secondary = getEmotionSecondary(m.emotionKeys[0] || 'wronged');
          observation = m.desire.nvc.observation;
          feeling = { feeling_text: `我觉得有些 ${primary} 和 ${secondary}。`, highlight_words: [primary, secondary] };
          need = m.desire.nvc.need;
          request = m.desire.nvc.request;
        }
        // 略延迟，让 phase 先切换
        setTimeout(() => {
          startNvc([
            { id: 'observation', text: observation },
            { id: 'feeling', text: feeling.feeling_text },
            { id: 'need', text: need },
            { id: 'request', text: request }
          ]);
        }, 300);
      }
    }
  }, [guideTyping, guideText, phase, view, mail, startNvc]);

  // B 视角：NVC 打字机结束 → 进入选择阶段
  useEffect(() => {
    if (view === 'B' && nvcDone && phase === 'B_nvc') {
      setPhase('B_choose');
    }
  }, [nvcDone, view, phase]);

  // B 视角：选线下聊 / 线上聊 → 写回云端 + 调 LLM 祝福
  const handleChooseChat = useCallback(async (type: 'offline' | 'online') => {
    console.info('[Finale] handleChooseChat called, type:', type, 'mailId:', mail?.mailId);
    markFinaleShown();
    appendRingsLog({
      type: 'B_choose',
      choice: type,
      mailId: mail?.mailId
    });

    // 写回云端（本地镜像 + 真机异步更新云端 rings_messages，含 status 字段）
    writeBackBChoice({
      mailId: mail?.mailId || '',
      choice: type,
      ventLog: (getLatestVentLog() as PuppetVentLog | null) || undefined
    });

    if (type === 'online') {
      // 线上聊：拦截默认线下逻辑，跳转到 chat_sandbox 测试槽
      Taro.showToast({ title: '心晴已就位', icon: 'none' });
      setTimeout(() => {
        Taro.navigateTo({ url: `/pages/chat_sandbox/index?mailId=${mail?.mailId || ''}&view=B` });
      }, 600);
      return;
    }

    // 线下聊：触发年轮生长动画，约 1.5s 后切到 B_blessing 阶段调 LLM 祝福
    setPhase('B_growing');
    Taro.showToast({ title: '和解信号已发出', icon: 'none' });

    setTimeout(async () => {
      setPhase('B_blessing');
      setBlessingLoading(true);
      try {
        const ctx: ContextSnapshot | undefined = mail ? extractContextSnapshot(mail) : undefined;
        const ventLog = (getLatestVentLog() as PuppetVentLog | null) || undefined;
        if (!ctx) {
          throw new Error('no context snapshot');
        }
        const result = await mockFinaleBlessingB(ctx, mail?.toName || partnerName, ventLog);
        setBlessing(result);
      } catch (e) {
        console.error('[Finale] finale_blessing_b failed:', e);
      } finally {
        setBlessingLoading(false);
      }
    }, 1500);
  }, [mail, partnerName]);

  // A 视角：模拟次日 → 弹反馈
  const handleSimulateNextDay = () => {
    setPhase('A_feedback');
  };

  // 反馈：问题已解决 → 打赏
  const handleResolved = () => {
    setPhase('A_reward');
  };

  // 反馈：还没好 → 关闭
  const handleNotYet = () => {
    Taro.showToast({ title: '没关系，年轮会慢慢长', icon: 'none' });
    clearFinaleFlag();
    setTimeout(() => Taro.switchTab({ url: '/pages/home/index' }), 1000);
  };

  // 选打赏金额
  const handleReward = (amount: 520 | 1314) => {
    setRewardChoice(amount);
    appendRingsLog({ type: 'reward', amount });
  };

  // 完成打赏
  const handleRewardDone = () => {
    Taro.showToast({ title: '谢谢你的咖啡，年轮又长了一圈', icon: 'none' });
    clearFinaleFlag();
    setTimeout(() => Taro.switchTab({ url: '/pages/home/index' }), 1200);
  };

  // B 视角祝福完成后回到首页
  const handleBFinish = () => {
    Taro.switchTab({ url: '/pages/home/index' });
  };

  return (
    <View className={styles.container}>
      {/* ============ B 视角 ============ */}
      {view === 'B' && (
        <View className={styles.bSection}>
          {/* B_guide / B_nvc / B_choose 阶段都显示心晴气泡（引导语或下一段引导） */}
          {(phase === 'B_guide' || phase === 'B_nvc' || phase === 'B_choose') && (
            <View className={styles.angelRow}>
              <View className={styles.angelAvatar}>{angelName[0]}</View>
              <View className={styles.angelBubble}>
                {guideLoading && !guideTyped ? (
                  <View className={styles.guideLoading}>
                    <View className={styles.guideSpinner} />
                    <Text className={styles.guideLoadingText}>{angelName}正在轻声靠近…</Text>
                  </View>
                ) : (
                  <>
                    {guideTyped}
                    {guideTyping && <Text className={styles.replyCursor}>|</Text>}
                  </>
                )}
              </View>
            </View>
          )}

          {/* B_nvc / B_choose 阶段显示 NVC 真心话卡片 */}
          {(phase === 'B_nvc' || phase === 'B_choose') && mail && (
            <View className={styles.nvcCard}>
              <View className={classnames(styles.nvcField, nvcResults.observation !== undefined && styles.visible)}>
                <Text className={styles.nvcLabel}>观察</Text>
                <Text className={styles.nvcText}>{nvcResults.observation}</Text>
              </View>
              <View className={classnames(styles.nvcField, nvcResults.feeling !== undefined && styles.visible)}>
                <Text className={styles.nvcLabel}>感受</Text>
                <Text className={styles.nvcText}>
                  {nvcResults.feeling ? renderFeeling(nvcResults.feeling, mail?.distilledNvc?.feeling?.highlight_words || [], styles) : ''}
                </Text>
              </View>
              <View className={classnames(styles.nvcField, nvcResults.need !== undefined && styles.visible)}>
                <Text className={styles.nvcLabel}>需求</Text>
                <Text className={styles.nvcText}>{nvcResults.need}</Text>
              </View>
              <View className={classnames(styles.nvcField, nvcResults.request !== undefined && styles.visible)}>
                <Text className={styles.nvcLabel}>请求</Text>
                <Text className={styles.nvcText}>{nvcResults.request}</Text>
              </View>
            </View>
          )}

          {/* B_choose 阶段：显示两个选择按钮 */}
          {phase === 'B_choose' && (
            <View className={styles.actions}>
              <View className={styles.btnPrimary} onClick={() => handleChooseChat('offline')}>
                <Text>线下聊：直接去现实中抱抱 Ta</Text>
              </View>
              <View className={styles.btnGhost} onClick={() => handleChooseChat('online')}>
                <Text>线上聊：开启心晴支招服务</Text>
              </View>
            </View>
          )}

          {/* B_growing 阶段：年轮生长同心圆放大变亮动画 */}
          {phase === 'B_growing' && (
            <View className={styles.growingWrap}>
              <View className={styles.growingRing}>
                <WoodRing size={320} finale />
              </View>
              <Text className={styles.growingText}>年轮正在悄悄生长…</Text>
            </View>
          )}

          {/* B_blessing 阶段：显示 LLM 祝福 + 小 Tips */}
          {phase === 'B_blessing' && (
            <View className={styles.blessingCard}>
              <Text className={styles.blessingTitle}>{angelName}的祝福</Text>
              {blessingLoading ? (
                <Text className={styles.blessingText}>{angelName}正在为你写一句祝福…</Text>
              ) : blessing ? (
                <>
                  <Text className={styles.blessingText}>{blessing.blessing}</Text>
                  <View className={styles.tipsRow}>
                    <Text className={styles.tipsIcon}>✦</Text>
                    <Text className={styles.tipsText}>{blessing.tips}</Text>
                  </View>
                </>
              ) : (
                <Text className={styles.blessingText}>年轮正在悄悄生长，去抱抱那个一直在等你的人吧。</Text>
              )}
              {!blessingLoading && blessing && (
                <View className={styles.bottomBar}>
                  <View className={styles.btnPrimary} onClick={handleBFinish}>
                    <Text>去见 Ta</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* ============ A 视角 ============ */}
      {view === 'A' && (
        <View className={styles.aSection}>
          <View className={styles.aRingWrap}>
            <WoodRing size={360} finale />
          </View>

          {/* A_waiting 阶段：B 端还没做选择，显示等待 + 刷新 */}
          {phase === 'A_waiting' && (
            <>
              <View className={styles.angelRow}>
                <View className={styles.angelAvatar}>{angelName[0]}</View>
                <View className={styles.angelBubble}>
                  {checkingB
                    ? `${angelName}正在帮你看 Ta 的回应…`
                    : `${partnerName}还在思考中，等 Ta 准备好，年轮会悄悄合拢。`}
                </View>
              </View>
              {!checkingB && (
                <View className={styles.bottomBar}>
                  <View className={styles.btnPrimary} onClick={handleAInsight}>
                    <Text>刷新看看</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* A_insight 阶段：《见面相拥和好指南》卡片 + 打字机流式渲染 */}
          {phase === 'A_insight' && (
            <>
              <View className={styles.angelRow}>
                <View className={styles.angelAvatar}>{angelName[0]}</View>
                <View className={styles.angelBubble}>
                  {insightLoading
                    ? `${angelName}正在为你和${partnerName}写一份和好指南…`
                    : `Ta 已经画出另外半圈年轮，准备与你线下相拥。`}
                </View>
              </View>

              <View className={styles.insightCard}>
                <Text className={styles.insightTitle}>见面相拥和好指南</Text>
                {insightLoading ? (
                  <Text className={styles.insightText}>{angelName}正在书写指南…</Text>
                ) : insight ? (
                  <>
                    <Text className={styles.insightText}>
                      {insightResults.insight !== undefined ? insightResults.insight : ''}
                      {!insightSeqDone && insightResults.tips === undefined && (
                        <Text className={styles.replyCursor}>|</Text>
                      )}
                    </Text>
                    {insightResults.tips !== undefined && (
                      <View className={styles.tipsRow} style={{ marginTop: '16rpx' }}>
                        <Text className={styles.tipsIcon}>✦</Text>
                        <Text className={styles.tipsText}>
                          {insightResults.tips}
                          {!insightSeqDone && <Text className={styles.replyCursor}>|</Text>}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text className={styles.insightText}>年轮正在悄悄生长。</Text>
                )}
              </View>

              {insightSeqDone && (
                <>
                  <View className={styles.devNextDay} onClick={handleSimulateNextDay}>
                    <Text>【开发】模拟次日 → 弹出反馈打赏</Text>
                  </View>
                  <Text className={styles.notice}>
                    按剧本，反馈打赏会在「次日或再次打开小程序」时弹出
                  </Text>
                </>
              )}
            </>
          )}

          {/* 反馈弹窗：问题解决了吗？ */}
          {phase === 'A_feedback' && (
            <View className={styles.mask}>
              <View className={styles.modal}>
                <Text className={styles.modalTitle}>昨天那圈年轮…</Text>
                <Text className={styles.modalDesc}>
                  有帮你和{partnerName}听见彼此的声音吗？
                </Text>
                <View className={styles.modalBtns}>
                  <View className={styles.modalBtnPrimary} onClick={handleResolved}>
                    <Text>问题已解决</Text>
                  </View>
                  <View className={styles.modalBtnGhost} onClick={handleNotYet}>
                    <Text>还没完全好</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 打赏弹窗 */}
          {phase === 'A_reward' && (
            <View className={styles.mask}>
              <View className={styles.modal}>
                {rewardChoice === 0 ? (
                  <>
                    <Text className={styles.modalTitle}>给{angelName}一杯热咖啡</Text>
                    <Text className={styles.modalDesc}>
                      感谢它昨晚替{selfName}挨了揍，听懂了{partnerName}的委屈。
                    </Text>
                    <View className={styles.rewardRow}>
                      <View className={styles.rewardCard} onClick={() => handleReward(520)}>
                        <Text className={styles.rewardAmount}>¥5.20</Text>
                        <Text className={styles.rewardLabel}>愿你被爱</Text>
                      </View>
                      <View className={styles.rewardCard} onClick={() => handleReward(1314)}>
                        <Text className={styles.rewardAmount}>¥13.14</Text>
                        <Text className={styles.rewardLabel}>一生一世</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View className={styles.woodTag}>
                      <Text className={styles.woodTagText}>暖心小木牌</Text>
                      <Text className={styles.woodTagAmount}>¥{(rewardChoice / 100).toFixed(2)}</Text>
                      <Text className={styles.woodTagText}>谢谢你的咖啡</Text>
                    </View>
                    <View className={styles.modalBtns}>
                      <View className={styles.modalBtnPrimary} onClick={handleRewardDone}>
                        <Text>完成打赏</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      )}
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

export default FinalePage;
