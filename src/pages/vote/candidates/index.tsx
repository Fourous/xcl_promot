import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useLoad, useReachBottom } from '@tarojs/taro';
import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CandidateCard from '@/components/business/candidate-card';
import {
  fetchCandidates,
  fetchConfig,
  fetchDepartments,
  fetchMyVote,
  submitVote,
  Candidate,
  VoteConfig,
} from '@/services/vote';
import {
  getSelectedIds,
  toggleSelect as toggleSelectUtil,
  clearSelection,
} from '@/utils/selection';
import { getVoterToken } from '@/utils/session';

const PAGE_SIZE = 20;

const CandidatesPage = () => {
  const [config, setConfig] = useState<VoteConfig | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  // 已选候选人 id（与详情页共享 storage 状态）
  const [selected, setSelected] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        status: 'active',
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
    // 恢复已选状态
    setSelected(getSelectedIds());

    // 未登录跳转登录页；已投票用户直接进入「我的投票」状态页
    try {
      const token = getVoterToken();
      if (!token) {
        Taro.redirectTo({ url: '/pages/vote/login/index' });
        return;
      }
      const myRes = await fetchMyVote(token);
      if (myRes.data?.hasVoted) {
        Taro.redirectTo({ url: '/pages/vote/mine/index' });
        return;
      }
    } catch (e) {
      console.error('检查投票状态失败', e);
    }

    // 加载配置与部门
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
    const { ids, full } = toggleSelectUtil(id, maxPicks);
    if (full) {
      Taro.showToast({ title: `最多选择 ${maxPicks} 人`, icon: 'none' });
      return;
    }
    setSelected(ids);
  };

  /** 实时搜索（防抖 300ms） */
  const onKeywordChange = (val: string) => {
    setKeyword(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadCandidates(1, false, val, department);
    }, 300);
  };

  /** 立即搜索（点击搜索按钮 / 键盘确认） */
  const handleSearch = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    loadCandidates(1, false, keyword, department);
  };

  /** 切换部门 */
  const selectDepartment = (dept: string) => {
    setDepartment(dept);
    loadCandidates(1, false, keyword, dept);
  };

  /** 提交投票：二次确认 + 幂等提交 + 成功跳转 */
  const submit = async () => {
    if (selected.length < minPicks || selected.length > maxPicks) return;
    const confirm = await Taro.showModal({
      title: '确认提交投票',
      content: `确认提交投票？提交后不可修改。当前已选 ${selected.length} 人。`,
    });
    if (!confirm.confirm) return;

    setSubmitting(true);
    try {
      const token = getVoterToken();
      const idempotencyToken = `vote_${token}_${Date.now()}`;
      await submitVote({ token, candidateIds: selected, idempotencyToken });
      clearSelection();
      setSelected([]);
      Taro.redirectTo({ url: '/pages/vote/success/index' });
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '提交失败，请重试', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="min-h-screen bg-[#F7F7F5] pb-28">
      {/* 搜索栏 */}
      <View className="px-4 pt-4">
        <View className="flex items-center gap-2">
          <View className="flex-1">
            <Input
              value={keyword}
              onInput={(e) => onKeywordChange(e.detail.value)}
              onConfirm={handleSearch}
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
          {selected.length < minPicks ? (
            <Text className="block text-xs text-gray-400 mt-1">至少选择 {minPicks} 人</Text>
          ) : null}
        </View>
        <Button
          className="bg-primary text-white rounded-md"
          disabled={selected.length < minPicks || selected.length > maxPicks || submitting}
          onClick={submit}
        >
          {submitting ? '提交中…' : '提交投票'}
        </Button>
      </View>
    </View>
  );
};

export default CandidatesPage;
