export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '投票成功' })
  : { navigationBarTitleText: '投票成功' };
