// 全局共享数据（独立模块，避免 app.tsx 命名导出在 weapp 编译时丢失）
// app.tsx / data 层 / pages 均从此处导入同一对象引用
export interface GlobalData {
  testMode: boolean;            // 全局测试开关（开发沙盒模式）
  mockRole: 'A' | 'B' | null;   // 当前模拟视角
  mockEmotion: string | null;   // 模拟 B 端入口预置情绪
  pairingKey: string;           // 配对密钥（Mock 预置）
  selfName: string;             // 当前用户名（Mock：林向阳）
  partnerName: string;          // 对方名（Mock：沈月亮）
  angelName: string;            // 小天使命名（默认心晴）
  sandboxScriptMode: boolean;   // H5 Demo 白金剧本锁定开关（环境检测弹窗激活）
}

export const globalData: GlobalData = {
  // H5 环境无 wx.cloud，强制沙盒模式；真机小程序默认走云端
  testMode: process.env.TARO_ENV === 'h5',
  mockRole: null,
  mockEmotion: null,
  pairingKey: 'rings_mock_pair_key_2026',
  selfName: '林向阳',
  partnerName: '沈月亮',
  angelName: '心晴',
  // 默认关闭；H5 环境下由首页环境检测弹窗按钮二激活，并写入 sessionStorage 持久化
  sandboxScriptMode: false
};
