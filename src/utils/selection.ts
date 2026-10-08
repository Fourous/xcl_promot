import Taro from '@tarojs/taro';

const KEY = 'selected_candidate_ids';

/** 读取已选候选人 id（有序，序号即下标） */
export function getSelectedIds(): string[] {
  return Taro.getStorageSync(KEY) || [];
}

/** 写入已选候选人 id */
export function setSelectedIds(ids: string[]) {
  Taro.setStorageSync(KEY, ids);
}

/** 切换选中状态，返回最新列表与是否已满 */
export function toggleSelect(id: string, maxPicks: number): { ids: string[]; full: boolean } {
  const ids = getSelectedIds();
  const idx = ids.indexOf(id);
  if (idx >= 0) {
    ids.splice(idx, 1);
  } else {
    if (ids.length >= maxPicks) {
      return { ids, full: true };
    }
    ids.push(id);
  }
  setSelectedIds(ids);
  return { ids, full: false };
}

/** 清空选择 */
export function clearSelection() {
  Taro.removeStorageSync(KEY);
}
