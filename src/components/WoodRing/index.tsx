// 年轮同心圆装饰组件（纯 CSS 绘制）
import React from 'react';
import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';

interface WoodRingProps {
  /** 是否触发终极生长发光 */
  finale?: boolean;
  /** 尺寸 rpx */
  size?: number;
}

const WoodRing: React.FC<WoodRingProps> = ({ finale = false, size = 320 }) => {
  const pxSize = Taro.pxTransform(size);
  return (
    <View
      className={classnames(styles.ringWrap, finale && styles.finale)}
      style={{ width: pxSize, height: pxSize }}
    >
      <View className={styles.ring1} />
      <View className={styles.ring2} />
      <View className={styles.ring3} />
      <View className={styles.ring4} />
      <View className={styles.ring5} />
      <View className={styles.core} />
    </View>
  );
};

export default WoodRing;
