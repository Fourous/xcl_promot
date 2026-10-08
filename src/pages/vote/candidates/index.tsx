import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useLoad, useReachBottom } from '@tarojs/taro';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CandidateCard from '@/components/business/candidate-card';
import {
  fetchCandidates,
  fetchConfig,
  fetchDepartments,
  Candidate,
  VoteConfig,
} from '@/services/vote';

const PAGE_SIZE = 20;

const CandidatesPage = () => {
  const [config, setConfig] = useState<VoteConfig | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  // 有序保存已选候选人 id，索引 + 1 即选中序号
  const [selected, setSelected] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const maxPicks = config?.max_picks ?? 9;
  const minPicks = config?.min_picks ?? 1;

  /** 加载候选人列表 */
  const loadCandidates = async (
    pageNum: number,
    append: boolean,
    kw: string,
    dept: string,
  ) => {
    setLoading(true);
    try {
      const res = await fetchCandidates({
        page: pageNum,
        pageSize: PAGE_SIZE,
        keyword: kw || undefined,
        department: dept || undefined,
      });
      setTotal(res.total);
      if (append) {
        setCandidates((prev) => [...prev, ...res.list]);
      } else {
        setCandidates(res.list);
      }
      setPage(pageNum);
    } catch (e) {
      console.error('加载候选人失败', e);
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useLoad(async () => {
    try {
      const cfg = await fetchConfig();
      setConfig(cfg);
      const deps = await fetchDepartments();
      setDepartments(deps);
    } catch (e) {
      console.error('加载配置失败', e);
    }
    await loadCandidates(1, false, '', '');
  });

  // 触底加载下一页
  useReachBottom(() => {
    if (loading || candidates.length >= total) return;
    loadCandidates(page + 1, true, keyword, department);
  });

  /** 切换勾选 */
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= maxPicks) {
        Taro.showToast({ title: `最多选择 ${maxPicks} 人`, icon: 'none' });
        return prev;
      }
      return [...prev, id];
    });
  };

  /** 搜索 */
  const handleSearch = () => {
    loadCandidates(1, false, keyword, department);
  };

  /** 切换部门 */
  const selectDepartment = (dept: string) => {
    setDepartment(dept);
    loadCandidates(1, false, keyword, dept);
  };

  /** 提交（第一版仅校验 + 友好提示，投票提交在后续阶段） */
  const submit = () => {
    if (selected.length < minPicks) {
      Taro.showToast({ title: `请至少选择 ${minPicks} 人`, icon: 'none' });
      return;
    }
    if (selected.length > maxPicks) {
      Taro.showToast({ title: `最多选择 ${maxPicks} 人`, icon: 'none' });
      return;
    }
    Taro.showToast({ title: '投票提交功能将在下一阶段开放', icon: 'none' });
  };

  return (
    <View className="min-h-screen bg-[#F7F7F5] pb-28">
      {/* 搜索栏 */}
      <View className="px-4 pt-4">
        <View className="flex items-center gap-2">
          <View className="flex-1">
            <Input
              value={keyword}
              onInput={(e) => setKeyword(e.detail.value)}
              placeholder="搜索姓名或编号"
            />
          </View>
          <Button variant="outline" size="sm" className="h-10 rounded-md" onClick={handleSearch}>
            搜索
          </Button>
        </View>
      </View>

      {/* 部门筛选 */}
      {config?.enable_department_filter !== false && departments.length > 0 && (
        <ScrollView scrollX className="mt-3">
          <View className="flex px-4 gap-2 whitespace-nowrap">
            <Badge
              variant={department === '' ? 'default' : 'outline'}
              className="rounded-md shrink-0"
              onClick={() => selectDepartment('')}
            >
              全部
            </Badge>
            {departments.map((d) => (
              <Badge
                key={d}
                variant={department === d ? 'default' : 'outline'}
                className="rounded-md shrink-0"
                onClick={() => selectDepartment(d)}
              >
                {d}
              </Badge>
            ))}
          </View>
        </ScrollView>
      )}

      {/* 候选人网格 */}
      <View className="px-4 mt-4 flex flex-wrap justify-between">
        {candidates.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            selectedIndex={selected.indexOf(c.id) + 1}
            onToggle={toggleSelect}
          />
        ))}
      </View>

      {/* 状态提示 */}
      {loading && (
        <Text className="block text-center text-sm text-muted-foreground py-4">加载中…</Text>
      )}
      {!loading && candidates.length === 0 && (
        <Text className="block text-center text-sm text-muted-foreground py-8">暂无候选人</Text>
      )}
      {!loading && candidates.length > 0 && candidates.length >= total && (
        <Text className="block text-center text-xs text-muted-foreground py-4">
          已加载全部 {total} 名候选人
        </Text>
      )}

      {/* 底部固定操作栏 */}
      <View
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: '#fff',
          borderTop: '1px solid #E5E5E5',
          zIndex: 100,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text className="block text-sm text-foreground">
            已选{' '}
            <Text className="text-primary font-bold tabular-nums">{selected.length}</Text>
            {' '}/ 最多 {maxPicks} 人
          </Text>
        </View>
        <Button
          className="bg-primary text-white rounded-md"
          disabled={selected.length < minPicks || selected.length > maxPicks}
          onClick={submit}
        >
          提交投票
        </Button>
      </View>
    </View>
  );
};

export default CandidatesPage;
