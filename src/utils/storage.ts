// 本地存储封装：100% 数据锁本地
import Taro from '@tarojs/taro';

export const STORAGE_KEYS = {
  PAIRING: 'rings_pairing',           // 配对信息（Mock）
  MAILBOX: 'simulated_cloud_mailbox', // 虚拟信使信箱
  RINGS_LOG: 'rings_history_log',     // 年轮历史记录
  VENT_LOG: 'rings_vent_log',         // B 端木偶宣泄记录
  FINALE_FLAG: 'rings_finale_flag',   // 结算页已展示标记（次日触发反馈）
  EXIF_PHOTO: 'rings_exif_photo_mock', // EXIF 年轮图片 Mock
  B_CHOICE: 'rings_b_choice',         // B 端最终选择记录（写回云端 + 本地镜像）
  CHAT_RESET: 'rings_chat_reset'      // 聊天历史重置标记（清空历史时写入）
} as const;

/** 初始化本地缓存（首启预留结构） */
export function initLocalCache(): void {
  try {
    const pairing = Taro.getStorageSync(STORAGE_KEYS.PAIRING);
    if (!pairing) {
      // A 端发起修复流程，默认 role 为 'A'；B 端通过模拟入口进入时由调用方覆写为 'B'
      Taro.setStorageSync(STORAGE_KEYS.PAIRING, {
        paired: true,
        pairingKey: 'rings_mock_pair_key_2026',
        selfName: '林向阳',
        partnerName: '沈月亮',
        angelName: '心晴',
        role: 'A',
        createdAt: Date.now()
      });
    }
    if (!Taro.getStorageSync(STORAGE_KEYS.MAILBOX)) {
      Taro.setStorageSync(STORAGE_KEYS.MAILBOX, [] as any[]);
    }
    if (!Taro.getStorageSync(STORAGE_KEYS.RINGS_LOG)) {
      Taro.setStorageSync(STORAGE_KEYS.RINGS_LOG, [] as any[]);
    }
    console.info('[Storage] local cache initialized');
  } catch (e) {
    console.error('[Storage] init failed:', e);
  }
}

/** 确保 Mock 配对就绪（指令 2.1 要求） */
export function ensurePairingMock(): void {
  try {
    const p = Taro.getStorageSync(STORAGE_KEYS.PAIRING);
    if (!p || !p.paired) {
      initLocalCache();
    }
  } catch (e) {
    console.error('[Storage] ensurePairingMock failed:', e);
  }
}

/** 读取配对信息 */
export function getPairing() {
  return Taro.getStorageSync(STORAGE_KEYS.PAIRING) || null;
}

/** 投递破冰卡密信到虚拟信箱 */
export function deliverMail(mail: any): void {
  const box = Taro.getStorageSync(STORAGE_KEYS.MAILBOX) || [];
  box.push(mail);
  Taro.setStorageSync(STORAGE_KEYS.MAILBOX, box);
  console.info('[Mailbox] delivered:', mail.mailId);
}

/** 读取最近一封密信（B 端承接） */
export function readLatestMail(): any | null {
  const box = Taro.getStorageSync(STORAGE_KEYS.MAILBOX) || [];
  return box.length ? box[box.length - 1] : null;
}

/** 追加年轮历史记录 */
export function appendRingsLog(entry: any): void {
  const log = Taro.getStorageSync(STORAGE_KEYS.RINGS_LOG) || [];
  log.push({ ...entry, at: Date.now() });
  Taro.setStorageSync(STORAGE_KEYS.RINGS_LOG, log);
}

/** 追加 B 端宣泄记录 */
export function appendVentLog(log: any): void {
  const arr = Taro.getStorageSync(STORAGE_KEYS.VENT_LOG) || [];
  arr.push({ ...log, at: Date.now() });
  Taro.setStorageSync(STORAGE_KEYS.VENT_LOG, arr);
}

/** 标记结算页已展示（次日触发反馈打赏） */
export function markFinaleShown(): void {
  Taro.setStorageSync(STORAGE_KEYS.FINALE_FLAG, { shownAt: Date.now() });
}

/** 读取结算页标记 */
export function getFinaleFlag(): { shownAt: number } | null {
  return Taro.getStorageSync(STORAGE_KEYS.FINALE_FLAG) || null;
}

/** 清除结算页标记 */
export function clearFinaleFlag(): void {
  Taro.removeStorageSync(STORAGE_KEYS.FINALE_FLAG);
}

/** 写入 B 端最终选择（本地镜像，云端写回由 mailbox.ts 处理） */
export function setBChoiceRecord(record: any): void {
  Taro.setStorageSync(STORAGE_KEYS.B_CHOICE, { ...record, at: Date.now() });
}

/** 同步读取 B 端最终选择（本地缓存）
 *  真机首次进入 A 视角时本地为空，需先调用 fetchBChoiceFromCloud 异步拉取 */
export function getBChoiceRecord(): any | null {
  return Taro.getStorageSync(STORAGE_KEYS.B_CHOICE) || null;
}

/** 读取 B 端宣泄记录（供 generate_insight 合流） */
export function getLatestVentLog(): any | null {
  const arr = Taro.getStorageSync(STORAGE_KEYS.VENT_LOG) || [];
  return arr.length ? arr[arr.length - 1] : null;
}

/** 写入聊天历史重置标记（清空历史时调用，防止本地旧缓存残留干扰下一次测试） */
export function setChatResetFlag(mailId: string): void {
  Taro.setStorageSync(STORAGE_KEYS.CHAT_RESET, { mailId, resetAt: Date.now() });
}

/** 读取聊天历史重置标记 */
export function getChatResetFlag(): { mailId: string; resetAt: number } | null {
  return Taro.getStorageSync(STORAGE_KEYS.CHAT_RESET) || null;
}

/** 清除聊天历史重置标记 */
export function clearChatResetFlag(): void {
  Taro.removeStorageSync(STORAGE_KEYS.CHAT_RESET);
}

/** 写入 B 端角色标记（B 端通过模拟入口/扫码进入时调用，覆写默认 'A'） */
export function setPairingRole(role: 'A' | 'B'): void {
  const p = Taro.getStorageSync(STORAGE_KEYS.PAIRING);
  if (p) {
    Taro.setStorageSync(STORAGE_KEYS.PAIRING, { ...p, role });
  }
}
