// H5 云开发 SDK 适配层
// 在微信浏览器中通过 CloudBase JS SDK 实现云函数调用
// 非微信浏览器或 SDK 加载失败时，上层走本地 mock 兜底

const CLOUD_ENV_ID = 'cloud1-d4gy9bh0ff360b152';
const CLOUDBASE_SDK_URL = 'https://imgcache.qq.com/qcloud/tcbjs/1.7.2/tcb.js';

let cloudApp: any = null;
let initPromise: Promise<void> | null = null;
let h5CloudReady = false;

/** 检测是否在微信浏览器中（UA 包含 MicroMessenger） */
export function isWeChatBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isWX = /MicroMessenger/i.test(ua);
  // 诊断日志：仅在首次调用时打印 UA
  if (typeof window !== 'undefined' && !(window as any).__rings_ua_logged) {
    (window as any).__rings_ua_logged = true;
    console.info('[H5Cloud] UA:', ua, '| isWeChatBrowser:', isWX);
  }
  return isWX;
}

/** 动态加载 CloudBase JS SDK（CDN 注入） */
function loadSDK(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('window not available'));
      return;
    }
    const w = window as any;
    if (w.tcb) {
      console.info('[H5Cloud] SDK already loaded (window.tcb exists)');
      resolve(w.tcb);
      return;
    }
    const existing = document.querySelector(`script[src="${CLOUDBASE_SDK_URL}"]`);
    if (existing) {
      console.info('[H5Cloud] SDK script tag exists, waiting for load...');
      existing.addEventListener('load', () => {
        if (w.tcb) {
          console.info('[H5Cloud] SDK loaded via existing script');
          resolve(w.tcb);
        } else {
          console.error('[H5Cloud] SDK script loaded but window.tcb missing');
          reject(new Error('CloudBase SDK loaded but tcb not found'));
        }
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load CloudBase SDK (existing script)')));
      return;
    }
    console.info('[H5Cloud] injecting SDK script from CDN:', CLOUDBASE_SDK_URL);
    const script = document.createElement('script');
    script.src = CLOUDBASE_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (w.tcb) {
        console.info('[H5Cloud] SDK loaded successfully');
        resolve(w.tcb);
      } else {
        console.error('[H5Cloud] SDK script onload fired but window.tcb missing');
        reject(new Error('CloudBase SDK loaded but tcb not found'));
      }
    };
    script.onerror = (e) => {
      console.error('[H5Cloud] SDK script onerror:', e);
      reject(new Error('Failed to load CloudBase SDK'));
    };
    document.head.appendChild(script);
  });
}

/** 初始化 H5 云开发 SDK（加载 SDK + 匿名登录） */
export async function initH5Cloud(): Promise<void> {
  if (h5CloudReady) {
    console.info('[H5Cloud] initH5Cloud skipped (already ready)');
    return;
  }
  if (initPromise) {
    console.info('[H5Cloud] initH5Cloud awaiting existing init promise');
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      console.info('[H5Cloud] init start, envId:', CLOUD_ENV_ID);
      const tcb = await loadSDK();
      console.info('[H5Cloud] tcb.init() with env:', CLOUD_ENV_ID);
      const app = tcb.init({ env: CLOUD_ENV_ID });
      const auth = app.auth();
      console.info('[H5Cloud] signing in anonymously...');
      await auth.signInAnonymously();
      cloudApp = app;
      h5CloudReady = true;
      console.info('[H5Cloud] initialized OK, anonymous auth success');
    } catch (e) {
      console.error('[H5Cloud] init failed:', e);
      h5CloudReady = false;
      throw e;
    }
  })();

  await initPromise;
}

/** H5 调用云函数（懒初始化，首次调用时自动 init） */
export async function h5CallFunction(name: string, data: Record<string, any>): Promise<any> {
  console.info('[H5Cloud] callFunction start:', name, '| data:', JSON.stringify(data).slice(0, 500));
  if (!h5CloudReady) {
    console.info('[H5Cloud] not ready, calling initH5Cloud first');
    await initH5Cloud();
  }
  if (!cloudApp) {
    console.error('[H5Cloud] callFunction aborted: cloudApp is null after init');
    throw new Error('Cloud SDK not initialized');
  }
  try {
    const res = await cloudApp.callFunction({ name, data });
    console.info('[H5Cloud] callFunction OK:', name, '| result:', JSON.stringify(res).slice(0, 500));
    return res.result;
  } catch (e) {
    console.error('[H5Cloud] callFunction FAILED:', name, '| error:', e);
    throw e;
  }
}

/** H5 云端是否已就绪 */
export function isH5CloudReady(): boolean {
  return h5CloudReady;
}

/** 获取 H5 云数据库实例（需先 initH5Cloud） */
export async function getH5Database(): Promise<any> {
  if (!h5CloudReady) {
    await initH5Cloud();
  }
  if (!cloudApp) {
    throw new Error('Cloud SDK not initialized');
  }
  return cloudApp.database();
}
