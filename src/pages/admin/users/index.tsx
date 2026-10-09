import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad, useReachBottom } from '@tarojs/taro';
import { fetchUsers, resetUserPassword } from '@/services/admin';
import { getToken } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface UserItem {
  id: string;
  employee_no: string;
  name: string;
  department: string | null;
  position: string | null;
  password_hash: string | null;
  status: string;
}

/** 用户池管理（全局账号，工号唯一） */
export default function AdminUsers() {
  const [list, setList] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');

  const load = async (p = 1, append = false, kw = keyword) => {
    try {
      const res = await fetchUsers(getToken(), { keyword: kw || undefined, page: p, pageSize: 20 });
      const data = res.data || { list: [], total: 0 };
      setList(append ? [...list, ...data.list] : data.list);
      setTotal(data.total);
      setPage(p);
    } catch (e) {
      console.error('加载用户失败', e);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    }
  };

  useLoad(() => {
    load(1);
  });

  useReachBottom(() => {
    if (list.length < total) load(page + 1, true);
  });

  const handleReset = async (item: UserItem) => {
    const res = await Taro.showModal({
      title: '重置密码',
      content: `确定重置「${item.name}（${item.employee_no}）」的密码吗？重置后恢复默认密码（工号），该用户登录后需重新修改密码。`,
    });
    if (res.confirm) {
      await resetUserPassword(getToken(), item.employee_no);
      Taro.showToast({ title: '已重置', icon: 'success' });
      load(1, false, keyword);
    }
  };

  return (
    <View className="min-h-screen bg-[#F7F7F5] pb-8">
      <View className="bg-primary px-5 pt-12 pb-6">
        <Text className="block text-white text-xl font-bold">用户管理</Text>
        <Text className="block text-white text-xs mt-1 opacity-80">
          全局账号池，工号唯一，候选人从本池选择
        </Text>
      </View>

      <View className="px-4 mt-4">
        <View className="flex items-center gap-2">
          <View className="flex-1 bg-white rounded-lg px-3 py-2 border border-border">
            <Input
              className="w-full text-sm"
              placeholder="搜索工号 / 姓名"
              value={keyword}
              onInput={(e) => setKeyword(e.detail.value)}
              onConfirm={() => load(1, false)}
            />
          </View>
          <Button size="sm" onClick={() => load(1, false)}>
            搜索
          </Button>
        </View>

        <Text className="block text-xs text-gray-400 mt-3 mb-2">共 {total} 名用户</Text>

        {list.map((u) => (
          <Card key={u.id} className="rounded-lg border-border shadow-none mb-2">
            <CardContent className="p-4">
              <View className="flex flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex flex-row items-center gap-2">
                    <Text className="block text-sm font-semibold text-foreground">{u.name}</Text>
                    <Text className="text-xs text-gray-400">{u.employee_no}</Text>
                  </View>
                  <Text className="block text-xs text-muted-foreground mt-1">
                    {u.department || '未填部门'}
                    {u.position ? ` · ${u.position}` : ''}
                  </Text>
                </View>
                <Button size="sm" variant="outline" onClick={() => handleReset(u)}>
                  重置密码
                </Button>
              </View>
            </CardContent>
          </Card>
        ))}

        {list.length === 0 ? (
          <Text className="block text-sm text-gray-400 text-center py-10">暂无用户</Text>
        ) : null}
      </View>
    </View>
  );
}
