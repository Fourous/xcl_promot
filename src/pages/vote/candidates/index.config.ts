export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '候选人' })
  : { navigationBarTitleText: '候选人' };
