import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { changePassword } from '@/services/vote';
import { getVoterToken, getEmployeeNo } from '@/utils/session';

/** 修改密码页（首次登录强制跳转） */
const ChangePasswordPage = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const employeeNo = getEmployeeNo();

  const handleSubmit = async () => {
    const oldPwd = oldPassword.trim();
    const newPwd = newPassword.trim();
    const confirmPwd = confirmPassword.trim();

    if (!oldPwd) {
      Taro.showToast({ title: '请输入原密码', icon: 'none' });
      return;
    }
    if (!newPwd || newPwd.length < 4) {
      Taro.showToast({ title: '新密码至少 4 位', icon: 'none' });
      return;
    }
    if (newPwd !== confirmPwd) {
      Taro.showToast({ title: '两次输入的新密码不一致', icon: 'none' });
      return;
    }
    if (newPwd === oldPwd) {
      Taro.showToast({ title: '新密码不能与原密码相同', icon: 'none' });
      return;
    }

    const token = getVoterToken();
    if (!token) {
      Taro.showToast({ title: '登录状态已失效，请重新登录', icon: 'none' });
      setTimeout(() => Taro.reLaunch({ url: '/pages/index/index' }), 600);
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(token, oldPwd, newPwd);
      Taro.showToast({ title: '密码修改成功', icon: 'success' });
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/index/index' });
      }, 600);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '修改失败，请重试', icon: 'none' });
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
        <Text className="block text-white text-2xl font-bold tracking-wide">修改密码</Text>
        <Text className="block text-white text-sm mt-3 tracking-wide opacity-90">
          首次登录需设置新密码后方可继续
        </Text>
      </View>

      {/* 表单 */}
      <View className="px-4 mt-5">
        <Card className="rounded-lg border-border shadow-none">
          <CardContent className="p-5">
            <View className="mb-4">
              <Text className="block text-sm font-bold text-foreground mb-2">
                工号 <Text className="text-gray-400 font-normal">（账号）</Text>
              </Text>
              <View className="bg-gray-100 rounded-lg px-4 py-3">
                <Text className="block text-gray-600">{employeeNo || '-'}</Text>
              </View>
            </View>
            <View className="mb-4">
              <Text className="block text-sm font-bold text-foreground mb-2">原密码</Text>
              <View className="bg-gray-50 rounded-lg px-4 py-3">
                <Input
                  className="w-full bg-transparent"
                  password
                  placeholder="首次登录请输入初始密码（工号）"
                  value={oldPassword}
                  onInput={(e) => setOldPassword(e.detail.value)}
                />
              </View>
            </View>
            <View className="mb-4">
              <Text className="block text-sm font-bold text-foreground mb-2">新密码</Text>
              <View className="bg-gray-50 rounded-lg px-4 py-3">
                <Input
                  className="w-full bg-transparent"
                  password
                  placeholder="请输入新密码"
                  value={newPassword}
                  onInput={(e) => setNewPassword(e.detail.value)}
                />
              </View>
            </View>
            <View className="mb-2">
              <Text className="block text-sm font-bold text-foreground mb-2">确认新密码</Text>
              <View className="bg-gray-50 rounded-lg px-4 py-3">
                <Input
                  className="w-full bg-transparent"
                  password
                  placeholder="请再次输入新密码"
                  value={confirmPassword}
                  onInput={(e) => setConfirmPassword(e.detail.value)}
                />
              </View>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* 提交按钮 */}
      <View className="px-4 mt-6 pb-10">
        <Button
          className="w-full h-12 rounded-md bg-primary text-white"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '提交中…' : '确认修改'}
        </Button>
      </View>
    </View>
  );
};

export default ChangePasswordPage;
