export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '候选人编辑' })
  : { navigationBarTitleText: '候选人编辑' };
