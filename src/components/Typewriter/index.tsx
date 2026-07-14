// 打字机文本组件：接收完整文本，逐字渲染
import React, { useEffect, useState, useRef } from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface TypewriterProps {
  text: string;
  charDelay?: number;
  onStart?: () => void;
  onDone?: () => void;
  /** 是否立即开始（默认 true） */
  autoStart?: boolean;
  className?: string;
}

const Typewriter: React.FC<TypewriterProps> = ({
  text,
  charDelay = 38,
  onStart,
  onDone,
  autoStart = true,
  className
}) => {
  const [display, setDisplay] = useState('');
  const [typing, setTyping] = useState(false);
  const timerRef = useRef<any>(null);
  const onStartRef = useRef(onStart);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onStartRef.current = onStart;
    onDoneRef.current = onDone;
  }, [onStart, onDone]);

  useEffect(() => {
    if (!autoStart || !text) return;
    let idx = 0;
    setDisplay('');
    setTyping(true);
    onStartRef.current?.();

    const tick = () => {
      if (idx >= text.length) {
        setTyping(false);
        onDoneRef.current?.();
        return;
      }
      idx += 1;
      setDisplay(text.slice(0, idx));
      timerRef.current = setTimeout(tick, charDelay);
    };
    timerRef.current = setTimeout(tick, charDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, charDelay, autoStart]);

  return (
    <View className={classnames(styles.wrap, className)}>
      <Text>{display}</Text>
      {typing && <Text className={styles.cursor}>|</Text>}
    </View>
  );
};

export default Typewriter;
