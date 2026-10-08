import Taro from '@tarojs/taro';

const TOKEN_KEY = 'admin_token';
const ADMIN_KEY = 'admin_info';

/** 获取管理员登录 token */
export function getToken(): string {
  return Taro.getStorageSync(TOKEN_KEY) || '';
}

/** 保存管理员登录 token */
export function setToken(token: string) {
  Taro.setStorageSync(TOKEN_KEY, token);
}

/** 清除登录态 */
export function clearToken() {
  Taro.removeStorageSync(TOKEN_KEY);
  Taro.removeStorageSync(ADMIN_KEY);
}

/** 获取当前管理员信息 */
export function getAdminInfo(): any {
  return Taro.getStorageSync(ADMIN_KEY) || null;
}

/** 保存当前管理员信息 */
export function setAdminInfo(info: any) {
  Taro.setStorageSync(ADMIN_KEY, info);
}
