import { useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { fetchCaptcha, adminLogin } from '@/services/admin';
import { setToken, setAdminInfo } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** 管理员登录页（账号 + 密码 + 图形验证码） */
export default function AdminLogin() {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [loading, setLoading] = useState(false);

  const refreshCaptcha = async () => {
    try {
      const res = await fetchCaptcha();
      setCaptchaId(res.data.captchaId);
      setCaptchaImage(res.data.captchaImage);
    } catch (e) {
      console.error('获取验证码失败', e);
    }
  };

  useLoad(() => {
    refreshCaptcha();
  });

  const handleLogin = async () => {
    if (!account || !password || !captchaCode) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      const res = await adminLogin({ account, password, captchaId, captchaCode });
      setToken(res.data.token);
      setAdminInfo(res.data.admin);
      Taro.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages/admin/dashboard/index' });
      }, 400);
    } catch (e: any) {
      const msg = e?.message || e?.errMsg || '登录失败';
      Taro.showToast({ title: String(msg).includes('验证码') ? '验证码错误' : '登录失败', icon: 'none' });
      refreshCaptcha();
      setCaptchaCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="min-h-screen bg-[#C80018] flex flex-col">
      {/* 顶部品牌区 */}
      <View className="pt-16 pb-10 px-8 flex flex-col items-center">
        <Text className="block text-2xl font-bold text-white tracking-widest">评选活动管理端</Text>
        <Text className="block text-sm text-white mt-3 opacity-80">集团先进工作者评选</Text>
      </View>

      {/* 登录卡片 */}
      <View className="flex-1 bg-white rounded-t-lg px-6 pt-8">
        <Text className="block text-xl font-bold text-gray-900 mb-6">管理员登录</Text>

        <View className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
          <Input
            className="w-full bg-transparent"
            placeholder="请输入账号"
            value={account}
            onInput={(e) => setAccount(e.detail.value)}
          />
        </View>

        <View className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
          <Input
            className="w-full bg-transparent"
            password
            placeholder="请输入密码"
            value={password}
            onInput={(e) => setPassword(e.detail.value)}
          />
        </View>

        <View className="flex flex-row items-center gap-3 mb-8">
          <View className="flex-1 bg-gray-50 rounded-lg px-4 py-3">
            <Input
              className="w-full bg-transparent"
              placeholder="验证码"
              value={captchaCode}
              onInput={(e) => setCaptchaCode(e.detail.value)}
            />
          </View>
          <View onClick={refreshCaptcha} className="shrink-0">
            {captchaImage ? (
              <Image src={captchaImage} style={{ width: '110px', height: '44px' }} />
            ) : (
              <View className="w-28 h-11 bg-gray-100 rounded flex items-center justify-center">
                <Text className="block text-xs text-gray-400">加载中</Text>
              </View>
            )}
          </View>
        </View>

        <Button className="w-full" disabled={loading} onClick={handleLogin}>
          {loading ? '登录中…' : '登录'}
        </Button>

        <Text className="block text-xs text-gray-400 text-center mt-8">
          仅限管理员访问，操作将被记录
        </Text>
      </View>
    </View>
  );
}
