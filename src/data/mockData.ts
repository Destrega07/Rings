// 大模型适配器：三轨数据层
// sandboxScriptMode=true（H5 白金剧本）：本地写死的白金 NVC 包
// H5+微信浏览器（动态云端）：调用 rings_engine 云函数（Qwen3.7-Plus + msgSecCheck）
// H5+非微信浏览器 / 真机 testMode=true（本地沙盒）：本地 mock 兜底
// 真机 testMode=false（小程序生产）：调用 rings_engine 云函数
import Taro from '@tarojs/taro';
import type {
  Intent, EmotionTag, InjectResult, DesireOption,
  ContextSnapshot, DistillResult, FinaleBlessing, FinaleInsight, PuppetVentLog,
  ChatMessage, ChatSuggestion
} from '../types/repair';
import { globalData } from '../appGlobal';
import { isWeChatBrowser, h5CallFunction } from '../utils/h5cloud';

// ============================================================
// H5 Demo 白金预彩排剧本语料（SANDBOX_SCRIPT_MODE 专用）
// 数据源：项目重要文档/完整测试记录.txt
// 场景：月亮发烧40度，向阳只顾做PPT忽略了她
// 当 globalData.sandboxScriptMode === true 时，所有 Mock 函数不论输入
// 都统一返回以下白金数据，保证评委体验 100% 可控
// ============================================================

/** 沙盒模式判定（仅在 H5 环境且 sandboxScriptMode 激活时为 true） */
function isSandbox(): boolean {
  return process.env.TARO_ENV === 'h5' && globalData.sandboxScriptMode === true;
}

/** 沙盒模式统一延迟（模拟 LLM 思考，默认 1200ms） */
function withSandboxDelay<T>(data: T, ms: number = 1200): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), ms));
}

// ---- mockTranslate 白金数据（完整测试记录.txt 第14行）----
const WHITE_GOLD_TRANSLATE: InjectResult = {
  guidePrompt: '试着放下防御，去看见月亮高烧背后的恐惧与孤单。',
  desireOptions: [
    {
      key: 'A',
      text: '我猜你渴望被置于首位而非工作之后',
      nvc: {
        observation: '我看见你烧到40度时，我正对着电脑修改PPT，直到送医路上都在听你责备我把工作看得比你的命重要。',
        feeling: { feeling_text: '我猜你那一刻感到了极度的不被重视和深深的失落', highlight_words: ['不被重视', '失落'] },
        need: '我知道你需要确认在你的生命中，你的安危与健康是我绝对的第一优先级，胜过任何职场任务。',
        request: '请允许我现在放下手机，握住你的手，看着你的眼睛认真说三遍：\'你的健康比我的PPT重要一万倍\'。'
      }
    },
    {
      key: 'B',
      text: '我猜你渴望病中温热的身体相拥与陪伴',
      nvc: {
        observation: '我看见昨晚你独自承受40度高烧的煎熬，而我忙于屏幕前的工作，缺席了对你病痛的即时照料与安抚。',
        feeling: { feeling_text: '我猜你那一刻感到了刺骨的孤单和无助', highlight_words: ['孤单', '无助'] },
        need: '我知道你需要在我身边获得温热的身体相拥和无声的陪伴，感受到即便在脆弱时刻也并未被遗弃的安全感。',
        request: '请允许我今晚调暗灯光，为你倒一杯温水，坐在床边轻轻抚摸你的额头，陪你安静地躺十分钟。'
      }
    },
    {
      key: 'C',
      text: '我猜你渴望脆弱时刻有人共同托底承担',
      nvc: {
        observation: '我看见你在高烧难受时发出求救信号，我却因专注工作而延迟回应，导致你不得不在愤怒中独自面对身体的痛苦。',
        feeling: { feeling_text: '我猜你那一刻感到了被抛弃的恐惧和心力交瘁', highlight_words: ['被抛弃的恐惧', '心力交瘁'] },
        need: '我知道你需要一个能在你生病脆弱时立刻放下手头事务，与你共同承担家庭温度、为你托底的伴侣。',
        request: '请允许我把明天的会议资料打印出来放在玄关，今晚专心为你煮一碗清淡的小米粥，端到床头喂你吃几口。'
      }
    }
  ]
};

