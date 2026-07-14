// 路由分发页：onLoad 拦截 mock_role 参数，分发到 A/B 端
import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { globalData } from '../../appGlobal';
import styles from './index.module.scss';

interface IndexPageProps {}

const IndexPage: React.FC<IndexPageProps> = () => {
  const router = useRouter();

  React.useEffect(() => {
    const { mock_role, test_mode, emotion, mail_id } = router.params;
    // 写入全局测试开关
    globalData.testMode = test_mode === 'true';
    globalData.mockRole = (mock_role === 'B' ? 'B' : mock_role === 'A' ? 'A' : null);
    globalData.mockEmotion = emotion || null;

    console.info('[Router] dispatch params:', { mock_role, test_mode, emotion, mail_id });

    if (mock_role === 'B') {
      // B 端：进入木门防火墙
      Taro.redirectTo({ url: '/pages/firewall/index' });
    } else if (mock_role === 'A') {
      // A 端：进入修复流程
      Taro.redirectTo({ url: '/pages/repair/index' });
    } else {
      // 无参数：默认进入首页（家）
      Taro.switchTab({ url: '/pages/home/index' });
    }
  }, [router.params]);

  return (
    <View className={styles.container}>
      <Text className={styles.loading}>年轮正在展开…</Text>
    </View>
  );
};

export default IndexPage;
