export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '候选人管理' })
  : { navigationBarTitleText: '候选人管理' };
