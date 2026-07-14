// B 端木门防火墙：检测 mock_role=B → 读信箱 → 木门 + 分流
import React, { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { receiveIceBreakMail } from '../../data/mailbox';
import { getPairing } from '../../utils/storage';
import type { IceBreakMail } from '../../types/repair';
import styles from './index.module.scss';

const FirewallPage: React.FC = () => {
  const [mail, setMail] = useState<IceBreakMail | null>(null);
  const pairing = getPairing();
  const selfName = pairing?.partnerName || '沈月亮'; // B 端是「对方」
  const partnerName = pairing?.selfName || '林向阳';

  useEffect(() => {
    const m = receiveIceBreakMail();
    if (!m) {
      console.warn('[Firewall] no mail in box');
    } else {
      setMail(m);
      console.info('[Firewall] B opened mail:', m.mailId);
    }
  }, []);

  const handleStillAngry = () => {
    Taro.redirectTo({ url: '/pages/puppet/index' });
  };

  const handleCalm = () => {
    // 冷静了：直接去结算页看真心话（B 视角）
    Taro.redirectTo({ url: '/pages/finale/index?view=B&path=calm' });
  };

  const handleBack = () => {
    Taro.redirectTo({ url: '/pages/home/index' });
  };

  return (
    <View className={styles.container}>
      <Text className={styles.hint}>模拟 {selfName} 点开微信卡片后的体验</Text>
      <Text className={styles.title}>情绪防火墙</Text>

      <View className={styles.door}>
        <View className={classnames(styles.doorPanel, styles.doorLeft)} />
        <View className={classnames(styles.doorPanel, styles.doorRight)} />
        <View className={styles.doorGlow} />
        <View className={classnames(styles.doorKnob, styles.doorKnobLeft)} />
        <View className={classnames(styles.doorKnob, styles.doorKnobRight)} />
      </View>

      {mail ? (
        <Text className={styles.lead}>
          {partnerName}已经为你种下了一圈和解的年轮。{'\n'}
          但在看 Ta 的真心话之前，{'\n'}
          你心里是不是还有<Text className={styles.leadHighlight}>火气或苦水</Text>想一吐而快？
        </Text>
      ) : (
        <Text className={styles.empty}>
          （信箱为空，请先在 A 端生成破冰卡）{'\n'}
          你可以回到首页，从【开发】入口模拟 B 端流程
        </Text>
      )}

      <View className={styles.actions}>
        <View className={styles.btnWarm} onClick={handleStillAngry}>
          <Text>是的，我还气着 / 委屈呢</Text>
        </View>
        <View className={styles.btnGhost} onClick={handleCalm}>
          <Text>其实，我也冷静下来了</Text>
        </View>
        <View className={styles.back} onClick={handleBack}><Text>← 回到首页</Text></View>
      </View>
    </View>
  );
};

export default FirewallPage;
