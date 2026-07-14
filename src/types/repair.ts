// 年轮修复流程类型定义

/** 意图分流方向 */
export type Intent = 'care_other' | 'care_me';

/** 情绪标签 */
export interface EmotionTag {
  key: string;
  label: string;
  /** 次生情绪（用于 NVC 感受字段组合） */
  secondary?: string;
}

/** 感受字段结构（feeling_text + 动态高亮词数组） */
export interface FeelingField {
  feeling_text: string;
  highlight_words: string[];
}

/** NVC 四字段结构（观察/感受/需求/请求） */
export interface NvcCard {
  observation: string;
  feeling: FeelingField;
  need: string;
  request: string;
}

/** 渴望提炼单选项 */
export interface DesireOption {
  key: string;
  text: string;
  /** 该渴望对应的 NVC 转译结果 */
  nvc: NvcCard;
}

/** 注入年轮返回的 Mock 包 */
export interface InjectResult {
  guidePrompt: string;       // 心晴引导语
  desireOptions: DesireOption[];
}

/** 信使投递的破冰卡密信 */
export interface IceBreakMail {
  mailId: string;            // 提取码
  ciphertext: string;        // Mock 密文
  fromName: string;          // A 端用户名
  toName: string;            // B 端用户名
  intent: Intent;
  emotionKeys: string[];     // A 端勾选的情绪
  rawText: string;           // 原始语料（B 端不直接展示）
  desire: DesireOption;      // 最终选定渴望 + NVC（Step 4 inject 版本）
  distilledNvc?: DistillResult;  // Step 6 LLM 提炼后的 4 段真心话（B 端优先显示此版本）
  createdAt: number;
}

/** A 端全套状态快照（背对背上下文流动的统一载体）
 *  B 端拉取信件解密后即得此结构，触发 puppet_reply / generate_insight 时上传 */
export type ContextSnapshot = Pick<
  IceBreakMail,
  'intent' | 'emotionKeys' | 'rawText' | 'desire' | 'distilledNvc' | 'fromName' | 'toName'
>;

/** B 端木偶替身宣泄记录 */
export interface PuppetVentLog {
  userText: string;
  angelReply: string;
  at: number;
  isCalm?: boolean;
}

/** B 端最终选择（写回云端，供 A 端 generate_insight 合流） */
export interface BChoiceRecord {
  mailId: string;
  choice: 'offline' | 'online';  // 线下聊 / 线上聊
  status?: 'resolved_offline' | 'resolved_online';  // 指令10 任务 3.1：状态标记
  ventLog?: PuppetVentLog;        // B 在木偶页宣泄过的内容
  at: number;
}

/** A 端"提炼真心话"LLM 返回的 4 段 NVC 卡片文本 */
export interface DistillResult {
  observation: string;
  feeling: FeelingField;     // feeling_text + highlight_words
  need: string;
  request: string;
}

/** B 端选线下聊后 LLM 返回的祝福 + 小 Tips */
export interface FinaleBlessing {
  blessing: string;
  tips: string;
}

/** A 端次日线索复盘 LLM 返回的线索 + 小 Tips */
export interface FinaleInsight {
  insight: string;
  tips: string;
}

/** 线上聊天沙盒：单条聊天消息（解密后） */
export interface ChatMessage {
  text: string;
  sender: 'A' | 'B';
  time: string;
}

/** 线上聊天沙盒：心晴代写选项 */
export interface ChatSuggestion {
  key: string;
  text: string;
}

/** 修复流程全局状态 */
export interface RepairState {
  intent: Intent | null;
  emotionKeys: string[];
  rawText: string;
  injecting: boolean;        // 是否正在模拟大模型延迟
  injectResult: InjectResult | null;
  selectedDesireKey: string | null;
  distilled: boolean;        // 是否已生成 NVC 卡
  mailSent: boolean;         // 是否已投递破冰卡
}

/** 结算页视角 */
export type FinaleView = 'B' | 'A';
