// 首页（家）：双生树 + 发起修复入口 + 和好指南入口
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import WoodRing from '../../components/WoodRing';
import { getPairing, readLatestMail, setPairingRole, STORAGE_KEYS } from '../../utils/storage';
import { fetchBStatusDirect } from '../../data/mailbox';
import { globalData } from '../../appGlobal';
import styles from './index.module.scss';

type ResponseChannel = 'none' | 'offline' | 'online';

// H5 环境标识
const isH5 = process.env.TARO_ENV === 'h5';

// 白金剧本前置词（A 端 Step 3 录入语料默认填充）
const SANDBOX_DEFAULT_RAW = '昨天月亮发烧，我下班回家只顾着准备第二天开会的PPT，忘了去关心她。结果，写好PPT时，月亮已烧到40度。我边送她去医院边听她骂我把工作看得比她的命还重要。然后就生我气，不理我了。';

const HomePage: React.FC = () => {
  const pairing = getPairing();
  const selfName = pairing?.selfName || '林向阳';
  const partnerName = pairing?.partnerName || '沈月亮';
  const angelName = pairing?.angelName || '心晴';

  // 指令14 任务二：反查云端 status，互斥显示线下聊/线上聊两条入口
  const [responseChannel, setResponseChannel] = useState<ResponseChannel>('none');
  const [pendingMailId, setPendingMailId] = useState('');
  const [checking, setChecking] = useState(false);

  // H5 Demo：环境检测分流弹窗（仅 H5 首次进入触发）
  const [showEnvPopup, setShowEnvPopup] = useState(false);
  // 模式指示器：H5 Demo 统一为白金剧本模式
  const [modeLabel, setModeLabel] = useState<string>('白金剧本');

  const checkPending = useCallback(async () => {
    const mail = readLatestMail();
    if (!mail) {
      setResponseChannel('none');
      console.info('[Home] no mail found, skip status check');
      return;
    }
    setPendingMailId(mail.mailId || '');
    setChecking(true);
    console.info('[Home] checking B status for mailId:', mail.mailId);
    const status = await fetchBStatusDirect(mail.mailId);
    console.info('[Home] B status result:', JSON.stringify(status));
    if (status?.status === 'resolved_offline') {
      setResponseChannel('offline');
    } else if (status?.status === 'resolved_online') {
      setResponseChannel('online');
    } else {
      setResponseChannel('none');
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    checkPending();
    // H5 Demo：首次进入首页检测环境选择状态，未选择则弹窗
    if (isH5) {
      try {
        const envChosen = sessionStorage.getItem('rings_env_chosen');
        if (!envChosen) {
          setShowEnvPopup(true);
        }
      } catch (e) {
        console.warn('[Home] sessionStorage read failed:', e);
      }
    }
  }, [checkPending]);

  // 指令14 修复：tabBar 页面切换回来时重新查询云端 status
  useDidShow(() => {
    checkPending();
  });

  const handleStartRepair = () => {
    Taro.navigateTo({ url: '/pages/repair/index' });
  };

  // 通道一：线下聊 → 跳转 finale（和好指南）
  const handleCheckOfflineGuide = () => {
    Taro.navigateTo({ url: '/pages/finale/index?view=A' });
  };

  // 通道二：线上聊 → 跳转 chat_sandbox（双端聊天入口）
  const handleCheckOnlineChat = () => {
    if (!pendingMailId) {
      Taro.showToast({ title: '缺少信件 ID', icon: 'none' });
      return;
    }
    Taro.navigateTo({ url: `/pages/chat_sandbox/index?mailId=${pendingMailId}&view=A` });
  };

  // 开发者测试入口：直接以 B 端情绪参数进入
  const handleDevTest = () => {
    Taro.redirectTo({
      url: '/pages/index/index?mock_role=B&test_mode=true&emotion=anger'
    });
  };

  // ============ H5 Demo：环境告示弹窗"我已知晓"按钮处理 ============
  // 单按钮模式：强制开启白金剧本，记录环境标记，关闭弹窗
  const handleAcknowledge = () => {
    try {
      sessionStorage.setItem('rings_env_chosen', 'sandbox');
      // 将白金剧本前置词存入 sessionStorage，供 repair 页 Step 3 读取默认填充
      sessionStorage.setItem('rings_sandbox_default_raw', SANDBOX_DEFAULT_RAW);
    } catch (e) {
      console.warn('[Home] sessionStorage write failed:', e);
    }
    globalData.sandboxScriptMode = true;
    setModeLabel('白金剧本');
    setShowEnvPopup(false);
    console.info('[Sandbox] 白金剧本模式已激活');
  };

  // ============ H5 Demo：评审工具栏行为（单设备切换 A/B 端） ============
  // 切换到 A 端：覆写 role 为 A，回到首页
  const switchToA = () => {
    setPairingRole('A');
    globalData.mockRole = 'A';
    Taro.redirectTo({ url: '/pages/home/index' });
  };

  // 切换到 B 端：覆写 role 为 B，跳转 firewall（情绪防火墙）模拟 B 端收卡入口
  const switchToB = () => {
    setPairingRole('B');
    globalData.mockRole = 'B';
    Taro.redirectTo({ url: '/pages/firewall/index' });
  };

  // 重置流程：二次确认后清除本地缓存与对话历史
  const resetFlow = () => {
    if (typeof window !== 'undefined' && !window.confirm('确定重置？将清除所有本地缓存与对话历史。')) {
      return;
    }
    try {
      Taro.removeStorageSync(STORAGE_KEYS.MAILBOX);
      Taro.removeStorageSync(STORAGE_KEYS.B_CHOICE);
      Taro.removeStorageSync(STORAGE_KEYS.VENT_LOG);
      Taro.removeStorageSync(STORAGE_KEYS.CHAT_RESET);
      console.info('[Home] flow reset, local cache cleared');
    } catch (e) {
      console.warn('[Home] resetFlow storage clear failed:', e);
    }
    Taro.redirectTo({ url: '/pages/home/index' });
  };

  // 重新查看环境告示：清除 sessionStorage 环境标记，重新触发弹窗
  const reselectEnv = () => {
    try {
      sessionStorage.removeItem('rings_env_chosen');
      sessionStorage.removeItem('rings_sandbox_default_raw');
    } catch (e) {
      console.warn('[Home] sessionStorage clear failed:', e);
    }
    setShowEnvPopup(true);
  };

  return (
    <View className={styles.container}>
      <View className={styles.brand}>
        <Text className={styles.brandTitle}>年 轮</Text>
        <Text className={styles.brandSub}>
          给爱情一圈年轮{'\n'}在年轮里，找回我们抱在一起取暖的轮廓
        </Text>
      </View>

      <View className={styles.treeWrap}>
        <View className={styles.tree}>
          <WoodRing size={320} />
        </View>
      </View>

      {/* 指令14 任务二：线下聊 / 线上聊互斥按钮（严格 if-else 隔离） */}
      {responseChannel === 'offline' && (
        <View className={styles.guideCard} onClick={handleCheckOfflineGuide}>
          <Text className={styles.guideCardIcon}>✦</Text>
          <Text className={styles.guideCardText}>Ta给出回应啦，快看和好指南✦</Text>
        </View>
      )}
      {responseChannel === 'online' && (
        <View className={styles.guideCard} onClick={handleCheckOnlineChat}>
          <Text className={styles.guideCardIcon}>✦</Text>
          <Text className={styles.guideCardText}>Ta给出回应啦，快看✦</Text>
        </View>
      )}
      {/* 等待状态：B 端还没选择，或云端 status 还没写入，提供手动刷新入口 */}
      {responseChannel === 'none' && pendingMailId && !checking && (
        <View className={styles.guideCard} onClick={() => checkPending()}>
          <Text className={styles.guideCardIcon}>⟳</Text>
          <Text className={styles.guideCardText}>看看 Ta 是否有回应…</Text>
        </View>
      )}
      {checking && (
        <View className={styles.guideCard}>
          <Text className={styles.guideCardIcon}>⟳</Text>
          <Text className={styles.guideCardText}>{angelName}正在帮你查看…</Text>
        </View>
      )}

      <View className={styles.pairCard}>
        <Text className={styles.pairTitle}>你们的双生树</Text>
        <Text className={styles.pairDesc}>
          {angelName}正在守护你们的爱情双生树。当风雨来临，Ta 会陪你们听见彼此。
        </Text>
        <View className={styles.pairNames}>
          <Text className={styles.nameTag}>{selfName}</Text>
          <Text className={styles.link}>❀</Text>
          <Text className={styles.nameTag}>{partnerName}</Text>
        </View>
      </View>

      <View className={styles.actions}>
        <View className={styles.btnPrimary} onClick={handleStartRepair}>
          <Text>我们现在，吵了一架…</Text>
        </View>
        <View className={styles.btnGhost} onClick={handleDevTest}>
          <Text>【开发】模拟 B 端收卡</Text>
        </View>
      </View>

      <View className={styles.devEntry}>
        <View className={styles.devDot} />
        <Text>当前为本地沙盒模式，数据 100% 锁在你手机里</Text>
      </View>

      <Text className={styles.toastHint}>
        所有对话数据仅储存在各自手机里{'\n'}云端不留一丝痕迹
      </Text>

      {/* ============ H5 Demo：环境告示弹窗（单按钮已知晓） ============ */}
      {isH5 && showEnvPopup && (
        <View className={styles.envMask}>
          <View className={styles.envModal}>
            <Text className={styles.envTitle}>✦ 接入年轮生长空间</Text>
            <Text className={styles.envBody}>
              尊敬的评委：作品的微信小程序尚未上线，暂用 H5 展示 Demo。由于微信云开发的安全鉴权限制，无法从 H5 页面调用云函数，故只能在 Demo 中安排了"预彩排剧本"（非 LLM 实时生成），同时也【预赛作品提交帖子】中附上短视频展示小程序调用 LLM 提供用户体验的能力。
            </Text>
            <View className={styles.envBtnRow}>
              <View className={styles.envBtnPrimary} onClick={handleAcknowledge}>
                <Text>我已知晓</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ============ H5 Demo：评审工具栏（单设备切换 A/B 端） ============ */}
      {isH5 && !showEnvPopup && (
        <View className={styles.reviewToolbar}>
          <View className={styles.toolbarHeader}>
            <Text>评审工具</Text>
          </View>
          <View className={styles.toolbarBtn} onClick={switchToA}>
            <Text className={styles.toolbarBtnMain}>切换到 A 端</Text>
            <Text className={styles.toolbarBtnSub}>向阳·发起修复</Text>
          </View>
          <View className={styles.toolbarBtn} onClick={switchToB}>
            <Text className={styles.toolbarBtnMain}>切换到 B 端</Text>
            <Text className={styles.toolbarBtnSub}>月亮·收卡回应</Text>
          </View>
          <View className={styles.toolbarBtn} onClick={resetFlow}>
            <Text className={styles.toolbarBtnMain}>重置流程</Text>
            <Text className={styles.toolbarBtnSub}>清除本地缓存</Text>
          </View>
          <View className={styles.toolbarBtnGhost} onClick={reselectEnv}>
            <Text className={styles.toolbarBtnMain}>重新查看告示</Text>
          </View>
          <View className={styles.modeIndicator}>
            <Text>模式：{modeLabel}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default HomePage;
