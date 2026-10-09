import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import {
  adminListAdmins,
  adminCreateAdmin,
  adminUpdateAdmin,
  adminDeleteAdmin,
  adminLogs,
  fetchActivities,
  adminCreateActivity,
  adminArchiveActivity,
  adminUpdateActivityStatus,
  adminResetVotes,
} from '@/services/admin';
import { getToken } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const TABS = [
  { key: 'activities', label: '活动管理' },
  { key: 'admins', label: '管理员' },
  { key: 'logs', label: '操作日志' },
];

const ROLE_TEXT: Record<string, string> = {
  super_admin: '超级管理员',
  operator: '运营',
  auditor: '只读审计',
};

const ACTIVITY_STATUS: Record<string, string> = {
  draft: '草稿',
  upcoming: '未开始',
  ongoing: '进行中',
  ended: '已结束',
  archived: '已归档',
};

/** 系统管理：活动管理、管理员账号、操作日志、数据归档 */
export default function SettingsPage() {
  const [tab, setTab] = useState('activities');
  const [admins, setAdmins] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ account: '', password: '', name: '', role: 'operator' });
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState({
    activity_name: '',
    main_title: '',
    start_time: '',
    end_time: '',
    winner_count: 9,
  });

  const loadAdmins = async () => {
    const res = await adminListAdmins(getToken());
    setAdmins(res.data || []);
  };

  const loadLogs = async () => {
    const res = await adminLogs(getToken());
    setLogs(res.data || []);
  };

  const loadActivities = async () => {
    const res = await fetchActivities();
    setActivities(res.data || []);
  };

  useLoad(() => {
    loadActivities();
    loadAdmins();
  });

  const switchTab = (key: string) => {
    setTab(key);
    if (key === 'logs') loadLogs();
    if (key === 'activities') loadActivities();
  };

  const handleCreateActivity = async () => {
    if (!activityForm.activity_name) {
      Taro.showToast({ title: '请输入活动名称', icon: 'none' });
      return;
    }
    try {
      await adminCreateActivity(getToken(), {
        ...activityForm,
        winner_count: Number(activityForm.winner_count) || 9,
        status: 'draft',
      });
      Taro.showToast({ title: '已创建活动', icon: 'success' });
      setShowActivityForm(false);
      setActivityForm({ activity_name: '', main_title: '', start_time: '', end_time: '', winner_count: 9 });
      loadActivities();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '创建失败', icon: 'none' });
    }
  };

  const handleArchiveActivity = async (id: number) => {
    const res = await Taro.showModal({ title: '确认归档', content: '归档后该活动不可再投票' });
    if (!res.confirm) return;
    try {
      await adminArchiveActivity(getToken(), id);
      Taro.showToast({ title: '已归档', icon: 'success' });
      loadActivities();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '归档失败', icon: 'none' });
    }
  };

  const handleStartActivity = async (id: number) => {
    try {
      await adminUpdateActivityStatus(getToken(), id, 'ongoing');
      Taro.showToast({ title: '已启动活动', icon: 'success' });
      loadActivities();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    }
  };

  const handleCreateAdmin = async () => {
    if (!form.account || !form.password || !form.name) {
      Taro.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    try {
      await adminCreateAdmin(getToken(), form);
      Taro.showToast({ title: '已新增', icon: 'success' });
      setShowForm(false);
      setForm({ account: '', password: '', name: '', role: 'operator' });
      loadAdmins();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '新增失败', icon: 'none' });
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    const res = await Taro.showModal({ title: '确认删除', content: '删除后不可恢复' });
    if (!res.confirm) return;
    try {
      await adminDeleteAdmin(getToken(), id);
      Taro.showToast({ title: '已删除', icon: 'success' });
      loadAdmins();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '删除失败', icon: 'none' });
    }
  };

  const handleToggleStatus = async (admin: any) => {
    try {
      await adminUpdateAdmin(getToken(), admin.id, {
        status: admin.status === 'active' ? 'locked' : 'active',
      });
      loadAdmins();
    } catch (e) {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  const handleResetVotes = async (id: number) => {
    const res = await Taro.showModal({
      title: '重置投票数据',
      content: '将清空该活动的所有投票记录并重置投票人状态，此操作不可恢复！',
    });
    if (!res.confirm) return;
    try {
      await adminResetVotes(getToken(), id);
      Taro.showToast({ title: '已重置', icon: 'success' });
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    }
  };

  return (
    <View className="min-h-screen bg-gray-50 pb-8">
      {/* Tab 切换 */}
      <View className="bg-white px-4 py-3 flex flex-row gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? 'default' : 'outline'}
            onClick={() => switchTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </View>

      {/* 活动管理 */}
      {tab === 'activities' ? (
        <View className="px-4 mt-4">
          <View className="flex flex-row items-center justify-between mb-3">
            <Text className="block text-base font-bold text-gray-900">活动列表</Text>
            <Button size="sm" onClick={() => setShowActivityForm((v) => !v)}>
              {showActivityForm ? '收起' : '新建活动'}
            </Button>
          </View>

          {showActivityForm ? (
            <View className="bg-white rounded-lg p-4 mb-3">
              <Text className="block text-sm font-bold text-gray-900 mb-3">新建活动</Text>
              {[
                { key: 'activity_name', label: '活动名称', placeholder: '如：2026 年度评选活动' },
                { key: 'main_title', label: '主标题', placeholder: '主视觉标题' },
              ].map((f) => (
                <View key={f.key} className="mb-3">
                  <Text className="block text-xs text-gray-500 mb-1">{f.label}</Text>
                  <View className="bg-gray-50 rounded-lg px-3 py-2">
                    <Input
                      className="w-full bg-transparent"
                      placeholder={f.placeholder}
                      value={(activityForm as any)[f.key]}
                      onInput={(e) => setActivityForm((p) => ({ ...p, [f.key]: e.detail.value }))}
                    />
                  </View>
                </View>
              ))}
              <View className="mb-3">
                <Text className="block text-xs text-gray-500 mb-1">当选名额</Text>
                <View className="bg-gray-50 rounded-lg px-3 py-2">
                  <Input
                    className="w-full bg-transparent"
                    type="number"
                    value={String(activityForm.winner_count)}
                    onInput={(e) =>
                      setActivityForm((p) => ({ ...p, winner_count: Number(e.detail.value) || 0 }))
                    }
                  />
                </View>
              </View>
              <Button className="w-full" onClick={handleCreateActivity}>创建活动</Button>
            </View>
          ) : null}

          {activities.map((a: any) => (
            <View key={a.id} className="bg-white rounded-lg p-4 mb-2">
              <View className="flex flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="block text-sm font-bold text-gray-900">
                    {a.activity_name}
                  </Text>
                  <Text className="block text-xs text-gray-500 mt-1">
                    ID {a.id} · {ACTIVITY_STATUS[a.status] || a.status} · 当选 {a.winner_count} 名
                  </Text>
                </View>
                <Badge variant={a.status === 'ongoing' ? 'default' : 'secondary'}>
                  {ACTIVITY_STATUS[a.status] || a.status}
                </Badge>
              </View>
              <View className="flex flex-row gap-2 mt-3">
                {a.status !== 'ongoing' && a.status !== 'archived' ? (
                  <Button size="sm" onClick={() => handleStartActivity(a.id)}>启动</Button>
                ) : null}
                {a.status !== 'archived' ? (
                  <Button size="sm" variant="outline" onClick={() => handleArchiveActivity(a.id)}>
                    归档
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => handleResetVotes(a.id)}>
                  重置投票数据
                </Button>
              </View>
            </View>
          ))}
          <Text className="block text-xs text-gray-500 mt-2">
            每个活动拥有独立的候选人、投票人清单与投票数据，互不影响。
          </Text>
        </View>
      ) : null}

      {/* 管理员管理 */}
      {tab === 'admins' ? (
        <View className="px-4 mt-4">
          <View className="flex flex-row items-center justify-between mb-3">
            <Text className="block text-base font-bold text-gray-900">管理员账号</Text>
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? '收起' : '新增'}
            </Button>
          </View>

          {showForm ? (
            <View className="bg-white rounded-lg p-4 mb-3">
              {[
                { key: 'account', label: '账号', placeholder: '登录账号' },
                { key: 'password', label: '密码', placeholder: '登录密码' },
                { key: 'name', label: '姓名', placeholder: '真实姓名' },
              ].map((f) => (
                <View key={f.key} className="mb-3">
                  <Text className="block text-xs text-gray-500 mb-1">{f.label}</Text>
                  <View className="bg-gray-50 rounded-lg px-3 py-2">
                    <Input
                      className="w-full bg-transparent"
                      placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onInput={(e) => setForm((p) => ({ ...p, [f.key]: e.detail.value }))}
                    />
                  </View>
                </View>
              ))}
              <View className="mb-3">
                <Text className="block text-xs text-gray-500 mb-1">角色</Text>
                <View className="flex flex-row gap-2">
                  {Object.entries(ROLE_TEXT).map(([k, v]) => (
                    <Button
                      key={k}
                      size="sm"
                      variant={form.role === k ? 'default' : 'outline'}
                      onClick={() => setForm((p) => ({ ...p, role: k }))}
                    >
                      {v}
                    </Button>
                  ))}
                </View>
              </View>
              <Button className="w-full" onClick={handleCreateAdmin}>保存</Button>
            </View>
          ) : null}

          {admins.map((a: any) => (
            <View key={a.id} className="bg-white rounded-lg p-4 mb-2">
              <View className="flex flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="block text-sm font-bold text-gray-900">
                    {a.name}（{a.account}）
                  </Text>
                  <Text className="block text-xs text-gray-500 mt-1">
                    {ROLE_TEXT[a.role] || a.role}
                  </Text>
                </View>
                <Badge variant={a.status === 'active' ? 'default' : 'secondary'}>
                  {a.status === 'active' ? '正常' : '锁定'}
                </Badge>
                <View className="flex flex-row gap-2 ml-3">
                  <Button size="sm" variant="outline" onClick={() => handleToggleStatus(a)}>
                    {a.status === 'active' ? '锁定' : '解锁'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDeleteAdmin(a.id)}>
                    删除
                  </Button>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* 操作日志 */}
      {tab === 'logs' ? (
        <View className="px-4 mt-4">
          {logs.length === 0 ? (
            <View className="bg-white rounded-lg p-8">
              <Text className="block text-sm text-gray-500 text-center">暂无操作日志</Text>
            </View>
          ) : (
            logs.map((l: any) => (
              <View key={l.id} className="bg-white rounded-lg p-4 mb-2">
                <View className="flex flex-row items-center justify-between">
                  <Text className="block text-sm font-bold text-gray-900">{l.action}</Text>
                  <Text className="block text-xs text-gray-500">
                    {new Date(l.created_at).toLocaleString()}
                  </Text>
                </View>
                <Text className="block text-xs text-gray-500 mt-1">
                  {l.admin_name || '-'} · {l.params_summary || '-'}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}

    </View>
  );
}