// ---- mockDistill 白金数据（完整测试记录.txt 第19行，用户选 A 后）----
const WHITE_GOLD_DISTILL: DistillResult = {
  observation: '昨夜你烧到四十度，我却埋头修改PPT，直到送医路上仍在听你责备我将工作置于你的安危之上。',
  feeling: { feeling_text: '我猜你那一刻感到了深深的被忽略和不安', highlight_words: ['被忽略', '不安'] },
  need: '我知道你需要确认：在我的价值排序里，你的健康与安危是绝对的第一优先级，胜过任何职场任务。',
  request: '请允许我现在放下手机，为你拧开一杯温水递到手心，看着你的眼睛认真说三遍：\'你比PPT重要\'。'
};

// ---- mockRefineWhisper 白金数据（完整测试记录.txt 第24行，用户输入"将你比PPT重要改为你比一切都重要"后）----
const WHITE_GOLD_REFINE_WHISPER: DistillResult = {
  observation: '昨夜你高烧四十度，我却埋头修改PPT，甚至在送医路上仍因工作忽略你的责备与痛苦。',
  feeling: { feeling_text: '我猜你那一刻感到了深深的被忽视和绝望', highlight_words: ['被忽视', '绝望'] },
  need: '我知道你需要确认：在你面前，任何职场任务都轻如鸿毛，你的安危是我生命中绝对且唯一的优先。',
  request: '请允许我用余生践行\'你比一切都重要\'的信念，此刻放下手机，为你递上温水，凝视你眼眸郑重承诺。'
};

// ---- mockComfortA 白金数据（完整测试记录.txt 第29行，A 寄出卡片后）----
const WHITE_GOLD_COMFORT_A = '林向阳，你愿意放下手机递上温水并凝视眼眸承诺，这份将爱人置于职场之上的决心与脆弱袒露，极具勇气。无论对方当下如何回应，你都已经被自己听见了。请安心，当沈月亮打开卡片后，我会马上告诉你 Ta 的反应与下一步建议。你们会重归于好的。';

// ---- mockPuppetReply 白金数据（完整测试记录.txt 第40、45行，2 轮固定回复）----
const WHITE_GOLD_PUPPET_REPLY_1 = '月亮，我真是猪脑子烧坏了。你烧到40度命悬一线，我竟还在纠结PPT字体。我这哪是工作狂，简直是冷血木偶。我把那破电脑砸了给你赔罪行吗？在我心里你比天大，是我混蛋，求你别不理这没良心的蠢货。';
const WHITE_GOLD_PUPPET_REPLY_2 = '月亮，这惩罚太对了！我就该尝尝被扔在一边的滋味。昨晚我抱着PPT当氧气瓶，把你高烧40度的痛苦当背景音，简直是个没有痛觉神经的废柴。求你把我绑在病床上反省，别真丢下我，我这木偶离了你连线都牵不动了。';

// ---- mockGuideB 白金数据（完整测试记录.txt 第48、80行）----
// 路线1（有宣泄）
const WHITE_GOLD_GUIDE_B_VENT = '沈月亮，刚才的委屈我都接住了。此刻林向阳正带着"你的安危是我唯一优先"的真诚，在冰山下等你。那份轻如鸿毛的任务观，是他想给你的定心丸，愿意听听吗？';
// 路线2（冷静了，isCalm=true）
const WHITE_GOLD_GUIDE_B_CALM = '沈月亮，你主动平复情绪的包容力真美。请带着这份柔软，去接收林向阳藏在冰山下的真心：在他心里，你的安危是绝对且唯一的优先。';

// ---- mockChatSuggest 白金数据（完整测试记录.txt 第54行，B 端视角）----
const WHITE_GOLD_CHAT_SUGGEST: ChatSuggestion[] = [
  { key: 'A', text: 'PPT改完了？那现在把我也列入你的最高优先级项目，立刻执行。' },
  { key: 'B', text: '病好了，但心里还缺块温度。别忙了，过来抱紧我，充充电。' },
  { key: 'C', text: '今晚不想听工作汇报，只想和你窝在沙发看部老电影，来吗？' }
];

// ---- mockChatPolish 白金数据（完整测试记录.txt 第59、68行）----
// B 端润色（完整测试记录.txt 第59行）
const WHITE_GOLD_CHAT_POLISH_B = '我现在很难受，需要你立刻出现。别让我等，我要看到你重视我的行动。';
// A 端润色（完整测试记录.txt 第68行）
const WHITE_GOLD_CHAT_POLISH_A = '车已叫，半小时必到。再撑一下，我马上飞奔到你身边。';

