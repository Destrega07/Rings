// 轻量错误边界：捕获子组件渲染异常，显示错误信息而非白屏
import React from 'react';
import { View, Text } from '@tarojs/components';

interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.label || '', 'render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ padding: '24rpx', background: '#fff0f0', minHeight: '100vh' }}>
          <Text style={{ color: '#cc0000', fontSize: '28rpx', display: 'block' }}>
            {this.props.label || '页面'}渲染错误：
          </Text>
          <Text style={{ color: '#cc0000', fontSize: '24rpx', display: 'block', marginTop: '16rpx' }}>
            {String(this.state.error.message || this.state.error)}
          </Text>
          <Text style={{ color: '#999', fontSize: '22rpx', display: 'block', marginTop: '16rpx' }}>
            请截图此错误反馈给开发者
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}
