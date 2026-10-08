import { ReactNode } from 'react';
import { View, Text } from '@tarojs/components';
import { ShieldAlert, CircleAlert, Loader, Ban } from 'lucide-react-taro';
import { Button } from '@/components/ui/button';

interface Props {
  type: 'loading' | 'empty' | 'not-started' | 'ended' | 'forbidden' | 'error';
  title?: string;
  description?: string;
  onAction?: () => void;
  actionText?: string;
}

/** 状态兜底页（加载/空/未开始/已结束/无权限/异常） */
export default function StatePage({ type, title, description, onAction, actionText }: Props) {
  const config: Record<string, { icon: ReactNode; title: string; desc: string }> = {
    loading: { icon: <Loader size={40} color="#C80018" />, title: '加载中', desc: '请稍候' },
    empty: { icon: <CircleAlert size={40} color="#8C8C8C" />, title: '暂无数据', desc: '当前没有可展示的内容' },
    'not-started': { icon: <Ban size={40} color="#8C8C8C" />, title: '活动未开始', desc: '活动尚未开始，请留意通知' },
    ended: { icon: <Ban size={40} color="#8C8C8C" />, title: '活动已结束', desc: '本次活动已结束，感谢关注' },
    forbidden: { icon: <ShieldAlert size={40} color="#8C8C8C" />, title: '暂无权限', desc: '您暂无权限访问此内容' },
    error: { icon: <CircleAlert size={40} color="#8C8C8C" />, title: '网络异常', desc: '请检查网络后重试' },
  };

  const item = config[type] || config.error;

  return (
    <View className="flex flex-col items-center justify-center min-h-screen px-8">
      <View className="mb-6">{item.icon}</View>
      <Text className="block text-lg font-bold text-gray-900">{title || item.title}</Text>
      <Text className="block text-sm text-gray-500 mt-2 text-center">{description || item.desc}</Text>
      {onAction && actionText ? (
        <Button className="mt-8" onClick={onAction}>
          {actionText}
        </Button>
      ) : null}
    </View>
  );
}
