import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter, useLoad } from '@tarojs/taro';
import { fetchCandidates } from '@/services/vote';
import { adminCreateCandidate, adminUpdateCandidate, fetchUsers } from '@/services/admin';
import { getToken } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface UserItem {
  id: string;
  employee_no: string;
  name: string;
  department: string | null;
  position: string | null;
}

/** 候选人新增/编辑（候选人从用户池选择，工号自动关联账号） */
export default function CandidateEdit() {
  const router = useRouter();
  const id = (router.params.id as string) || '';

  const [form, setForm] = useState({
    code: '',
    employee_no: '',
    name: '',
    department: '',
    position: '',
    intro: '',
    status: 'active',
  });
  const [userKeyword, setUserKeyword] = useState('');
  const [userResults, setUserResults] = useState<UserItem[]>([]);
  const [searching, setSearching] = useState(false);

  useLoad(async () => {
    if (id) {
      const res = await fetchCandidates({ page: 1, pageSize: 200 });
      const c = res.list.find((x) => x.id === id);
      if (c) {
        setForm({
          code: c.code,
          employee_no: c.employee_no || '',
          name: c.name,
          department: c.department,
          position: c.position || '',
          intro: c.intro || '',
          status: c.status,
        });
      }
    }
  });

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /** 搜索用户池 */
  const searchUsers = async (kw?: string) => {
    const key = (kw ?? userKeyword).trim();
    if (!key) {
      Taro.showToast({ title: '请输入工号或姓名', icon: 'none' });
      return;
    }
    setSearching(true);
    try {
      const res = await fetchUsers(getToken(), { keyword: key, page: 1, pageSize: 20 });
      setUserResults(res.data?.list || []);
    } catch (e) {
      Taro.showToast({ title: '搜索失败', icon: 'none' });
    } finally {
      setSearching(false);
    }
  };

  /** 从用户池选择，自动填充工号/姓名/部门/岗位 */
  const pickUser = (u: UserItem) => {
    setForm((prev) => ({
      ...prev,
      employee_no: u.employee_no,
      name: u.name,
      department: u.department || '',
      position: u.position || '',
    }));
    setUserResults([]);
    setUserKeyword('');
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.department) {
      Taro.showToast({ title: '请填写编号/姓名/部门', icon: 'none' });
      return;
    }
    if (!id && !form.employee_no) {
      Taro.showToast({ title: '请从用户池选择用户', icon: 'none' });
      return;
    }
    try {
      const token = getToken();
      if (id) {
        await adminUpdateCandidate(token, id, form);
      } else {
        await adminCreateCandidate(token, form);
      }
      Taro.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 400);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '保存失败', icon: 'none' });
    }
  };

  const field = (label: string, key: string, placeholder: string, readOnly = false) => (
    <View className="mb-4">
      <Text className="block text-sm font-bold text-gray-700 mb-2">{label}</Text>
      <View className="bg-gray-50 rounded-lg px-4 py-3">
        <Input
          className="w-full bg-transparent"
          placeholder={placeholder}
          value={(form as any)[key]}
          disabled={readOnly}
          onInput={(e) => set(key, e.detail.value)}
        />
      </View>
    </View>
  );

  return (
    <View className="min-h-screen bg-gray-50 px-4 py-6 pb-28">
      {/* 从用户池选择（仅新增时） */}
      {!id ? (
        <Card className="rounded-lg border-border shadow-none mb-4">
          <CardContent className="p-4">
            <Text className="block text-sm font-bold text-gray-900 mb-2">从用户池选择</Text>
            <Text className="block text-xs text-gray-500 mb-3">
              候选人必须来自用户池（工号账号），选中后自动带出姓名、部门、岗位。
            </Text>
            <View className="flex items-center gap-2">
              <View className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                <Input
                  className="w-full bg-transparent text-sm"
                  placeholder="输入工号 / 姓名搜索"
                  value={userKeyword}
                  onInput={(e) => setUserKeyword(e.detail.value)}
                  onConfirm={() => searchUsers()}
                />
              </View>
              <Button size="sm" onClick={() => searchUsers()} disabled={searching}>
                {searching ? '搜索中' : '搜索'}
              </Button>
            </View>

            {userResults.length > 0 ? (
              <View className="mt-3">
                {userResults.map((u) => (
                  <View
                    key={u.id}
                    className="border border-border rounded-lg p-3 mb-2"
                    onClick={() => pickUser(u)}
                  >
                    <View className="flex flex-row items-center justify-between">
                      <Text className="block text-sm font-semibold text-gray-900">
                        {u.name}（{u.employee_no}）
                      </Text>
                      <Text className="text-xs text-primary">选择</Text>
                    </View>
                    <Text className="block text-xs text-gray-500 mt-1">
                      {u.department || '未填部门'}
                      {u.position ? ` · ${u.position}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {form.employee_no ? (
              <View className="mt-3 bg-green-50 rounded-lg px-3 py-2">
                <Text className="block text-xs text-green-700">
                  已选择：{form.name}（{form.employee_no}）
                </Text>
              </View>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <View className="bg-white rounded-lg p-5">
        <Text className="block text-lg font-bold text-gray-900 mb-5">
          {id ? '编辑候选人' : '新增候选人'}
        </Text>

        {field('编号', 'code', '如 091')}
        {field('工号', 'employee_no', '从用户池自动带出', !!form.employee_no)}
        {field('姓名', 'name', '请输入姓名', !!form.employee_no)}
        {field('部门', 'department', '请输入部门', !!form.employee_no)}
        {field('岗位/职务', 'position', '请输入岗位')}

        <View className="mb-4">
          <Text className="block text-sm font-bold text-gray-700 mb-2">简介（≤200字）</Text>
          <View className="bg-gray-50 rounded-lg p-4">
            <Textarea
              style={{ width: '100%', minHeight: '100px', backgroundColor: 'transparent' }}
              placeholder="请输入简介"
              maxlength={200}
              value={form.intro}
              onInput={(e) => set('intro', e.detail.value)}
            />
          </View>
        </View>

        <View className="mb-2">
          <Text className="block text-sm font-bold text-gray-700 mb-2">状态</Text>
          <View className="flex flex-row gap-2">
            {[
              { v: 'active', t: '启用' },
              { v: 'disabled', t: '停用' },
              { v: 'eliminated', t: '淘汰' },
            ].map((s) => (
              <Button
                key={s.v}
                size="sm"
                variant={form.status === s.v ? 'default' : 'outline'}
                onClick={() => set('status', s.v)}
              >
                {s.t}
              </Button>
            ))}
          </View>
        </View>
      </View>

      <View
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          backgroundColor: '#fff',
          borderTop: '1px solid #e5e5e5',
        }}
      >
        <Button className="w-full" onClick={handleSave}>
          保存
        </Button>
      </View>
    </View>
  );
}
