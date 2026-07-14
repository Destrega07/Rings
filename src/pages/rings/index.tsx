// 年轮历史页（tabBar）：展示已记录的修复事件
import React, { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import WoodRing from '../../components/WoodRing';
import { STORAGE_KEYS } from '../../utils/storage';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

interface LogEntry {
  type: string;
  intent?: string;
  emotionKeys?: string[];
  rawText?: string;
  desireKey?: string;
  mailId?: string;
  choice?: string;
  amount?: number;
  at: number;
}

const TYPE_LABEL: Record<string, string> = {
  A_inject: '注入年轮',
  B_choose: 'Ta 的回应',
  reward: '打赏感谢'
};

const RingsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const arr = Taro.getStorageSync(STORAGE_KEYS.RINGS_LOG) || [];
    // 倒序展示，最新在前
    setLogs([...arr].reverse());
  }, []);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title}>年 轮</Text>
        <Text className={styles.subtitle}>
          每一次修复，都在双生树上{'\n'}长出温暖的一圈
        </Text>
      </View>

      <View className={styles.ringPreview}>
        <WoodRing size={240} />
      </View>

      {logs.length === 0 ? (
        <View className={styles.empty}>
          还没有年轮。{'\n'}
          去家页面点【我们现在，吵了一架…】开始第一圈吧。
        </View>
      ) : (
        <View className={styles.timeline}>
          {logs.map((log, i) => (
            <View className={styles.timelineItem} key={i}>
              <View className={styles.timelineDot} />
              <View className={styles.timelineBody}>
                <Text className={styles.timelineTitle}>
                  {TYPE_LABEL[log.type] || log.type}
                </Text>
                <Text className={styles.timelineMeta}>{formatDate(log.at)}</Text>
                {log.rawText && (
                  <Text className={styles.timelineText}>「{log.rawText.slice(0, 28)}…」</Text>
                )}
                {log.intent && (
                  <Text className={styles.timelineText}>
                    意图：{log.intent === 'care_other' ? '主动关心对方' : '邀请对方关心我'}
                  </Text>
                )}
                {log.choice && (
                  <Text className={styles.timelineText}>
                    Ta 选择：{log.choice === 'offline' ? '线下聊' : '线上聊'}
                  </Text>
                )}
                {log.amount && (
                  <Text className={styles.timelineText}>
                    打赏 ¥{(log.amount / 100).toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default RingsPage;
