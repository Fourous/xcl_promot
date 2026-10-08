export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '数据看板' })
  : { navigationBarTitleText: '数据看板' };
