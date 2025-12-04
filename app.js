// app.js
App({
  // 全局共享数据
  globalData: {
    userInfo: null,
    // 项目列表（本地缓存持久化）
    projectList: wx.getStorageSync('projectList') || [],
    // 时间追踪状态
    timerData: {
      isTracking: false,    // 是否正在计时
      currentProjectId: '', // 当前计时项目ID
      startTime: 0,         // 计时开始时间
      timerInterval: null   // 计时器实例
    }
  },

  // 全局方法：格式化秒数为 时:分:秒
  formatTime(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  },

  // 全局方法：保存项目列表到本地缓存
  saveProjectList(list) {
    this.globalData.projectList = list;
    wx.setStorageSync('projectList', list);
  },

  // 全局方法：检查项目是否超时（HCI：情感化反馈）
  checkProjectTimeout(projectId) {
    const projectList = this.globalData.projectList;
    const targetProject = projectList.find(item => item.id === projectId);
    if (targetProject) {
      // 模拟超时规则：累计时长>1小时 或 超过截止日期
      const isTimeout = targetProject.totalTime > 3600 || (targetProject.deadline && new Date(targetProject.deadline) < new Date());
      if (isTimeout && targetProject.status !== 'timeout') {
        targetProject.status = 'timeout';
        this.saveProjectList(projectList);
        // 震动提醒（HCI：非弹窗反馈）
        wx.vibrateShort({ type: 'light' });
        // 渐变红色提醒（在卡片样式中体现）
        wx.showToast({
          title: `【${targetProject.name}】进度超时！`,
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  onLaunch() {
    // 初始化：读取本地缓存
    if (!wx.getStorageSync('projectList')) {
      wx.setStorageSync('projectList', []);
    }
    // 授权检查：语音/录音权限
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
  }
});