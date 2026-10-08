import { View, Text } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { verifyVoter } from '@/services/vote';
import { ensureLogin, setVerified } from '@/utils/session';

/** 投票人身份校验页（工号 + 姓名，仅名单内人员可投票） */
const VoterLoginPage = () => {
  const [openid, setOpenid] = useState('');
  const [employeeNo, setEmployeeNo] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useLoad(async () => {
    try {
      const id = await ensureLogin();
      setOpenid(id);
    } catch (e) {
      console.error('微信登录失败', e);
    }
  });

  const handleLogin = async () => {
    const emp = employeeNo.trim();
    const nm = name.trim();
    if (!emp) {
      Taro.showToast({ title: '请输入工号', icon: 'none' });
      return;
    }
    if (!nm) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!openid) {
      Taro.showToast({ title: '微信授权中，请稍候重试', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await verifyVoter({ openid, employeeNo: emp, name: nm });
      if (res.status === 'success') {
        setVerified(true);
        Taro.showToast({ title: '身份校验通过', icon: 'success' });
        setTimeout(() => {
          Taro.redirectTo({ url: '/pages/vote/candidates/index' });
        }, 500);
      } else {
        Taro.showToast({ title: '校验未通过', icon: 'none' });
      }
    } catch (e: any) {
      const msg = e?.message || '校验失败，请核对工号与姓名';
      Taro.showToast({ title: msg, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="min-h-screen flex flex-col bg-[#F7F7F5]">
      {/* 红色主视觉 */}
      <View className="bg-primary px-6 pt-14 pb-10 relative overflow-hidden">
        <View className="absolute top-0 left-0 right-0 h-1 bg-[#C9A063]" />
        <View className="absolute right-6 top-16 w-16 h-16 border border-white opacity-20 rotate-45" />
        <View className="absolute right-12 top-24 w-10 h-10 border border-[#C9A063] opacity-40 rotate-45" />
        <Text className="block text-white text-2xl font-bold tracking-wide">投票人身份验证</Text>
        <Text className="block text-white text-sm mt-3 tracking-wide opacity-90">
          请填写您的工号与姓名进行核验
        </Text>
      </View>

      {/* 表单 */}
      <View className="px-4 mt-5">
        <Card className="rounded-lg border-border shadow-none">
          <CardContent className="p-5">
            <View className="mb-4">
              <Text className="block text-sm font-bold text-foreground mb-2">工号</Text>
              <View className="bg-gray-50 rounded-lg px-4 py-3">
                <Input
                  className="w-full bg-transparent"
                  placeholder="请输入工号（如 EMP001）"
                  value={employeeNo}
                  onInput={(e) => setEmployeeNo(e.detail.value)}
                />
              </View>
            </View>
            <View className="mb-2">
              <Text className="block text-sm font-bold text-foreground mb-2">姓名</Text>
              <View className="bg-gray-50 rounded-lg px-4 py-3">
                <Input
                  className="w-full bg-transparent"
                  placeholder="请输入姓名"
                  value={name}
                  onInput={(e) => setName(e.detail.value)}
                />
              </View>
            </View>
            <Text className="block text-xs text-gray-400 mt-3 leading-5">
              仅活动名单内人员可参与投票，请确保工号与姓名与名单一致。
            </Text>
          </CardContent>
        </Card>
      </View>

      {/* 登录按钮 */}
      <View className="px-4 mt-6 pb-10">
        <Button
          className="w-full h-12 rounded-md bg-primary text-white"
          onClick={handleLogin}
          disabled={submitting}
        >
          {submitting ? '校验中…' : '验证并进入投票'}
        </Button>
      </View>
    </View>
  );
};

export default VoterLoginPage;