// ---- mockFinaleBlessingB 白金数据（完整测试记录.txt 第72行，B 选线下聊）----
const WHITE_GOLD_FINALE_BLESSING_B: FinaleBlessing = {
  blessing: '卸下疲惫吧，月亮。你的委屈已被听见，此刻只需带着余温去赴约。那个\'木头\'正捧着真心等你，去拥抱属于你的优先级。',
  tips: '见面先沉默拥抱15秒，感受彼此心跳，让身体代替语言确认安全。'
};

// ---- mockGenerateInsight 白金数据（完整测试记录.txt 第75行，A 端和好攻略）----
const WHITE_GOLD_GENERATE_INSIGHT: FinaleInsight = {
  insight: '她骂你木头，实则是渴望被看见的深情呼救。这份愤怒是防御，背后是对高质量连接的极度渴求。你已破冰，她心已软，此刻只需你稳稳接住。',
  tips: '见面先沉默拥抱30秒，感受彼此心跳。松开后递上温水，凝视双眼说：\'我来了，余生听你的。\''
};

// ============================================================
// 白金语料块结束
// ============================================================

/** 是否走真实云端
 *  - 小程序：testMode=false 时走云端
 *  - H5：微信浏览器 + 非沙盒模式 时走云端（通过 CloudBase JS SDK）
 */
function useCloud(): boolean {
  if (process.env.TARO_ENV !== 'h5') {
    const result = globalData.testMode === false;
    console.info('[useCloud] miniapp branch, testMode:', globalData.testMode, '=>', result);
    return result;
  }
  // H5 环境：仅在微信浏览器 + 非沙盒模式下走云端
  const isWX = isWeChatBrowser();
  const isSandboxMode = globalData.sandboxScriptMode === true;
  const result = isWX && !isSandboxMode;
  console.info('[useCloud] H5 branch, isWX:', isWX, '| sandboxScriptMode:', globalData.sandboxScriptMode, '| isSandboxMode:', isSandboxMode, '=>', result);
  return result;
}

/** 调用 rings_engine 云函数（小程序用 Taro.cloud，H5 用 CloudBase JS SDK） */
async function callRingsEngine(action: string, data: Record<string, any>): Promise<any> {
  console.info('[callRingsEngine] action:', action, '| data:', JSON.stringify(data).slice(0, 500));
  let result: any;
  if (process.env.TARO_ENV === 'h5') {
    // H5 环境：通过 CloudBase JS SDK 调用
    result = await h5CallFunction('rings_engine', { action, ...data });
  } else {
    // 小程序环境：通过 Taro.cloud 调用
    const res = await Taro.cloud.callFunction({
      name: 'rings_engine',
      data: { action, ...data }
    });
    result = res && (res.result as any);
  }
  console.info('[callRingsEngine] result:', action, '=>', JSON.stringify(result).slice(0, 500));
  if (!result || !result.ok) {
    throw new Error((result && result.error) || `rings_engine ${action} failed`);
  }
  return result.data;
}

/** 情绪卡片墙（两套意图共用，标签一致） */
export const EMOTION_TAGS: EmotionTag[] = [
  { key: 'anger',      label: '愤怒',   secondary: '被忽略' },
  { key: 'wronged',    label: '委屈',   secondary: '孤单' },
  { key: 'ignored',    label: '被忽略', secondary: '失落' },
  { key: 'anxiety',    label: '焦虑',   secondary: '不安' },
  { key: 'sad',        label: '悲伤',   secondary: '无力' },
  { key: 'unclear',    label: '不清楚', secondary: '迷茫' }
];

