export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '投票规则配置' })
  : { navigationBarTitleText: '投票规则配置' };
