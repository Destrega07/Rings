// B 端木偶替身宣泄：戳一戳抖动 + 心晴代答打字机 + 解锁看真心话
import React, { useState, useCallback } from 'react';
import { View, Text, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useTypewriter } from '../../utils/useTypewriter';
import { mockPuppetReply } from '../../data/mockData';
import { receiveIceBreakMail, extractContextSnapshot } from '../../data/mailbox';
import { getPairing, appendVentLog } from '../../utils/storage';
import type { ContextSnapshot, PuppetVentLog } from '../../types/repair';
import styles from './index.module.scss';

const PuppetPage: React.FC = () => {
  const [userText, setUserText] = useState('');
  const [shaking, setShaking] = useState(false);
  const [replied, setReplied] = useState(false);
  const [pokeCount, setPokeCount] = useState(0);
  const [ventHistory, setVentHistory] = useState<PuppetVentLog[]>([]);
  const [replyLoading, setReplyLoading] = useState(false);

  const { text: replyText, typing: replyTyping, type: typeReply } = useTypewriter({ charDelay: 36 });

  const pairing = getPairing();
  const angelName = pairing?.angelName || '心晴';

  // 从信箱读取 A 端投递的破冰卡，提取 A 端全套状态快照
  // 真机：mail 来自云端拉取；沙盒：mail 来自本地缓存
  const mail = receiveIceBreakMail();
  const contextSnapshot: ContextSnapshot | undefined = mail
    ? extractContextSnapshot(mail)
    : undefined;
  // 木偶替 A，名字取 A 端投递人（mail.fromName），无 mail 时回退 pairing
  const partnerName = mail?.fromName || pairing?.selfName || '向阳';

  const handlePoke = useCallback(async () => {
    // 抖动动画（与云函数调用并行）
    setShaking(true);
    setTimeout(() => setShaking(false), 600);

    const currentInput = userText || '你就是个木头！';
    setReplyLoading(true);
    // 木偶替身代答：传入 ventHistory 让 LLM 知道之前已道过什么歉，避免重复
    const reply = await mockPuppetReply(
      currentInput,
      partnerName,
      contextSnapshot,
      ventHistory
    );
    setReplyLoading(false);
    typeReply(reply);
    setReplied(true);
    setPokeCount(c => c + 1);
    // 自动清空输入框，进入"回复后态"等待下一轮泄洪
    setUserText('');

    // 累积历史（供下一轮云函数调用）+ 持久化到本地日志
    const newLog: PuppetVentLog = { userText: currentInput, angelReply: reply, at: Date.now() };
    setVentHistory(prev => [...prev, newLog]);
    appendVentLog({ userText: currentInput, angelReply: reply });
    console.info('[Puppet] poke #', pokeCount + 1, 'history:', ventHistory.length + 1);
  }, [userText, partnerName, contextSnapshot, ventHistory, typeReply, pokeCount]);

  const handleReveal = () => {
    Taro.redirectTo({ url: '/pages/finale/index?view=B&path=puppet' });
  };

  const handleBack = () => {
    Taro.redirectTo({ url: '/pages/firewall/index' });
  };

  // 状态机两态：初始态 vs 回复后态（placeholder + 按钮文字联动）
  const placeholder = replied
    ? '怒气/苦水继续倒在这里...'
    : '把火气倒给 Ta（可选）';
  const pokeBtnText = replyLoading
    ? '正在挨骂…'
    : (replied ? '继续戳 Ta 倒苦水' : '戳一戳 Ta（替你解气）');

  return (
    <View className={styles.container}>
      <Text className={styles.title}>木偶替身</Text>
      <Text className={styles.subtitle}>
        这是{angelName}替你准备的「{partnerName}的替身」。想骂就骂，Ta 受着。
      </Text>

      <View
        className={classnames(styles.puppet, shaking && styles.puppetShaking)}
        onClick={handlePoke}
      >
        <View className={styles.head}>
          <View className={classnames(styles.eye, styles.eyeLeft)} />
          <View className={classnames(styles.eye, styles.eyeRight)} />
          <View className={classnames(styles.blush, styles.blushLeft)} />
          <View className={classnames(styles.blush, styles.blushRight)} />
          <View className={styles.mouth} />
        </View>
        <View className={styles.body}>
          <View className={classnames(styles.patch, styles.patch1)} />
          <View className={classnames(styles.patch, styles.patch2)} />
        </View>

        {/* 小木牌浮层：replied 后显示在木偶头像右上方，作为看真心话的入口 */}
        {replied && !replyTyping && !replyLoading && (
          <View className={styles.woodSignFloat} onClick={handleReveal}>
            <Text>Ta 已经低头了，去看看真心话</Text>
          </View>
        )}
      </View>

      <View className={styles.inputCard}>
        <Textarea
          className={styles.inputBox}
          placeholder={placeholder}
          value={userText}
          maxlength={200}
          onInput={e => setUserText(e.detail.value)}
        />
        <View
          className={classnames(styles.pokeBtn, (replyLoading || shaking) && styles.pokeBtnBusy)}
          onClick={() => { if (!replyLoading && !shaking) handlePoke(); }}
        >
          <Text>{pokeBtnText}</Text>
        </View>
      </View>

      {replied && (
        <View className={styles.replyBox}>
          <View className={styles.replyAvatar}>{partnerName[0]}</View>
          <View className={styles.replyText}>
            {replyLoading && !replyText ? (
              <Text className={styles.replyLoading}>Ta 正在低头认错…</Text>
            ) : (
              <>
                <Text>{replyText}</Text>
                {replyTyping && <Text className={styles.replyCursor}>|</Text>}
              </>
            )}
          </View>
        </View>
      )}

      <View className={styles.back} onClick={handleBack}><Text>← 回到木门</Text></View>
    </View>
  );
};

export default PuppetPage;