/** 主动关心对方 · Mock NVC 包（识别对方情绪，以「月亮」为感受主体） */
const CARE_OTHER_MAP: Record<string, DesireOption[]> = {
  anger: [
    {
      key: 'A',
      text: '渴望你回家后能先给她一个拥抱，而不是各自冷漠。',
      nvc: {
        observation: '最近我经常很晚回家，进门就进房间反锁了门，没有先跟你打招呼。',
        feeling: { feeling_text: '我感到愤怒与被忽略', highlight_words: ['愤怒', '被忽略'] },
        need: '其实她需要被放在第一位，需要感受到家是有温度的，而不是一个睡觉的旅馆。',
        request: '今晚回家，能不能让我先放下手机，给你一个 15 秒的拥抱，再聊彼此的一天？'
      }
    },
    {
      key: 'B',
      text: '渴望你能在她说话时放下手机，看着她的眼睛。',
      nvc: {
        observation: '我们对话时，我经常眼睛还盯着电脑或手机屏幕。',
        feeling: { feeling_text: '我感到愤怒与被忽略', highlight_words: ['愤怒', '被忽略'] },
        need: '她需要被认真倾听，需要感觉到自己说的话被你当作重要的事。',
        request: '以后你说话时，我能不能放下手头的东西，转过身来看着你，至少 30 秒？'
      }
    },
    {
      key: 'C',
      text: '渴望你主动问一句「今天累不累」，而不是等她发火。',
      nvc: {
        observation: '最近几次她情绪爆发前，我都没有察觉到她已经在硬撑。',
        feeling: { feeling_text: '我感到愤怒与被忽略', highlight_words: ['愤怒', '被忽略'] },
        need: '她需要被主动关心，而不是总要在情绪崩溃后才被看见。',
        request: '以后我每天回家，能不能主动问一句「今天累不累，要不要喝口水」？'
      }
    }
  ],
  ignored: [
    {
      key: 'A',
      text: '渴望你回家后能多陪陪她，而不是各自玩手机。',
      nvc: {
        observation: '最近我们回家后，常常各自对着屏幕，一晚上没说几句话。',
        feeling: { feeling_text: '我感到被忽略与失落', highlight_words: ['被忽略', '失落'] },
        need: '她需要和你建立有温度的连接，感受家的存在。',
        request: '今晚我们能不能放下手机，抽出 15 分钟坐下来抱抱，聊聊彼此的一天？'
      }
    },
    {
      key: 'B',
      text: '渴望你看见她在家务中的付出，并对她说一句谢谢。',
      nvc: {
        observation: '她每天整理家务、做饭，但很少有人提起这些。',
        feeling: { feeling_text: '我感到被忽略与失落', highlight_words: ['被忽略', '失落'] },
        need: '她需要付出被看见、被认可，这让她感到被在乎。',
        request: '下次回家时，能不能先给她一个拥抱，再说一句「辛苦了」？'
      }
    },
    {
      key: 'C',
      text: '渴望在做重大决定前，你先听听她的意见。',
      nvc: {
        observation: '家里有几次决定，我是先做了才告诉她。',
        feeling: { feeling_text: '我感到被忽略与失落', highlight_words: ['被忽略', '失落'] },
        need: '她需要在这段关系里拥有平等的发言权，被当作重要的伙伴。',
        request: '以后家里有大事，我们能不能先坐下来一起商量再决定？'
      }
    }
  ]
};

/** 邀请对方关心我 · Mock NVC 包（识别自己情绪，以「向阳」为感受主体） */
const CARE_ME_MAP: Record<string, DesireOption[]> = {
  wronged: [
    {
      key: 'A',
      text: '情绪低落时，对独处空间的需求和情感上被照顾的需求。',
      nvc: {
        observation: '那天我加班回家，一进门就躲进房间关上了门，是因为白天项目搞砸被领导当众批评。',
        feeling: { feeling_text: '我感到委屈与孤单', highlight_words: ['委屈', '孤单'] },
        need: '我需要在我心力耗尽的时候，有一段不被打扰的独处空间，让自己慢慢走出来。',
        request: '下次我关门独处时，能不能给我 30 分钟，不用问也不要催，我会自己走出来的。'
      }
    },
    {
      key: 'B',
      text: '渴望我的努力被看见，而不是只被定义成「不回家」。',
      nvc: {
        observation: '最近我加班多，回家晚，但那是为了把这个家撑起来。',
        feeling: { feeling_text: '我感到委屈与孤单', highlight_words: ['委屈', '孤单'] },
        need: '我需要我的付出被你看见，而不是被一句话否定成「把家当旅馆」。',
        request: '能不能在我晚归时，先问一句「今天顺利吗」，再聊其他？'
      }
    },
    {
      key: 'C',
      text: '渴望在你面前我可以脆弱，不必时刻坚强。',
      nvc: {
        observation: '我在外面要撑着，回家也常常忍着不说自己的难。',
        feeling: { feeling_text: '我感到委屈与孤单', highlight_words: ['委屈', '孤单'] },
        need: '我需要在你面前被允许脆弱，被接住，而不是只能当那个「靠谱的人」。',
        request: '以后我难过的时候，能不能让我靠你一会儿，什么都不用说？'
      }
    }
  ],
  sad: [
    {
      key: 'A',
      text: '渴望你能陪我一起度过低谷，而不是急着要我振作。',
      nvc: {
        observation: '我最近状态不好，但你似乎急着让我「赶紧好起来」。',
        feeling: { feeling_text: '我感到悲伤与无力', highlight_words: ['悲伤', '无力'] },
        need: '我需要被允许难过一会儿，需要你陪我待着，而不是被催促。',
        request: '下次我低落时，能不能就坐在我旁边，握着我的手，不说话也可以？'
      }
    },
    {
      key: 'B',
      text: '渴望你看见我情绪背后的疲惫，而不是只看到结果。',
      nvc: {
        observation: '我最近把很多事扛在自己身上，但你看不到我累。',
        feeling: { feeling_text: '我感到悲伤与无力', highlight_words: ['悲伤', '无力'] },
        need: '我需要你看见我情绪背后的疲惫，需要被照顾一次。',
        request: '这周末能不能让你来照顾我一天，让我什么都不用做？'
      }
    }
  ]
};

