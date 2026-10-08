import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad, useReachBottom } from '@tarojs/taro';
import { fetchCandidates, Candidate } from '@/services/vote';
import { adminDeleteCandidate, adminBatchCandidates } from '@/services/admin';
import { getToken } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const STATUS_TEXT: Record<string, string> = {
  active: '启用',
  disabled: '停用',
  eliminated: '淘汰',
};

/** 候选人管理列表（含批量操作） */
export default function AdminCandidates() {
  const [list, setList] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = async (p = 1, append = false, kw = keyword, st = status) => {
    try {
      const res = await fetchCandidates({ page: p, pageSize: 20, keyword: kw || undefined, status: st || undefined });
      setList(append ? [...list, ...res.list] : res.list);
      setTotal(res.total);
      setPage(p);
    } catch (e) {
      console.error('加载候选人失败', e);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    }
  };

  useLoad(() => {
    load(1);
  });

  useReachBottom(() => {
    if (list.length < total) load(page + 1, true);
  });

  const handleDelete = async (id: string) => {
    const res = await Taro.showModal({ title: '确认删除', content: '删除后不可恢复，是否继续？' });
    if (res.confirm) {
      await adminDeleteCandidate(getToken(), id);
      Taro.showToast({ title: '已删除', icon: 'success' });
      load(1, false, keyword, status);
    }
  };

  /** 单条启用/停用切换 */
  const toggleStatus = async (item: Candidate) => {
    const next = item.status === 'active' ? 'disable' : 'enable';
    const label = next === 'enable' ? '启用' : '停用';
    try {
      await adminBatchCandidates(getToken(), [item.id], next);
      Taro.showToast({ title: `已${label}「${item.name}」`, icon: 'success' });
      load(1, false, keyword, status);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const enterBatchMode = () => {
    setBatchMode(true);
    setSelectedIds([]);
  };

  const exitBatchMode = () => {
    setBatchMode(false);
    setSelectedIds([]);
  };

  const batchAction = async (action: string) => {
    if (!selectedIds.length) {
      Taro.showToast({ title: '请先勾选候选人', icon: 'none' });
      return;
    }
    if (action === 'delete') {
      const res = await Taro.showModal({
        title: '批量删除',
        content: `确认删除选中的 ${selectedIds.length} 名候选人？此操作不可恢复。`,
      });
      if (!res.confirm) return;
    }
    try {
      await adminBatchCandidates(getToken(), selectedIds, action);
      Taro.showToast({ title: '操作成功', icon: 'success' });
      exitBatchMode();
      load(1, false, keyword, status);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    }
  };

  return (
    <View className="min-h-screen bg-gray-50 pb-28">
      {/* 搜索栏 */}
      <View className="bg-white px-4 py-3 flex flex-row items-center gap-2">
        <View className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
          <Input
            className="w-full bg-transparent"
            placeholder="搜索姓名/编号"
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>
        <Button size="sm" onClick={() => load(1, false, keyword, status)}>搜索</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => Taro.navigateTo({ url: '/pages/admin/candidates-edit/index' })}
        >
          新增
        </Button>
      </View>

      {/* 状态筛选 + 批量开关 */}
      <View className="px-4 py-3 flex flex-row items-center gap-2 flex-wrap">
        {['', 'active', 'disabled', 'eliminated'].map((s) => (
          <Badge
            key={s}
            variant={status === s ? 'default' : 'outline'}
            onClick={() => {
              setStatus(s);
              load(1, false, keyword, s);
            }}
          >
            {s === '' ? '全部' : STATUS_TEXT[s]}
          </Badge>
        ))}
        <View className="flex-1" />
        <Button size="sm" variant={batchMode ? 'default' : 'outline'} onClick={batchMode ? exitBatchMode : enterBatchMode}>
          {batchMode ? '取消批量' : '批量管理'}
        </Button>
      </View>

      <Text className="block text-xs text-gray-500 px-4 mb-2">共 {total} 人</Text>

      {/* 列表 */}
      {list.map((item) => (
        <View
          key={item.id}
          className="bg-white rounded-lg mx-4 mb-2 p-4 flex flex-row items-center"
          onClick={() => batchMode && toggleSelect(item.id)}
        >
          {batchMode ? (
            <Checkbox
              className="mr-3"
              checked={selectedIds.includes(item.id)}
              onCheckedChange={() => toggleSelect(item.id)}
            />
          ) : null}
          <Avatar className="w-11 h-11 mr-3">
            <AvatarFallback>{item.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <View className="flex-1">
            <View className="flex flex-row items-center gap-2">
              <Text className="block text-base font-bold text-gray-900">{item.name}</Text>
              <Text className="block text-xs text-gray-400 tabular-nums">{item.code}</Text>
            </View>
            <Text className="block text-xs text-gray-500 mt-1">
              {item.department} · {item.position || '-'}
            </Text>
          </View>
          <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
            {STATUS_TEXT[item.status] || item.status}
          </Badge>
          {!batchMode ? (
            <View className="flex flex-row gap-2 ml-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => Taro.navigateTo({ url: `/pages/admin/candidates-edit/index?id=${item.id}` })}
              >
                编辑
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}>
                删除
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleStatus(item)}
              >
                {item.status === 'active' ? '停用' : '启用'}
              </Button>
            </View>
          ) : null}
        </View>
      ))}

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
            已选 <Text className="text-primary font-bold tabular-nums">{selectedIds.length}</Text> 人
          </Text>
          <View className="flex-1" />
          <Button size="sm" onClick={() => batchAction('enable')}>批量启用</Button>
          <Button size="sm" variant="outline" onClick={() => batchAction('disable')}>批量停用</Button>
          <Button size="sm" variant="outline" onClick={() => batchAction('delete')}>批量删除</Button>
        </View>
      ) : null}
    </View>
  );
}
