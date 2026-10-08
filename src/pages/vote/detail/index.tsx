import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter, useLoad } from '@tarojs/taro';
import { fetchCandidates, fetchConfig } from '@/services/vote';
import { getSelectedIds, toggleSelect } from '@/utils/selection';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/** 候选人详情页（可直接勾选/取消，与列表实时同步） */
export default function CandidateDetail() {
  const router = useRouter();
  const id = (router.params.id as string) || '';

  const [candidate, setCandidate] = useState<any>(null);
  const [selected, setSelected] = useState(false);
  const [maxPicks, setMaxPicks] = useState(9);

  useLoad(async () => {
    try {
      const [cfg, page] = await Promise.all([
        fetchConfig(),
        fetchCandidates({ page: 1, pageSize: 200 }),
      ]);
      setMaxPicks(cfg.max_picks);
      const c = page.list.find((x) => x.id === id);
      setCandidate(c || null);
      setSelected(getSelectedIds().includes(id));
    } catch (e) {
      console.error('加载候选人详情失败', e);
    }
  });

  const handleToggle = () => {
    const { ids, full } = toggleSelect(id, maxPicks);
    if (full) {
      Taro.showToast({ title: `最多选择 ${maxPicks} 人`, icon: 'none' });
      return;
    }
    setSelected(ids.includes(id));
  };

  if (!candidate) {
    return (
      <View className="flex items-center justify-center min-h-screen">
        <Text className="block text-gray-500">加载中…</Text>
      </View>
    );
  }

  return (
    <View className="min-h-screen bg-gray-50 pb-28">
      {/* 顶部信息区 */}
      <View className="bg-white px-6 py-8 flex flex-col items-center">
        <Avatar className="w-24 h-24 mb-4">
          <AvatarFallback className="text-3xl">{candidate.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <Text className="block text-2xl font-bold text-gray-900">{candidate.name}</Text>
        <Text className="block text-sm text-gray-500 mt-2 tabular-nums">编号 {candidate.code}</Text>
        <View className="flex flex-row gap-2 mt-3">
          <Badge variant="secondary">{candidate.department}</Badge>
          {candidate.position ? <Badge variant="outline">{candidate.position}</Badge> : null}
        </View>
      </View>

      {/* 简介 */}
      <View className="bg-white mt-3 px-6 py-6">
        <Text className="block text-base font-bold text-gray-900 mb-3">个人简介</Text>
        <Text className="block text-sm text-gray-600 leading-7">
          {candidate.intro || '暂无简介'}
        </Text>
      </View>

      {/* 底部操作栏 */}
      <View
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          padding: '12px 16px',
          backgroundColor: '#fff',
          borderTop: '1px solid #e5e5e5',
        }}
      >
        <Button
          className="w-full"
          variant={selected ? 'outline' : 'default'}
          onClick={handleToggle}
        >
          {selected ? '取消选择' : '选择此候选人'}
        </Button>
      </View>
    </View>
  );
}
