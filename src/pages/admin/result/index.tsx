import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { Network } from '@/network';
import { adminFetchRanking } from '@/services/admin';
import { getToken } from '@/utils/auth';
import { getActivityId } from '@/utils/activity';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

/** 结果统计与导出（管理端，不受公示限制） */
export default function ResultPage() {
  const [data, setData] = useState<any>(null);

  useLoad(async () => {
    try {
      const res = await adminFetchRanking(getToken());
      setData(res.data);
    } catch (e) {
      console.error('加载结果失败', e);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    }
  });

  const exportResult = async () => {
    try {
      await Network.downloadFile({
        url: `/api/stats/export?activityId=${getActivityId()}`,
        header: { Authorization: `Bearer ${getToken()}` },
      });
      Taro.showToast({ title: '已导出', icon: 'success' });
    } catch (e) {
      Taro.showToast({ title: '导出失败', icon: 'none' });
    }
  };

  if (!data) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Text className="block text-gray-500">加载中…</Text>
      </View>
    );
  }

  const list = data.list || [];

  return (
    <View className="min-h-screen bg-gray-50 pb-8">
      <View className="bg-white px-4 py-5 mb-4">
        <Text className="block text-lg font-bold text-gray-900 mb-1">评选结果排名</Text>
        <Text className="block text-xs text-gray-400 mb-3">当前活动：{data.activityName || '—'}</Text>
        <View className="flex flex-row gap-3">
          <Badge variant="default">已投票 {data.votedCount} 人</Badge>
          <Badge variant="secondary">总票数 {data.totalVotes}</Badge>
          <Badge variant="default">当选 {data.winners} 名</Badge>
        </View>
        <Button className="mt-3" variant="outline" onClick={exportResult}>
          一键导出评选结果表
        </Button>
      </View>

      {list.length === 0 ? (
        <View className="flex flex-col items-center justify-center py-20">
          <Text className="block text-gray-500">暂无投票数据</Text>
        </View>
      ) : (
        list.map((item: any) => (
          <View key={item.id} className="bg-white rounded-lg mx-4 mb-2 p-4">
            <View className="flex flex-row items-center">
              <Text
                className={`block w-8 text-center text-lg font-bold ${
                  item.isWinner ? 'text-[#C9A063]' : 'text-gray-400'
                }`}
              >
                {item.rank}
              </Text>
              <View className="flex-1 ml-2">
                <View className="flex flex-row items-center gap-2">
                  <Text className="block text-base font-bold text-gray-900">{item.name}</Text>
                  <Text className="block text-xs text-gray-400 tabular-nums">{item.code}</Text>
                  {item.isWinner ? (
                    <Badge className="bg-[#C9A063] text-white">当选</Badge>
                  ) : null}
                </View>
                <Text className="block text-xs text-gray-500 mt-1">{item.department}</Text>
              </View>
              <Text className="block text-base font-bold text-gray-900 tabular-nums">
                {item.votes}
                <Text className="block text-xs font-normal text-gray-400">票</Text>
              </Text>
            </View>
            <View className="mt-3">
              <Progress value={Number((item.rate * 100).toFixed(1))} />
              <Text className="block text-xs text-gray-500 mt-1">
                得票率 {(item.rate * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
