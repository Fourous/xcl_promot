import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { fetchDashboard, fetchActivities, adminCreateActivity } from '@/services/admin';
import { getToken, getAdminInfo } from '@/utils/auth';
import { getActivityId, setActivityId } from '@/utils/activity';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import StatePage from '@/components/business/state-page';
import { Users, FileSpreadsheet, Settings, List, Trophy, ShieldCheck, Plus } from 'lucide-react-taro';

const NAV_ITEMS = [
  { key: 'candidates', label: '候选人管理', icon: Users, url: '/pages/admin/candidates/index' },
  { key: 'import', label: 'Excel 导入', icon: FileSpreadsheet, url: '/pages/admin/import/index' },
  { key: 'config', label: '规则配置', icon: Settings, url: '/pages/admin/config/index' },
  { key: 'records', label: '投票记录', icon: List, url: '/pages/admin/records/index' },
  { key: 'result', label: '结果统计', icon: Trophy, url: '/pages/admin/result/index' },
  { key: 'settings', label: '系统管理', icon: ShieldCheck, url: '/pages/admin/settings/index' },
];

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  upcoming: '未开始',
  ongoing: '进行中',
  ended: '已结束',
  archived: '已归档',
};

/** 管理端数据看板 */
export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTime, setRefreshTime] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState(getActivityId());
  const [showCreate, setShowCreate] = useState(false);
  const [activityName, setActivityName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async (aid?: number) => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetchDashboard(token, aid);
      setData(res.data);
      setRefreshTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('加载看板失败', e);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const res = await fetchActivities();
      setActivities(res.data || []);
    } catch (e) {
      console.error('加载活动列表失败', e);
    }
  };

  const switchActivity = (id: number) => {
    setCurrentId(id);
    setActivityId(id);
    load(id);
  };

  const handleCreateActivity = async () => {
    if (!activityName.trim()) {
      Taro.showToast({ title: '请输入活动名称', icon: 'none' });
      return;
    }
    setCreating(true);
    try {
      const res = await adminCreateActivity(getToken(), { activity_name: activityName.trim() });
      const newId = res.data?.id;
      Taro.showToast({ title: '已创建活动', icon: 'success' });
      setShowCreate(false);
      setActivityName('');
      await loadActivities();
      if (newId) switchActivity(newId);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '创建失败', icon: 'none' });
    } finally {
      setCreating(false);
    }
  };

  useLoad(() => {
    loadActivities();
    load();
  });

  if (loading && !data) return <StatePage type="loading" />;

  const admin = getAdminInfo();
  const rank = data?.top9 || [];

  return (
    <View className="min-h-screen bg-gray-50 pb-8">
      {/* 顶部栏 */}
      <View className="bg-[#C80018] px-5 py-6">
        <View className="flex flex-row items-center justify-between">
          <View>
            <Text className="block text-white font-bold text-lg">数据看板</Text>
            <Text className="block text-white text-xs mt-1 opacity-80">
              {admin?.name || '管理员'} · 刷新于 {refreshTime}
            </Text>
          </View>
          <Button variant="secondary" size="sm" onClick={() => load()}>
            刷新
          </Button>
        </View>
      </View>

      {/* 活动切换 */}
      <View className="px-4 -mt-4">
        <View className="bg-white rounded-lg p-3 mb-4">
          <View className="flex flex-row items-center justify-between mb-2">
            <Text className="block text-sm font-bold text-gray-900">当前活动</Text>
            <View className="flex flex-row items-center" onClick={() => setShowCreate(true)}>
              <Plus size={14} color="#C80018" />
              <Text className="text-xs text-[#C80018] ml-1">新建活动</Text>
            </View>
          </View>
          <ScrollView scrollX className="whitespace-nowrap" enhanced showScrollbar={false}>
            <View className="flex flex-row gap-2">
              {activities.map((a: any) => (
                <View
                  key={a.id}
                  onClick={() => switchActivity(a.id)}
                  className={`inline-block px-3 py-2 rounded-md border ${
                    a.id === currentId ? 'border-[#C80018] bg-red-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Text className={`block text-xs ${a.id === currentId ? 'text-[#C80018] font-bold' : 'text-gray-700'}`}>
                    {a.activity_name}
                  </Text>
                  <Text className="block text-xs text-gray-400 mt-1">{STATUS_LABEL[a.status] || a.status}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 功能导航 */}
      <View className="px-4 -mt-4">
        <View className="bg-white rounded-lg p-2 mb-4">
          <View className="flex flex-wrap">
            {NAV_ITEMS.map((item) => (
              <View
                key={item.key}
                className="w-1/3 p-2"
                onClick={() => Taro.navigateTo({ url: item.url })}
              >
                <View className="flex flex-col items-center py-2">
                  <item.icon size={24} color="#C80018" />
                  <Text className="block text-xs text-gray-700 mt-1">{item.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 指标卡 */}
      <View className="px-4 -mt-4">
        <View className="flex flex-wrap gap-3">
          {[
            { label: '候选人总数', value: data?.totalCandidates || 0 },
            { label: '已投票人数', value: data?.votedCount || 0 },
            { label: '总票数', value: data?.totalVotes || 0 },
            { label: '投票率', value: `${data?.voteRate || 0}%` },
          ].map((item) => (
            <View key={item.label} className="bg-white rounded-lg px-4 py-4 w-[48%]">
              <Text className="block text-xs text-gray-500">{item.label}</Text>
              <Text className="block text-2xl font-bold text-gray-900 mt-2 tabular-nums">
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 排名前9 */}
      <View className="px-4 mt-6">
        <Text className="block text-base font-bold text-gray-900 mb-3">实时排名（前 9 名）</Text>
        {rank.length === 0 ? (
          <View className="bg-white rounded-lg p-6">
            <Text className="block text-sm text-gray-500 text-center">暂无投票数据</Text>
          </View>
        ) : (
          rank.map((item: any) => (
            <View key={item.id} className="bg-white rounded-lg p-4 mb-2 flex flex-row items-center">
              <Text className="block text-lg font-bold text-gray-400 tabular-nums w-8">{item.rank}</Text>
              <Avatar className="w-10 h-10 mr-3">
                <AvatarFallback>{item.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <View className="flex-1">
                <Text className="block text-base font-bold text-gray-900">{item.name}</Text>
                <Text className="block text-xs text-gray-500 mt-1">{item.department}</Text>
              </View>
              <View className="text-right">
                <Text className="block text-lg font-bold text-[#C80018] tabular-nums">{item.votes}</Text>
                <Text className="block text-xs text-gray-500">票 · {item.rate}%</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* 部门参与度 */}
      {data?.departmentStats?.length ? (
        <View className="px-4 mt-6">
          <Text className="block text-base font-bold text-gray-900 mb-3">部门参与度</Text>
          <View className="bg-white rounded-lg p-4">
            {data.departmentStats.map((d: any) => (
              <View key={d.department} className="flex flex-row items-center justify-between py-2 border-b border-gray-100 last:border-none">
                <Text className="block text-sm text-gray-700">{d.department}</Text>
                <Badge variant="secondary">{d.count} 人</Badge>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* 新建活动弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建活动</DialogTitle>
          </DialogHeader>
          <View className="bg-gray-50 rounded-lg px-3 py-2 mt-2">
            <Input
              className="w-full bg-transparent"
              placeholder="请输入活动名称，如：2026 年度评选活动"
              value={activityName}
              onInput={(e) => setActivityName(e.detail.value)}
            />
          </View>
          <Text className="block text-xs text-gray-500 mt-2">
            新建后可在候选人管理、Excel 导入中为该活动独立维护人员与规则。
          </Text>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreateActivity} disabled={creating}>
              {creating ? '创建中…' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}
