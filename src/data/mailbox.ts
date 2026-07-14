// 虚拟信箱 → 云端信使三轨数据层
// sandboxScriptMode=true（H5 白金剧本）：完全本地存储
// H5+微信浏览器（动态云端）：通过 CloudBase JS SDK 读写云端 rings_messages 集合
// H5+非微信浏览器 / 真机 testMode=true（本地沙盒）：完全本地存储
// 真机 testMode=false（小程序生产）：投递到云端 rings_messages 集合（24h TTL）
import Taro from '@tarojs/taro';
import type { IceBreakMail, DesireOption, Intent, ContextSnapshot, PuppetVentLog, DistillResult } from '../types/repair';
import { deliverMail, readLatestMail, setBChoiceRecord, getBChoiceRecord } from '../utils/storage';
import { globalData } from '../appGlobal';
import { isWeChatBrowser, getH5Database } from '../utils/h5cloud';

const CLOUD_ENV_ID = 'cloud1-d4gy9bh0ff360b152';
const COLLECTION = 'rings_messages';
const TTL_MS = 24 * 60 * 60 * 1000;

/** 是否走真实云端
 *  - 小程序：始终走云端（保持原逻辑）
 *  - H5：微信浏览器 + 非沙盒模式 时走云端
 */
function useCloud(): boolean {
  if (process.env.TARO_ENV !== 'h5') {
    return true;
  }
  return isWeChatBrowser() && globalData.sandboxScriptMode !== true;
}

/** 获取数据库实例（小程序用 Taro.cloud，H5 用 CloudBase SDK） */
async function getDatabase(): Promise<any> {
  if (process.env.TARO_ENV === 'h5') {
    return await getH5Database();
  }
  return Taro.cloud.database({ env: CLOUD_ENV_ID });
}

/** 生成 6 位提取码 */
export function genMailId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Mock 加密（真机用配对密钥 AES 加密；沙盒/H5 阶段用 base64 替代）
 *  用 TextEncoder 替代已弃用的 escape/unescape，与 exif.ts 保持一致
 */
export function mockEncryptMail(plain: string): string {
  try {
    const bytes = new TextEncoder().encode(plain);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return 'CIPHER_V1:' + btoa(binary);
  } catch {
    return 'CIPHER_V1:' + plain;
  }
}

export function mockDecryptMail(cipher: string): string {
  if (!cipher || !cipher.startsWith('CIPHER_V1:')) return cipher || '';
  const body = cipher.slice('CIPHER_V1:'.length);
  try {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return body;
  }
}

/** 构造一封破冰卡密信（不投递，仅生成结构） */
function buildMail(payload: {
  fromName: string;
  toName: string;
  intent: Intent;
  emotionKeys: string[];
  rawText: string;
  desire: DesireOption;
  distilledNvc?: DistillResult;
}): IceBreakMail {
  const mailId = genMailId();
  const ciphertext = mockEncryptMail(JSON.stringify(payload));
  return {
    mailId,
    ciphertext,
    fromName: payload.fromName,
    toName: payload.toName,
    intent: payload.intent,
    emotionKeys: payload.emotionKeys,
    rawText: payload.rawText,
    desire: payload.desire,
    distilledNvc: payload.distilledNvc,
    createdAt: Date.now()
  };
}

/** 投递一封破冰卡密信
 *  - 沙盒/H5：写入本地 simulated_cloud_mailbox
 *  - 真机：fire-and-forget 异步投递云端 rings_messages（24h TTL），同时同步写本地缓存镜像
 *  同步返回 mail 对象，保证 UI 调用方签名不变
 */
export function sendIceBreakMail(payload: {
  fromName: string;
  toName: string;
  intent: Intent;
  emotionKeys: string[];
  rawText: string;
  desire: DesireOption;
  distilledNvc?: DistillResult;
}): IceBreakMail {
  const mail = buildMail(payload);
  // 本地缓存镜像（沙盒主路径 / 真机回退兜底）
  deliverMail(mail);

  if (useCloud()) {
    // 真机：异步投递云端，不阻塞 UI
    cloudDeliverMail(mail).catch((e) => {
      console.error('[Mailbox] cloud deliver failed:', e);
    });
  }
  return mail;
}

