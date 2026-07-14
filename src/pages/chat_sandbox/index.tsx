// 线上聊天沙盒：双端基于云端 chatHistory 的去中心化上下文同步
// 指令12 任务三：完整聊天列表 UI + 心晴润色/代写/发送闭环
// H5 Demo 任务三：SANDBOX_SCRIPT_MODE 下不调用 watch()，改用本地 state + 预设 A端回复
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Textarea, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { getPairing, readLatestMail, setChatResetFlag, getChatResetFlag, clearChatResetFlag } from '../../utils/storage';
import { mockEncryptMail, mockDecryptMail } from '../../data/mailbox';
import { mockChatPolish, mockChatSuggest } from '../../data/mockData';
import { extractContextSnapshot } from '../../data/mailbox';
import { globalData } from '../../appGlobal';
import type { ChatMessage, ChatSuggestion, IceBreakMail, Intent } from '../../types/repair';
import { useTypewriter } from '../../utils/useTypewriter';
import styles from './index.module.scss';

const CLOUD_ENV_ID = 'cloud1-d4gy9bh0ff360b152';
const COLLECTION = 'rings_messages';

// H5 Demo：沙盒模式标识（watch 不可用时改用本地 state）
const isH5Sandbox = process.env.TARO_ENV === 'h5' && globalData.sandboxScriptMode;

// B 端白金润色文案（A 端首次进入时预填，模拟 B 已发送）
const SANDBOX_B_PRESET_MSG = '我现在很难受，需要你立刻出现。别让我等，我要看到你重视我的行动。';
// A 端白金自动回复（B 端发送后 3 秒自动追加）
const SANDBOX_A_AUTO_REPLY = '车已叫，半小时必到。再撑一下，我马上飞奔到你身边。';

