// 脚本：向云函数 handleChatPolish 和 handleChatSuggest 注入焦点智能淡化约束
const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'cloudfunctions', 'rings_engine', 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

// 焦点智能淡化约束文本（心晴润色版本）
const fadeConstraintPolish = '\\n\\n\\u3010\\u6838\\u5fc3\\u7ea6\\u675f\\uff1a\\u4e0a\\u4e0b\\u6587\\u65e7\\u6897\\u667a\\u80fd\\u6de1\\u5316\\u3011\\n1. \\u5728\\u5206\\u6790\\u4f20\\u5165\\u7684\\u8fc7\\u5f80\\u591a\\u8f6e\\u5bf9\\u8bdd\\u5386\\u53f2\\uff08chatHistory\\uff09\\u65f6\\uff0c\\u4f60\\u5fc5\\u987b\\u5177\\u5907\\u52a8\\u6001\\u7684\\u5fc3\\u7406\\u5b66\\u89c9\\u5bdf\\u529b\\u3002\\n2. \\u5982\\u679c\\u53d1\\u73b0\\u60c5\\u4fa3\\u4e24\\u4eba\\u7684\\u5bf9\\u8bdd\\u5df2\\u7ecf\\u5ea6\\u8fc7\\u4e86\\u6fc0\\u70c8\\u7684\\u51b2\\u7a81\\u671f\\u3001\\u5e76\\u4e14\\u6700\\u8fd1 2-3 \\u8f6e\\u7684\\u5185\\u5bb9\\u5df2\\u7ecf\\u5e73\\u7a33\\u8fc7\\u6e21\\u5230\\u4e86\\u201c\\u89c4\\u5212\\u5177\\u4f53\\u884c\\u52a8\\u201d\\u3001\\u201c\\u5546\\u91cf\\u65e5\\u5e38\\u7410\\u4e8b\\u201d\\uff08\\u5982\\u8ba8\\u8bba\\u770b\\u4ec0\\u4e48\\u7535\\u5f71\\u3001\\u5403\\u4ec0\\u4e48\\u996d\\u3001\\u4e92\\u9053\\u65e9\\u665a\\u5b89\\uff09\\uff0c\\u4f60\\u5fc5\\u987b\\u3010\\u81ea\\u52a8\\u964d\\u4f4e\\u3011\\u6700\\u521d\\u51b2\\u7a81\\u5feb\\u7167\\u7684\\u5173\\u8054\\u6743\\u91cd\\u3002\\n3. \\u6b64\\u65f6\\uff0c\\u3010\\u5fc3\\u6674\\u6da6\\u8272\\u3011\\u5e94\\u654f\\u9510\\u987a\\u7740\\u4e24\\u4eba\\u5f53\\u524d\\u7684\\u65b0\\u8bdd\\u9898\\u3001\\u65b0\\u53f0\\u9636\\u5411\\u4e0b\\u884d\\u751f\\u6e29\\u6696\\u3001\\u9ad8\\u60c5\\u5546\\u7684\\u60c5\\u611f\\u62c9\\u8fd1\\u8bed\\u6599\\uff0c\\u4e25\\u7981\\u5f3a\\u884c\\u7ffb\\u65e7\\u8d26\\u3001\\u4e25\\u7981\\u518d\\u6b21\\u751f\\u786c\\u63d0\\u53ca\\u6700\\u521d\\u5f15\\u53d1\\u5435\\u67b6\\u7684\\u654f\\u611f\\u8bcd\\uff08\\u5982\\u5bf9\\u65b9\\u5df2\\u6d88\\u6c14\\uff0c\\u5c31\\u4e0d\\u8981\\u518d\\u53cd\\u590d\\u63d0\\u53ca\\u201c\\u4e34\\u671f\\u725b\\u5976\\u201d\\u6216\\u201c\\u524d\\u4efb\\u201d\\uff09\\uff0c\\u4fdd\\u6301\\u5bf9\\u8bdd\\u81ea\\u7136\\u6d41\\u52a8\\u3002';