/** 真机云端投递：写入 rings_messages 集合，设置 24h TTL */
async function cloudDeliverMail(mail: IceBreakMail): Promise<void> {
  const db = await getDatabase();
  await db.collection(COLLECTION).add({
    data: {
      mailId: mail.mailId,
      encryptedData: mail.ciphertext,
      fromName: mail.fromName,
      toName: mail.toName,
      intent: mail.intent,
      expireAt: new Date(Date.now() + TTL_MS),
      createTime: new Date(mail.createdAt)
    }
  });
  console.info('[Mailbox] cloud delivered:', mail.mailId);
}

/** B 端读取最近一封信（同步签名，保持调用方不变）
 *  - 沙盒/H5：读本地缓存
 *  - 真机：读本地缓存镜像（真机首次进入需先调用 fetchMailFromCloud(mailId) 拉取云端信件写入本地缓存）
 */
export function receiveIceBreakMail(): IceBreakMail | null {
  return readLatestMail() as IceBreakMail | null;
}

/** B 端最终选择写回（本地 + 云端）
 *  - 沙盒/H5：仅写本地
 *  - 真机：写本地 + 异步更新云端 rings_messages 中对应 mailId 记录的 bChoice/status/ventLog 字段
 */
export function writeBackBChoice(payload: {
  mailId: string;
  choice: 'offline' | 'online';
  ventLog?: PuppetVentLog;
}): void {
  console.info('[Mailbox] writeBackBChoice ENTER mailId:', payload.mailId, 'choice:', payload.choice);
  try {
    // 指令10 任务 3.1：自动推导 status 字段
    const status: 'resolved_offline' | 'resolved_online' = payload.choice === 'offline' ? 'resolved_offline' : 'resolved_online';
    const record = { ...payload, status };
    setBChoiceRecord(record);
    const cloudEnabled = useCloud();
    console.info('[Mailbox] writeBackBChoice mailId:', payload.mailId, 'choice:', payload.choice, 'status:', status, 'useCloud:', cloudEnabled);
    if (cloudEnabled) {
      cloudWriteBackBChoice(record).catch((e) => {
        console.error('[Mailbox] cloud writeBack failed:', e);
      });
    }
  } catch (e) {
    console.error('[Mailbox] writeBackBChoice EXCEPTION:', e);
  }
}

/** 真机：更新云端 rings_messages 中对应 mailId 记录的 B 端选择 */
async function cloudWriteBackBChoice(payload: {
  mailId: string;
  choice: 'offline' | 'online';
  status: 'resolved_offline' | 'resolved_online';
  ventLog?: PuppetVentLog;
}): Promise<void> {
  console.info('[Mailbox] cloudWriteBackBChoice START mailId:', payload.mailId, 'choice:', payload.choice, 'status:', payload.status);
  const db = await getDatabase();
  // 查找对应 mailId 的记录并更新 bChoice/status/ventLog 字段
  const res = await db.collection(COLLECTION)
    .where({ mailId: payload.mailId })
    .limit(1)
    .get();
  console.info('[Mailbox] cloudWriteBackBChoice query count:', res.data?.length, 'for mailId:', payload.mailId);
  const doc = res.data && res.data[0];
  if (!doc || !doc._id) {
    console.warn('[Mailbox] cloud writeBack: mailId not found:', payload.mailId, '| query returned:', res.data?.length, 'records');
    return;
  }
  console.info('[Mailbox] cloudWriteBackBChoice found doc._id:', doc._id, 'current status:', (doc as any).status, 'current bChoice:', (doc as any).bChoice);
  const updateRes = await db.collection(COLLECTION).doc(String(doc._id)).update({
    data: {
      bChoice: payload.choice,
      status: payload.status,
      ventLog: payload.ventLog || null,
      bChoiceAt: new Date()
    }
  });
  console.info('[Mailbox] cloud writeBack DONE mailId:', payload.mailId, '| stats.updated:', (updateRes as any)?.stats?.updated, '| choice:', payload.choice, '| status:', payload.status);
}

/** 真机：从云端拉取 B 端选择（A 端进入 finale 时调用）
 *  拉取成功后写入本地缓存，供后续同步读取
 */
