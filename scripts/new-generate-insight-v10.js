// new-generate-insight-v10.js
// 链路A 提示词：handleGenerateInsight 升级为《见面相拥和好指南》
// - offline 场景：使用链路A 提示词（陈海贤级见面相拥和好指南）
// - online 场景：保留简化版本（线上陪伴指南）
async function handleGenerateInsight({contextSnapshot, bChoice, ventLog, aName, bName}) {
  const ctx = contextSnapshot || {};
  const a = aName || '向阳';
  const b = bName || '月亮';
  const choice = bChoice || 'offline';
  const ventText = (ventLog && ventLog.userText) ? String(ventLog.userText).slice(0, 300) : '（无宣泄记录）';
  const nvc = extractAWhisper(ctx);
  const request = (nvc && nvc.request) || '被听见';

  let prompt;
  if (choice === 'offline') {
    // 链路A 提示词：线下聊场景（《见面相拥和好指南》）
    prompt = `你现在是顶级心理咨询师陈海贤。A 端用户${a}昨晚投递了破冰卡，B 端${b}看完真心话后，内心的冰山融化，最终选择了「线下聊（愿意去现实中相拥和好）」。
现在请基于 A/B 双方的全套碎片，给${a}一份极其精准、充满力量与温情的《见面相拥和好指南》。

【全量上下文快照】
- 向阳的真心话请求：${request}
- 月亮刚刚在木偶替身处的吐苦水（重点分析）：${ventText}

【你的分析与生成逻辑】：
1. 深入剖析${b}的"吐苦水"：不要被她字面上的愤怒迷惑，去翻译她愤怒背后"渴望被${a}在乎、渴望被爱"的真实诉求。
2. 视角锁定：你是对${a}说话，采用第二人称"你"，称呼 B 端为"${b}"。
3. 语气调性：稳重、抱持、充满鼓励。要让${a}感觉到"${b}是在乎他的，只要他走过去就能接住"。

【输出严格 JSON】（response_format=json_object）
{
  "insight": "对${b}吐苦水背后的心理学解码，点出她的在乎与软肋。字数控制在 100 字以内。必须以肯定${a}的努力为基调。",
  "tips": "结合${a}原本的 request，给出一个今晚见面时、5分钟内可落地的具体和好微行动（如肢体动作+第一句话说什么）。字数控制在 60 字以内。"
}

【硬约束】：
- 严禁说教或指责${a}。
- tips 必须是具体的物理微行动，禁止使用"多关心"、"多沟通"等泛泛而谈的词汇。
- 仅返回纯 JSON，不附加任何 markdown 格式或解释说明。`;
  } else {
    // online 场景：线上陪伴指南
    prompt = `你现在是顶级心理咨询师陈海贤。A 端用户${a}投递了破冰卡，B 端${b}看完后选择了「线上聊（还需要${a}在线上继续陪伴）」。
请基于 A/B 双方的全套碎片，给${a}一份精准、温柔、可执行的线上陪伴指南。

【A 端全套背景】
- ${a}的真心话请求：${request}
- ${b}在木偶替身那里宣泄过：${ventText}

【任务】作为陈海贤，给${a}一份精准的线索复盘：
1. 解读${b}宣泄内容背后的真实需要（不是表面抱怨）。
2. 给${a}一个线上聊天的开场建议。

【输出严格 JSON】（response_format=json_object）
{
  "insight": "对${b}行为的心理学解读，120字内",
  "tips": "线上聊的开场建议，60字内"
}

【硬约束】
- 仅返回 JSON。`;
  }

  const raw = await callQwen(prompt, '', true);
  let parsed;
  await securityCheck(raw);
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('LLM 返回非 JSON：' + raw.slice(0, 200));
    parsed = JSON.parse(m[0]);
  }
  return { ok: true, data: parsed };
}
