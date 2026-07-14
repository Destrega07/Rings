// new-guide-b-v10.js
// 指令10 任务一：handleGuideB 升级
// 新增入参：ventLog（B 端宣泄日志，含 userText）
// System Prompt 按指令10 任务一 2.2 模板：先承接 B 宣泄的不满与受伤，再提醒 A 在冰山下等候
async function handleGuideB({contextSnapshot, bName, ventLog}) {
  const ctx = contextSnapshot || {};
  const b = bName || '月亮';
  const a = ctx.fromName || '向阳';
  const ventText = (ventLog && ventLog.userText) ? String(ventLog.userText).slice(0, 200) : '（无宣泄记录）';
  const nvc = extractAWhisper(ctx);
  const need = (nvc && nvc.need) || '被听见';

  const prompt = `你现在是守护小天使「心晴」，调性是同辈的温柔倾听者。
B 端用户${b}刚刚在木偶替身那里狠狠倒完了火气（ventLog），现在正准备看 A 端${a}写给 Ta 的真心话卡片（contextSnapshot）。
请写一段温柔的软着陆引导语，帮助${b}消解防备心，愿意听见对方。

【输入线索整合】
- B 端的吐槽：${ventText}
- A 端的真心话需求：${need}

【你的文案硬约束】：
1. 第二人称"你"，称呼 B 端用户为"${b}"。
2. 字数严格控制在 80 字以内，纯文本，不要 markdown、不要换行、不要 emoji。
3. 心理咨询师叙事流：先精准承接并肯定 B 刚才宣泄的不满与受伤，再温柔提醒 Ta 伴侣${a}正带着怎样真诚的脆弱（${need}）在冰山下等 Ta。`;

  const raw = await callQwen(prompt, '', false);
  await securityCheck(raw);
  return { ok: true, data: raw.trim() };
}