export async function fetchBChoiceFromCloud(mailId: string): Promise<{ choice: 'offline' | 'online'; status?: 'resolved_offline' | 'resolved_online'; ventLog?: PuppetVentLog } | null> {
  if (!useCloud()) {
    // 沙盒：直接读本地
    const local = getBChoiceRecord();
    return local ? { choice: local.choice, status: local.status, ventLog: local.ventLog } : null;
  }
  try {
    const db = await getDatabase();
    const res = await db.collection(COLLECTION)
      .where({ mailId })
      .limit(1)
      .get();
    const doc = res.data && res.data[0];
    if (!doc || !doc.bChoice) {
      return null;
    }
    const record = {
      mailId,
      choice: doc.bChoice as 'offline' | 'online',
      status: doc.status as 'resolved_offline' | 'resolved_online' | undefined,
      ventLog: doc.ventLog || undefined
    };
    setBChoiceRecord(record);
    return { choice: record.choice, status: record.status, ventLog: record.ventLog };
  } catch (e) {
    console.error('[Mailbox] fetchBChoiceFromCloud failed:', e);
    return null;
  }
}

/** 直接从云端查询 B 端选择状态（绕过 useCloud，A 端 finale 主动反查）
 *  指令11 任务二：A 端进入结算页时强制发起云端读取，不受 test_mode 短路
 */
export async function fetchBStatusDirect(mailId: string): Promise<{ status?: 'resolved_offline' | 'resolved_online'; choice?: 'offline' | 'online' } | null> {
  if (!useCloud()) {
    // 非云端模式：读本地
    const local = getBChoiceRecord();
    return local ? { status: local.status, choice: local.choice } : null;
  }
  try {
    const db = await getDatabase();
    const res = await db.collection(COLLECTION)
      .where({ mailId })
      .limit(1)
      .get();
    const doc = res.data && res.data[0];
    if (!doc) return null;
    return {
      status: doc.status as 'resolved_offline' | 'resolved_online' | undefined,
      choice: doc.bChoice as 'offline' | 'online' | undefined
    };
  } catch (e) {
    console.error('[Mailbox] fetchBStatusDirect failed:', e);
    return null;
  }
}

/** 从 IceBreakMail 提取 ContextSnapshot（A 端全套状态快照） */
export function extractContextSnapshot(mail: IceBreakMail): ContextSnapshot {
  return {
    intent: mail.intent,
    emotionKeys: mail.emotionKeys,
    rawText: mail.rawText,
    desire: mail.desire,
    distilledNvc: mail.distilledNvc,
    fromName: mail.fromName,
    toName: mail.toName
  };
}

/** 真机模式：凭 mailId 从云端 rings_messages 拉取信件，解密后写入本地缓存并返回
 *  供真机双设备场景（B 端通过扫码/输入提取码拿到 mailId）使用
 */
export async function fetchMailFromCloud(mailId: string): Promise<IceBreakMail | null> {
  if (!useCloud()) {
    // 沙盒模式直接读本地
    return readLatestMail() as IceBreakMail | null;
  }
  try {
    const db = await getDatabase();
    const res = await db
      .collection(COLLECTION)
      .where({ mailId })
      .limit(1)
      .get();
    const doc = res.data && res.data[0];
    if (!doc) {
      console.warn('[Mailbox] cloud mail not found:', mailId);
      return null;
    }
    const plain = mockDecryptMail(doc.encryptedData || '');
    const payload = JSON.parse(plain) as {
      fromName: string;
      toName: string;
      intent: Intent;
      emotionKeys: string[];
      rawText: string;
      desire: DesireOption;
      distilledNvc?: DistillResult;
    };
    const mail: IceBreakMail = {
      mailId: doc.mailId,
      ciphertext: doc.encryptedData,
      fromName: payload.fromName,
      toName: payload.toName,
      intent: payload.intent,
      emotionKeys: payload.emotionKeys,
      rawText: payload.rawText,
      desire: payload.desire,
      distilledNvc: payload.distilledNvc,
      createdAt: doc.createTime ? new Date(doc.createTime).getTime() : Date.now()
    };
    // 写入本地缓存镜像，B 端后续 receiveIceBreakMail 可同步读取
    deliverMail(mail);
    console.info('[Mailbox] cloud mail fetched:', mailId);
    return mail;
  } catch (e) {
    console.error('[Mailbox] fetchMailFromCloud failed:', e);
    return null;
  }
}
