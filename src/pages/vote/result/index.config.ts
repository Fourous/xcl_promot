export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '评选结果' })
  : { navigationBarTitleText: '评选结果' };
