// 我的（tabBar）：配对信息 + 隐私说明 + EXIF 导出/导入 + 测试模式提示
import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getPairing, initLocalCache, STORAGE_KEYS } from '../../utils/storage';
import { exportRingsToPhoto, importRingsFromPhoto } from '../../utils/exif';
import styles from './index.module.scss';

const MinePage: React.FC = () => {
  initLocalCache();
  const pairing = getPairing();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // EXIF 导出：将年轮记录加密写入 Mock 图片
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const ringsLog = Taro.getStorageSync(STORAGE_KEYS.RINGS_LOG) || [];
      if (ringsLog.length === 0) {
        Taro.showToast({ title: '还没有年轮可导出', icon: 'none' });
        return;
      }
      const { photoPath } = await exportRingsToPhoto(ringsLog);
      console.info('[Mine] export done:', photoPath);
      Taro.showModal({
        title: '年轮已加密导出',
        content: `共 ${ringsLog.length} 圈年轮已加密写入图片（沙盒 Mock）。\n\n真机版会把加密数据写入图片 EXIF 自定义标签，保存到相册。换手机时只需选这张图片即可还原所有年轮。`,
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#8C6239'
      });
    } catch (e) {
      console.error('[Mine] export failed:', e);
      Taro.showToast({ title: '导出失败', icon: 'none' });
    } finally {
      setExporting(false);
    }
  };

  // EXIF 导入：从 Mock 图片读取加密数据 → 还原年轮记录
  const handleImport = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const payload = await importRingsFromPhoto();
      if (!payload) {
        Taro.showToast({ title: '没有可导入的年轮图片', icon: 'none' });
        return;
      }
      const existing = Taro.getStorageSync(STORAGE_KEYS.RINGS_LOG) || [];
      const merged = [...existing, ...payload.ringsLog];
      Taro.setStorageSync(STORAGE_KEYS.RINGS_LOG, merged);
      console.info('[Mine] import done, total:', merged.length);
      Taro.showModal({
        title: '年轮已还原',
        content: `从图片还原了 ${payload.ringsLog.length} 圈年轮。\n当前共有 ${merged.length} 圈年轮记录。`,
        showCancel: false,
        confirmText: '去查看',
        confirmColor: '#8C6239',
        success: (res) => {
          if (res.confirm) {
            Taro.switchTab({ url: '/pages/rings/index' });
          }
        }
      });
    } catch (e) {
      console.error('[Mine] import failed:', e);
      Taro.showToast({ title: '导入失败', icon: 'none' });
    } finally {
      setImporting(false);
    }
  };

  const handleClearLocal = () => {
    Taro.showModal({
      title: '清空本地数据',
      content: '会清除所有年轮记录、密信与配对信息，无法恢复。',
      confirmText: '清空',
      confirmColor: '#8C6239',
      success: (res) => {
        if (res.confirm) {
          Taro.clearStorageSync();
          initLocalCache();
          Taro.showToast({ title: '已清空', icon: 'success' });
          setTimeout(() => Taro.reLaunch({ url: '/pages/home/index' }), 800);
        }
      }
    });
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <View className={styles.avatar}>{pairing?.selfName?.[0] || '我'}</View>
        <Text className={styles.name}>{pairing?.selfName || '我'}</Text>
        <Text className={styles.pair}>与 {pairing?.partnerName} 的双生树</Text>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>守护小天使</Text>
        <View className={styles.card}>
          <View className={styles.cardRow}>
            <Text className={styles.cardLabel}>小天使命名</Text>
            <Text className={styles.cardValue}>{pairing?.angelName || '心晴'}</Text>
          </View>
          <View className={styles.cardRow}>
            <Text className={styles.cardLabel}>配对密钥</Text>
            <Text className={styles.cardValue}>{pairing?.pairingKey?.slice(-8) || '—'}</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>数据隐私</Text>
        <View className={styles.privacyCard}>
          <Text className={styles.privacyTitle}>100% 锁在你手机里</Text>
          <Text className={styles.privacyText}>· 所有对话、原始语料、NVC 真心话仅储存在你的本地缓存。</Text>
          <Text className={styles.privacyText}>· 云端不留下任何原始数据，仅有你主动投递的破冰卡密信（一次性阅后即焚）。</Text>
          <Text className={styles.privacyText}>· 你可随时清空所有本地记录，软件无法恢复。</Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>换手机迁移（EXIF 加密）</Text>
        <View className={styles.card}>
          <View className={styles.cardRow}>
            <Text className={styles.cardLabel}>导出年轮到图片</Text>
            <Text className={styles.cardAction} onClick={handleExport}>
              {exporting ? '导出中…' : '导出 →'}
            </Text>
          </View>
          <View className={styles.cardRow}>
            <Text className={styles.cardLabel}>从图片导入年轮</Text>
            <Text className={styles.cardAction} onClick={handleImport}>
              {importing ? '导入中…' : '导入 →'}
            </Text>
          </View>
        </View>
        <Text className={styles.migrateHint}>
          真机版会把年轮记录加密写入图片 EXIF 标签，换手机时选图即可还原。
        </Text>
      </View>

      <View className={styles.testMode}>
        <Text>当前为本地沙盒模式 · Mock 数据已就绪</Text>
      </View>

      <View className={styles.btn} onClick={handleClearLocal}>
        <Text>清空本地所有数据</Text>
      </View>

      <View className={styles.footer}>
        <Text>年轮 v1.0 · 给爱情一圈年轮{'\n'}愿你们的爱情双生树长青</Text>
      </View>
    </View>
  );
};

export default MinePage;
