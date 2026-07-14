// 脚本：向云函数 handleGuideB 注入 isCalm 正向肯定分支（指令16）
const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'cloudfunctions', 'rings_engine', 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

// 将中文字符串转换为 Unicode 转义（与云函数文件格式一致）
function toUnicode(str) {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code === 10) {
      result += '\\n';
    } else if (code > 127) {
      result += '\\u' + code.toString(16).padStart(4, '0');
    } else {
      result += str[i];
    }
  }
  return result;
}

// 冷静状态的正向肯定分支 prompt（\${s} 等保持为模板表达式）
const calmPromptZh = `你现在是守护小天使「心晴」，调性是同辈的温柔倾听者。
B 端用户\${s}没有选择倒苦水，而是主动平静了下来，现在正准备看 A 端\${a}写给 Ta 的真心话卡片。
请写一段温暖的软着陆引导语，以欣慰、肯定的笔触帮助\${s}以柔软心态听见对方。

【硬约束：B 端已冷静状态特判】
1. isCalm === true 时，立刻停用"委屈、愤怒、火气、宣泄"等负面防御性词汇。
2. 以极其欣慰、温暖且充满肯定的笔触，赞美\${s}能为了爱主动平复情绪、放下防御的包容心。
3. 语气参考："月亮，看到你已经温柔地让自己冷静下来，小天使真为你感到骄傲。这意味着你心里深深珍视着这段关系。现在，请带着这份柔软，拆开向阳藏在冰山下的那句真心话吧。"

【你的文案硬约束】：
1. 第二人称"你"，称呼 B 端用户为"\${s}"。
2. 字数严格控制在 80 字以内，纯文本，不要 markdown、不要换行、不要 emoji。
3. 先以欣慰肯定的笔触赞美\${s}主动平复情绪的包容心，再温柔提醒 Ta 伴侣\${a}正带着真诚的脆弱（\${c}）在冰山下等 Ta。`;

const calmPromptEscaped = toUnicode(calmPromptZh);

// 定位 handleGuideB 函数中的 prompt 模板字面量
const fnStart = content.indexOf('handleGuideB');
if (fnStart < 0) {
  console.error('[FAIL] handleGuideB not found');
  process.exit(1);
}

// 锚点：,l=` 开始的模板字面量
const lStart = content.indexOf(',l=`', fnStart);
if (lStart < 0) {
  console.error('[FAIL] ,l=` anchor not found after handleGuideB');
  process.exit(1);
}

// 锚点：`,d=await callQwen(l 结束的模板字面量
const dStart = content.indexOf('`,d=await callQwen(l', lStart);
if (dStart < 0) {
  console.error('[FAIL] closing backtick + ,d=await callQwen anchor not found');
  process.exit(1);
}

// 提取原始 prompt（包含 ,l=` ... `）
const originalBlock = content.substring(lStart, dStart + 1); // 包含闭合 backtick
console.log('[INFO] original block length:', originalBlock.length);

// 检查是否已被修改
if (content.indexOf('calm=t&&t.isCalm===true', fnStart) >= 0 && content.indexOf('calm=t&&t.isCalm===true', fnStart) < dStart) {
  console.log('[WARN] isCalm branch already injected, skipping');
  process.exit(0);
}

// 构造替换块：,calm=t&&t.isCalm===true,l=calm?`[calm]`:`[original]`
const replacementBlock = ',calm=t&&t.isCalm===true,l=calm?`' + calmPromptEscaped + '`:`' + originalBlock.substring(4); // 4 = skip ",l=`" prefix, keep original content + closing backtick

// 执行替换
content = content.substring(0, lStart) + replacementBlock + content.substring(dStart + 1);

// 写回文件
fs.writeFileSync(filePath, content, 'utf8');
console.log('[OK] handleGuideB: isCalm 正向肯定分支已注入');
console.log('[DONE] 云函数修改完成');