/** 兜底（默认走「委屈」分支） */
const FALLBACK_DESIRES = CARE_ME_MAP.wronged;

/** 心晴引导语（按意图 + 主情绪） */
const GUIDE_PROMPTS: Record<Intent, string> = {
  care_other: '我看到了你的在意。让我们先识别 Ta 此刻的情绪，这里有几张情绪卡片，你选就行。',
  care_me: '我看到了你的不容易。让我们先识别你此刻的情绪，这里有几张情绪卡片，你选就行。'
};

/** 本地沙盒转译：模拟 1.5s 延迟，返回写死的 NVC 包 */
function localTranslate(intent: Intent, primaryEmotion: string): Promise<InjectResult> {
  return new Promise(resolve => {
    setTimeout(() => {
      const map = intent === 'care_other' ? CARE_OTHER_MAP : CARE_ME_MAP;
      const desires = map[primaryEmotion] || FALLBACK_DESIRES;
      resolve({
        guidePrompt: GUIDE_PROMPTS[intent],
        desireOptions: desires
      });
    }, 1500);
  });
}

/**
 * 转译适配器：意图→情绪→原始语料 → NVC + 3 个渴望选项
 *  - 沙盒/H5：本地 mock（1.5s 延迟）
 *  - 真机：调用 rings_engine 云函数（Qwen3.7-Plus JSON 模式 + msgSecCheck）
 */
export function mockTranslate(
  intent: Intent,
  primaryEmotion: string,
  rawText: string
): Promise<InjectResult> {
  // H5 Demo 白金剧本：不论输入，统一返回白金 NVC 包
  if (isSandbox()) {
    return withSandboxDelay(WHITE_GOLD_TRANSLATE, 1500);
  }
  if (!useCloud()) {
    return localTranslate(intent, primaryEmotion);
  }
  return callRingsEngine('translate', {
    intent,
    emotionKeys: [primaryEmotion],
    rawText
  })
    .then((data) => data as InjectResult)
    .catch((e) => {
      console.error('[mockTranslate] cloud failed, fallback to local:', e);
      return localTranslate(intent, primaryEmotion);
    });
}

/** 取情绪标签 */
export function getEmotionLabel(key: string): string {
  const t = EMOTION_TAGS.find(e => e.key === key);
  return t ? t.label : key;
}

export function getEmotionSecondary(key: string): string {
  const t = EMOTION_TAGS.find(e => e.key === key);
  return t?.secondary || '孤单';
}

/** 本地沙盒木偶替身道歉：关键词命中（同步） */
function localPuppetReply(userText: string, partnerName: string): string {
  // 沙盒兜底：第一人称"我"指代 partnerName（A 端木偶替身），严禁心晴/小天使口吻
  if (/电脑|手机|游戏/.test(userText)) {
    return `${partnerName}消消气！当时我真是脑子进水了！那玩意儿哪有你好看！我已经狠狠自扇了两个耳光，给你解解气！`;
  }
  if (/不理|冷漠|无视/.test(userText)) {
    return `${partnerName}对不起对不起！是我太迟钝了，没看见你在等我！我已经在门口罚站了，你随时来踹我一脚！`;
  }
  if (/滚|分手|离婚|讨厌/.test(userText)) {
    return `${partnerName}别别别！我错了还不行吗！我可舍不得走！让我给你端茶倒水三天三夜赎罪！`;
  }
  return `${partnerName}对不起对不起！当时我脑子进水了！你已经狠狠教训过我了，我记住了，下次绝不再犯！`;
}

