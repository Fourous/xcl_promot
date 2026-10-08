export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '评选投票',
      navigationBarBackgroundColor: '#C80018',
      navigationBarTextStyle: 'white',
    })
  : {
      navigationBarTitleText: '评选投票',
      navigationBarBackgroundColor: '#C80018',
      navigationBarTextStyle: 'white',
    };
