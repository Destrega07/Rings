// 打字机 Hook：逐字渲染文本
import { useState, useCallback, useRef, useEffect } from 'react';

interface TypewriterOptions {
  charDelay?: number;     // 每字延迟 ms
  onStart?: () => void;
  onDone?: () => void;
}

/**
 * 单段文本打字机
 * 用法：
 *   const { text, type, reset } = useTypewriter({ charDelay: 38 });
 *   type('你好月亮');  // text 状态会逐字增长
 */
export function useTypewriter(opts: TypewriterOptions = {}) {
  const { charDelay = 38, onStart, onDone } = opts;
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const timerRef = useRef<any>(null);
  const idxRef = useRef(0);
  const fullRef = useRef('');
  const onStartRef = useRef(onStart);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onStartRef.current = onStart;
    onDoneRef.current = onDone;
  }, [onStart, onDone]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const type = useCallback((str: string) => {
    clear();
    fullRef.current = str;
    idxRef.current = 0;
    setText('');
    setTyping(true);
    onStartRef.current?.();

    const tick = () => {
      const i = idxRef.current;
      if (i >= fullRef.current.length) {
        setTyping(false);
        onDoneRef.current?.();
        return;
      }
      idxRef.current = i + 1;
      setText(fullRef.current.slice(0, i + 1));
      timerRef.current = setTimeout(tick, charDelay);
    };
    timerRef.current = setTimeout(tick, charDelay);
  }, [charDelay, clear]);

  const reset = useCallback(() => {
    clear();
    setText('');
    setTyping(false);
    fullRef.current = '';
    idxRef.current = 0;
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { text, typing, type, reset, clear };
}

/**
 * 多字段顺序打字机：依次渲染多个字段
 * 用法：
 *   const { fields, start } = useSequentialTypewriter();
 *   start([{id:'a', text:'第一段'}, {id:'b', text:'第二段'}]);
 */
export function useSequentialTypewriter(charDelay = 38, fieldGap = 240) {
  const [results, setResults] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const queueRef = useRef<{ id: string; text: string }[]>([]);
  const timersRef = useRef<any[]>([]);

  const clearAll = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const start = useCallback((items: { id: string; text: string }[]) => {
    clearAll();
    setResults({});
    setDone(false);
    queueRef.current = items;

    const runField = (idx: number) => {
      if (idx >= items.length) {
        setActiveField(null);
        setDone(true);
        return;
      }
      const item = items[idx];
      setActiveField(item.id);
      let charIdx = 0;
      const tick = () => {
        if (charIdx >= item.text.length) {
          setResults(prev => ({ ...prev, [item.id]: item.text }));
          const t = setTimeout(() => runField(idx + 1), fieldGap);
          timersRef.current.push(t);
          return;
        }
        charIdx += 1;
        const partial = item.text.slice(0, charIdx);
        setResults(prev => ({ ...prev, [item.id]: partial }));
        const t = setTimeout(tick, charDelay);
        timersRef.current.push(t);
      };
      tick();
    };
    runField(0);
  }, [charDelay, charDelay, fieldGap, clearAll]);

  const reset = useCallback(() => {
    clearAll();
    setResults({});
    setActiveField(null);
    setDone(false);
    queueRef.current = [];
  }, [clearAll]);

  useEffect(() => clearAll, [clearAll]);

  return { results, activeField, done, start, reset };
}
