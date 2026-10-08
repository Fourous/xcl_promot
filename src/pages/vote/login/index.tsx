import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { voteLogin } from '@/services/vote';
import { saveSession } from '@/utils/session';

/** 投票人账号登录页（工号 + 密码，首次登录强制改密） */
const VoterLoginPage = () => {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    const acc = account.trim();
    const pwd = password.trim();
    if (!acc) {
      Taro.showToast({ title: '请输入工号', icon: 'none' });
      return;
    }
    if (!pwd) {
      Taro.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await voteLogin(acc, pwd);
      const d = res.data;
      saveSession({ token: d.token, employeeNo: d.employeeNo, name: d.name });

      if (d.needChangePassword) {
        Taro.showToast({ title: '请先修改初始密码', icon: 'none' });
        setTimeout(() => {
          Taro.redirectTo({ url: '/pages/vote/change-password/index' });
        }, 600);
      } else {
        Taro.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => {
          Taro.reLaunch({ url: '/pages/index/index' });
        }, 600);
      }
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '登录失败，请核对工号与密码', icon: 'none' });
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
        <Text className="block text-white text-2xl font-bold tracking-wide">投票人登录</Text>
        <Text className="block text-white text-sm mt-3 tracking-wide opacity-90">
          请使用您的工号登录参与投票
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
                  value={account}
                  onInput={(e) => setAccount(e.detail.value)}
                />
              </View>
            </View>
            <View className="mb-2">
              <Text className="block text-sm font-bold text-foreground mb-2">密码</Text>
              <View className="bg-gray-50 rounded-lg px-4 py-3">
                <Input
                  className="w-full bg-transparent"
                  password
                  placeholder="请输入密码"
                  value={password}
                  onInput={(e) => setPassword(e.detail.value)}
                />
              </View>
            </View>
            <Text className="block text-xs text-gray-400 mt-3 leading-5">
              首次登录初始密码为您的工号，登录后需修改密码。
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
          {submitting ? '登录中…' : '登录'}
        </Button>
      </View>
    </View>
  );
};

export default VoterLoginPage;
