// Post-build 修复脚本：让 dist/project.config.json 的 cloudfunctionRoot 指向源 cloudfunctions 目录
// 背景：Taro build 会从源 project.config.json 生成 dist/project.config.json，
//   但 cloudfunctionRoot 字段保持不变（"cloudfunctions/"）。
//   如果用户在微信开发者工具中打开 dist 目录，cloudfunctions/ 会解析为 dist/cloudfunctions/（空目录）。
//   本脚本把 cloudfunctionRoot 改为 "../cloudfunctions/"，指向源 cloudfunctions 目录。
const fs = require('fs');
const path = require('path');

const distConfig = path.join(__dirname, '..', 'dist', 'project.config.json');

if (!fs.existsSync(distConfig)) {
  console.warn('[post-build] dist/project.config.json not found, skip.');
  process.exit(0);
}

try {
  const config = JSON.parse(fs.readFileSync(distConfig, 'utf8'));
  if (config.cloudfunctionRoot !== '../cloudfunctions/') {
    config.cloudfunctionRoot = '../cloudfunctions/';
    fs.writeFileSync(distConfig, JSON.stringify(config, null, 2), 'utf8');
    console.log('[post-build] cloudfunctionRoot updated to "../cloudfunctions/"');
  } else {
    console.log('[post-build] cloudfunctionRoot already correct');
  }
} catch (e) {
  console.error('[post-build] failed:', e.message);
  process.exit(1);
}
