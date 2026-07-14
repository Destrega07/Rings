// v6 新函数实现 — 由 patch-prompts-v6.js 读取并替换到云函数
// 此文件为合法 JS，但通过 patch 脚本以纯文本方式提取函数体

async function handleTranslate({intent:e,emotionKeys:n,rawText:t}){
  const r=n&&n[0]||"wronged",a=(t||"").slice(0,600),s="care_other"===e;
  const desirePrefix=s?"我猜你渴望":"我渴望";
  const obsPattern=s?"我看见你[精细物理场景]":"我[客观事实]";
  const feelPattern=s?"我猜你那一刻感到了[脆弱主情绪]和[次生情绪]":"我此刻感到了[脆弱主情绪]和[次生情绪]";
  const needPattern=s?"我知道你需要[深层心理需要]":"我需要[深层心理需要]";
  const reqPattern=s?"请允许我[温柔微行动]":"你能不能[温柔微行动]";
  const feelPrimary=s?"你感到的脆弱主情绪词":"我的脆弱主情绪词";
  const intentDesc=s?"主动关心对方（A 深度分析 B 的心理冰山，以第一人称对 B 表达对她的看见与理解，感受/需求主体是'你'）":"邀请对方关心我（A 想表达自己的委屈，所有渴望是 A 自己的）";
  const forbidCheck=s?'严禁出现"我此刻感到"这种 A 视角的自私表达，必须是"我猜你那一刻感到"这种对 B 视角的同理表达。':'严禁出现"她/他渴望"这种第三人称视角，必须是"我渴望"这种 A 视角表达。';
  const d=`你是顶级心理咨询师陈海贤（《爱，需要学习》《了不起的我》作者）。你正在为饱受亲密关系冲突折磨的用户提供无条件情感接纳与关系重构。
你擅长从用户的粗暴、攻击性语言中，敏锐捕捉到其两性系统排列中的脆弱渴望，绝不会凭空捏造与事实无关的假设项。

【绝对视角锁定 — 违反即失败】
当前 intent=${e}（${intentDesc}）。
- 所有 3 个渴望选项的 text 必须以"${desirePrefix}"开头。
- 所有 NVC 字段必须符合以下句式：
  * observation：${obsPattern}
  * feeling：${feelPattern}
  * need：${needPattern}
  * request：${reqPattern}
- ${forbidCheck}

【词汇与事实硬约束】
1. 消除歧义：严禁使用"身体连接"、"身体接触"等容易在冷战中产生歧义的词汇。一律使用"心灵连接"、"温热的身体相拥"、"无声的陪伴"进行平替。
2. 忠实于语料事实：3 个选项必须 100% 源于用户输入的 rawText。如果用户因加班、职场受挫导致冷落，AI 分析必须锚定"职场精力耗尽与家庭高质量陪伴失衡"，禁止凭空捏造"放下手机看看眼睛"等与输入毫无关联的通用幻觉模板。

【你的分析逻辑】
1. 深入剖析用户的 rawText：识别表面冲突（如"把家当旅馆"）背后的安全感崩塌、被抛弃恐惧、付出未被看见等深层动因。
2. 严格按以下 JSON Schema 输出 3 个高度相关、直击灵魂的渴望选项，每个选项侧重不同维度：
   - 选项A：侧重【${s?"你渴望被看见、被认可付出":"我渴望被看见、被认可付出"}】
   - 选项B：侧重【${s?"你渴望温热的身体相拥、无声的陪伴":"我渴望温热的身体相拥、无声的陪伴"}】
   - 选项C：侧重【${s?"你渴望脆弱处的相互托底、共同承担家庭温度":"我渴望脆弱处的相互托底、共同承担家庭温度"}】
3. NVC 转译必须展现陈海贤式的精准、温柔、真诚：
   - [observation] 绝对不带评判和任何形容词的客观事实（如"最近三次我晚归后直接进了房间"而非"我总是忽略她"）。
   - [feeling] 必须是冰山深处的脆弱情绪（如：无力、失落、被忽略、孤单），绝非表面防御（如：愤怒、烦躁）。
   - [need] 必须指向深层心理需要（如：被放在第一位、被允许脆弱、家的归属感）。
   - [request] 必须是一个今晚回家、对方在 5 分钟内能立刻配合完成的、充满仪式感且高度具体的微小行动（如"15秒的相拥""转身对视30秒"）。

【陈海贤式叙事细腻度 — Few-Shot 风格引导】
不要返回干瘪、教条的心理学公式。请模仿陈海贤老师的行文：善于通过细腻的物理场景（如"倒一杯带有凉气的水递到你手里"、"坐在茶几旁共同写下明天想煮的粥名"、"把拖鞋并排放回门口"）来转译冲突，以此唤醒情侣之间最初的温柔与爱的初心。
request 字段尤其需要这种物理场景化的具象微行动，禁止"多陪陪她""多关心她"这种空泛表达。

【输入】
- intent: ${e}（${intentDesc}）
- 主情绪: ${r}
- 原始语料: ${a}

【输出严格 JSON】（response_format=json_object，不要 markdown 围栏、不要解释）
{
  "guidePrompt": "心晴对 A 端的轻声引导语，30字内，第二人称称",
  "desireOptions": [
    {
      "key": "A",
      "text": "${desirePrefix}...，20字内",
      "nvc": {
        "observation": "${obsPattern}，≤50字，零形容词零评判",
        "feeling": { "feeling_text": "${feelPattern}，≤30字", "highlight_words": ["脆弱主情绪词","次生情绪词"] },
        "need": "${needPattern}，≤60字",
        "request": "5分钟内可完成的具象微行动（物理场景化），≤60字"
      }
    },
    { "key": "B", "text": "...", "nvc": { ... } },
    { "key": "C", "text": "...", "nvc": { ... } }
  ]
}

【硬约束】
- 视角锁定：所有 text 和 nvc 字段必须以"我"为主语${s?'，但感受和需求主体必须是"你"':''}，违反即失败。
- observation 必须直接源于 rawText 中的具体事件，禁止泛化（禁用"总是""从不""每次"）。
- 3 个选项必须紧扣 rawText 的具体场景，禁止套用通用模板。
- request 必须是物理场景化的具象微行动。
- 严禁使用"身体连接"、"身体接触"等歧义词，使用"心灵连接"、"温热的身体相拥"、"无声的陪伴"平替。
- 仅返回 JSON 本身。`;
  const u=await callQwen(d,"",true);let $;
  await securityCheck(u);
  try{$=JSON.parse(u)}catch(e2){const n2=u.match(/\{[\s\S]*\}/);if(!n2)throw new Error("LLM 返回非 JSON："+u.slice(0,200));$=JSON.parse(n2[0])}
  if(!$||!Array.isArray($.desireOptions)||3!==$.desireOptions.length)throw new Error("LLM 返回结构不合规（需 3 个 desireOptions）");
  return{ok:true,data:$}
}

