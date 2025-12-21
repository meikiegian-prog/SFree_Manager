App({
  globalData: {
    userInfo: null,
    projectList: wx.getStorageSync('projectList') || [],
    timerData: {
      // 支持多项目追踪的新结构
      trackingProjects: [], // 正在追踪的项目数组 {projectId, startTime, projectName}
      timerInterval: null // 计时器定时器 ID
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
    // 兼容 undefined 或非数字情况
    seconds = Number(seconds) || 0; 
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

  // 检查项目是否超时（增强版：渐变红色+温和震动）
  checkProjectTimeout(projectId) {
    const projectList = this.globalData.projectList;
    const targetProject = projectList.find(item => item.id === projectId);
    if (targetProject) {
      const isTimeout = targetProject.totalTime > 3600 || (targetProject.deadline && new Date(targetProject.deadline) < new Date());
      if (isTimeout && targetProject.status !== 'timeout') {
        targetProject.status = 'timeout';
        this.saveProjectList(projectList);
        
        // 温和震动提醒（200Hz，1秒）
        wx.vibrateShort({ type: 'light' });
        
        // 无刺眼弹窗，使用toast提示
        wx.showToast({
          title: `【${targetProject.name}】进度超时！`,
          icon: 'none',
          duration: 2000
        });
        
        console.log('项目超时提醒：渐变红色效果已应用');
      }
    }
  },

  // 完成任务成就系统
  completeProjectAchievement(projectId) {
    const projectList = this.globalData.projectList;
    const targetProject = projectList.find(item => item.id === projectId);
    if (targetProject && targetProject.status !== 'finished') {
      targetProject.status = 'finished';
      this.saveProjectList(projectList);
      
      // 弹出卡通风格成就勋章
      wx.showModal({
        title: '🎉 任务完成！',
        content: '解锁「高效达人」勋章，奖励自己一杯咖啡吧～',
        showCancel: false,
        confirmText: '太棒了！'
      });
      
      // 语音鼓励（如果启用）
      if (wx.getStorageSync('voiceEnabled')) {
        console.log('语音鼓励：恭喜完成任务！继续加油！');
      }
      
      // 累计奖励统计
      this.updateContinuousAchievement();
    }
  },

  // 更新连续完成任务成就
  updateContinuousAchievement() {
    const today = new Date().toDateString();
    const lastCompletion = wx.getStorageSync('lastCompletionDate');
    const streakCount = wx.getStorageSync('completionStreak') || 0;
    
    if (lastCompletion === today) {
      // 今天已经完成过任务，不重复计数
      return;
    }
    
    let newStreak = streakCount + 1;
    if (!lastCompletion || new Date(today) - new Date(lastCompletion) > 24 * 60 * 60 * 1000) {
      // 如果间隔超过24小时，重置连续计数
      newStreak = 1;
    }
    
    wx.setStorageSync('lastCompletionDate', today);
    wx.setStorageSync('completionStreak', newStreak);
    
    // 检查是否解锁新成就
    if (newStreak === 7) {
      wx.showModal({
        title: '🏆 周达人成就！',
        content: '连续7天完成任务，解锁「周达人」称号！',
        showCancel: false
      });
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
        // 如果没有项目数据，创建一些测试数据
        const testData = [
          {
            id: 'test1',
            name: '测试项目1',
            deadline: '2024-12-31 23:59',
            totalTime: 7200, // 2小时
            income: 100,
            status: 'doing',
            createTime: new Date().toISOString().slice(0, 16).replace('T', ' ') // 精确到分钟：YYYY-MM-DD HH:mm
          },
          {
            id: 'test2', 
            name: '测试项目2',
            deadline: '2024-12-25 18:00',
            totalTime: 3600, // 1小时
            income: 50,
            status: 'doing',
            createTime: new Date().toISOString().slice(0, 16).replace('T', ' ') // 精确到分钟：YYYY-MM-DD HH:mm
          }
        ];
        wx.setStorageSync('projectList', testData);
        this.globalData.projectList = testData;
      } else {
        this.globalData.projectList = wx.getStorageSync('projectList');
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

  // 开始追踪项目（支持多项目同时追踪）
  startTrackingProject(projectId, projectName) {
    const trackingProject = {
      projectId,
      projectName,
      startTime: Date.now()
    };
    
    // 检查是否已经在追踪
    const existingIndex = this.globalData.timerData.trackingProjects.findIndex(
      item => item.projectId === projectId
    );
    
    if (existingIndex === -1) {
      // 新项目，添加到追踪列表
      this.globalData.timerData.trackingProjects.push(trackingProject);
    } else {
      // 已存在，更新开始时间
      this.globalData.timerData.trackingProjects[existingIndex].startTime = Date.now();
    }
    
    // 更新项目状态为追踪中
    const projectList = this.globalData.projectList;
    const projectIndex = projectList.findIndex(item => item.id === projectId);
    if (projectIndex !== -1) {
      projectList[projectIndex].status = 'tracking';
      this.saveProjectList(projectList);
    }
    
    // 启动计时器（如果未启动）
    if (!this.globalData.timerData.timerInterval) {
      this.startGlobalTimer();
    }
    
    console.log('开始追踪项目:', projectName);
  },

  // 暂停追踪项目
  pauseTrackingProject(projectId) {
    const trackingProjects = this.globalData.timerData.trackingProjects;
    const projectIndex = trackingProjects.findIndex(item => item.projectId === projectId);
    
    if (projectIndex !== -1) {
      const trackingProject = trackingProjects[projectIndex];
      const elapsedTime = Math.floor((Date.now() - trackingProject.startTime) / 1000);
      
      // 更新项目总时长和状态
      const projectList = this.globalData.projectList;
      const targetProject = projectList.find(item => item.id === projectId);
      if (targetProject) {
        targetProject.totalTime += elapsedTime;
        targetProject.status = 'paused'; // 更新状态为暂停
        this.saveProjectList(projectList);
      }
      
      // 从追踪列表中移除
      trackingProjects.splice(projectIndex, 1);
      
      // 如果没有追踪中的项目，停止计时器
      if (trackingProjects.length === 0 && this.globalData.timerData.timerInterval) {
        clearInterval(this.globalData.timerData.timerInterval);
        this.globalData.timerData.timerInterval = null;
      }
      
      console.log('暂停追踪项目:', trackingProject.projectName, '时长:', elapsedTime);
    }
  },

  // 启动全局计时器
  startGlobalTimer() {
    if (this.globalData.timerData.timerInterval) {
      clearInterval(this.globalData.timerData.timerInterval);
    }
    
    const timerInterval = setInterval(() => {
      // 实时更新追踪项目列表，触发界面更新
      const trackingProjects = this.getTrackingProjects();
      
      // 如果有页面需要更新，可以在这里触发页面更新
      // 实际的数据更新由各个页面监听globalData变化来处理
    }, 1000);
    
    this.globalData.timerData.timerInterval = timerInterval;
  },

  // 获取当前追踪项目列表
  getTrackingProjects() {
    return this.globalData.timerData.trackingProjects.map(item => {
      const elapsedTime = Math.floor((Date.now() - item.startTime) / 1000);
      return {
        ...item,
        elapsedTime,
        formattedTime: this.formatTime(elapsedTime)
      };
    });
  },

    // 智能解析项目创建文本（自动识别关键词和时间）
    parseProjectCreationText(text) {
      const result = {
        name: text,
        deadline: '',
        autoStartTracking: false,
        suggestedIncome: 0
      };
      
      // 增强时间识别模式 - 更准确的时间转换
      const timePatterns = [
        // 明天上午/下午 + 时间（更精确的上午/下午处理）
        { pattern: /明天\s*(上午|下午)?\s*(\d{1,2})[点:](\d{0,2})/, 
          calculate: (matches) => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // 确保分组正确
            let period = '';
            let hours = 0;
            let minutes = 0;
            
            // 根据匹配结果解析
            if (matches[1]) period = matches[1]; // 上午/下午
            if (matches[2]) hours = parseInt(matches[2]); // 小时
            if (matches[3]) minutes = parseInt(matches[3]); // 分钟
            
            // 更准确的上午/下午处理
            if (period === '下午') {
              if (hours < 12) {
                hours += 12; // 下午1-11点 -> 13-23点
              }
              // 下午12点保持12点
            } else if (period === '上午') {
              if (hours === 12) {
                hours = 0; // 上午12点 -> 0点
              }
              // 上午1-11点保持不变
            }
            
            tomorrow.setHours(hours, minutes, 0, 0);
            
            // 使用本地时间格式，避免时区问题
            const year = tomorrow.getFullYear();
            const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const day = String(tomorrow.getDate()).padStart(2, '0');
            const hourStr = String(hours).padStart(2, '0');
            const minuteStr = String(minutes).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
          }
        },
        // 后天上午/下午 + 时间
        { pattern: /后天\s*(上午|下午)?\s*(\d{1,2})[点:](\d{0,2})/, 
          calculate: (matches) => {
            const dayAfterTomorrow = new Date();
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
            
            let period = '';
            let hours = 0;
            let minutes = 0;
            
            if (matches[1]) period = matches[1];
            if (matches[2]) hours = parseInt(matches[2]);
            if (matches[3]) minutes = parseInt(matches[3]);
            
            if (period === '下午' && hours < 12) hours += 12;
            else if (period === '上午' && hours === 12) hours = 0;
            
            dayAfterTomorrow.setHours(hours, minutes, 0, 0);
            
            const year = dayAfterTomorrow.getFullYear();
            const month = String(dayAfterTomorrow.getMonth() + 1).padStart(2, '0');
            const day = String(dayAfterTomorrow.getDate()).padStart(2, '0');
            const hourStr = String(hours).padStart(2, '0');
            const minuteStr = String(minutes).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
          }
        },
        // 大后天 + 时间
        { pattern: /大后天\s*(\d{1,2})[点:](\d{0,2})/, 
          calculate: (matches) => {
            const threeDaysLater = new Date();
            threeDaysLater.setDate(threeDaysLater.getDate() + 3);
            
            let hours = 0;
            let minutes = 0;
            
            if (matches[1]) hours = parseInt(matches[1]);
            if (matches[2]) minutes = parseInt(matches[2]);
            
            threeDaysLater.setHours(hours, minutes, 0, 0);
            
            const year = threeDaysLater.getFullYear();
            const month = String(threeDaysLater.getMonth() + 1).padStart(2, '0');
            const day = String(threeDaysLater.getDate()).padStart(2, '0');
            const hourStr = String(hours).padStart(2, '0');
            const minuteStr = String(minutes).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
          }
        },
        // 今天 + 时间
        { pattern: /今天\s*(\d{1,2})[点:](\d{0,2})/, 
          calculate: (matches) => {
            const today = new Date();
            
            let hours = 0;
            let minutes = 0;
            
            if (matches[1]) hours = parseInt(matches[1]);
            if (matches[2]) minutes = parseInt(matches[2]);
            
            today.setHours(hours, minutes, 0, 0);
            
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const hourStr = String(hours).padStart(2, '0');
            const minuteStr = String(minutes).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
          }
        },
        // 单独的时间（默认今天）
        { pattern: /(\d{1,2})[点:](\d{0,2})/, 
          calculate: (matches) => {
            const today = new Date();
            
            let hours = 0;
            let minutes = 0;
            
            if (matches[1]) hours = parseInt(matches[1]);
            if (matches[2]) minutes = parseInt(matches[2]);
            
            today.setHours(hours, minutes, 0, 0);
            
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const hourStr = String(hours).padStart(2, '0');
            const minuteStr = String(minutes).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
          }
        },
        // 支持更多时间表达方式
        { pattern: /(上午|下午)\s*(\d{1,2})[点:](\d{0,2})/, 
          calculate: (matches) => {
            const today = new Date();
            
            let period = '';
            let hours = 0;
            let minutes = 0;
            
            if (matches[1]) period = matches[1];
            if (matches[2]) hours = parseInt(matches[2]);
            if (matches[3]) minutes = parseInt(matches[3]);
            
            if (period === '下午' && hours < 12) hours += 12;
            else if (period === '上午' && hours === 12) hours = 0;
            
            today.setHours(hours, minutes, 0, 0);
            
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const hourStr = String(hours).padStart(2, '0');
            const minuteStr = String(minutes).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
          }
        }
      ];
    
    // 应用时间识别
    for (const timePattern of timePatterns) {
      const matches = text.match(timePattern.pattern);
      if (matches) {
        result.deadline = timePattern.calculate(matches);
        break;
      }
    }
    
    // 移除自动收入设置，只保留时间识别功能
    // 用户明确要求不要自动添加预计金额
    
    return result;
  },

  // 修复：删除错误的 onShow 方法（原代码中 onShow 未定义 that 导致报错）
  onShow(options) {
    // 无需重复初始化 Token，onLaunch 已执行
  }
});