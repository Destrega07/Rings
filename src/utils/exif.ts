// EXIF 图片属性读写模拟（为后期换手机迁移年轮记录预留）
// 真机将加密 JSON 写入图片自定义 EXIF 标签；本沙盒阶段以本地存储 Mock
import Taro from '@tarojs/taro';
import { STORAGE_KEYS } from './storage';

interface ExifPayload {
  version: string;
  pairingKey: string;
  exportedAt: number;
  ringsLog: any[];
}

/**
 * 模拟「将年轮记录加密写入图片 EXIF 自定义标签」
 * 真机：用 canvas 生成年轮图片 → 写入 EXIF UserComment
 * 沙盒：将加密 JSON 存入本地，返回 Mock 的图片路径
 */
export async function exportRingsToPhoto(ringsLog: any[]): Promise<{ photoPath: string; cipher: string }> {
  const payload: ExifPayload = {
    version: '1.0.0',
    pairingKey: 'rings_mock_pair_key_2026',
    exportedAt: Date.now(),
    ringsLog
  };
  // Mock 加密：base64（真机用 AES + 配对密钥）
  const cipher = mockEncrypt(JSON.stringify(payload));
  const photoPath = `mock://rings_photo_${Date.now()}.jpg`;
  Taro.setStorageSync(STORAGE_KEYS.EXIF_PHOTO, { photoPath, cipher });
  console.info('[EXIF] export simulated:', photoPath);
  return { photoPath, cipher };
}

/**
 * 模拟「从相册图片读取 EXIF 加密数据 → 解密 → 还原年轮记录」
 */
export async function importRingsFromPhoto(): Promise<ExifPayload | null> {
  const stored = Taro.getStorageSync(STORAGE_KEYS.EXIF_PHOTO) || null;
  if (!stored) {
    console.warn('[EXIF] no mock photo to import');
    return null;
  }
  try {
    const json = mockDecrypt(stored.cipher);
    const payload = JSON.parse(json) as ExifPayload;
    console.info('[EXIF] import simulated:', payload.ringsLog.length, 'entries');
    return payload;
  } catch (e) {
    console.error('[EXIF] import failed:', e);
    return null;
  }
}

// Mock 加密（base64 + 前缀，仅沙盒用）
// 用 TextEncoder/TextDecoder 处理 UTF-8↔base64，替代已弃用的 escape/unescape
function mockEncrypt(plain: string): string {
  try {
    const bytes = new TextEncoder().encode(plain);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return 'RINGS_MOCK_V1:' + btoa(binary);
  } catch {
    return 'RINGS_MOCK_V1:' + plain;
  }
}

function mockDecrypt(cipher: string): string {
  if (cipher.startsWith('RINGS_MOCK_V1:')) {
    const body = cipher.slice('RINGS_MOCK_V1:'.length);
    try {
      const binary = atob(body);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    } catch {
      return body;
    }
  }
  return cipher;
}
