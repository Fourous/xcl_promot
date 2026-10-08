import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import { useLoad } from '@tarojs/taro';
import { fetchResults } from '@/services/vote';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import StatePage from '@/components/business/state-page';

/** 结果页（实时公示或结果公示时间到后可见） */
export default function Result() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useLoad(async () => {
    try {
      const res = await fetchResults();
      setData(res.data);
    } catch (e) {
      console.error('加载结果失败', e);
    } finally {
      setLoading(false);
    }
  });

  if (loading) return <StatePage type="loading" />;

  if (!data?.published) {
    return (
      <StatePage
        type="empty"
        title="结果暂未公示"
        description="评选结果将在公示时间后统一展示"
      />
    );
  }

  const list = data.list || [];
  const winnerCount = data.winners || 9;
  const maxVotes = list.length ? list[0].votes : 1;

  return (
    <View className="min-h-screen bg-gray-50 pb-8">
      <View className="px-4 py-6">
        <Text className="block text-lg font-bold text-gray-900 mb-1">评选结果</Text>
        <Text className="block text-xs text-gray-500 mb-5">
          共 {list.length} 名候选人，前 {winnerCount} 名当选
        </Text>

        {list.map((item: any, i: number) => {
          const isWinner = i < winnerCount;
          const rate = maxVotes ? Math.round((item.votes / maxVotes) * 100) : 0;
          return (
            <View
              key={item.id}
              className={`bg-white rounded-lg mb-3 p-4 ${
                isWinner ? 'border border-[#C9A063]' : ''
              }`}
            >
              <View className="flex flex-row items-center">
                <Text className="block text-lg font-bold text-gray-400 tabular-nums w-10">
                  {i + 1}
                </Text>
                <Avatar className="w-12 h-12 mr-3">
                  <AvatarFallback>{item.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <View className="flex-1">
                  <View className="flex flex-row items-center gap-2">
                    <Text className="block text-base font-bold text-gray-900">{item.name}</Text>
                    {isWinner ? (
                      <Badge className="bg-[#C9A063] text-white border-none">当选</Badge>
                    ) : null}
                  </View>
                  <Text className="block text-xs text-gray-500 mt-1">{item.department}</Text>
                </View>
                <View className="text-right">
                  <Text className="block text-xl font-bold text-[#C80018] tabular-nums">
                    {item.votes}
                  </Text>
                  <Text className="block text-xs text-gray-500">票</Text>
                </View>
              </View>
              <View className="mt-3 flex flex-row items-center gap-2">
                <View className="flex-1">
                  <Progress value={rate} />
                </View>
                <Text className="block text-xs text-gray-500 tabular-nums">{rate}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
