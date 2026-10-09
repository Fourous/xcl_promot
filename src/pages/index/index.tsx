import { View, Text } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchMyActivities, ActivityWithRight } from '@/services/vote';
import { setActivityId } from '@/utils/activity';
import { isLoggedIn, getVoterToken, getVoterName, clearSession } from '@/utils/session';

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  upcoming: '未开始',
  ongoing: '进行中',
  ended: '已结束',
  archived: '已归档',
};

const STATUS_VARIANT: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  ongoing: 'default',
  upcoming: 'outline',
  ended: 'secondary',
  draft: 'outline',
  archived: 'secondary',
};

/** 格式化时间区间 */
function formatRange(start: string | null, end: string | null): string {
  if (!start || !end) return '时间待定';
  const s = new Date(start).toLocaleDateString('zh-CN');
  const e = new Date(end).toLocaleDateString('zh-CN');
  return `${s} 至 ${e}`;
}

/** 投票端首页：活动列表（含投票权校验） */
const IndexPage = () => {
  const [activities, setActivities] = useState<ActivityWithRight[]>([]);
  const [loading, setLoading] = useState(true);

  useLoad(async () => {
    try {
      const list = await fetchMyActivities(getVoterToken());
      setActivities(list);
    } catch (e) {
      console.error('加载活动列表失败', e);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  });

  const goActivity = (activity: ActivityWithRight) => {
    if (activity.status === 'upcoming' || activity.status === 'draft') return;

    // 查看结果（公开）
    if (activity.status === 'ended') {
      setActivityId(activity.id);
      Taro.navigateTo({ url: '/pages/vote/result/index' });
      return;
    }

    // 进入投票需先登录
    if (!isLoggedIn()) {
      Taro.navigateTo({ url: '/pages/vote/login/index' });
      return;
    }

    // 投票权校验
    if (!activity.hasVoteRight) {
      Taro.showModal({
        title: '暂无投票权',
        content: '您不在该活动的投票名单中，无法进入投票。',
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }

    setActivityId(activity.id);
    Taro.navigateTo({ url: '/pages/vote/candidates/index' });
  };

  const loggedIn = isLoggedIn();

  return (
    <View className="min-h-screen flex flex-col bg-[#F7F7F5] pb-10">
      {/* 主视觉 */}
      <View className="bg-primary px-6 pt-14 pb-12 relative overflow-hidden">
        <View className="absolute top-0 left-0 right-0 h-1 bg-[#C9A063]" />
        <View className="absolute right-6 top-16 w-16 h-16 border border-white opacity-20 rotate-45" />
        <View className="absolute right-12 top-24 w-10 h-10 border border-[#C9A063] opacity-40 rotate-45" />
        <Text className="block text-white text-3xl font-bold tracking-wide leading-tight">
          致敬奋斗者 建功新时代
        </Text>
        <Text className="block text-white text-sm mt-3 tracking-wide">评选活动正式启动</Text>
        <View className="mt-5 flex items-center gap-2">
          <View className="w-8 h-px bg-[#C9A063]" />
          <Text className="text-white text-xs tracking-wide">
            {loggedIn ? `欢迎，${getVoterName() || getVoterToken().slice(0, 6)}` : '集团党委 · 集团工会'}
          </Text>
          {loggedIn ? (
            <Text
              className="text-white text-xs underline ml-2"
              onClick={() => {
                clearSession();
                Taro.showToast({ title: '已退出登录', icon: 'none' });
                setTimeout(() => Taro.reLaunch({ url: '/pages/index/index' }), 300);
              }}
            >
              退出登录
            </Text>
          ) : null}
        </View>
      </View>

      {/* 活动列表 */}
      <View className="px-4 mt-5">
        <Text className="block text-base font-bold text-foreground mb-3">评选活动</Text>

        {loading ? (
          <Text className="block text-sm text-gray-500 text-center py-8">加载中…</Text>
        ) : activities.length === 0 ? (
          <Card className="rounded-lg border-border shadow-none">
            <CardContent className="p-6">
              <Text className="block text-sm text-gray-500 text-center">暂无进行中的活动</Text>
            </CardContent>
          </Card>
        ) : (
          activities.map((a) => (
            <Card key={a.id} className="rounded-lg border-border shadow-none mb-3">
              <CardContent className="p-5">
                <View className="flex flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="block text-base font-bold text-foreground">
                      {a.activity_name}
                    </Text>
                    <Text className="block text-xs text-gray-400 mt-1">{a.main_title}</Text>
                  </View>
                  <Badge variant={STATUS_VARIANT[a.status] || 'outline'}>
                    {STATUS_LABEL[a.status] || a.status}
                  </Badge>
                </View>

                <View className="mt-4 flex items-center justify-between">
                  <Text className="text-xs text-muted-foreground">活动时间</Text>
                  <Text className="text-xs text-foreground tabular-nums">
                    {formatRange(a.start_time ?? null, a.end_time ?? null)}
                  </Text>
                </View>

                <Button
                  className={`w-full mt-4 rounded-md ${
                    a.status === 'upcoming' || a.status === 'draft'
                      ? 'bg-gray-300 text-gray-500'
                      : 'bg-primary text-white'
                  }`}
                  disabled={a.status === 'upcoming' || a.status === 'draft'}
                  onClick={() => goActivity(a)}
                >
                  {a.status === 'upcoming' || a.status === 'draft'
                    ? '活动未开始'
                    : a.status === 'ended'
                      ? '查看结果'
                      : '进入投票'}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </View>

      {/* 管理端入口 */}
      <View className="text-center mt-6">
        <Text
          className="block text-xs text-gray-400"
          onClick={() => Taro.navigateTo({ url: '/pages/admin/login/index' })}
        >
          管理端
        </Text>
      </View>
    </View>
  );
};

export default IndexPage;
