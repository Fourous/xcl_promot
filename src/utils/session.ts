import Taro from '@tarojs/taro';

const TOKEN_KEY = 'voter_token';
const EMPLOYEE_NO_KEY = 'voter_employee_no';
const NAME_KEY = 'voter_name';

export interface VoterSession {
  token: string;
  employeeNo: string;
  name: string;
}

/** 读取投票人登录 token */
export function getVoterToken(): string {
  return Taro.getStorageSync(TOKEN_KEY) || '';
}

/** 读取当前投票人工号 */
export function getEmployeeNo(): string {
  return Taro.getStorageSync(EMPLOYEE_NO_KEY) || '';
}

/** 读取当前投票人姓名 */
export function getVoterName(): string {
  return Taro.getStorageSync(NAME_KEY) || '';
}

/** 是否已登录 */
export function isLoggedIn(): boolean {
  return !!getVoterToken();
}

/** 保存登录态 */
export function saveSession(session: VoterSession) {
  Taro.setStorageSync(TOKEN_KEY, session.token);
  Taro.setStorageSync(EMPLOYEE_NO_KEY, session.employeeNo);
  Taro.setStorageSync(NAME_KEY, session.name);
}

/** 清除登录态 */
export function clearSession() {
  Taro.removeStorageSync(TOKEN_KEY);
  Taro.removeStorageSync(EMPLOYEE_NO_KEY);
  Taro.removeStorageSync(NAME_KEY);
}
