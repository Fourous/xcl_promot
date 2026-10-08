export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '我的投票' })
  : { navigationBarTitleText: '我的投票' };
