// patch-prompts-v6.js
// 读取 new-prompts-v6.js 中的新函数，替换云函数中的旧函数
const fs = require('fs');
const path = require('path');

const cloudFuncPath = path.join(__dirname, '..', 'cloudfunctions', 'rings_engine', 'index.js');
const newFuncsPath = path.join(__dirname, 'new-prompts-v6.js');

let cloudContent = fs.readFileSync(cloudFuncPath, 'utf8');
let newFuncsRaw = fs.readFileSync(newFuncsPath, 'utf8');

// 修正转义：将 \${ 替换为 ${
newFuncsRaw = newFuncsRaw.replace(/\\\$\{/g, '${');

// 从新函数文件中提取指定函数
function extractFunc(text, name, nextName) {
  const startMarker = `async function ${name}(`;
  const start = text.indexOf(startMarker);
  if (start === -1) throw new Error(`Cannot find ${name} in new functions file`);

  let end;
  if (nextName) {
    const nextMarker = `async function ${nextName}(`;
    end = text.indexOf(nextMarker, start);
    if (end === -1) throw new Error(`Cannot find ${nextName} in new functions file`);
    // 回退到最后一个 }（函数体的闭合花括号）
    while (end > 0 && text[end - 1] !== '}') end--;
  } else {
    end = text.length;
    while (end > 0 && /\s/.test(text[end - 1])) end--;
  }
  return text.substring(start, end);
}

const newTranslate = extractFunc(newFuncsRaw, 'handleTranslate', 'handleDistill');
const newDistill = extractFunc(newFuncsRaw, 'handleDistill', 'handleRefineWhisper');
const newRefine = extractFunc(newFuncsRaw, 'handleRefineWhisper', null);

console.log('[patch] newTranslate length:', newTranslate.length);
console.log('[patch] newDistill length:', newDistill.length);
console.log('[patch] newRefine length:', newRefine.length);

// 在云函数文件中定位旧函数边界
function findFuncBounds(text, name, nextName) {
  const startMarker = `async function ${name}(`;
  const start = text.indexOf(startMarker);
  if (start === -1) throw new Error(`Cannot find ${name} in cloud function`);

  const nextMarker = `async function ${nextName}(`;
  const nextStart = text.indexOf(nextMarker, start);
  if (nextStart === -1) throw new Error(`Cannot find ${nextName} in cloud function`);

  // 回退到 }} 的最后一个 }
  let end = nextStart;
  while (end > 0 && text[end - 1] !== '}') end--;
  return { start, end };
}

// 替换 handleTranslate
const tBounds = findFuncBounds(cloudContent, 'handleTranslate', 'handleDistill');
console.log('[patch] old translate:', tBounds.start, '-', tBounds.end, 'length:', tBounds.end - tBounds.start);
cloudContent = cloudContent.substring(0, tBounds.start) + newTranslate + cloudContent.substring(tBounds.end);

// 替换 handleDistill
const dBounds = findFuncBounds(cloudContent, 'handleDistill', 'handleRefineWhisper');
console.log('[patch] old distill:', dBounds.start, '-', dBounds.end, 'length:', dBounds.end - dBounds.start);
cloudContent = cloudContent.substring(0, dBounds.start) + newDistill + cloudContent.substring(dBounds.end);

// 替换 handleRefineWhisper
const rBounds = findFuncBounds(cloudContent, 'handleRefineWhisper', 'handleComfortA');
console.log('[patch] old refine:', rBounds.start, '-', rBounds.end, 'length:', rBounds.end - rBounds.start);
cloudContent = cloudContent.substring(0, rBounds.start) + newRefine + cloudContent.substring(rBounds.end);

// 写回文件
fs.writeFileSync(cloudFuncPath, cloudContent, 'utf8');
console.log('[patch] Cloud function patched successfully!');
console.log('[patch] File size:', cloudContent.length, 'bytes');