const ChatSandboxPage: React.FC = () => {
  const router = useRouter();
  const pairing = getPairing();
  const angelName = pairing?.angelName || '心晴';
  const selfName = pairing?.selfName || '林向阳';
  const partnerName = pairing?.partnerName || '沈月亮';

  const mailId = (router.params.mailId as string) || '';
  // 指令14 任务一：view 获取优先 router 参数，其次 pairing.role 兜底
  const view = (router.params.view as 'A' | 'B') || (pairing?.role === 'B' ? 'B' : 'A');
  const sender = view;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [polishLoading, setPolishLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [scrollAnchor, setScrollAnchor] = useState('');

  // H5 Demo：沙盒模式自动回复定时器引用（组件卸载时清理）
  const autoReplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清理自动回复定时器
  useEffect(() => {
    return () => {
      if (autoReplyTimerRef.current) {
        clearTimeout(autoReplyTimerRef.current);
      }
    };
  }, []);

  const { text: polishedText, typing: polishTyping, type: typePolish } = useTypewriter({ charDelay: 30 });

  // 打字机完成后回填输入框
  useEffect(() => {
    if (!polishTyping && polishedText) {
      setInputText(polishedText);
    }
  }, [polishTyping, polishedText]);

  // 指令15 任务二：用 db.collection().watch() 替代静态 fetch，实现双端实时消息监听
  // H5 Demo 任务三：SANDBOX_SCRIPT_MODE 下不调用 watch()，改用本地 state 预设消息
  useEffect(() => {
    if (!mailId) {
      setLoadingHistory(false);
      return;
    }

    // H5 Demo 沙盒模式：完全跳过 watch，使用本地预设消息
    if (isH5Sandbox) {
      const resetFlag = getChatResetFlag();
      if (resetFlag && resetFlag.mailId === mailId) {
        // 刚清空过：展示空列表
        setMessages([]);
      } else if (view === 'A') {
        // A 端首次进入：预填 B 端已发送的白金润色消息
        setMessages([{
          text: SANDBOX_B_PRESET_MSG,
          sender: 'B',
          time: new Date().toISOString()
        }]);
      } else {
        // B 端首次进入：空列表，由用户发送触发
        setMessages([]);
      }
      setLoadingHistory(false);
      return;
    }

    // 指令14 任务三：检查本地重置标记，若刚刚清空过则先展示空列表（但不阻止 watcher 建立）
    const resetFlag = getChatResetFlag();
    if (resetFlag && resetFlag.mailId === mailId) {
      setMessages([]);
    }
    setLoadingHistory(true);
    let watcher: { close?: () => void } | null = null;
    try {
      const db = Taro.cloud.database({ env: CLOUD_ENV_ID });
      watcher = db.collection(COLLECTION)
        .where({ mailId })
        .watch({
          onChange: (snapshot: any) => {
            const doc = snapshot.docs && snapshot.docs[0];
            if (doc && doc.chatHistory && Array.isArray(doc.chatHistory)) {
              const decoded: ChatMessage[] = doc.chatHistory.map((item: any) => ({
                text: mockDecryptMail(item.text || ''),
                sender: item.sender || 'A',
                time: item.time || ''
              }));
              setMessages(decoded);
            }
            setLoadingHistory(false);
          },
          onError: (err: any) => {
            console.error('[chat_sandbox] watch error:', err);
            setLoadingHistory(false);
          }
        });
    } catch (e) {
      console.error('[chat_sandbox] watch setup failed:', e);
      setLoadingHistory(false);
    }
    // 组件卸载时销毁 watcher，防止内存泄漏 / 监听逻辑闭环
    return () => {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
    };
  }, [mailId, view]);

  // 心晴润色
  const handlePolish = async () => {
    if (!inputText.trim()) {
      Taro.showToast({ title: '先在输入框写点什么吧', icon: 'none' });
      return;
    }
    setPolishLoading(true);
    try {
      // H5 Demo：传入 view 区分 A/B 端白金润色文案
      const polished = await mockChatPolish(inputText, messages, view);
      typePolish(polished);
    } catch (e) {
      console.error('[chat_sandbox] polish failed:', e);
      Taro.showToast({ title: '润色失败', icon: 'none' });
    } finally {
      setPolishLoading(false);
    }
  };

  // 心晴代写
  const handleSuggest = async () => {
    setSuggestLoading(true);
    try {
      const mail = readLatestMail() as IceBreakMail | null;
      const ctx = mail ? extractContextSnapshot(mail) : { intent: 'care_me' as Intent, emotionKeys: [], rawText: '', desire: {} as any, fromName: selfName, toName: partnerName };
      const options = await mockChatSuggest(messages, ctx, view);
      setSuggestions(options);
    } catch (e) {
      console.error('[chat_sandbox] suggest failed:', e);
      Taro.showToast({ title: '代写失败', icon: 'none' });
    } finally {
      setSuggestLoading(false);
    }
  };

  const handlePickSuggestion = (suggestion: ChatSuggestion) => {
    setInputText(suggestion.text);
    setSuggestions([]);
  };

  // 发送
  const handleSend = async () => {
    if (!inputText.trim()) {
      Taro.showToast({ title: '先写点什么再发送吧', icon: 'none' });
      return;
    }
    if (!mailId) {
      Taro.showToast({ title: '缺少信件 ID', icon: 'none' });
      return;
    }

    // H5 Demo 沙盒模式：本地追加，不走云端；B 端发送后 3 秒自动追加 A 端白金回复
    if (isH5Sandbox) {
      const newMsg: ChatMessage = {
        text: inputText,
        sender,
        time: new Date().toISOString()
      };
      setMessages(prev => [...prev, newMsg]);
      setInputText('');
      setSuggestions([]);
      clearChatResetFlag();
      Taro.showToast({ title: '已发送', icon: 'success', duration: 800 });

      // B 端发送后，3 秒自动追加 A 端白金回复（模拟实时对话）
      if (view === 'B' && sender === 'B') {
        if (autoReplyTimerRef.current) {
          clearTimeout(autoReplyTimerRef.current);
        }
        autoReplyTimerRef.current = setTimeout(() => {
          setMessages(prev => [...prev, {
            text: SANDBOX_A_AUTO_REPLY,
            sender: 'A',
            time: new Date().toISOString()
          }]);
          autoReplyTimerRef.current = null;
        }, 3000);
      }
      return;
    }

    setSending(true);
    try {
      const encryptedText = mockEncryptMail(inputText);
      const db = Taro.cloud.database({ env: CLOUD_ENV_ID });
      const _ = db.command;
      const res = await db.collection(COLLECTION)
        .where({ mailId })
        .limit(1)
        .get();
      const doc = res.data && res.data[0];
      if (!doc || !doc._id) {
        Taro.showToast({ title: '信件未找到', icon: 'none' });
        return;
      }
      await db.collection(COLLECTION).doc(String(doc._id)).update({
        data: {
          chatHistory: _.push({
            text: encryptedText,
            sender,
            time: new Date().toISOString()
          })
        }
      });

      // watch() 的 onChange 会自动同步云端最新 chatHistory，无需本地追加
      setInputText('');
      setSuggestions([]);
      // 发送新消息后清除重置标记，恢复云端拉取能力
      clearChatResetFlag();
      Taro.showToast({ title: '已发送', icon: 'success', duration: 800 });
    } catch (e) {
      console.error('[chat_sandbox] send failed:', e);
      Taro.showToast({ title: '发送失败', icon: 'none' });
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (!mailId) {
      Taro.showToast({ title: '缺少信件 ID', icon: 'none' });
      return;
    }

    // H5 Demo 沙盒模式：仅清空本地 state，不走云端
    if (isH5Sandbox) {
      setMessages([]);
      setChatResetFlag(mailId);
      Taro.showToast({ title: '测试记录已清空', icon: 'success' });
      return;
    }

    try {
      const db = Taro.cloud.database({ env: CLOUD_ENV_ID });
      const res = await db.collection(COLLECTION)
        .where({ mailId })
        .limit(1)
        .get();
      const doc = res.data && res.data[0];
      if (!doc || !doc._id) {
        Taro.showToast({ title: '信件未找到', icon: 'none' });
        return;
      }
      await db.collection(COLLECTION).doc(String(doc._id)).update({
        data: { chatHistory: [] }
      });
      setMessages([]);
      // 指令14 任务三：写入本地重置标记，防止旧缓存残留干扰下一次测试
      setChatResetFlag(mailId);
      Taro.showToast({ title: '测试记录已清空', icon: 'success' });
    } catch (e) {
      console.error('[chat_sandbox] clearHistory failed:', e);
      Taro.showToast({ title: '清空失败', icon: 'none' });
    }
  };

  const handleBack = () => {
    Taro.navigateBack();
  };

  // 滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => setScrollAnchor('chatScrollBottom'), 100);
    }
  }, [messages]);

  const isSelf = (s: string) => s === sender;

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <View className={styles.headerLeft} onClick={handleBack}>
          <Text className={styles.backIcon}>←</Text>
        </View>
        <View className={styles.headerCenter}>
          <Text className={styles.title}>心晴支招</Text>
          <Text className={styles.subtitle}>{angelName}陪你们说话</Text>
        </View>
        <View className={styles.headerRight}>
          <Text className={styles.clearIcon} onClick={handleClearHistory}>⎔</Text>
        </View>
      </View>

      {/* 聊天列表 */}
      <ScrollView
        className={styles.chatList}
        scrollY
        scrollIntoView={scrollAnchor}
      >
        {loadingHistory && (
          <View className={styles.loadingTip}>
            <Text>{angelName}正在拉取你们的对话…</Text>
          </View>
        )}
        {!loadingHistory && messages.length === 0 && (
          <View className={styles.loadingTip}>
            <Text>还没有对话，先说点什么吧</Text>
          </View>
        )}
        {messages.map((msg, i) => (
          <View
            key={i}
            className={classnames(styles.msgRow, isSelf(msg.sender) ? styles.msgSelf : styles.msgOther)}
          >
            <View className={styles.msgBubble}>
              <Text className={styles.msgText}>{msg.text}</Text>
            </View>
          </View>
        ))}
        <View id='chatScrollBottom' />
      </ScrollView>

      {/* 心晴代写卡片 */}
      {(suggestions.length > 0 || suggestLoading) && (
        <View className={styles.suggestOverlay}>
          <Text className={styles.suggestTitle}>
            {suggestLoading ? `${angelName}正在写给你…` : `${angelName}给你写了三段话，选一段吧：`}
          </Text>
          {!suggestLoading && suggestions.map((s) => (
            <View
              key={s.key}
              className={styles.suggestCard}
              onClick={() => handlePickSuggestion(s)}
            >
              <Text className={styles.suggestLabel}>{s.key}</Text>
              <Text className={styles.suggestText}>{s.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 输入区 */}
      <View className={styles.inputArea}>
        <Textarea
          className={styles.inputBox}
          value={polishTyping ? polishedText : inputText}
          onInput={(e) => setInputText(e.detail.value)}
          placeholder='把想对 Ta 说的话写在这里…'
          maxlength={500}
          autoHeight
        />
        {polishTyping && <Text className={styles.polishHint}>{angelName}润色中…</Text>}
        <View className={styles.actionRow}>
          <View
            className={classnames(styles.actionBtn, styles.actionBtnGhost, polishLoading && styles.btnBusy)}
            onClick={handlePolish}
          >
            <Text>{polishLoading ? '润色中…' : '心晴润色'}</Text>
          </View>
          <View
            className={classnames(styles.actionBtn, styles.actionBtnGhost, suggestLoading && styles.btnBusy)}
            onClick={handleSuggest}
          >
            <Text>{suggestLoading ? '代写中…' : '心晴代写'}</Text>
          </View>
          <View
            className={classnames(styles.actionBtn, styles.actionBtnPrimary, sending && styles.btnBusy)}
            onClick={handleSend}
          >
            <Text>{sending ? '发送中…' : '发送'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ChatSandboxPage;
