export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/home/index',
    'pages/repair/index',
    'pages/firewall/index',
    'pages/puppet/index',
    'pages/finale/index',
    'pages/chat_sandbox/index',
    'pages/rings/index',
    'pages/mine/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#FAF6F0',
    navigationBarTitleText: '年轮',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#A89580',
    selectedColor: '#8C6239',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/home/index', text: '家' },
      { pagePath: 'pages/rings/index', text: '年轮' },
      { pagePath: 'pages/mine/index', text: '我的' }
    ]
  }
})
