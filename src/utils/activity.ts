import Taro from '@tarojs/taro';

const KEY = 'vote_activity_id';

/** 获取当前活动 ID（默认 1） */
export function getActivityId(): number {
  try {
    return Number(Taro.getStorageSync(KEY)) || 1;
  } catch {
    return 1;
  }
}

/** 设置当前活动 ID */
export function setActivityId(id: number) {
  try {
    Taro.setStorageSync(KEY, id);
  } catch {
    // ignore
  }
}