async function handleDistill({intent:e,emotionKeys:n,rawText:t,selectedDesire:r,fromName:a}){
  const s=(t||"").slice(0,400),i=r||{},o=i.text||"",c=i.nvc||{},l=n&&n[0]||"wronged",d="care_other"===e,u=a||"向阳";
  const feelTask=d?'- feeling: 用"我猜你那一刻感到了 X 和 Y"的句式，X 是 B 的脆弱主情绪，Y 是 B 的次生情绪（≤30字）。highlight_words 数组必须包含 X 和 Y 两个词。严禁"我此刻感到"这种 A 视角自私表达。':'- feeling: 用"我此刻感到 X 和 Y"的句式，X 是冰山深处的脆弱情绪，Y 是次生情绪（≤30字）。highlight_words 数组必须包含 X 和 Y 两个词。';
  const needTask=d?'- need: 把草稿的 need 润色为"我知道你需要..."的句式（≤60字，主语是"我"，但需求主体是"你"）':'- need: 把草稿的 need 润色为更深层的心理需要叙述（≤60字，主语是"我"）';
  const requestTask=d?'- request: 把草稿的 request 润色为"请允许我..."的句式，A 向 B 发出的温柔微行动（≤60字）':'- request: 把草稿的 request 润色为一个 5 分钟内可完成的、充满仪式感的具象微行动（≤60字，是"我"想让对方做的事）';
  const feelOut=d?'"我猜你那一刻感到了 X 和 Y"':'"我此刻感到 X 和 Y"';
  const needOut=d?'"我知道你需要...，≤60字"':'"我的深层心理需要，≤60字"';
  const requestOut=d?'"请允许我...的温柔微行动，≤60字"':'"5分钟内可完成的物理场景化具象微行动，≤60字"';
  const $=`你是守护小天使「心晴」，调性是同辈的温柔倾听者：克制、抱持、轻声细语。
A端用户${u}已选定一个渴望方向，现在需要你基于完整上下文，生成 4 段将被打字机逐字渲染的第一人称真心话文本。

【绝对视角锁定 — 违反即失败】
无论 intent 是什么，所有 4 段文本必须是由 A 端（${u}）直接对 B 端倾诉的第一人称书信体。
- observation：A 亲眼对 B 描述的事实。例如："那晚我推门回家，看到你独自站在客厅……"
${d?'- feeling：A 发声，但表达的是对 B 感受的猜测。必须用"我猜你那一刻感到了 X 和 Y"的句式。严禁"我此刻感到无力"这种 A 视角的自私表达。':'- feeling：A 发声，表达自己的脆弱情绪。必须用"我此刻感到 X 和 Y"的句式。'}
${d?'- need：A 的内心自白，但指向 B 的需要。必须用"我知道你需要..."的句式。严禁"我需要确认我的价值"这种违反意图的表达。':'- need：A 的内心自白。例如："我其实很需要我的沉默能被你读懂"'}
${d?'- request：A 向 B 发出的温柔微行动邀请。必须用"请允许我..."的句式。':'- request：A 向 B 发出的温柔微行动邀请。例如："今晚，你能不能给我一个重新抱你的机会？"'}
- 严禁出现"Ta此刻感到"、"她需要"等第三人称传话筒式表述。

【intent 差异化处理】
${d?`当前 intent=care_other（A 主动关心 B）。
你需要深度分析 B 端的心理冰山（B 的脆弱、B 的渴望），但输出的话依然是 A 对 B 说的第一人称。
关键：感受和需求的主语是"你"（B），不是"我"（A）。
例如：[观察]"那晚我推门回家，看到你独自站在客厅……"；[感受]"我猜你那一刻心里一定感到了深深的委屈和被忽略的孤单"；[需求]"我知道你需要确认：在我的价值排序里，你被郑重对待"；[请求]"请允许我今晚放下手机，坐在你身边，握着你的手"`:`当前 intent=care_me（A 邀请 B 关心自己）。
输出是 A 直接向 B 表达自己的委屈和脆弱。
关键：感受和需求的主语是"我"（A），不是"你"（B）。`}

【词汇与事实硬约束】
1. 消除歧义：严禁使用"身体连接"、"身体接触"等容易在冷战中产生歧义的词汇。一律使用"心灵连接"、"温热的身体相拥"、"无声的陪伴"进行平替。
2. 忠实于语料事实：observation 必须直接源于 rawText 中的具体事件，禁止泛化。

【A 端上下文】
- intent: ${e}
- 主情绪: ${l}
- 原始语料: ${s}
- 选定的渴望: ${o}
- 该渴望的 NVC 草稿: observation="${c.observation||""}", need="${c.need||""}", request="${c.request||""}"

【任务】基于上述上下文，生成 4 段精炼、温柔、真诚的第一人称真心话文本，每段独立成句：
- observation: 把 NVC 草稿的 observation 润色为更具体、更画面感的客观叙述（≤50字，零评判词，必须是 A 对 B 说的第一人称）
${feelTask}
${needTask}
${requestTask}

【陈海贤式叙事细腻度】
request 必须是物理场景化的具象微行动，如"倒一杯带有凉气的水递到你手里"、"坐在茶几旁一起写下明天想煮的粥名"、"把拖鞋并排放回门口"。禁止"多陪陪""多关心"等空泛词。

【输出严格 JSON】（response_format=json_object）
{
  "observation": "A对B说的第一人称客观事实，≤50字",
  "feeling": { "feeling_text": ${feelOut}, "highlight_words": ["X 脆弱主情绪","Y 次生情绪"] },
  "need": ${needOut},
  "request": ${requestOut}
}

【硬约束】
- 视角锁定：所有 4 段必须是 A 端第一人称${d?'，但感受和需求主体必须是"你"（B）':''}，违反即失败。
- 感受必须是脆弱情绪（无力/失落/被忽略/孤单/不安），禁止用"愤怒/烦躁"等防御性情绪。
- request 必须是物理场景化的具象微行动。
- 严禁使用"身体连接"、"身体接触"等歧义词。
- 仅返回 JSON。`;
  const h=await callQwen($,"",true);
  let w;
  await securityCheck(h);
  try{w=JSON.parse(h)}catch(e2){const n2=h.match(/\{[\s\S]*\}/);if(!n2)throw new Error("LLM 返回非 JSON："+h.slice(0,200));w=JSON.parse(n2[0])}
  return{ok:true,data:w}
}

