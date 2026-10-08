export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '投票人验证' })
  : { navigationBarTitleText: '投票人验证' };
