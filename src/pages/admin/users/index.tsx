import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad, useReachBottom } from '@tarojs/taro';
import { fetchUsers, resetUserPassword, adminImportUsers, createUser, adminUserImportBatches, adminDownloadUserTemplate } from '@/services/admin';
import { getToken } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, UserPlus, Download } from 'lucide-react-taro';

interface UserItem {
  id: string;
  employee_no: string;
  name: string;
  department: string | null;
  position: string | null;
  password_hash: string | null;
  status: string;
}

const EMPTY_FORM = { employeeNo: '', name: '', department: '', position: '', intro: '' };

/** 用户池管理（全局账号，工号唯一） */
export default function AdminUsers() {
  const [list, setList] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [importing, setImporting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [batches, setBatches] = useState<any[]>([]);

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

  const loadBatches = async () => {
    try {
      const res = await adminUserImportBatches(getToken());
      setBatches(res.data || []);
    } catch (e) {
      console.error('加载导入记录失败', e);
    }
  };

  useLoad(() => {
    load(1);
    loadBatches();
  });

  useReachBottom(() => {
    if (list.length < total) load(page + 1, true);
  });

  const setField = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    if (!form.employeeNo.trim() || !form.name.trim()) {
      Taro.showToast({ title: '请填写工号和姓名', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      await createUser(getToken(), {
        employeeNo: form.employeeNo.trim(),
        name: form.name.trim(),
        department: form.department.trim(),
        position: form.position.trim(),
        intro: form.intro.trim(),
      });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      Taro.showToast({ title: '新增成功', icon: 'success' });
      load(1, false, keyword);
    } catch (e: any) {
      const msg = e?.message || '新增失败';
      Taro.showToast({ title: msg.includes('已存在') ? '该工号已存在' : '新增失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

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

  const handleDownloadTemplate = async () => {
    try {
      await adminDownloadUserTemplate(getToken());
      Taro.showToast({ title: '模板已下载', icon: 'success' });
    } catch (e) {
      Taro.showToast({ title: '下载失败', icon: 'none' });
    }
  };

  const handleImport = async () => {
    const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
    if (!isWeapp) {
      Taro.showToast({ title: '请在微信小程序中使用导入', icon: 'none' });
      return;
    }
    try {
      const res = await Taro.chooseMessageFile({ count: 1, type: 'file' });
      const file = res.tempFiles[0];
      setImporting(true);
      Taro.showLoading({ title: '导入中...' });
      const importRes = await adminImportUsers(getToken(), file.path);
      const data = importRes.data || {};
      Taro.hideLoading();
      await Taro.showModal({
        title: '导入完成',
        content: `成功导入 ${data.imported || 0} 人，跳过 ${data.skipped || 0} 人（工号已存在），失败 ${data.errors?.length || 0} 条。\n导入后默认密码 = 工号，登录需修改密码。`,
        showCancel: false,
      });
      load(1, false, keyword);
      loadBatches();
    } catch (e) {
      console.error('导入失败', e);
      Taro.hideLoading();
      Taro.showToast({ title: '导入失败，请检查文件格式', icon: 'none' });
    } finally {
      setImporting(false);
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
        <View className="flex flex-row gap-2 mb-3">
          <Button className="flex-1" onClick={() => { setForm(EMPTY_FORM); setShowCreate(true); }}>
            <UserPlus size={16} color="#ffffff" className="mr-1" />
            <Text>新增用户</Text>
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={handleImport}
            disabled={importing}
          >
            <Upload size={16} color="#C80018" className="mr-1" />
            <Text>{importing ? '导入中...' : '导入用户'}</Text>
          </Button>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download size={16} color="#C80018" className="mr-1" />
            <Text>模板</Text>
          </Button>
        </View>

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

      <View className="px-4 mt-6">
        <Text className="block text-sm font-bold text-gray-900 mb-3">导入记录</Text>
        {batches.length === 0 ? (
          <View className="bg-white rounded-lg p-6">
            <Text className="block text-sm text-gray-400 text-center">暂无导入记录</Text>
          </View>
        ) : (
          batches.map((b: any) => (
            <View key={b.id} className="bg-white rounded-lg p-4 mb-2">
              <View className="flex flex-row items-center justify-between">
                <Text className="block text-sm font-semibold text-foreground">{b.file_name}</Text>
                <Text className="text-xs text-gray-500">成功 {b.success_rows} / 失败 {b.fail_rows}</Text>
              </View>
              <Text className="block text-xs text-gray-400 mt-1">
                {new Date(b.created_at).toLocaleString()} · 操作人 {b.operator || '-'}
              </Text>
            </View>
          ))
        )}
      </View>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增用户</DialogTitle>
          </DialogHeader>
          <View className="flex flex-col gap-3 py-2">
            <View className="bg-gray-50 rounded-lg px-3 py-2 border border-border">
              <Input
                className="w-full text-sm"
                placeholder="工号（必填，登录账号）"
                value={form.employeeNo}
                onInput={(e) => setField('employeeNo', e.detail.value)}
              />
            </View>
            <View className="bg-gray-50 rounded-lg px-3 py-2 border border-border">
              <Input
                className="w-full text-sm"
                placeholder="姓名（必填）"
                value={form.name}
                onInput={(e) => setField('name', e.detail.value)}
              />
            </View>
            <View className="bg-gray-50 rounded-lg px-3 py-2 border border-border">
              <Input
                className="w-full text-sm"
                placeholder="部门（选填）"
                value={form.department}
                onInput={(e) => setField('department', e.detail.value)}
              />
            </View>
            <View className="bg-gray-50 rounded-lg px-3 py-2 border border-border">
              <Input
                className="w-full text-sm"
                placeholder="岗位（选填）"
                value={form.position}
                onInput={(e) => setField('position', e.detail.value)}
              />
            </View>
            <View className="bg-gray-50 rounded-lg px-3 py-2 border border-border">
              <Input
                className="w-full text-sm"
                placeholder="简介（选填）"
                value={form.intro}
                onInput={(e) => setField('intro', e.detail.value)}
              />
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}
