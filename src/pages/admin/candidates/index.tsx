import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad, useReachBottom } from '@tarojs/taro';
import { fetchCandidatePool, CandidatePoolItem } from '@/services/vote';
import { adminPoolToggle } from '@/services/admin';
import { getToken } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/** 候选人管理：展示用户池所有用户，标记启用状态，支持批量启用/停用 */
export default function AdminCandidates() {
  const [list, setList] = useState<CandidatePoolItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedNos, setSelectedNos] = useState<string[]>([]);

  const load = async (p = 1, append = false, kw = keyword) => {
    try {
      const res = await fetchCandidatePool({ page: p, pageSize: 20, keyword: kw || undefined });
      setList(append ? [...list, ...res.list] : res.list);
      setTotal(res.total);
      setPage(p);
    } catch (e) {
      console.error('加载用户池失败', e);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    }
  };

  useLoad(() => {
    load(1);
  });

  useReachBottom(() => {
    if (list.length < total) load(page + 1, true);
  });

  const toggleSelect = (no: string) => {
    setSelectedNos((prev) => (prev.includes(no) ? prev.filter((x) => x !== no) : [...prev, no]));
  };

  const enterBatchMode = () => {
    setBatchMode(true);
    setSelectedNos([]);
  };

  const exitBatchMode = () => {
    setBatchMode(false);
    setSelectedNos([]);
  };

  const batchAction = async (action: 'enable' | 'disable') => {
    if (!selectedNos.length) {
      Taro.showToast({ title: '请先勾选用户', icon: 'none' });
      return;
    }
    try {
      await adminPoolToggle(getToken(), selectedNos, action);
      Taro.showToast({ title: action === 'enable' ? '已批量启用' : '已批量停用', icon: 'success' });
      exitBatchMode();
      load(1, false, keyword);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    }
  };

  /** 单条启用/停用切换 */
  const toggleSingle = async (item: CandidatePoolItem) => {
    const isActive = item.isCandidate && item.candidateStatus === 'active';
    const action: 'enable' | 'disable' = isActive ? 'disable' : 'enable';
    try {
      await adminPoolToggle(getToken(), [item.employee_no], action);
      Taro.showToast({ title: action === 'enable' ? '已启用' : '已停用', icon: 'success' });
      load(1, false, keyword);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    }
  };

  const statusOf = (item: CandidatePoolItem) => {
    if (item.isCandidate && item.candidateStatus === 'active') return 'active';
    if (item.isCandidate && item.candidateStatus === 'disabled') return 'disabled';
    return 'none';
  };

  return (
    <View className="min-h-screen bg-gray-50 pb-28">
      {/* 搜索栏 */}
      <View className="bg-white px-4 py-3 flex flex-row items-center gap-2">
        <View className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
          <Input
            className="w-full bg-transparent"
            placeholder="搜索工号/姓名"
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>
        <Button size="sm" onClick={() => load(1, false, keyword)}>搜索</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => Taro.navigateTo({ url: '/pages/admin/candidates-edit/index' })}
        >
          新增
        </Button>
      </View>

      {/* 筛选 + 批量开关 */}
      <View className="px-4 py-3 flex flex-row items-center gap-2 flex-wrap">
        <Badge variant="default">已启用</Badge>
        <Badge variant="secondary">已停用</Badge>
        <Badge variant="outline">未启用</Badge>
        <View className="flex-1" />
        <Button
          size="sm"
          variant={batchMode ? 'default' : 'outline'}
          onClick={batchMode ? exitBatchMode : enterBatchMode}
        >
          {batchMode ? '取消批量' : '批量管理'}
        </Button>
      </View>

      <Text className="block text-xs text-gray-500 px-4 mb-2">共 {total} 名用户</Text>

      {/* 用户列表 */}
      {list.map((item) => {
        const st = statusOf(item);
        return (
          <View
            key={item.employee_no}
            className="bg-white rounded-lg mx-4 mb-2 p-4 flex flex-row items-center"
            onClick={() => batchMode && toggleSelect(item.employee_no)}
          >
            {batchMode ? (
              <Checkbox
                className="mr-3"
                checked={selectedNos.includes(item.employee_no)}
                onCheckedChange={() => toggleSelect(item.employee_no)}
              />
            ) : null}
            <Avatar className="w-11 h-11 mr-3">
              <AvatarFallback>{item.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <View className="flex-1">
              <View className="flex flex-row items-center gap-2">
                <Text className="block text-base font-bold text-gray-900">{item.name}</Text>
                <Text className="block text-xs text-gray-400 tabular-nums">{item.employee_no}</Text>
              </View>
              <Text className="block text-xs text-gray-500 mt-1">
                {item.department || '-'} · {item.position || '-'}
              </Text>
            </View>
            <Badge
              variant={st === 'active' ? 'default' : st === 'disabled' ? 'secondary' : 'outline'}
            >
              {st === 'active' ? '已启用' : st === 'disabled' ? '已停用' : '未启用'}
            </Badge>
            {!batchMode ? (
              <Button
                size="sm"
                variant="outline"
                className="ml-3"
                onClick={() => toggleSingle(item)}
              >
                {st === 'active' ? '停用' : '启用'}
              </Button>
            ) : null}
          </View>
        );
      })}

      {list.length === 0 ? (
        <View className="bg-white rounded-lg mx-4 p-8">
          <Text className="block text-sm text-gray-500 text-center">暂无用户</Text>
        </View>
      ) : null}

      {/* 批量操作栏 */}
      {batchMode ? (
        <View
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            backgroundColor: '#fff',
            borderTop: '1px solid #E5E5E5',
            zIndex: 100,
          }}
        >
          <Text className="block text-sm text-gray-700">
            已选 <Text className="text-primary font-bold tabular-nums">{selectedNos.length}</Text> 人
          </Text>
          <View className="flex-1" />
          <Button size="sm" onClick={() => batchAction('enable')}>批量启用</Button>
          <Button size="sm" variant="outline" onClick={() => batchAction('disable')}>批量停用</Button>
        </View>
      ) : null}
    </View>
  );
}
