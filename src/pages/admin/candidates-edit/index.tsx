import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter, useLoad } from '@tarojs/taro';
import { fetchCandidates } from '@/services/vote';
import { adminCreateCandidate, adminUpdateCandidate } from '@/services/admin';
import { getToken } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/** 候选人新增/编辑 */
export default function CandidateEdit() {
  const router = useRouter();
  const id = (router.params.id as string) || '';

  const [form, setForm] = useState({
    code: '',
    name: '',
    department: '',
    position: '',
    intro: '',
    status: 'active',
  });

  useLoad(async () => {
    if (id) {
      const res = await fetchCandidates({ page: 1, pageSize: 200 });
      const c = res.list.find((x) => x.id === id);
      if (c) {
        setForm({
          code: c.code,
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

  const handleSave = async () => {
    if (!form.code || !form.name || !form.department) {
      Taro.showToast({ title: '请填写编号/姓名/部门', icon: 'none' });
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

  const field = (label: string, key: string, placeholder: string) => (
    <View className="mb-4">
      <Text className="block text-sm font-bold text-gray-700 mb-2">{label}</Text>
      <View className="bg-gray-50 rounded-lg px-4 py-3">
        <Input
          className="w-full bg-transparent"
          placeholder={placeholder}
          value={(form as any)[key]}
          onInput={(e) => set(key, e.detail.value)}
        />
      </View>
    </View>
  );

  return (
    <View className="min-h-screen bg-gray-50 px-4 py-6 pb-28">
      <View className="bg-white rounded-lg p-5">
        <Text className="block text-lg font-bold text-gray-900 mb-5">
          {id ? '编辑候选人' : '新增候选人'}
        </Text>

        {field('编号', 'code', '如 091')}
        {field('姓名', 'name', '请输入姓名')}
        {field('部门', 'department', '请输入部门')}
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

      <View style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', backgroundColor: '#fff', borderTop: '1px solid #e5e5e5' }}>
        <Button className="w-full" onClick={handleSave}>保存</Button>
      </View>
    </View>
  );
}
