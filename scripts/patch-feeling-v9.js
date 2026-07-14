// patch-feeling-v9.js
// 升级云函数 feeling schema 为 {feeling_text, highlight_words}
// 替换 5 个函数：
//   1. extractAWhisper（兼容 string | {feeling_text, highlight_words} | {primary, secondary}）
//   2. handleTranslate（feeling schema 改为 {feeling_text, highlight_words}）
//   3. handleDistill（feeling schema 改为 {feeling_text, highlight_words}）
//   4. handleRefineWhisper（feeling schema 改为 {feeling_text, highlight_words}）
//   5. handlePuppetReply（追加"输出格式绝杀令"）
// 策略：直接用源文件未压缩文本替换压缩版本，从后往前替换避免索引偏移
const fs = require('fs');
const path = require('path');

const cloudFuncPath = path.join(__dirname, '..', 'cloudfunctions', 'rings_engine', 'index.js');
const promptsPath = path.join(__dirname, 'new-prompts-v6.js');
const puppetPath = path.join(__dirname, 'new-puppet-reply-v8.js');
const extractPath = path.join(__dirname, 'new-extract-a-whisper-v9.js');

let cloudContent = fs.readFileSync(cloudFuncPath, 'utf8');
const promptsRaw = fs.readFileSync(promptsPath, 'utf8');
const puppetRaw = fs.readFileSync(puppetPath, 'utf8');
const extractRaw = fs.readFileSync(extractPath, 'utf8');

// 工具：从源文件提取函数体（从 "function XXX(" 或 "async function XXX(" 开始到下一个 "async function " 或文件末尾）
function extractFunc(src, name, isAsync) {
  const startMarker = (isAsync ? 'async function ' : 'function ') + name + '(';
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`Cannot find ${name} in source file`);
  // 找下一个 "async function "（用于切割）
  const nextAsync = src.indexOf('async function ', start + startMarker.length);
  let end = nextAsync === -1 ? src.length : nextAsync;
  // 去掉末尾空白
  while (end > 0 && /\s/.test(src[end - 1])) end--;
  return src.substring(start, end);
}

const newExtract = extractFunc(extractRaw, 'extractAWhisper', false);
const newTranslate = extractFunc(promptsRaw, 'handleTranslate', true);
const newDistill = extractFunc(promptsRaw, 'handleDistill', true);
const newRefine = extractFunc(promptsRaw, 'handleRefineWhisper', true);
const newPuppet = extractFunc(puppetRaw, 'handlePuppetReply', true);

console.log('[patch] new extractAWhisper length:', newExtract.length);
console.log('[patch] new handleTranslate length:', newTranslate.length);
console.log('[patch] new handleDistill length:', newDistill.length);
console.log('[patch] new handleRefineWhisper length:', newRefine.length);
console.log('[patch] new handlePuppetReply length:', newPuppet.length);

// 工具：在云函数中替换指定函数（找到该函数声明起点到下一个 async function 之间的内容）
function replaceFunc(cloud, name, newFunc, isAsync, nextName, nextIsAsync) {
  const startMarker = (isAsync ? 'async function ' : 'function ') + name + '(';
  const start = cloud.indexOf(startMarker);
  if (start === -1) throw new Error(`Cannot find ${name} in cloud function`);

  // 找下一个函数声明作为旧函数的结束
  const nextMarker = (nextIsAsync ? 'async function ' : 'function ') + nextName + '(';
  const next = cloud.indexOf(nextMarker, start + startMarker.length);
  if (next === -1) throw new Error(`Cannot find next function ${nextName} after ${name}`);

  const oldSegment = cloud.substring(start, next);
  console.log(`[patch] replacing ${name}: old=${oldSegment.length} chars, new=${newFunc.length} chars`);

  return cloud.substring(0, start) + newFunc + '\n' + cloud.substring(next);
}

// 从后往前替换（避免索引偏移）
// 1. handlePuppetReply → 到 handleGuideB
cloudContent = replaceFunc(cloudContent, 'handlePuppetReply', newPuppet, true, 'handleGuideB', true);

// 2. handleRefineWhisper → 到 handleComfortA
cloudContent = replaceFunc(cloudContent, 'handleRefineWhisper', newRefine, true, 'handleComfortA', true);

// 3. handleDistill → 到 handleRefineWhisper
cloudContent = replaceFunc(cloudContent, 'handleDistill', newDistill, true, 'handleRefineWhisper', true);

// 4. handleTranslate → 到 handleDistill
cloudContent = replaceFunc(cloudContent, 'handleTranslate', newTranslate, true, 'handleDistill', true);

// 5. extractAWhisper → 到 handleTranslate
cloudContent = replaceFunc(cloudContent, 'extractAWhisper', newExtract, false, 'handleTranslate', true);

fs.writeFileSync(cloudFuncPath, cloudContent, 'utf8');
console.log('[patch] All 5 functions replaced successfully!');
console.log('[patch] File size:', cloudContent.length, 'bytes');
