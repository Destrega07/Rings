// patch-guide-b-and-insight-v10.js
// 升级云函数中 handleGuideB 和 handleGenerateInsight 两个函数：
//   - handleGuideB：新增 ventLog 参数，提示词按指令10 任务一 2.2 模板（80 字内软着陆引导）
//   - handleGenerateInsight：提示词按链路A《见面相拥和好指南》模板（insight 100 字内、tips 60 字内）
// 边界检测策略：字符串感知的字符计数器，正确处理压缩云函数中的字符串字面量、解构语法、嵌套大括号
const fs = require('fs');
const path = require('path');

const cloudFuncPath = path.join(__dirname, '..', 'cloudfunctions', 'rings_engine', 'index.js');
const guideBPath = path.join(__dirname, 'new-guide-b-v10.js');
const insightPath = path.join(__dirname, 'new-generate-insight-v10.js');

let cloudContent = fs.readFileSync(cloudFuncPath, 'utf8');
const guideBRaw = fs.readFileSync(guideBPath, 'utf8');
const insightRaw = fs.readFileSync(insightPath, 'utf8');

// 工具：从源文件提取函数体（从 "function XXX(" 或 "async function XXX(" 开始到文件末尾，去掉前后空白）
function extractFunc(src, name, isAsync) {
  const startMarker = (isAsync ? 'async function ' : 'function ') + name + '(';
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`Cannot find ${name} in source file`);
  let end = src.length;
  while (end > 0 && /\s/.test(src[end - 1])) end--;
  return src.substring(start, end);
}

// 工具：在云函数中找到指定函数的结束位置（字符串感知，正确处理字符串字面量和嵌套大括号）
function findFuncEnd(src, start) {
  // 跳过参数列表：找匹配的 (...)（参数列表中可能含解构 {}，但不含 ()）
  let j = start;
  while (j < src.length && src[j] !== '(') j++;
  let depth = 1;
  j++;
  while (j < src.length && depth > 0) {
    const c = src[j];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    j++;
  }
  // j 指向 ) 后一个字符，跳过空格找到 body 起始 {
  while (j < src.length && src[j] !== '{') j++;
  // 进入 body 计数，处理字符串字面量
  let bodyDepth = 0;
  let started = false;
  let inStr = null;
  for (; j < src.length; j++) {
    const c = src[j];
    if (inStr) {
      if (c === '\\') { j++; continue; }
      if (c === inStr) inStr = null;
    } else {
      if (c === '"' || c === "'" || c === '`') inStr = c;
      else if (c === '{') { bodyDepth++; started = true; }
      else if (c === '}') { bodyDepth--; if (started && bodyDepth === 0) break; }
    }
  }
  return j + 1; // 包含结束 }
}

function replaceFunc(cloud, name, newFunc, isAsync) {
  const startMarker = (isAsync ? 'async function ' : 'function ') + name + '(';
  const start = cloud.indexOf(startMarker);
  if (start === -1) throw new Error(`Cannot find ${name} in cloud function`);
  const end = findFuncEnd(cloud, start);
  const oldSegment = cloud.substring(start, end);
  console.log(`[patch] replacing ${name}: old=${oldSegment.length} chars, new=${newFunc.length} chars`);
  return cloud.substring(0, start) + newFunc + '\n' + cloud.substring(end);
}

const newGuideB = extractFunc(guideBRaw, 'handleGuideB', true);
const newInsight = extractFunc(insightRaw, 'handleGenerateInsight', true);

console.log('[patch] new handleGuideB length:', newGuideB.length);
console.log('[patch] new handleGenerateInsight length:', newInsight.length);

// 替换（字符串感知，顺序无关）
cloudContent = replaceFunc(cloudContent, 'handleGenerateInsight', newInsight, true);
cloudContent = replaceFunc(cloudContent, 'handleGuideB', newGuideB, true);

fs.writeFileSync(cloudFuncPath, cloudContent, 'utf8');
console.log('[patch] handleGuideB and handleGenerateInsight replaced successfully!');
console.log('[patch] File size:', cloudContent.length, 'bytes');
