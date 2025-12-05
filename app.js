App({
  globalData: {
    userInfo: null,
    projectList: wx.getStorageSync('projectList') || [],
    timerData: {
      isTracking: false,
      currentProjectId: '',
      startTime: 0,
      timerInterval: null
    },
    // 百度语音识别配置（已填入你的密钥）
    baiduYuyin: {
      apiKey: 'mQImQDd3K1blg25bgsh5fSnm',
      secretKey: '72xGrDMgEfIagnMBNVeawA7LxdFbFK8Q',
      appId: '121195969',
      tokenUrl: 'https://aip.baidubce.com/oauth/2.0/token'
    }
  },

  // 格式化秒数为 时:分:秒
  formatTime(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  },

  // 保存项目列表到本地缓存
  saveProjectList(list) {
    this.globalData.projectList = list;
    wx.setStorageSync('projectList', list);
  },

  // 检查项目是否超时
  checkProjectTimeout(projectId) {
    const projectList = this.globalData.projectList;
    const targetProject = projectList.find(item => item.id === projectId);
    if (targetProject) {
      const isTimeout = targetProject.totalTime > 3600 || (targetProject.deadline && new Date(targetProject.deadline) < new Date());
      if (isTimeout && targetProject.status !== 'timeout') {
        targetProject.status = 'timeout';
        this.saveProjectList(projectList);
        wx.vibrateShort({ type: 'light' });
        wx.showToast({
          title: `【${targetProject.name}】进度超时！`,
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  // 初始化百度语音 AccessToken
  initBaiduYuyinAccessToken() {
    // 修复：使用箭头函数绑定 this，避免 that 未定义
    const baiduAccessToken = wx.getStorageSync("baidu_yuyin_access_token");
    
    if (!baiduAccessToken) {
      this.getBaiduYuyinAccessToken(); // 直接使用 this，无需 that
    } else {
      const baiduTime = wx.getStorageSync("baidu_yuyin_time");
      // 修复：正确计算 Token 过期时间（百度 Token 有效期 30 天，单位：毫秒）
      const expireTime = 30 * 24 * 60 * 60 * 1000; // 30天的毫秒数
      if (Date.now() - baiduTime > expireTime) {
        this.getBaiduYuyinAccessToken();
      }
    }
  },

  // 获取百度语音 AccessToken（修复网络请求逻辑）
  getBaiduYuyinAccessToken() {
    const { baiduYuyin } = this.globalData;
    
    // 修复：兼容基础库 3.12.1 的 POST 请求格式
    wx.request({
      url: baiduYuyin.tokenUrl,
      data: {
        grant_type: 'client_credentials',
        client_id: baiduYuyin.apiKey,
        client_secret: baiduYuyin.secretKey
      },
      method: 'POST',
      // 修复：调整请求头，适配基础库 3.12.1
      header: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      // 修复：添加超时和失败处理
      timeout: 10000,
      success: (res) => {
        if (res.data && res.data.access_token) {
          wx.setStorageSync("baidu_yuyin_access_token", res.data.access_token);
          wx.setStorageSync("baidu_yuyin_time", Date.now());
          console.log('百度语音 Token 获取成功：', res.data.access_token);
        } else {
          console.error('Token 返回格式错误：', res.data);
          wx.showToast({ title: 'Token 获取失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('Token 请求失败：', err);
        // 失败后降级：使用微信原生语音输入
        wx.showToast({
          title: '百度语音初始化失败，将使用微信原生语音',
          icon: 'none',
          duration: 3000
        });
      }
    });
  },

  onLaunch() {
    // 初始化本地缓存
    if (!wx.getStorageSync('projectList')) {
      wx.setStorageSync('projectList', []);
    }
    
    // 修复：onShow 中误调用 that 的问题，直接在 onLaunch 初始化 Token
    this.initBaiduYuyinAccessToken();
    
    // 录音权限授权
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            fail: () => {
              wx.showToast({ title: '需授权录音才能使用语音录入', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 修复：删除错误的 onShow 方法（原代码中 onShow 未定义 that 导致报错）
  onShow(options) {
    // 无需重复初始化 Token，onLaunch 已执行
  }
});