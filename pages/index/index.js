// 首页逻辑（简化语音播报，保留核心HCI交互）
const app = getApp();

Page({
  data: {
    activeTab: 0,                // 当前模块：0=项目 1=时间 2=收入
    projectList: [],              // 项目列表
    timerData: app.globalData.timerData, // 计时数据
    currentTime: '00:00:00',      // 当前计时时长
    showRecordPanel: false,       // 快速记录面板显隐
    trackingProjectName: '',      // 正在追踪的项目名称
    totalIncome: 0,               // 本月总收入
    scrollHeight: 500,            // 滚动容器高度
    showRecordTrigger: true,      // 快速记录触发按钮显隐
    trackingProjectsWithFullData: []    // 包含完整项目数据的追踪项目列表
  },

  onLoad() {
    // 获取屏幕高度并计算滚动容器高度
    wx.getSystemInfo({
      success: (res) => {
        // 精确的高度计算：屏幕高度 - 顶部按钮高度 - 底部触发按钮高度
        const screenHeight = res.screenHeight;
        // 转换为rpx比例计算（1px ≈ 2rpx）
        const topButtonHeight = 120 / 2; // 顶部按钮高度约120rpx
        const bottomTriggerHeight = 100 / 2; // 底部触发按钮高度约100rpx
        const bottomMargin = 30 / 2; // 底部边距30rpx
        const scrollHeight = screenHeight - topButtonHeight - bottomTriggerHeight - bottomMargin - 40; // 额外减去40px确保完全显示
        
        this.setData({
          scrollHeight: Math.max(scrollHeight, 400) // 设置最小高度400px
        });
      }
    });
    
    this.initData();
    this.checkAllProjectTimeout();
  },

  onShow() {
    this.initData();
  },

  onUnload() {
    if (this.data.timerData.timerInterval) {
      clearInterval(this.data.timerData.timerInterval);
      app.globalData.timerData.timerInterval = null;
    }
  },

  // 初始化数据
  initData() {
    const allProjects = app.globalData.projectList;
    
    // 过滤掉已完成的项目，只显示进行中、追踪中、暂停、超时的项目
    const projectList = allProjects.filter(item => item.status !== 'finished');
    // 计算已完成项目的总收入
    const totalIncome = allProjects
      .filter(item => item.status === 'finished')
      .reduce((sum, item) => sum + (item.income || 0), 0);
    
    // 获取追踪项目列表
    const trackingProjects = app.getTrackingProjects();
    
    // 将追踪项目转换为完整项目数据
    const trackingProjectsWithFullData = trackingProjects.map(trackingProject => {
      const fullProject = allProjects.find(p => p.id === trackingProject.projectId);
      return {
        ...fullProject,
        // 使用项目的实际状态，而不是强制设置为'tracking'
        status: fullProject ? fullProject.status : 'tracking'
      };
    }).filter(project => project); // 过滤掉找不到对应项目的条目

    this.setData({
      projectList,
      timerData: app.globalData.timerData,
      totalIncome,
      trackingProjects,
      trackingProjectsWithFullData,
      currentTime: app.formatTime(
        trackingProjects.length > 0 
          ? Math.floor((Date.now() - Math.min(...trackingProjects.map(p => p.startTime))) / 1000) 
          : 0
      )
    });

    if (trackingProjects.length > 0 && !this.data.timerData.timerInterval) {
      this.startTimer();
    }
  },

  // 滑动切换模块
  swiperChange(e) {
    this.setData({ activeTab: e.detail.current });
  },

  // 新建项目（智能解析版本）
  async addProject() {
    wx.showModal({
      title: '新建项目',
      editable: true,
      placeholderText: '输入项目名称或语音描述（如：明天10点客户沟通）',
      success: async (res) => {
        if (res.confirm && res.content.trim()) {
          const text = res.content.trim();
          
          // 智能解析项目信息
          const parsedInfo = app.parseProjectCreationText(text);
          
          const newProject = {
            id: Date.now().toString(),
            name: parsedInfo.name,
            deadline: parsedInfo.deadline,
            totalTime: 0,
            income: parsedInfo.suggestedIncome,
            status: 'doing',
            createTime: new Date().toISOString().slice(0, 16).replace('T', ' ') // 精确到分钟：YYYY-MM-DD HH:mm
          };

          const newList = [...app.globalData.projectList, newProject];
          await app.saveProjectList(newList);
          this.setData({ projectList: newList.filter(item => item.status !== 'finished') });

          // 如果建议自动追踪，询问用户
          if (parsedInfo.autoStartTracking) {
            wx.showModal({
              title: '智能建议',
              content: `检测到${parsedInfo.name}可能需要立即开始工作，是否自动开始追踪？`,
              success: async (trackRes) => {
                if (trackRes.confirm) {
                  await app.startTrackingProject(newProject.id, newProject.name);
                  this.setData({ 
                    timerData: app.globalData.timerData,
                    trackingProjectName: newProject.name
                  });
                  wx.showToast({ title: '已开始自动追踪！', icon: 'success' });
                }
              }
            });
          } else {
            wx.showToast({ title: '项目创建成功！', icon: 'success' });
          }
        }
      }
    });
  },

    // 一键开始/暂停计时（多项目版本）
    async handleToggleTimer(e) {
      const { projectId } = e.detail;
      const project = this.data.projectList.find(item => item.id === projectId);
      
      if (!project) return;
      
      // 检查是否已经在追踪
      const isTracking = app.globalData.timerData.trackingProjects.some(
        item => item.projectId === projectId
      );
      
      if (!isTracking) {
        // 开始追踪
        await app.startTrackingProject(projectId, project.name);
        wx.showToast({ title: `开始追踪：${project.name}`, icon: 'success' });
      } else {
        // 暂停追踪
        await app.pauseTrackingProject(projectId);
        wx.showToast({ title: `暂停追踪：${project.name}`, icon: 'success' });
      }
      
      // 更新数据
      const trackingProjects = app.getTrackingProjects();
      const trackingProjectsWithFullData = trackingProjects.map(trackingProject => {
        const fullProject = app.globalData.projectList.find(p => p.id === trackingProject.projectId);
        return {
          ...fullProject,
          // 使用项目的实际状态，而不是强制设置为'tracking'
          status: fullProject ? fullProject.status : 'tracking'
        };
      }).filter(project => project); // 过滤掉找不到对应项目的条目
      
      this.setData({ 
        timerData: app.globalData.timerData,
        projectList: app.globalData.projectList,
        trackingProjects,
        trackingProjectsWithFullData
      });
      
      // 如果开始追踪，确保计时器启动（无论当前计时器状态如何）
      if (!isTracking) {
        this.startTimer();
      }
    },

  // 启动计时器
  startTimer() {
    // 清理旧的计时器
    if (this.data.timerData.timerInterval) {
      clearInterval(this.data.timerData.timerInterval);
    }
    
    // 立即更新一次数据
    this.updateTrackingData();
    
    // 启动每秒更新的计时器
    const timerInterval = setInterval(() => {
      this.updateTrackingData();
    }, 1000);

    app.globalData.timerData.timerInterval = timerInterval;
    this.setData({
      'timerData.timerInterval': timerInterval
    });
    
    console.log('计时器启动成功，每秒更新一次');
  },

  // 更新追踪数据
  updateTrackingData() {
    const trackingProjects = app.getTrackingProjects();
    
    // 计算总时长
    let totalTime = 0;
    if (trackingProjects.length > 0) {
      const startTimes = trackingProjects.map(p => p.startTime);
      const earliestStartTime = Math.min(...startTimes);
      totalTime = Math.floor((Date.now() - earliestStartTime) / 1000);
    }
    
    // 实时更新每个追踪项目的累计时长（简单方法：每秒增加1秒）
    if (trackingProjects.length > 0) {
      const projectList = [...this.data.projectList]; // 创建新数组确保数据变化被检测
      let hasUpdated = false;
      
      trackingProjects.forEach(trackingProject => {
        const projectIndex = projectList.findIndex(p => p.id === trackingProject.projectId);
        if (projectIndex !== -1) {
          // 创建新对象确保数据变化被检测
          const updatedProject = {
            ...projectList[projectIndex],
            totalTime: (projectList[projectIndex].totalTime || 0) + 1
          };
          projectList[projectIndex] = updatedProject;
          hasUpdated = true;
        }
      });
      
      if (hasUpdated) {
        // 更新全局数据
        app.globalData.projectList = projectList;
        this.setData({ projectList });
      }
    }
    
    // 将追踪项目转换为完整项目数据
    const trackingProjectsWithFullData = trackingProjects.map(trackingProject => {
      const fullProject = this.data.projectList.find(p => p.id === trackingProject.projectId);
      return {
        ...fullProject,
        // 使用项目的实际状态，而不是强制设置为'tracking'
        status: fullProject ? fullProject.status : 'tracking'
      };
    }).filter(project => project); // 过滤掉找不到对应项目的条目
    
    this.setData({
      trackingProjects,
      trackingProjectsWithFullData,
      currentTime: app.formatTime(totalTime)
    });
    
    console.log('计时器更新：', trackingProjects.length, '个项目，总时长：', totalTime);
  },

  // 标记项目完成（使用新的成就系统）
  async handleFinishProject(e) {
    const { projectId } = e.detail;
    
    // 使用新的成就系统处理项目完成
    await app.completeProjectAchievement(projectId);
    
    // 更新本地数据，包括追踪项目列表和完整追踪项目数据
    const trackingProjects = app.getTrackingProjects();
    const trackingProjectsWithFullData = trackingProjects.map(trackingProject => {
      const fullProject = app.globalData.projectList.find(p => p.id === trackingProject.projectId);
      return {
        ...fullProject,
        // 使用项目的实际状态，而不是强制设置为'tracking'
        status: fullProject ? fullProject.status : 'tracking'
      };
    }).filter(project => project); // 过滤掉找不到对应项目的条目
    
    this.setData({ 
      projectList: app.globalData.projectList,
      trackingProjects,
      trackingProjectsWithFullData
    });
  },

  // 检查超时项目
  async checkAllProjectTimeout() {
    for (const project of this.data.projectList) {
      await app.checkProjectTimeout(project.id);
    }
    this.setData({ projectList: app.globalData.projectList });
  },

  // 显示快速记录面板
  showRecordPanel() {
    this.setData({ 
      showRecordPanel: true,
      showRecordTrigger: false 
    });
  },

  // 关闭快速记录面板
  closeRecordPanel() {
    this.setData({ 
      showRecordPanel: false,
      showRecordTrigger: true 
    });
  },

    // 保存快速记录的任务
    async handleSaveRecord(e) {
      const { text } = e.detail;
      
      // 使用智能解析功能解析用户输入
      const parsedInfo = app.parseProjectCreationText(text);
      
      const newProject = {
        id: `task_${Date.now()}`,
        name: parsedInfo.name,
        deadline: parsedInfo.deadline,
        totalTime: 0,
        income: 0,
        status: 'doing',
        createTime: new Date().toISOString().slice(0, 16).replace('T', ' ') // 精确到分钟：YYYY-MM-DD HH:mm
      };

      const newList = [...app.globalData.projectList, newProject];
      await app.saveProjectList(newList);
      this.setData({ projectList: newList.filter(item => item.status !== 'finished') });

      wx.showToast({ title: '任务保存成功！', icon: 'success' });
    },

  // 暂停追踪（时间模块中的暂停按钮）
  async pauseTracking(e) {
    const projectId = e.currentTarget.dataset.projectid;
    const project = this.data.projectList.find(item => item.id === projectId);
    
    if (!project) return;
    
    await app.pauseTrackingProject(projectId);
    wx.showToast({ title: `已暂停追踪：${project.name}`, icon: 'success' });
    
    // 更新数据
    this.setData({ 
      timerData: app.globalData.timerData,
      projectList: app.globalData.projectList,
      trackingProjects: app.getTrackingProjects()
    });
  },

  // 处理优先级更改事件
  async onPriorityChange(e) {
    const { projectId, priority } = e.detail;
    console.log('项目优先级更改:', projectId, '优先级:', priority);
    
    // 更新项目优先级
    const projectList = app.globalData.projectList;
    const projectIndex = projectList.findIndex(item => item.id === projectId);
    
    if (projectIndex !== -1) {
      projectList[projectIndex].priority = priority;
      
      // 保存到全局数据
      await app.saveProjectList(projectList);
      
      // 更新追踪项目列表
      this.updateTrackingData();
      
      wx.showToast({
        title: '优先级设置成功',
        icon: 'success'
      });
    }
  },

  // 处理追踪状态切换事件
  async onToggleTracking(e) {
    const { projectId } = e.detail;
    const projectList = app.globalData.projectList;
    const projectIndex = projectList.findIndex(item => item.id === projectId);
    
    if (projectIndex !== -1) {
      const project = projectList[projectIndex];
      
      if (project.status === 'tracking') {
        // 暂停追踪
        await app.pauseTrackingProject(projectId);
        project.status = 'paused';
      } else {
        // 开始追踪
        await app.startTrackingProject(projectId, project.name);
        project.status = 'tracking';
      }
      
      // 保存到全局数据
      await app.saveProjectList(projectList);
      
      // 更新追踪项目列表
      this.updateTrackingData();
      
      wx.showToast({
        title: project.status === 'tracking' ? '开始追踪' : '暂停追踪',
        icon: 'success'
      });
    }
  },

  // 处理删除项目事件
  async onDeleteProject(e) {
    const { projectId } = e.detail;
    const projectList = app.globalData.projectList;
    const projectIndex = projectList.findIndex(item => item.id === projectId);
    
    if (projectIndex !== -1) {
      // 从列表中移除项目
      projectList.splice(projectIndex, 1);
      
      // 保存到全局数据
      await app.saveProjectList(projectList);
      
      // 更新本地数据
      this.setData({ projectList: projectList.filter(item => item.status !== 'finished') });
      
      wx.showToast({
        title: '项目已删除',
        icon: 'success'
      });
    }
  }
});