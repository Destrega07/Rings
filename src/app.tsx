import React, { useEffect } from 'react';
import Taro, { useDidShow, useDidHide } from '@tarojs/taro';
import { initLocalCache, ensurePairingMock } from './utils/storage';
import { globalData } from './appGlobal';
import './app.scss';

export { globalData };

// 构建版本标记（H5 Demo 版本号，区别于小程序构建）
const BUILD_VERSION = 'h5-demo-20260714-v6';

// H5 环境标识，避免 process.env.TARO_ENV 重复读取
const isH5 = process.env.TARO_ENV === 'h5';

function App(props: React.PropsWithChildren<unknown>) {
  useEffect(() => {
    // 启动时打印构建版本，帮助确认真机运行的是最新构建
    console.info('========== [App] BUILD_VERSION:', BUILD_VERSION, '==========');
    // 启动时初始化本地缓存 + 确保 Mock 配对就绪
    initLocalCache();
    ensurePairingMock();

    // H5 Demo：从 sessionStorage 恢复 sandboxScriptMode（评委刷新页面后保持白金剧本模式）
    if (isH5) {
      try {
        const envChosen = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rings_env_chosen');
        if (envChosen === 'sandbox') {
          globalData.sandboxScriptMode = true;
          console.info('[App] sandboxScriptMode restored from sessionStorage');
        }
      } catch (e) {
        console.warn('[App] sessionStorage read failed:', e);
      }
    }

    // 初始化微信云开发（仅小程序环境；H5 Demo 统一走白金剧本，不调用云函数）
    if (!isH5) {
      try {
        Taro.cloud.init({ env: 'cloud1-d4gy9bh0ff360b152', traceUser: true });
        console.info('[App] wx.cloud initialized');
      } catch (e) {
        console.warn('[App] wx.cloud.init failed:', e);
      }
    }
  }, []);

  useDidShow(() => {});

  useDidHide(() => {});

  // H5 环境：套手机壳容器 + 顶部刘海装饰
  if (isH5) {
    return (
      <div className="phoneWrapper">
        <div className="phoneShellDecor" />
        {props.children}
      </div>
    );
  }

  // 小程序环境：原样返回
  return props.children;
}

export default App;
