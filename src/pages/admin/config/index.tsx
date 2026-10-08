import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { fetchConfig, VoteConfig } from '@/services/vote';
import { adminSaveConfig } from '@/services/admin';
import { getToken } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

type FieldType = 'text' | 'number' | 'textarea' | 'boolean';

interface FieldDef {
  key: keyof VoteConfig;
  label: string;
  type: FieldType;
  placeholder?: string;
}

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: '基础信息',
    fields: [
      { key: 'activity_name', label: '活动名称', type: 'text' },
      { key: 'main_title', label: '主标题', type: 'text' },
      { key: 'subtitle', label: '副标题', type: 'text' },
      { key: 'organizer', label: '主办单位', type: 'text' },
      { key: 'description', label: '活动说明', type: 'textarea' },
    ],
  },
  {
    title: '时间设置',
    fields: [
      { key: 'start_time', label: '投票开始时间', type: 'text', placeholder: '2026-01-01 00:00:00' },
      { key: 'end_time', label: '投票结束时间', type: 'text', placeholder: '2027-01-31 23:59:59' },
      { key: 'result_publish_time', label: '结果公示时间', type: 'text', placeholder: '2027-02-01 00:00:00' },
    ],
  },
  {
    title: '投票规则',
    fields: [
      { key: 'min_picks', label: '最少可选人数', type: 'number' },
      { key: 'max_picks', label: '最多可选人数', type: 'number' },
      { key: 'candidate_pool_size', label: '候选人池总数', type: 'number' },
      { key: 'winner_count', label: '最终当选名额', type: 'number' },
      { key: 'allow_duplicate', label: '允许重复投给同一人', type: 'boolean' },
      { key: 'allow_modify', label: '允许修改已提交投票', type: 'boolean' },
    ],
  },
  {
    title: '展示设置',
    fields: [
      { key: 'anonymous', label: '匿名投票', type: 'boolean' },
      { key: 'realtime_public', label: '实时公示票数', type: 'boolean' },
      { key: 'page_size', label: '候选人列表每页数量', type: 'number' },
      { key: 'enable_department_filter', label: '开启部门筛选', type: 'boolean' },
    ],
  },
  {
    title: '结果设置',
    fields: [
      { key: 'device_vote_limit', label: '单设备投票上限', type: 'number' },
      { key: 'ip_vote_limit', label: '单 IP 投票上限', type: 'number' },
    ],
  },
];

const SORT_OPTIONS = [
  { v: 'code', t: '编号升序' },
  { v: 'random', t: '随机打乱' },
];

const TIE_OPTIONS = [
  { v: 'code_asc', t: '编号靠前者优先' },
  { v: 'tie', t: '并列并列' },
  { v: 'second_round', t: '进入第二轮' },
];

/** 投票规则配置 */
export default function ConfigPage() {
  const [config, setConfig] = useState<VoteConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useLoad(async () => {
    try {
      const c = await fetchConfig();
      setConfig(c);
    } catch (e) {
      console.error('加载配置失败', e);
    }
  });

  const setField = (key: keyof VoteConfig, value: any) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!config) return;
    if (config.min_picks > config.max_picks) {
      Taro.showToast({ title: '最少可选不能大于最多可选', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      await adminSaveConfig(getToken(), config);
      Taro.showToast({ title: '已保存并生效', icon: 'success' });
    } catch (e) {
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Text className="block text-gray-500">加载中…</Text>
      </View>
    );
  }

  return (
    <View className="min-h-screen bg-gray-50 px-4 py-5 pb-28">
      {SECTIONS.map((section) => (
        <View key={section.title} className="bg-white rounded-lg p-5 mb-4">
          <Text className="block text-base font-bold text-gray-900 mb-4">{section.title}</Text>
          {section.fields.map((f) => (
            <View key={f.key as string} className="mb-4 last:mb-0">
              {f.type === 'boolean' ? (
                <View className="flex flex-row items-center justify-between py-2">
                  <Text className="block text-sm text-gray-700">{f.label}</Text>
                  <Switch
                    checked={!!config[f.key]}
                    onCheckedChange={(v) => setField(f.key, v)}
                  />
                </View>
              ) : f.type === 'textarea' ? (
                <>
                  <Text className="block text-sm font-bold text-gray-700 mb-2">{f.label}</Text>
                  <View className="bg-gray-50 rounded-lg p-4">
                    <Textarea
                      style={{ width: '100%', minHeight: '80px', backgroundColor: 'transparent' }}
                      placeholder={f.placeholder || '请输入内容'}
                      value={(config[f.key] as string) || ''}
                      onInput={(e) => setField(f.key, e.detail.value)}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text className="block text-sm font-bold text-gray-700 mb-2">{f.label}</Text>
                  <View className="bg-gray-50 rounded-lg px-4 py-3">
                    <Input
                      className="w-full bg-transparent"
                      type={f.type === 'number' ? 'number' : 'text'}
                      placeholder={f.placeholder || '请输入内容'}
                      value={String(config[f.key] ?? '')}
                      onInput={(e) =>
                        setField(
                          f.key,
                          f.type === 'number' ? Number(e.detail.value) : e.detail.value,
                        )
                      }
                    />
                  </View>
                </>
              )}
            </View>
          ))}
        </View>
      ))}

      {/* 排序方式 */}
      <View className="bg-white rounded-lg p-5 mb-4">
        <Text className="block text-base font-bold text-gray-900 mb-3">候选人展示排序</Text>
        <View className="flex flex-row gap-2">
          {SORT_OPTIONS.map((o) => (
            <Button
              key={o.v}
              size="sm"
              variant={config.candidate_sort === o.v ? 'default' : 'outline'}
              onClick={() => setField('candidate_sort', o.v)}
            >
              {o.t}
            </Button>
          ))}
        </View>
        <Text className="block text-xs text-gray-500 mt-2">
          随机打乱：每人每次访问顺序固定（按 openid 种子）
        </Text>
      </View>

      {/* 同票策略 */}
      <View className="bg-white rounded-lg p-5 mb-4">
        <Text className="block text-base font-bold text-gray-900 mb-3">同票并列处理策略</Text>
        <View className="flex flex-row gap-2 flex-wrap">
          {TIE_OPTIONS.map((o) => (
            <Button
              key={o.v}
              size="sm"
              variant={config.tie_strategy === o.v ? 'default' : 'outline'}
              onClick={() => setField('tie_strategy', o.v)}
            >
              {o.t}
            </Button>
          ))}
        </View>
      </View>

      <View style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', backgroundColor: '#fff', borderTop: '1px solid #e5e5e5' }}>
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存并生效'}
        </Button>
      </View>
    </View>
  );
}
