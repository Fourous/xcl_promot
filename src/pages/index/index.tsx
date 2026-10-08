import { View, Text } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchConfig, VoteConfig } from '@/services/vote';

/** 格式化倒计时为「X 天 X 时 X 分 X 秒」 */
function formatCountdown(ms: number): string {
  if (ms <= 0) return '0 天 0 时 0 分 0 秒';
  const day = Math.floor(ms / 86400000);
  const hour = Math.floor((ms % 86400000) / 3600000);
  const minute = Math.floor((ms % 3600000) / 60000);
  const second = Math.floor((ms % 60000) / 1000);
  return `${day} 天 ${hour} 时 ${minute} 分 ${second} 秒`;
}

/** 格式化时间区间 */
function formatRange(start: string | null, end: string | null): string {
  if (!start || !end) return '待定';
  const s = new Date(start).toLocaleDateString('zh-CN');
  const e = new Date(end).toLocaleDateString('zh-CN');
  return `${s} 至 ${e}`;
}

const IndexPage = () => {
  const [config, setConfig] = useState<VoteConfig | null>(null);
  const [now, setNow] = useState(Date.now());

  useLoad(async () => {
    try {
      const cfg = await fetchConfig();
      setConfig(cfg);
    } catch (e) {
      console.error('加载活动配置失败', e);
    }
  });

  // 每秒刷新当前时间，驱动倒计时
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const startMs = config?.start_time ? new Date(config.start_time).getTime() : 0;
  const endMs = config?.end_time ? new Date(config.end_time).getTime() : 0;

  // 活动状态：not_started / ongoing / ended
  let phase: 'not_started' | 'ongoing' | 'ended' = 'ongoing';
  if (config?.status === 'not_started' || now < startMs) phase = 'not_started';
  else if (config?.status === 'ended' || now >= endMs) phase = 'ended';

  const countdownTarget = phase === 'not_started' ? startMs - now : endMs - now;
  const countdownLabel = phase === 'not_started' ? '距开始' : '距结束';

  const goVote = () => {
    Taro.navigateTo({ url: '/pages/vote/candidates/index' });
  };

  return (
    <View className="min-h-screen flex flex-col bg-[#F7F7F5]">
      {/* 主视觉：红色几何块 */}
      <View className="bg-primary px-6 pt-14 pb-12 relative overflow-hidden">
        {/* 顶部金线 */}
        <View className="absolute top-0 left-0 right-0 h-1 bg-[#C9A063]" />
        {/* 抽象轨道线条装饰 */}
        <View className="absolute right-6 top-16 w-16 h-16 border border-white opacity-20 rotate-45" />
        <View className="absolute right-12 top-24 w-10 h-10 border border-[#C9A063] opacity-40 rotate-45" />

        <Text className="block text-white text-3xl font-bold tracking-wide leading-tight">
          {config?.main_title || '致敬奋斗者 建功新时代'}
        </Text>
        <Text className="block text-white text-sm mt-3 tracking-wide">
          {config?.subtitle || '评选活动正式启动'}
        </Text>
        <View className="mt-5 flex items-center gap-2">
          <View className="w-8 h-px bg-[#C9A063]" />
          <Text className="text-white text-xs tracking-wide">
            {config?.organizer || '集团党委 · 集团工会'}
          </Text>
        </View>
      </View>

      {/* 活动信息 */}
      <View className="px-4 mt-5">
        <Card className="rounded-lg border-border shadow-none">
          <CardContent className="p-5">
            <Text className="block text-base font-bold text-foreground">
              {config?.activity_name || '评选活动'}
            </Text>
            <View className="mt-4 flex items-center justify-between">
              <Text className="text-sm text-muted-foreground">活动时间</Text>
              <Text className="text-sm text-foreground tabular-nums">
                {formatRange(config?.start_time ?? null, config?.end_time ?? null)}
              </Text>
            </View>
            <View className="mt-3 flex items-center justify-between">
              <Text className="text-sm text-muted-foreground">
                {phase === 'ended' ? '活动状态' : countdownLabel}
              </Text>
              {phase === 'ended' ? (
                <Text className="text-base font-bold text-foreground">活动已结束</Text>
              ) : (
                <Text className="text-base font-bold text-primary tabular-nums">
                  {formatCountdown(countdownTarget)}
                </Text>
              )}
            </View>
          </CardContent>
        </Card>
      </View>

      {/* 活动说明 */}
      <View className="px-4 mt-4">
        <Card className="rounded-lg border-border shadow-none">
          <CardContent className="p-5">
            <Text className="block text-sm font-semibold text-foreground">活动说明</Text>
            <Text className="block text-sm text-muted-foreground leading-7 mt-2">
              {config?.description ||
                '为表彰先进、树立榜样，现开展集团年度先进工作者评选活动。'}
            </Text>
          </CardContent>
        </Card>
      </View>

      {/* 底部操作 */}
      <View className="px-4 mt-8 pb-10">
        <Button
          className="w-full h-12 rounded-md bg-primary text-white"
          onClick={goVote}
          disabled={phase === 'not_started'}
        >
          {phase === 'not_started' ? '活动未开始' : phase === 'ended' ? '查看结果' : '进入投票'}
        </Button>
      </View>
    </View>
  );
};

export default IndexPage;