// 焦点智能淡化约束文本（心晴代写版本）
const fadeConstraintSuggest = '\\n\\n\\u3010\\u6838\\u5fc3\\u7ea6\\u675f\\uff1a\\u4e0a\\u4e0b\\u6587\\u65e7\\u6897\\u667a\\u80fd\\u6de1\\u5316\\u3011\\n1. \\u5728\\u5206\\u6790\\u4f20\\u5165\\u7684\\u8fc7\\u5f80\\u591a\\u8f6e\\u5bf9\\u8bdd\\u5386\\u53f2\\uff08chatHistory\\uff09\\u65f6\\uff0c\\u4f60\\u5fc5\\u987b\\u5177\\u5907\\u52a8\\u6001\\u7684\\u5fc3\\u7406\\u5b66\\u89c9\\u5bdf\\u529b\\u3002\\n2. \\u5982\\u679c\\u53d1\\u73b0\\u60c5\\u4fa3\\u4e24\\u4eba\\u7684\\u5bf9\\u8bdd\\u5df2\\u7ecf\\u5ea6\\u8fc7\\u4e86\\u6fc0\\u70c8\\u7684\\u51b2\\u7a81\\u671f\\u3001\\u5e76\\u4e14\\u6700\\u8fd1 2-3 \\u8f6e\\u7684\\u5185\\u5bb9\\u5df2\\u7ecf\\u5e73\\u7a33\\u8fc7\\u6e21\\u5230\\u4e86\\u201c\\u89c4\\u5212\\u5177\\u4f53\\u884c\\u52a8\\u201d\\u3001\\u201c\\u5546\\u91cf\\u65e5\\u5e38\\u7410\\u4e8b\\u201d\\uff08\\u5982\\u8ba8\\u8bba\\u770b\\u4ec0\\u4e48\\u7535\\u5f71\\u3001\\u5403\\u4ec0\\u4e48\\u996d\\u3001\\u4e92\\u9053\\u65e9\\u665a\\u5b89\\uff09\\uff0c\\u4f60\\u5fc5\\u987b\\u3010\\u81ea\\u52a8\\u964d\\u4f4e\\u3011\\u6700\\u521d\\u51b2\\u7a81\\u5feb\\u7167\\u7684\\u5173\\u8054\\u6743\\u91cd\\u3002\\n3. \\u6b64\\u65f6\\uff0c\\u3010\\u5fc3\\u6674\\u4ee3\\u5199\\u3011\\u5e94\\u654f\\u9510\\u987a\\u7740\\u4e24\\u4eba\\u5f53\\u524d\\u7684\\u65b0\\u8bdd\\u9898\\u3001\\u65b0\\u53f0\\u9636\\u5411\\u4e0b\\u884d\\u751f\\u6e29\\u6696\\u3001\\u9ad8\\u60c5\\u5546\\u7684\\u60c5\\u611f\\u62c9\\u8fd1\\u8bed\\u6599\\uff0c\\u4e25\\u7981\\u5f3a\\u884c\\u7ffb\\u65e7\\u8d26\\u3001\\u4e25\\u7981\\u518d\\u6b21\\u751f\\u786c\\u63d0\\u53ca\\u6700\\u521d\\u5f15\\u53d1\\u5435\\u67b6\\u7684\\u654f\\u611f\\u8bcd\\uff08\\u5982\\u5bf9\\u65b9\\u5df2\\u6d88\\u6c14\\uff0c\\u5c31\\u4e0d\\u8981\\u518d\\u53cd\\u590d\\u63d0\\u53ca\\u201c\\u4e34\\u671f\\u725b\\u5976\\u201d\\u6216\\u201c\\u524d\\u4efb\\u201d\\uff09\\uff0c\\u4fdd\\u6301\\u5bf9\\u8bdd\\u81ea\\u7136\\u6d41\\u52a8\\u3002';

// === 修改 handleChatPolish ===
// 锚点：【用户原始输入】的 Unicode 转义 = \u3010\u7528\u6237\u539f\u59cb\u8f93\u5165\u3011
// 在 handleChatPolish 的 prompt 中，【用户原始输入】前面是 \n\n
const polishAnchor = '\\n\\n\\u3010\\u7528\\u6237\\u539f\\u59cb\\u8f93\\u5165\\u3011\\n\'+t+';
const polishReplacement = fadeConstraintPolish + '\\n\\n\\u3010\\u7528\\u6237\\u539f\\u59cb\\u8f93\\u5165\\u3011\\n\'+t+';

if (content.indexOf(polishAnchor) >= 0) {
  content = content.replace(polishAnchor, polishReplacement);
  console.log('[OK] handleChatPolish: 焦点淡化约束已注入');
} else {
  console.log('[WARN] handleChatPolish: 未找到锚点，可能已被修改或编码不同');
  // 尝试备用锚点
  const altAnchor = '\\u3010\\u7528\\u6237\\u539f\\u59cb\\u8f93\\u5165\\u3011';
  const idx = content.indexOf(altAnchor);
  console.log('[DEBUG] 备用锚点位置:', idx);
  if (idx >= 0) {
    console.log('[DEBUG] 上下文:', content.substring(Math.max(0, idx - 50), idx + 50));
  }
}

// === 修改 handleChatSuggest ===
// 锚点：【聊天上下文】的 Unicode 转义 = \u3010\u804a\u5929\u4e0a\u4e0b\u6587\u3011
// 在 handleChatSuggest 的 prompt 中，【聊天上下文】前面是 \n\n
const suggestAnchor = '\\n\\n\\u3010\\u804a\\u5929\\u4e0a\\u4e0b\\u6587\\u3011\\n"+a+';
const suggestReplacement = fadeConstraintSuggest + '\\n\\n\\u3010\\u804a\\u5929\\u4e0a\\u4e0b\\u6587\\u3011\\n"+a+';

if (content.indexOf(suggestAnchor) >= 0) {
  content = content.replace(suggestAnchor, suggestReplacement);
  console.log('[OK] handleChatSuggest: 焦点淡化约束已注入');
} else {
  console.log('[WARN] handleChatSuggest: 未找到锚点，可能已被修改或编码不同');
  const altAnchor2 = '\\u3010\\u804a\\u5929\\u4e0a\\u4e0b\\u6587\\u3011';
  const idx2 = content.indexOf(altAnchor2);
  console.log('[DEBUG] 备用锚点位置:', idx2);
  if (idx2 >= 0) {
    console.log('[DEBUG] 上下文:', content.substring(Math.max(0, idx2 - 50), idx2 + 50));
  }
}

// 写回文件
fs.writeFileSync(filePath, content, 'utf8');
console.log('[DONE] 云函数修改完成');
