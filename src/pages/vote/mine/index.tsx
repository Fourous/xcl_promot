import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import { useLoad } from '@tarojs/taro';
import { fetchMyVote } from '@/services/vote';
import { getVoterToken } from '@/utils/session';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import StatePage from '@/components/business/state-page';

/** 我的投票记录 */
export default function MyVote() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useLoad(async () => {
    try {
      const token = getVoterToken();
      const res = await fetchMyVote(token);
      setData(res.data);
    } catch (e) {
      console.error('加载投票记录失败', e);
    } finally {
      setLoading(false);
    }
  });

  if (loading) return <StatePage type="loading" />;

  if (!data?.hasVoted) {
    return (
      <StatePage
        type="empty"
        title="尚未投票"
        description="您还未提交投票，快去为您心中的候选人投票吧"
      />
    );
  }

  return (
    <View className="min-h-screen bg-gray-50 pb-8">
      <View className="px-4 py-6">
        <View className="bg-white rounded-lg p-5 mb-4">
          <Text className="block text-lg font-bold text-gray-900">已完成投票</Text>
          <Text className="block text-xs text-gray-500 mt-2">
            投票时间：{data.votedAt ? new Date(data.votedAt).toLocaleString() : '-'}
          </Text>
        </View>

        {data.anonymous ? (
          <View className="bg-white rounded-lg p-5">
            <Text className="block text-sm text-gray-600">
              本次投票为匿名投票，不展示具体投票对象。
            </Text>
          </View>
        ) : (
          <View>
            <Text className="block text-base font-bold text-gray-900 mb-3">我投给了</Text>
            {(data.picks || []).map((p: any) => (
              <View key={p.candidate_id} className="bg-white rounded-lg p-4 mb-2 flex flex-row items-center">
                <Avatar className="w-11 h-11 mr-3">
                  <AvatarFallback>{p.candidates?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <View className="flex-1">
                  <Text className="block text-base font-bold text-gray-900">{p.candidates?.name}</Text>
                  <Text className="block text-xs text-gray-500 mt-1">
                    {p.candidates?.department} · {p.candidates?.position}
                  </Text>
                </View>
                <Text className="block text-sm text-gray-500 tabular-nums">
                  {p.candidates?.code}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