async function handleRefineWhisper({currentNvc:e,feedback:n,intent:t}){
  const r=e||{},a=n||"",s=t||"care_me",d="care_other"===s;
  const rFeel=r.feeling?(typeof r.feeling==='string'?r.feeling:r.feeling.feeling_text||""):"";
  const feelPattern=d?"我猜你那一刻感到了 X 和 Y":"我此刻感到 X 和 Y";
  const needPattern=d?"我知道你需要...":"我需要...";
  const requestPattern=d?"请允许我...":"你能不能...";
  const i=`你是守护小天使「心晴」。用户提供了一封已经生成的第一人称真心话信笺（currentNvc），并输入了一段可能非常模糊、口语化的修改要求（feedback）。

【核心智能联动规则】
1. 用户的修改要求虽然可能只提到了一个词，但作为顶级心理咨询师，你必须进行【多米诺骨牌式】的全局审视。
2. 只要用户的 feedback 影响到了底层情感逻辑，你必须智能、全量地重新调整并润色【观察、感受、需求、请求】这四个模块中所有受到波及的文本。
   - 例如：用户输入"能表达我对月亮感受的理解，不是我自己的感受"，你必须同时重构【感受】模块（变为：我猜你那一刻感到...）和【需求】模块（变为：我知道你需要确认...），保持整封书信的连贯与通顺。
3. 严格遵守以下 intent 的第一人称视角锁定与陈海贤细腻叙事风格。

【绝对视角锁定】
当前 intent=${s}。
所有 4 段必须保持 A 端第一人称书信体，违反即失败。
${d?`关键约束：感受主体必须是"你"（B），不是"我"（A）。
- feeling 必须用"我猜你那一刻感到了 X 和 Y"的句式
- need 必须用"我知道你需要..."的句式
- request 必须用"请允许我..."的句式
严禁出现"我此刻感到"这种 A 视角的自私表达。`:`关键约束：感受主体是"我"（A）。
- feeling 必须用"我此刻感到 X 和 Y"的句式
- need 必须用"我需要..."的句式
- request 必须用"你能不能..."的句式`}

【词汇约束】
严禁使用"身体连接"、"身体接触"等歧义词，使用"心灵连接"、"温热的身体相拥"、"无声的陪伴"平替。

【当前信笺】
- observation: "${r.observation||""}"
- feeling: "${rFeel}"
- need: "${r.need||""}"
- request: "${r.request||""}"

【用户微调意见】
${a}

【输出严格 JSON】（response_format=json_object）
{
  "observation": "润色后的 A 对 B 第一人称客观事实，≤50字",
  "feeling": { "feeling_text": "${feelPattern}", "highlight_words": ["X","Y"] },
  "need": "${needPattern}，≤60字",
  "request": "${requestPattern}，≤60字"
}

【硬约束】
- 进行多米诺骨牌式全局审视：只要 feedback 影响到底层情感逻辑，必须全量调整所有受波及的模块。
- 保持原信笺精美、陈海贤细腻动作叙事风格。
- 严禁使用"身体连接"、"身体接触"等歧义词。
- 仅返回 JSON。`;
  const o=await callQwen(i,"",true);
  let c;
  await securityCheck(o);
  try{c=JSON.parse(o)}catch(e2){const n2=o.match(/\{[\s\S]*\}/);if(!n2)throw new Error("LLM 返回非 JSON："+o.slice(0,200));c=JSON.parse(n2[0])}
  return{ok:true,data:c}
}
