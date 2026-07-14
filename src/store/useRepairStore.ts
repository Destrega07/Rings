// 修复流程状态管理（zustand）
import { create } from 'zustand';
import type { Intent, InjectResult, DesireOption } from '../types/repair';
import { mockTranslate } from '../data/mockData';

interface RepairStore {
  intent: Intent | null;
  emotionKeys: string[];
  rawText: string;
  injecting: boolean;
  injectResult: InjectResult | null;
  selectedDesireKey: string | null;
  distilled: boolean;
  mailSent: boolean;

  setIntent: (i: Intent) => void;
  toggleEmotion: (key: string) => void;
  setRawText: (t: string) => void;
  inject: () => Promise<void>;
  selectDesire: (key: string) => void;
  getSelectedDesire: () => DesireOption | null;
  setDistilled: (v: boolean) => void;
  setMailSent: (v: boolean) => void;
  reset: () => void;
}

export const useRepairStore = create<RepairStore>((set, get) => ({
  intent: null,
  emotionKeys: [],
  rawText: '',
  injecting: false,
  injectResult: null,
  selectedDesireKey: null,
  distilled: false,
  mailSent: false,

  setIntent: (i) => set({ intent: i }),

  toggleEmotion: (key) => {
    const cur = get().emotionKeys;
    if (cur.includes(key)) {
      set({ emotionKeys: cur.filter(k => k !== key) });
    } else {
      set({ emotionKeys: [...cur, key] });
    }
  },

  setRawText: (t) => set({ rawText: t }),

  inject: async () => {
    const { intent, emotionKeys, rawText } = get();
    if (!intent || emotionKeys.length === 0 || !rawText.trim()) {
      console.warn('[Repair] inject prereq not met', { intent, emotionKeys, rawText });
      return;
    }
    set({ injecting: true });
    try {
      const result = await mockTranslate(intent, emotionKeys[0], rawText);
      set({ injectResult: result, injecting: false });
      console.info('[Repair] inject done, desires:', result.desireOptions.length);
    } catch (e) {
      console.error('[Repair] inject failed:', e);
      set({ injecting: false });
    }
  },

  selectDesire: (key) => set({ selectedDesireKey: key }),

  getSelectedDesire: () => {
    const { injectResult, selectedDesireKey } = get();
    if (!injectResult || !selectedDesireKey) return null;
    return injectResult.desireOptions.find(d => d.key === selectedDesireKey) || null;
  },

  setDistilled: (v) => set({ distilled: v }),
  setMailSent: (v) => set({ mailSent: v }),

  reset: () => set({
    intent: null,
    emotionKeys: [],
    rawText: '',
    injecting: false,
    injectResult: null,
    selectedDesireKey: null,
    distilled: false,
    mailSent: false
  })
}));
