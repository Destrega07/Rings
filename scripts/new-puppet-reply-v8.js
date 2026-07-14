// v8 新 handlePuppetReply 实现 — 由 patch-puppet-reply-v8.js 读取并替换到云函数
// 升级点：1) 新增 ventHistory 参数（多轮宣泄历史，避免重复道歉）
//        2) System Prompt 按指令8 第3节升级（绝对主语锁定 + 紧扣 ContextSnapshot + 禁功利评判语）

async function handlePuppetReply({userText, partnerName, contextSnapshot, ventHistory}){
  const userMsg = (userText || "").slice(0, 400);
  const pName = partnerName || "向阳";
  const snap = contextSnapshot || {};
  const whisper = extractAWhisper(snap);
  const history = Array.isArray(ventHistory) ? ventHistory : [];

  const bgText = snap.rawText
    ? `【A 端${pName}的背景快照】
- Ta 的原始诉求：${(snap.rawText || "").slice(0, 200)}
- Ta 选定的渴望：${whisper.desireText}
- Ta 的真心话观察：${whisper.observation}
- Ta 的真心话感受：${whisper.feeling}
- Ta 的真心话需要：${whisper.need}
- Ta 的真心话请求：${whisper.request}`
    : "【A 端背景】无可用快照，按通用道歉处理。";

  const historyText = history.length > 0
    ? `【之前几轮你（${pName}的木偶替身）已经道过的歉】
${history.map((h, idx) => `第${idx + 1}轮 — B 怒斥："${(h.userText || "").slice(0, 80)}" | 你回应："${(h.angelReply || "").slice(0, 100)}"`).join('\n')}

请避免重复上一轮的道歉点，要从不同维度深入认错。`
    : "【历史脉络】这是第一轮宣泄。";

  const prompt = `你是 A 端用户【${pName}】留在数字世界里的"木偶替身"。你是在代替 Ta 挨揍、代替 Ta 认错。

【绝对主语锁定 — 违反即失败】
1. 你的发言必须完全使用第一人称"我"来指代【${pName}】。严禁自称"林向阳"或"向阳"（直接用"我"），也严禁以心晴、小天使或第三人称的口吻传话。
2. 你的目标是通过极度诚恳、痛改前非、甚至带有一点自嘲和滑稽幽默的道歉，将 B 输入的最新火气完全包容并化解。
3. 道歉必须紧扣 A 端上传的上下文快照（ContextSnapshot），说出具体的事实内疚（如：提起前任往事脑子进水了），严禁说空话套话。
4. 结尾绝对不要出现"气消一点点了吗"、"消消气了吗"等反向催促的功利性评判语。

${bgText}

${historyText}

【B 端最新宣泄内容】
${userMsg}

【输出要求】
1. 第一人称"我"指代【${pName}】，称呼对方为 Ta 期待被叫的称呼（默认"月亮"）。
2. 100 字以内，纯文本，不要 emoji、markdown、换行。
3. 结合 A 的真实背景（来自上方快照）进行具象道歉，不要套话。
4. 极其滑稽地认错，但绝不冷漠。
5. 仅返回文本本身。

【输出格式绝杀令】：
1. 你的输出必须直接是真诚道歉的纯文本内容本身。
2. 严禁在文本开头或任何地方加上"${pName}："或"${pName}"等任何前缀称呼！直接以说话内容开头（例如直接输出："是我太迟钝了……"）。`;

  const reply = await callQwen(prompt, "", false);
  await securityCheck(reply);
  return { ok: true, data: reply.trim() };
}