/**
 * B 端木偶替身道歉适配器（结合 A 的 ContextSnapshot + 多轮宣泄历史）
 *  - 沙盒/H5：本地关键词命中（包装为 Promise）
 *  - 真机：强制调用 rings_engine action=puppet_reply（Qwen + msgSecCheck + A 端背景快照 + ventHistory 防止重复道歉）
 *    test_mode===false 时绝不回退到 localPuppetReply，失败返回中性错误提示
 */
export function mockPuppetReply(
  userText: string,
  partnerName: string = '向阳',
  contextSnapshot?: ContextSnapshot,
  ventHistory?: PuppetVentLog[]
): Promise<string> {
  // H5 Demo 白金剧本：根据 ventHistory.length 判断第几次宣泄，返回固定文本
  if (isSandbox()) {
    const ventCount = Array.isArray(ventHistory) ? ventHistory.length : 0;
    const reply = ventCount === 0 ? WHITE_GOLD_PUPPET_REPLY_1 : WHITE_GOLD_PUPPET_REPLY_2;
    return withSandboxDelay(reply, 1000);
  }
  if (!useCloud()) {
    return Promise.resolve(localPuppetReply(userText, partnerName));
  }
  // 云端：走 rings_engine，失败时返回中性提示
  return callRingsEngine('puppet_reply', {
    userText, partnerName, contextSnapshot, ventHistory
  })
    .then((data) => String(data || ''))
    .catch((e) => {
      console.error('[mockPuppetReply] cloud failed:', e);
      return '（Ta 此刻说不出话，稍后再试一次）';
    });
}

/** A 端"提炼真心话"适配器
 *  - 沙盒：直接用 selectedDesire.nvc 构造（行为不变）
 *  - 真机：调用 rings_engine action=distill 生成 4 段精炼 NVC 文本
 */
export function mockDistill(
  intent: Intent,
  emotionKeys: string[],
  rawText: string,
  selectedDesire: DesireOption,
  fromName: string
): Promise<DistillResult> {
  // H5 Demo 白金剧本：不论输入，统一返回白金提炼版 NVC 4 字段
  if (isSandbox()) {
    return withSandboxDelay(WHITE_GOLD_DISTILL, 1200);
  }
  if (!useCloud()) {
    // 沙盒：直接用 selectedDesire.nvc 字段（与原 repair 步骤6行为一致）
    const primary = getEmotionLabel(emotionKeys[0] || 'wronged');
    const secondary = getEmotionSecondary(emotionKeys[0] || 'wronged');
    const subject = intent === 'care_other' ? 'Ta' : '我';
    return Promise.resolve({
      observation: selectedDesire.nvc.observation,
      feeling: {
        feeling_text: `${subject}此刻感到 ${primary} 和 ${secondary}`,
        highlight_words: [primary, secondary]
      },
      need: selectedDesire.nvc.need,
      request: selectedDesire.nvc.request
    });
  }
  return callRingsEngine('distill', {
    intent, emotionKeys, rawText, selectedDesire, fromName
  })
    .then((data) => data as DistillResult)
    .catch((e) => {
      console.error('[mockDistill] cloud failed, fallback to local:', e);
      const primary = getEmotionLabel(emotionKeys[0] || 'wronged');
      const secondary = getEmotionSecondary(emotionKeys[0] || 'wronged');
      const subject = intent === 'care_other' ? 'Ta' : '我';
      return {
        observation: selectedDesire.nvc.observation,
        feeling: {
          feeling_text: `${subject}此刻感到 ${primary} 和 ${secondary}`,
          highlight_words: [primary, secondary]
        },
        need: selectedDesire.nvc.need,
        request: selectedDesire.nvc.request
      };
    });
}

/** A 端"对话微调"适配器
 *  - 沙盒：原 currentNvc 原样返回（仅用于 UI 流程验证）
 *  - 真机：调用 rings_engine action=refine_whisper 进行 AI 全局联动润色
 */
export function mockRefineWhisper(
  currentNvc: DistillResult,
  feedback: string,
  intent: Intent
): Promise<DistillResult> {
  // H5 Demo 白金剧本：不论输入，统一返回白金微调版 NVC（含"你比一切都重要"锚点）
  if (isSandbox()) {
    return withSandboxDelay(WHITE_GOLD_REFINE_WHISPER, 1200);
  }
  if (!useCloud()) {
    return Promise.resolve({ ...currentNvc });
  }
  return callRingsEngine('refine_whisper', {
    currentNvc, feedback, intent
  })
    .then((data) => data as DistillResult)
    .catch((e) => {
      console.error('[mockRefineWhisper] cloud failed, fallback to local:', e);
      return { ...currentNvc };
    });
}

