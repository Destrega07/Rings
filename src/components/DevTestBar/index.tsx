// 开发者测试浮窗：A 端生成破冰卡后弹出，一键模拟 B 端点开
import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';

interface DevTestBarProps {
  visible: boolean;
  mailId?: string;
  /** 点击模拟 B 端：携带 mock_role=B 参数重新载入 */
  onSimulateB?: () => void;
}

const DevTestBar: React.FC<DevTestBarProps> = ({ visible, mailId, onSimulateB }) => {
  if (!visible) return null;

  const handleSimulate = () => {
    if (onSimulateB) {
      onSimulateB();
      return;
    }
    // 默认行为：重新打开 index 路由分发页，带 B 端参数
    Taro.redirectTo({
      url: `/pages/index/index?mock_role=B&test_mode=true${mailId ? `&mail_id=${mailId}` : ''}`
    });
  };

  return (
    <View className={classnames(styles.bar)}>
      <View className={styles.body}>
        <Text className={styles.title}>【开发者测试浮窗】</Text>
        <Text className={styles.desc}>
          A 端破冰卡已生成{mailId ? `（提取码 ${mailId}）` : ''}，已写入本地虚拟信箱。
        </Text>
        <Text className={styles.desc}>点击下方按钮，一键模拟 B 端点开该卡片。</Text>
      </View>
      <View className={styles.btn} onClick={handleSimulate}>
        <Text className={styles.btnText}>模拟 B 端点开卡片 →</Text>
      </View>
    </View>
  );
};

export default DevTestBar;
