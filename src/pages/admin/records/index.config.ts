export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '投票记录查询' })
  : { navigationBarTitleText: '投票记录查询' };
