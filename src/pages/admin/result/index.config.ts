export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '结果统计与导出' })
  : { navigationBarTitleText: '结果统计与导出' };
