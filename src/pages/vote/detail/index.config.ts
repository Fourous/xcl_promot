export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '候选人详情' })
  : { navigationBarTitleText: '候选人详情' };