/** A 端发送成功后安慰话适配器
 *  - 沙盒：本地写死的安慰话
 *  - 真机：调用 rings_engine action=comfort_a
 */
export function mockComfortA(
  intent: Intent,
  emotionKeys: string[],
  rawText: string,
  selectedDesire: DesireOption,
  fromName: string = '向阳',
  distilledNvc?: DistillResult | null,
  bName?: string
): Promise<string> {
  // H5 Demo 白金剧本：返回白金心晴安慰话
  if (isSandbox()) {
    return withSandboxDelay(WHITE_GOLD_COMFORT_A, 1000);
  }
  if (!useCloud()) {
    return Promise.resolve(
      `${fromName}，你愿意把心里话写下来，这本身就很了不起。无论对方当下如何回应，你都已经被自己听见了。请安心，当${bName || '月亮'}打开卡片后，我会马上告诉你 Ta 的反应与下一步建议。你们会重归于好的。`
    );
  }
  return callRingsEngine('comfort_a', {
    intent, emotionKeys, rawText, selectedDesire, fromName, distilledNvc, bName
  })
    .then((data) => String(data || ''))
    .catch((e) => {
      console.error('[mockComfortA] cloud failed, fallback to local:', e);
      return `${fromName}，你愿意把心里话写下来，这本身就很了不起。无论对方当下如何回应，你都已经被自己听见了。请安心，当${bName || '月亮'}打开卡片后，我会马上告诉你 Ta 的反应与下一步建议。你们会重归于好的。`;
    });
}

/** B 端"去看真心话"前的心晴引导适配器
 *  - 沙盒：本地写死的引导语
 *  - 真机：调用 rings_engine action=guide_b（结合 A 的 ContextSnapshot + B 的 ventLog）
 */
export function mockGuideB(
  contextSnapshot: ContextSnapshot,
  bName: string = '月亮',
  ventLog?: PuppetVentLog
): Promise<string> {
  // H5 Demo 白金剧本：按 isCalm 切换路线1（宣泄）/路线2（冷静）白金引导语
  if (isSandbox()) {
    const reply = ventLog?.isCalm ? WHITE_GOLD_GUIDE_B_CALM : WHITE_GOLD_GUIDE_B_VENT;
    return withSandboxDelay(reply, 1200);
  }
  if (!useCloud()) {
    return Promise.resolve(
      `${bName}，你刚才把火气倒出来，这很勇敢。现在，来看看${contextSnapshot.fromName || 'Ta'}藏在冰山下的那句话吧。`
    );
  }
  return callRingsEngine('guide_b', { contextSnapshot, bName, ventLog })
    .then((data) => String(data || ''))
    .catch((e) => {
      console.error('[mockGuideB] cloud failed, fallback to local:', e);
      return `${bName}，你刚才把火气倒出来，这很勇敢。现在，来看看${contextSnapshot.fromName || 'Ta'}藏在冰山下的那句话吧。`;
    });
}

/** B 端选线下聊后的祝福 + 小 Tips 适配器
 *  - 沙盒：本地写死（复用 mockBFinaleBlessing）
 *  - 真机：调用 rings_engine action=finale_blessing_b（结合 A 快照 + B 宣泄记录）
 */
export function mockFinaleBlessingB(
  contextSnapshot: ContextSnapshot,
  bName: string = '月亮',
  ventLog?: PuppetVentLog
): Promise<FinaleBlessing> {
  // H5 Demo 白金剧本：返回白金祝福 + Tips
  if (isSandbox()) {
    return withSandboxDelay(WHITE_GOLD_FINALE_BLESSING_B, 1500);
  }
  if (!useCloud()) {
    return Promise.resolve(mockBFinaleBlessing(bName, contextSnapshot.fromName || '向阳'));
  }
  return callRingsEngine('finale_blessing_b', {
    contextSnapshot, bName, ventLog
  })
    .then((data) => data as FinaleBlessing)
    .catch((e) => {
      console.error('[mockFinaleBlessingB] cloud failed, fallback to mock:', e);
      return mockBFinaleBlessing(bName, contextSnapshot.fromName || '向阳');
    });
}

/** 线上聊天沙盒：心晴润色适配器
 *  - 沙盒/H5：直接返回原文
 *  - 真机：调用 rings_engine action=chat_polish
 *  - SANDBOX_SCRIPT_MODE：按 view 返回白金润色文案（B端/A端不同）
 */
