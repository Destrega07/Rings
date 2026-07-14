// patch-comfort-a-v7.js
// 读取 new-comfort-a-v7.js 中的新 handleComfortA，替换云函数中的旧函数
const fs = require('fs');
const path = require('path');

const cloudFuncPath = path.join(__dirname, '..', 'cloudfunctions', 'rings_engine', 'index.js');
const newFuncsPath = path.join(__dirname, 'new-comfort-a-v7.js');

let cloudContent = fs.readFileSync(cloudFuncPath, 'utf8');
let newFuncsRaw = fs.readFileSync(newFuncsPath, 'utf8');

// 安全修正：将 \${ 替换为 ${
newFuncsRaw = newFuncsRaw.replace(/\\\$\{/g, '${');

// 提取 handleComfortA 函数
function extractFunc(text, name, nextName) {
  const startMarker = `async function ${name}(`;
  const start = text.indexOf(startMarker);
  if (start === -1) throw new Error(`Cannot find ${name} in new functions file`);

  let end;
  if (nextName) {
    const nextMarker = `async function ${nextName}(`;
    end = text.indexOf(nextMarker, start);
    if (end === -1) throw new Error(`Cannot find ${nextName} in new functions file`);
    while (end > 0 && text[end - 1] !== '}') end--;
  } else {
    end = text.length;
    while (end > 0 && /\s/.test(text[end - 1])) end--;
  }
  return text.substring(start, end);
}

const newComfortA = extractFunc(newFuncsRaw, 'handleComfortA', null);
console.log('[patch] newComfortA length:', newComfortA.length);

// 在云函数文件中定位旧 handleComfortA 边界
function findFuncBounds(text, name, nextName) {
  const startMarker = `async function ${name}(`;
  const start = text.indexOf(startMarker);
  if (start === -1) throw new Error(`Cannot find ${name} in cloud function`);

  const nextMarker = `async function ${nextName}(`;
  const nextStart = text.indexOf(nextMarker, start);
  if (nextStart === -1) throw new Error(`Cannot find ${nextName} in cloud function`);

  let end = nextStart;
  while (end > 0 && text[end - 1] !== '}') end--;
  return { start, end };
}

const bounds = findFuncBounds(cloudContent, 'handleComfortA', 'handlePuppetReply');
console.log('[patch] old comfortA:', bounds.start, '-', bounds.end, 'length:', bounds.end - bounds.start);

cloudContent = cloudContent.substring(0, bounds.start) + newComfortA + cloudContent.substring(bounds.end);

fs.writeFileSync(cloudFuncPath, cloudContent, 'utf8');
console.log('[patch] handleComfortA replaced successfully!');
console.log('[patch] File size:', cloudContent.length, 'bytes');
