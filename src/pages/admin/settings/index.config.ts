export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '系统管理' })
  : { navigationBarTitleText: '系统管理' };
