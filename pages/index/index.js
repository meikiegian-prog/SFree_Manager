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
    showRecordTrigger: true       // 快速记录触发按钮显隐
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
    const projectList = app.globalData.projectList;
    const totalIncome = projectList.reduce((sum, item) => sum + (item.income || 0), 0);
    const trackingProjectName = projectList.find(
      item => item.id === app.globalData.timerData.currentProjectId
    )?.name || '';

    this.setData({
      projectList,
      timerData: app.globalData.timerData,
      totalIncome,
      trackingProjectName,
      currentTime: app.formatTime(
        this.data.timerData.isTracking 
          ? Math.floor((Date.now() - this.data.timerData.startTime) / 1000) 
          : 0
      )
    });

    if (this.data.timerData.isTracking && !this.data.timerData.timerInterval) {
      this.startTimer();
    }
  },

  // 滑动切换模块
  swiperChange(e) {
    this.setData({ activeTab: e.detail.current });
  },

  // 新建项目
  addProject() {
    wx.showModal({
      title: '新建项目',
      editable: true,
      placeholderText: '输入项目名称（如：UI设计）',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const newProject = {
            id: Date.now().toString(),
            name: res.content.trim(),
            deadline: '',
            totalTime: 0,
            income: 0,
            status: 'doing',
            createTime: new Date().toLocaleDateString()
          };

          const newList = [...this.data.projectList, newProject];
          app.saveProjectList(newList);
          this.setData({ projectList: newList });

          wx.showToast({ title: '项目创建成功！', icon: 'success' });
        }
      }
    });
  },

  // 一键开始/暂停计时
  handleToggleTimer(e) {
    const { projectId } = e.detail;
    const { isTracking, currentProjectId, timerInterval } = this.data.timerData;

    if (!isTracking) {
      const startTime = Date.now();
      app.globalData.timerData = {
        isTracking: true,
        currentProjectId: projectId,
        startTime,
        timerInterval: null
      };
      this.setData({
        timerData: app.globalData.timerData,
        trackingProjectName: this.data.projectList.find(item => item.id === projectId)?.name || ''
      });
      this.startTimer();
    } else if (currentProjectId === projectId) {
      clearInterval(timerInterval);
      const totalSeconds = Math.floor((Date.now() - this.data.timerData.startTime) / 1000);
      const newList = this.data.projectList.map(item => {
        if (item.id === projectId) {
          return { ...item, totalTime: item.totalTime + totalSeconds };
        }
        return item;
      });

      app.saveProjectList(newList);
      app.globalData.timerData = {
        isTracking: false,
        currentProjectId: '',
        startTime: 0,
        timerInterval: null
      };
      this.setData({
        projectList: newList,
        timerData: app.globalData.timerData,
        currentTime: '00:00:00',
        trackingProjectName: ''
      });

      wx.showToast({ title: '计时已暂停！', icon: 'success' });
    }
  },

  // 启动计时器
  startTimer() {
    const timerInterval = setInterval(() => {
      const { startTime } = app.globalData.timerData;
      const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
      this.setData({
        currentTime: app.formatTime(totalSeconds)
      });
    }, 1000);

    app.globalData.timerData.timerInterval = timerInterval;
    this.setData({
      'timerData.timerInterval': timerInterval
    });
  },

  // 标记项目完成（简化语音播报，保留弹窗激励）
  handleFinishProject(e) {
    const { projectId } = e.detail;
    const newList = this.data.projectList.map(item => {
      if (item.id === projectId) {
        return { ...item, status: 'finished' };
      }
      return item;
    });

    app.saveProjectList(newList);
    this.setData({ projectList: newList });

    // HCI核心：情感化激励反馈（弹窗替代语音，保留体验）
    wx.showModal({
      title: '🎉 任务完成！',
      content: '解锁「高效达人」勋章，奖励自己一杯咖啡吧～',
      showCancel: false
    });
  },

  // 检查超时项目
  checkAllProjectTimeout() {
    this.data.projectList.forEach(project => {
      app.checkProjectTimeout(project.id);
    });
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
  handleSaveRecord(e) {
    const { text } = e.detail;
    const newProject = {
      id: `task_${Date.now()}`,
      name: `快速任务：${text}`,
      deadline: '',
      totalTime: 0,
      income: 0,
      status: 'doing',
      createTime: new Date().toLocaleDateString()
    };

    const newList = [...this.data.projectList, newProject];
    app.saveProjectList(newList);
    this.setData({ projectList: newList });

    wx.showToast({ title: '任务保存成功！', icon: 'success' });
  }
});