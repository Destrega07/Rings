// patch-puppet-reply-v8.js
// 读取 new-puppet-reply-v8.js 中的新 handlePuppetReply，替换云函数中的旧/损坏版本
// 策略：直接用字符串替换，不追踪花括号（源文件无 "async function" 字符串冲突）
const fs = require('fs');
const path = require('path');

const cloudFuncPath = path.join(__dirname, '..', 'cloudfunctions', 'rings_engine', 'index.js');
const newFuncPath = path.join(__dirname, 'new-puppet-reply-v8.js');

let cloudContent = fs.readFileSync(cloudFuncPath, 'utf8');
let newFuncRaw = fs.readFileSync(newFuncPath, 'utf8');

// 提取新函数：从 "async function handlePuppetReply(" 到文件末尾（去掉末尾空白）
const startMarker = 'async function handlePuppetReply(';
const start = newFuncRaw.indexOf(startMarker);
if (start === -1) throw new Error('Cannot find handlePuppetReply in new function file');

let end = newFuncRaw.length;
while (end > 0 && /\s/.test(newFuncRaw[end - 1])) end--;
const newFunc = newFuncRaw.substring(start, end);
console.log('[patch] new handlePuppetReply length:', newFunc.length);
console.log('[patch] new func starts with:', newFunc.substring(0, 80));
console.log('[patch] new func ends with:', newFunc.substring(newFunc.length - 80));

// 在云函数中定位 handlePuppetReply 的开始
const oldStart = cloudContent.indexOf('handlePuppetReply(');
if (oldStart === -1) throw new Error('Cannot find handlePuppetReply in cloud function');

// handlePuppetReply 前面应该是 "async function " 或压缩后的残留
// 找到函数声明的真正起点：回退到 "async function" 或行首
let funcDeclStart = oldStart;
const asyncIdx = cloudContent.lastIndexOf('async function ', oldStart);
if (asyncIdx !== -1 && asyncIdx >= oldStart - 30) {
  funcDeclStart = asyncIdx;
}
console.log('[patch] old func decl start:', funcDeclStart, 'snippet:', cloudContent.substring(funcDeclStart, funcDeclStart + 60));

// 定位旧函数的结束：找下一个 "async function " 出现的位置
const nextAsyncIdx = cloudContent.indexOf('async function ', oldStart + 1);
if (nextAsyncIdx === -1) throw new Error('Cannot find next function after handlePuppetReply');
console.log('[patch] next async function at:', nextAsyncIdx, 'snippet:', cloudContent.substring(nextAsyncIdx, nextAsyncIdx + 60));

// 旧函数结束于 nextAsyncIdx 之前（可能有 } 也可能因损坏而缺失）
// 截取从 funcDeclStart 到 nextAsyncIdx 之间的内容，看是否需要补 }
const oldSegment = cloudContent.substring(funcDeclStart, nextAsyncIdx);
console.log('[patch] old segment length:', oldSegment.length, 'ends with:', JSON.stringify(oldSegment.slice(-20)));

// 替换：用新函数 + 换行 替换 oldSegment
cloudContent = cloudContent.substring(0, funcDeclStart) + newFunc + '\n' + cloudContent.substring(nextAsyncIdx);

fs.writeFileSync(cloudFuncPath, cloudContent, 'utf8');
console.log('[patch] handlePuppetReply replaced successfully!');
console.log('[patch] File size:', cloudContent.length, 'bytes');
