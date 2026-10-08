import Taro from '@tarojs/taro';
import { voterLogin } from '@/services/vote';

const KEY = 'voter_openid';

/** 读取已登录 openid */
export function getOpenid(): string {
  return Taro.getStorageSync(KEY) || '';
}

/** 保存 openid */
export function setOpenid(openid: string) {
  Taro.setStorageSync(KEY, openid);
}

/** 确保已登录，返回 openid（首次登录时自动获取） */
export async function ensureLogin(): Promise<string> {
  const exist = getOpenid();
  if (exist) return exist;

  let code = '';
  if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
    const loginRes = await Taro.login();
    code = loginRes.code || '';
  }
  if (!code) {
    code = `h5_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }
  const { openid } = await voterLogin(code);
  setOpenid(openid);
  return openid;
}
