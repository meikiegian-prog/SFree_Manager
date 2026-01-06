App({
  globalData: {
    userInfo: null,
    projectList: wx.getStorageSync('projectList') || [],
    timerData: {
      // 支持多项目追踪的新结构
      trackingProjects: [], // 正在追踪的项目数组 {projectId, startTime, projectName, lastElapsedTime}
      timerInterval: null, // 计时器定时器 ID
      backgroundTime: null, // 小程序进入后台的时间戳
      lastActiveTime: Date.now() // 最后活动时间
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

  // 保存项目列表到本地缓存（异步版本）
  async saveProjectList(list) {
    return new Promise((resolve, reject) => {
      try {
        console.log('=== saveProjectList 开始 ===');
        console.log('保存前的全局项目列表:', this.globalData.projectList);
        console.log('要保存的项目列表:', list);
        console.log('项目数量:', list.length);
        
        this.globalData.projectList = list;
        wx.setStorage({
          key: 'projectList',
          data: list,
          success: () => {
            console.log('项目列表保存成功');
            console.log('保存后的全局项目列表:', this.globalData.projectList);
            console.log('保存后的项目数量:', this.globalData.projectList.length);
            console.log('=== saveProjectList 完成 ===');
            resolve(list);
          },
          fail: (err) => {
            console.error('项目列表保存失败:', err);
            reject(err);
          }
        });
      } catch (error) {
        console.error('保存项目列表时发生错误:', error);
        reject(error);
      }
    });
  },

  // 检查项目是否超时（增强版：渐变红色+温和震动+自动停止追踪+恢复逻辑）
  async checkProjectTimeout(projectId) {
    const projectList = this.globalData.projectList;
    const targetProject = projectList.find(item => item.id === projectId);
    if (targetProject) {
      const isTimeout = targetProject.totalTime > 3600 || (targetProject.deadline && new Date(targetProject.deadline) < new Date());
      
      if (isTimeout && targetProject.status !== 'timeout') {
        // 项目超时，设置状态为timeout
        targetProject.status = 'timeout';
        await this.saveProjectList(projectList);
        
        // 如果项目正在追踪，自动停止追踪
        const isTracking = this.globalData.timerData.trackingProjects.some(
          item => item.projectId === projectId
        );
        if (isTracking) {
          await this.pauseTrackingProject(projectId);
        }
        
        // 温和震动提醒（200Hz，1秒）
        wx.vibrateShort({ type: 'light' });
        
        // 无刺眼弹窗，使用toast提示
        wx.showToast({
          title: `【${targetProject.name}】进度超时，已自动停止追踪！`,
          icon: 'none',
          duration: 2000
        });
        
        console.log('项目超时提醒：渐变红色效果已应用，自动停止追踪');
      } else if (!isTimeout && targetProject.status === 'timeout') {
        // 项目不再超时，恢复状态为doing
        targetProject.status = 'doing';
        await this.saveProjectList(projectList);
        
        console.log('项目超时恢复：状态已恢复为进行中');
      }
    }
  },

  // 完成任务成就系统
  async completeProjectAchievement(projectId) {
    const projectList = this.globalData.projectList;
    
    console.log('=== 开始完成项目 ===');
    console.log('项目ID:', projectId);
    console.log('当前项目列表:', projectList);
    console.log('项目列表长度:', projectList.length);
    
    // 详细检查每个项目
    projectList.forEach((item, index) => {
      console.log(`项目${index + 1}:`, item.name, 'ID:', item.id, '状态:', item.status);
    });
    
    const targetProject = projectList.find(item => item.id === projectId);
    
    console.log('找到的目标项目:', targetProject);
    console.log('项目ID匹配检查:');
    projectList.forEach(item => {
      console.log(`项目ID: ${item.id}, 目标ID: ${projectId}, 是否匹配: ${item.id === projectId}`);
    });
    
    if (targetProject) {
      // 移除状态检查，确保即使项目已经是finished状态也能正确设置
      // 如果项目正在追踪，先停止追踪
      const isTracking = this.globalData.timerData.trackingProjects.some(
        item => item.projectId === projectId
      );
      console.log('项目是否在追踪中:', isTracking);
      
      if (isTracking) {
        await this.pauseTrackingProject(projectId, false); // 传递false参数，不自动设置状态
      }
      
      // 确保项目状态正确设置为完成
      targetProject.status = 'finished';
      
      // 记录完成时间（使用标准ISO格式，确保能被正确解析）
      targetProject.finishTime = new Date().toISOString();
      await this.saveProjectList(projectList);
      
      console.log('项目完成状态已设置:', targetProject.name, '状态:', targetProject.status);
      console.log('保存后的项目列表:', projectList);
      
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
    } else {
      console.error('未找到项目:', projectId);
      console.error('可能的原因:');
      console.error('1. 项目ID不匹配');
      console.error('2. 项目列表为空');
      console.error('3. 项目数据损坏');
    }
    
    console.log('=== 项目完成处理结束 ===');
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

    async onLaunch() {
      // 初始化本地缓存
      const savedTracking = wx.getStorageSync('trackingProjects');
      console.log('从存储加载的追踪项目:', savedTracking);
      
      if(savedTracking && Array.isArray(savedTracking)) {
        // 严格过滤无效项目
        const validTracking = savedTracking.filter(project => {
          const isValid = project && 
                         project.projectId && 
                         project.projectName &&
                         this.globalData.projectList.some(p => p.id === project.projectId);
          if (!isValid) {
            console.warn('过滤掉无效追踪项目:', project);
          }
          return isValid;
        });
        
        this.globalData.timerData.trackingProjects = validTracking;
        console.log('有效的追踪项目:', validTracking);
        
        // 强制保存过滤后的数据
        wx.setStorageSync('trackingProjects', validTracking);
      } else {
        this.globalData.timerData.trackingProjects = [];
      }
      console.log('=== onLaunch 开始 ===');
      console.log('存储中是否有项目数据:', !!wx.getStorageSync('projectList'));
      
      if (!wx.getStorageSync('projectList')) {
        console.log('没有项目数据，创建测试数据');
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
        await this.saveProjectList(testData);
        console.log('测试数据创建完成');
      } else {
        console.log('从存储加载项目数据');
        const storedData = wx.getStorageSync('projectList');
        console.log('存储中的项目数量:', storedData.length);
        console.log('存储中的项目:', storedData);
        this.globalData.projectList = storedData;
      }
      
      console.log('全局数据中的项目数量:', this.globalData.projectList.length);
      console.log('=== onLaunch 完成 ===');
    
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
  async startTrackingProject(projectId, projectName) {
    if (!projectId || !projectName) {
      console.error('无法开始追踪：缺少projectId或projectName');
      return false;
    }
    
    // 验证项目是否存在
    const project = this.globalData.projectList.find(p => p.id === projectId);
    if (!project) {
      console.error('无法开始追踪：项目不存在', projectId);
      return false;
    }
    
    // 清理现有追踪状态
    this.globalData.timerData.trackingProjects = 
      this.globalData.timerData.trackingProjects.filter(
        p => p.projectId !== projectId
      );
    
    const trackingProject = {
      projectId,
      projectName,
      startTime: Date.now(), // 确保是数字时间戳
      totalElapsedTime: 0,   // 初始化为0
      lastPauseTime: null
    };
    
    console.log('创建新的追踪项目:', trackingProject);
    
    // 检查是否已经在追踪
    const existingIndex = this.globalData.timerData.trackingProjects.findIndex(
      item => item.projectId === projectId
    );
    
    if (existingIndex === -1) {
      // 新项目，添加到追踪列表
      this.globalData.timerData.trackingProjects.push(trackingProject);
    } else {
      // 已存在，更新开始时间和重置totalElapsedTime
      this.globalData.timerData.trackingProjects[existingIndex].startTime = Date.now();
      this.globalData.timerData.trackingProjects[existingIndex].totalElapsedTime = 0;
    }
    
    // 更新项目状态为追踪中
    const projectList = this.globalData.projectList;
    const projectIndex = projectList.findIndex(item => item.id === projectId);
    if (projectIndex !== -1) {
      projectList[projectIndex].status = 'tracking';
      await this.saveProjectList(projectList);
    }
    
    // 启动计时器（如果未启动）
    if (!this.globalData.timerData.timerInterval) {
      this.startGlobalTimer();
    }
    
    // 保存追踪状态
    wx.setStorageSync('trackingProjects', this.globalData.timerData.trackingProjects);
    
    console.log('开始追踪项目:', projectName);
  },

  // 暂停追踪项目
  async pauseTrackingProject(projectId, autoSetStatus = true) {
    const trackingProjects = this.globalData.timerData.trackingProjects;
    // 查找并移除项目
    const projectIndex = trackingProjects.findIndex(item => item.projectId === projectId);
    if (projectIndex !== -1) {
      const trackingProject = trackingProjects[projectIndex];
      // 计算已经追踪的时间
      const elapsedTime = Math.floor((Date.now() - trackingProject.startTime) / 1000);
      
      // 更新项目总时长
      const projectList = this.globalData.projectList;
      const targetProject = projectList.find(item => item.id === projectId);
      if (targetProject) {
        targetProject.totalTime += elapsedTime;
        if (autoSetStatus) {
          targetProject.status = 'paused';
        }
        await this.saveProjectList(projectList);
      }
      
      // 从追踪列表中移除
      trackingProjects.splice(projectIndex, 1);
      
      // 保存更新后的追踪列表
      wx.setStorageSync('trackingProjects', trackingProjects);
      
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

  // 获取当前追踪项目列表（支持后台计时）
  getTrackingProjects() {
    console.log('当前追踪项目原始数据:', this.globalData.timerData.trackingProjects);
    
    const validProjects = this.globalData.timerData.trackingProjects
      .filter(item => {
        const isValid = item && 
                       item.projectId && 
                       item.projectName &&
                       typeof item.startTime === 'number' &&
                       typeof item.totalElapsedTime === 'number';
        if (!isValid) {
          console.error('发现无效追踪项目:', item);
        }
        return isValid;
      });
    
    console.log('有效追踪项目数量:', validProjects.length);
    
    return validProjects.map(item => {
      // 确保数值有效
      const startTime = Number(item.startTime) || Date.now();
      const totalElapsedTime = Number(item.totalElapsedTime) || 0;
      
      // 计算活跃时间（限制在合理范围内）
      const activeElapsedTime = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      const calculatedTime = Math.min(totalElapsedTime + activeElapsedTime, 86400 * 7); // 限制最大7天
      
      console.log(`项目 ${item.projectName} 计算: 
        开始时间: ${new Date(startTime).toISOString()}
        累计时间: ${totalElapsedTime}
        活跃时间: ${activeElapsedTime}
        总时间: ${calculatedTime}`);
      
      return {
        ...item,
        elapsedTime: calculatedTime,
        formattedTime: this.formatTime(calculatedTime)
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
      
      // 中文数字到阿拉伯数字映射
      const chineseNumbers = {
        '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, 
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
        '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
        '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
        '二十一': 21, '二十二': 22, '二十三': 23, '二十四': 24
      };
      
      // 将中文数字转换为阿拉伯数字
      const convertChineseNumber = (chineseNum) => {
        if (/^\d+$/.test(chineseNum)) {
          return parseInt(chineseNum);
        }
        return chineseNumbers[chineseNum] || 0;
      };
      
      // 增强时间识别模式 - 支持更多时间范围和更灵活的表达
      const timePatterns = [
        // 中文详细时间：下午七点二十一分、二十一点十五分
        { pattern: /(上午|下午)?\s*([零一二三四五六七八九十]+)点\s*([零一二三四五六七八九十]+)分/, 
          calculate: (matches) => {
            const today = new Date();
            let period = matches[1] || '';
            let hours = convertChineseNumber(matches[2]);
            let minutes = convertChineseNumber(matches[3]);
            
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
        },
        
        // 中文时间：七点、二十一点
        { pattern: /(上午|下午)?\s*([零一二三四五六七八九十]+)点/, 
          calculate: (matches) => {
            const today = new Date();
            let period = matches[1] || '';
            let hours = convertChineseNumber(matches[2]);
            let minutes = 0;
            
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
        },
        
        // 天数识别：15/十五天后
        { pattern: /(\d+|零|一|二|三|四|五|六|七|八|九|十|十一|十二|十三|十四|十五|十六|十七|十八|十九|二十|二十一|二十二|二十三|二十四|二十五|二十六|二十七|二十八|二十九|三十)天后/, 
          calculate: (matches) => {
            const date = new Date();
            const days = convertChineseNumber(matches[1]);
            date.setDate(date.getDate() + days);
            date.setHours(18, 0, 0, 0); // 默认下午6点
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hourStr = String(18).padStart(2, '0');
            const minuteStr = String(0).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
          }
        },
        
        // 星期识别：一周/一星期后
        { pattern: /(\d+|零|一|二|三|四|五|六|七)周后/, 
          calculate: (matches) => {
            const date = new Date();
            const weeks = convertChineseNumber(matches[1]);
            date.setDate(date.getDate() + (weeks * 7));
            date.setHours(18, 0, 0, 0); // 默认下午6点
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hourStr = String(18).padStart(2, '0');
            const minuteStr = String(0).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
          }
        },
        
        // 星期识别：一星期后
        { pattern: /(\d+|零|一|二|三|四|五|六|七)星期后/, 
          calculate: (matches) => {
            const date = new Date();
            const weeks = convertChineseNumber(matches[1]);
            date.setDate(date.getDate() + (weeks * 7));
            date.setHours(18, 0, 0, 0); // 默认下午6点
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hourStr = String(18).padStart(2, '0');
            const minuteStr = String(0).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
          }
        },
        
        // 月数识别：一个月/半个月/十个月/10个月后
        { pattern: /(\d+|零|一|二|三|四|五|六|七|八|九|十|半)个月后/, 
          calculate: (matches) => {
            const date = new Date();
            let months = convertChineseNumber(matches[1]);
            
            if (matches[1] === '半') {
              // 半个月 = 15天
              date.setDate(date.getDate() + 15);
            } else {
              date.setMonth(date.getMonth() + months);
            }
            date.setHours(18, 0, 0, 0); // 默认下午6点
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hourStr = String(18).padStart(2, '0');
            const minuteStr = String(0).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
          }
        },
        
        // 具体日期格式：YYYY-MM-DD HH:mm
        { pattern: /(\d{4})[-年](\d{1,2})[-月](\d{1,2})[日]?\s*(\d{1,2})?:?(\d{0,2})?/, 
          calculate: (matches) => {
            const date = new Date();
            let year = date.getFullYear();
            let month = 1;
            let day = 1;
            let hours = 9;
            let minutes = 0;
            
            if (matches[1]) year = parseInt(matches[1]);
            if (matches[2]) month = parseInt(matches[2]) - 1; // 月份从0开始
            if (matches[3]) day = parseInt(matches[3]);
            if (matches[4]) hours = parseInt(matches[4]);
            if (matches[5]) minutes = parseInt(matches[5]);
            
            date.setFullYear(year, month, day);
            date.setHours(hours, minutes, 0, 0);
            
            const yearStr = String(date.getFullYear());
            const monthStr = String(date.getMonth() + 1).padStart(2, '0');
            const dayStr = String(date.getDate()).padStart(2, '0');
            const hourStr = String(hours).padStart(2, '0');
            const minuteStr = String(minutes).padStart(2, '0');
            
            return `${yearStr}-${monthStr}-${dayStr} ${hourStr}:${minuteStr}`;
          }
        },
        
        // 明年、后年等相对年份
        { pattern: /(明年|后年|大后年)\s*(\d{1,2})月(\d{1,2})日?\s*(\d{1,2})?:?(\d{0,2})?/, 
          calculate: (matches) => {
            const date = new Date();
            let yearOffset = 0;
            
            if (matches[1] === '明年') yearOffset = 1;
            else if (matches[1] === '后年') yearOffset = 2;
            else if (matches[1] === '大后年') yearOffset = 3;
            
            let month = 1;
            let day = 1;
            let hours = 9;
            let minutes = 0;
            
            if (matches[2]) month = parseInt(matches[2]) - 1;
            if (matches[3]) day = parseInt(matches[3]);
            if (matches[4]) hours = parseInt(matches[4]);
            if (matches[5]) minutes = parseInt(matches[5]);
            
            date.setFullYear(date.getFullYear() + yearOffset, month, day);
            date.setHours(hours, minutes, 0, 0);
            
            const yearStr = String(date.getFullYear());
            const monthStr = String(date.getMonth() + 1).padStart(2, '0');
            const dayStr = String(date.getDate()).padStart(2, '0');
            const hourStr = String(hours).padStart(2, '0');
            const minuteStr = String(minutes).padStart(2, '0');
            
            return `${yearStr}-${monthStr}-${dayStr} ${hourStr}:${minuteStr}`;
          }
        },
        
        // 月份日期格式：MM月DD日 HH:mm
        { pattern: /(\d{1,2})月(\d{1,2})日?\s*(\d{1,2})?:?(\d{0,2})?/, 
          calculate: (matches) => {
            const date = new Date();
            let month = 1;
            let day = 1;
            let hours = 9;
            let minutes = 0;
            
            if (matches[1]) month = parseInt(matches[1]) - 1;
            if (matches[2]) day = parseInt(matches[2]);
            if (matches[3]) hours = parseInt(matches[3]);
            if (matches[4]) minutes = parseInt(matches[4]);
            
            // 如果日期已经过去，设置为明年
            date.setMonth(month, day);
            if (date < new Date()) {
              date.setFullYear(date.getFullYear() + 1);
            }
            
            date.setHours(hours, minutes, 0, 0);
            
            const yearStr = String(date.getFullYear());
            const monthStr = String(date.getMonth() + 1).padStart(2, '0');
            const dayStr = String(date.getDate()).padStart(2, '0');
            const hourStr = String(hours).padStart(2, '0');
            const minuteStr = String(minutes).padStart(2, '0');
            
            return `${yearStr}-${monthStr}-${dayStr} ${hourStr}:${minuteStr}`;
          }
        },
        
        // 明天上午/下午 + 时间（更精确的上午/下午处理）
        { pattern: /明天\s*(上午|下午)?\s*(\d{1,2})[点:：](\d{0,2})/,
          calculate: (matches) => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            let period = '';
            let hours = 0;
            let minutes = 0;
            
            if (matches[1]) period = matches[1];
            if (matches[2]) hours = parseInt(matches[2]);
            if (matches[3]) minutes = parseInt(matches[3]);
            
            if (period === '下午') {
              if (hours < 12) hours += 12;
            } else if (period === '上午' && hours === 12) {
              hours = 0;
            }
            
            tomorrow.setHours(hours, minutes, 0, 0);
            
            const year = tomorrow.getFullYear();
            const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const day = String(tomorrow.getDate()).padStart(2, '0');
            const hourStr = String(hours).padStart(2, '0');
            const minuteStr = String(minutes).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
          }
        },
        
        // 后天上午/下午 + 时间
        { pattern: /后天\s*(上午|下午)?\s*(\d{1,2})[点:：](\d{0,2})/, 
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
        { pattern: /大后天\s*(\d{1,2})[点:：](\d{0,2})/, 
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
        { pattern: /今天\s*(\d{1,2})[点:：](\d{0,2})/, 
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
        { pattern: /(上午|下午)\s*(\d{1,2})[点:：](\d{0,2})/,
          calculate: (matches) => {
            const today = new Date();
            
            let hours = 0;
            let minutes = 0;
            
            if (matches[1]) hours = parseInt(matches[1]);
            if (matches[2]) minutes = parseInt(matches[2]);
            
            // 验证时间合理性
            if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
              return ''; // 返回空字符串表示无效时间
            }
            
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
        { pattern: /(上午|下午)\s*(\d{1,2})[点:：](\d{0,2})/, 
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
    
    // 应用时间识别（按优先级顺序）
    let matchedPattern = null;
    for (const timePattern of timePatterns) {
      const matches = text.match(timePattern.pattern);
      if (matches) {
        try {
          result.deadline = timePattern.calculate(matches);
          matchedPattern = timePattern;
          break;
        } catch (error) {
          console.warn('时间解析失败:', error);
          // 继续尝试其他模式
        }
      }
    }
    
    // 如果识别到时间，从项目名称中移除时间信息
    if (matchedPattern && result.deadline) {
      result.name = text.replace(matchedPattern.pattern, '').trim();
      // 如果名称为空，使用默认名称
      if (!result.name) {
        result.name = '新项目';
      }
    }
    
    // 移除自动收入设置，只保留时间识别功能
    // 用户明确要求不要自动添加预计金额
    
    return result;
  },

  // 小程序进入后台时调用
  onHide() {
    const now = Date.now();
    // 保存当前时间到 backgroundTime
    this.globalData.timerData.backgroundTime = now;
    // 保存最后活动时间
    this.globalData.timerData.lastActiveTime = now;
    
    // 更新每个追踪项目的 totalElapsedTime
    this.globalData.timerData.trackingProjects.forEach(project => {
      // 计算从最后一次开始/恢复追踪到现在的活跃时间
      const activeElapsedTime = Math.floor((now - project.startTime) / 1000);
      // 更新 totalElapsedTime
      project.totalElapsedTime += activeElapsedTime;
      // 记录暂停时间
      project.lastPauseTime = now;
    });
    
    console.log('小程序进入后台，保存时间戳和更新累计时间:', now);
  },

  // 小程序回到前台时调用
  onShow(options) {
    const { backgroundTime } = this.globalData.timerData;
    
    // 如果之前有保存后台时间，计算经过的后台时间
    if (backgroundTime) {
      const backgroundDuration = Math.floor((Date.now() - backgroundTime) / 1000);
      console.log('小程序从后台返回，后台持续时间:', backgroundDuration, '秒');
      
      // 更新每个追踪项目的累计时间
      this.globalData.timerData.trackingProjects.forEach(project => {
        // 将后台时间加到 totalElapsedTime
        project.totalElapsedTime += backgroundDuration;
        // 重置 startTime 为当前时间
        project.startTime = Date.now();
      });
      
      // 重置后台时间
      this.globalData.timerData.backgroundTime = null;
    }
    
    // 更新最后活动时间
    this.globalData.timerData.lastActiveTime = Date.now();
  }
});