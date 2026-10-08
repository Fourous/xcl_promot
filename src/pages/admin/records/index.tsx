import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { Network } from '@/network';
import { adminVoteRecords } from '@/services/admin';
import { getToken } from '@/utils/auth';
import { getActivityId } from '@/utils/activity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** 投票记录查询 */
export default function RecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    candidateName: '',
    department: '',
    startTime: '',
    endTime: '',
  });

  const load = async () => {
    try {
      const res = await adminVoteRecords(getToken(), {
        department: filters.department || undefined,
        startTime: filters.startTime || undefined,
        endTime: filters.endTime || undefined,
      });
      const list = res.data || [];
      // 前端按候选人姓名二次过滤（后端仅支持部门/时间/候选人id）
      if (filters.candidateName) {
        setRecords(
          list.filter((r: any) =>
            String(r.candidates?.name || '').includes(filters.candidateName),
          ),
        );
      } else {
        setRecords(list);
      }
    } catch (e) {
      console.error('加载记录失败', e);
    }
  };

  useLoad(() => {
    load();
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

  const field = (label: string, key: string, placeholder: string) => (
    <View className="mb-3">
      <Text className="block text-xs text-gray-500 mb-1">{label}</Text>
      <View className="bg-gray-50 rounded-lg px-3 py-2">
        <Input
          className="w-full bg-transparent"
          placeholder={placeholder}
          value={(filters as any)[key]}
          onInput={(e) => setFilters((p) => ({ ...p, [key]: e.detail.value }))}
        />
      </View>
    </View>
  );

  return (
    <View className="min-h-screen bg-gray-50 pb-8">
      <View className="bg-white px-4 py-4">
        <Text className="block text-base font-bold text-gray-900 mb-3">筛选条件</Text>
        {field('候选人姓名', 'candidateName', '输入姓名关键词')}
        {field('部门', 'department', '输入部门')}
        {field('开始时间', 'startTime', '2026-01-01 00:00:00')}
        {field('结束时间', 'endTime', '2027-01-31 23:59:59')}
        <View className="flex flex-row gap-3">
          <Button className="flex-1" onClick={load}>查询</Button>
          <Button className="flex-1" variant="outline" onClick={exportResult}>
            导出评选结果表
          </Button>
        </View>
      </View>

      <View className="px-4 mt-4">
        <Text className="block text-sm text-gray-500 mb-2">共 {records.length} 条记录</Text>
        {records.length === 0 ? (
          <View className="bg-white rounded-lg p-8">
            <Text className="block text-sm text-gray-500 text-center">暂无投票记录</Text>
          </View>
        ) : (
          records.map((r: any) => (
            <View key={r.id} className="bg-white rounded-lg p-4 mb-2">
              <View className="flex flex-row items-center justify-between">
                <Text className="block text-sm font-bold text-gray-900">
                  {r.candidates?.name || '-'}（{r.candidates?.code || '-'}）
                </Text>
                <Text className="block text-xs text-gray-500">
                  {new Date(r.created_at).toLocaleString()}
                </Text>
              </View>
              <Text className="block text-xs text-gray-500 mt-1">
                投票人：{r.voters?.name || '匿名'} · {r.candidates?.department || '-'}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