export function mockChatPolish(
  text: string,
  chatHistory: ChatMessage[],
  view?: 'A' | 'B'
): Promise<string> {
  // H5 Demo 白金剧本：按 view 区分 A/B 端返回不同白金润色文案
  if (isSandbox()) {
    const polished = view === 'A' ? WHITE_GOLD_CHAT_POLISH_A : WHITE_GOLD_CHAT_POLISH_B;
    return withSandboxDelay(polished, 1000);
  }
  if (!useCloud()) {
    return Promise.resolve(text);
  }
  return callRingsEngine('chat_polish', { text, chatHistory })
    .then((data) => String(data || text))
    .catch((e) => {
      console.error('[mockChatPolish] cloud failed:', e);
      return text;
    });
}

/** 线上聊天沙盒：心晴代写适配器
 *  - 沙盒/H5：返回三段写死文案
 *  - 真机：调用 rings_engine action=chat_suggest
 */
export function mockChatSuggest(
  chatHistory: ChatMessage[],
  contextSnapshot: ContextSnapshot,
  view: 'A' | 'B'
): Promise<ChatSuggestion[]> {
  // H5 Demo 白金剧本：返回 B 端视角白金 3 条建议
  if (isSandbox()) {
    return withSandboxDelay(WHITE_GOLD_CHAT_SUGGEST, 1000);
  }
  if (!useCloud()) {
    return Promise.resolve([
      { key: 'A', text: '别生气啦，我知道我错了，给你一个台阶下嘛~' },
      { key: 'B', text: '我想你了，真的很想很想抱抱你。' },
      { key: 'C', text: '是我疏忽了，今晚我们一起做顿饭好不好？' }
    ]);
  }
  return callRingsEngine('chat_suggest', { chatHistory, contextSnapshot, view })
    .then((data) => (Array.isArray(data) ? data as ChatSuggestion[] : []))
    .catch((e) => {
      console.error('[mockChatSuggest] cloud failed:', e);
      return [];
    });
}

/** A 端次日线索复盘适配器（合流 A/B 全套碎片）
 *  - 沙盒：本地写死（复用 mockAFinaleInsight）
 *  - 真机：调用 rings_engine action=generate_insight
 */
export function mockGenerateInsight(
  contextSnapshot: ContextSnapshot,
  bChoice: 'offline' | 'online',
  ventLog: PuppetVentLog | undefined,
  aName: string = '向阳',
  bName: string = '月亮'
): Promise<FinaleInsight> {
  // H5 Demo 白金剧本：返回白金和好攻略（严禁撒娇化，保持专业克制）
  if (isSandbox()) {
    return withSandboxDelay(WHITE_GOLD_GENERATE_INSIGHT, 1500);
  }
  if (!useCloud()) {
    return Promise.resolve(mockAFinaleInsight(bName, aName));
  }
  return callRingsEngine('generate_insight', {
    contextSnapshot, bChoice, ventLog, aName, bName
  })
    .then((data) => data as FinaleInsight)
    .catch((e) => {
      console.error('[mockGenerateInsight] cloud failed, fallback to mock:', e);
      return mockAFinaleInsight(bName, aName);
    });
}

/** B 端结算 Mock：心晴对 B 的祝福 + 线下聊小 Tips */
export function mockBFinaleBlessing(bName: string = '月亮', aName: string = '向阳'): { blessing: string; tips: string } {
  return {
    blessing: `${bName}，谢谢你愿意把心里的火气先放下。${aName}那几句真心话，是被 Ta 藏了很久的委屈。现在，去抱抱那个一直在等你的人吧。`,
    tips: '小 Tips：见面时不用立刻聊「问题」。先一个拥抱，再一起做件小事（倒杯水、并排坐一会），话会自然流出来。'
  };
}

/** A 端结算 Mock：月亮已选择线下聊 + 心晴给向阳的线索 + 小 Tips */
export function mockAFinaleInsight(bName: string = '月亮', aName: string = '向阳'): { insight: string; tips: string } {
  return {
    insight: `${bName}已选择线下聊。她之前介意的是你过多时间对着工作，感觉被忽视。未来记得回家先给她高质量的陪伴（时间可长可短，重在质量），然后再去忙工作。感觉自己被放在第一位后，${bName}会更理解你对工作的投入。`,
    tips: `小 Tips：${bName}出门时，${aName}记得主动开门、递鞋。这些细节，比千言万语更让她安心。`
  };
}
