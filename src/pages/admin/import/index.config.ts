export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: 'Excel 批量导入' })
  : { navigationBarTitleText: 'Excel 批量导入' };
