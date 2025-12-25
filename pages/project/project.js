// 项目详情页逻辑
const app = getApp();

Page({
  data: {
    projectId: '',   // 当前项目ID
    project: null,   // 当前项目数据
    tempProject: {}, // 临时修改的数据
    formattedTotalTime: '00:00:00', // 预先格式化的累计时长
    timerInterval: null, // 计时器ID
    lastUpdateTime: null // 上次更新时间戳
  },

  onLoad(options) {
    const { projectId } = options;
    if (!projectId) {
      wx.showToast({ title: '项目ID不能为空', icon: 'none' });
      wx.navigateBack();
      return;
    }

    // 获取项目数据
    const projectList = app.globalData.projectList;
    console.log('项目列表:', projectList);
    
    const project = projectList.find(item => item.id === projectId);
    if (!project) {
      wx.showToast({ title: '项目不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }

    console.log('找到的项目数据:', project);
    const formattedTotalTime = this.formatTime(project.totalTime);
    console.log('项目累计时长:', project.totalTime, '格式化后:', formattedTotalTime);

    // 解析deadline为日期和时间部分
    let deadlineDate = '';
    let deadlineTime = '';
    if (project.deadline) {
      const parts = project.deadline.split(' ');
      if (parts.length === 2) {
        deadlineDate = parts[0];
        deadlineTime = parts[1];
      }
    }

    this.setData({
      projectId,
      project,
      tempProject: { ...project }, // 复制一份用于临时修改
      formattedTotalTime,
      deadlineDate,
      deadlineTime
    });
  },

  onShow() {
    // 页面显示时启动计时器，实时更新累计时长
    this.startTimer();
  },

  onHide() {
    // 页面隐藏时停止计时器
    this.stopTimer();
  },

  onUnload() {
    // 页面卸载时停止计时器
    this.stopTimer();
  },

  // 启动计时器
  startTimer() {
    // 清理旧的计时器
    this.stopTimer();
    
    // 立即更新一次数据
    this.updateProjectTime();
    
    // 启动每秒更新的计时器
    const timerInterval = setInterval(() => {
      this.updateProjectTime();
    }, 1000);
    
    this.setData({ timerInterval });
  },

  // 停止计时器
  stopTimer() {
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
      this.setData({ timerInterval: null });
    }
  },

  // 更新项目累计时长
  updateProjectTime() {
    const { projectId, project } = this.data;
    if (!project) return;
    
    // 检查当前项目是否正在追踪
    const isTracking = app.globalData.timerData.trackingProjects.some(
      item => item.projectId === projectId
    );
    
    if (isTracking) {
      // 项目正在追踪，实时更新累计时长（简单方法：每秒增加1秒）
      const totalTime = (project.totalTime || 0) + 1;
      const formattedTotalTime = this.formatTime(totalTime);
      
      this.setData({
        formattedTotalTime,
        'project.totalTime': totalTime
      });
    } else {
      // 项目未在追踪，使用静态累计时长
      const formattedTotalTime = this.formatTime(project.totalTime || 0);
      this.setData({ formattedTotalTime });
    }
  },

  // 格式化时间
  formatTime(seconds) {
    return app.formatTime(seconds);
  },

  // 选择日期
  onDateChange(e) {
    const date = e.detail.value;
    this.setData({
      deadlineDate: date
    });
    this.updateDeadline();
  },

  // 选择时间
  onTimeChange(e) {
    const time = e.detail.value;
    this.setData({
      deadlineTime: time
    });
    this.updateDeadline();
  },

  // 更新截止时间
  updateDeadline() {
    const { deadlineDate, deadlineTime } = this.data;
    if (deadlineDate && deadlineTime) {
      const deadline = `${deadlineDate} ${deadlineTime}`;
      this.setData({
        'tempProject.deadline': deadline
      });
    }
  },

  // 修改收入
  onIncomeChange(e) {
    this.setData({
      'tempProject.income': Number(e.detail.value) || 0
    });
  },

  // 保存修改
  saveProject() {
    const { projectId, tempProject } = this.data;
    const projectList = app.globalData.projectList;
    const newList = projectList.map(item => {
      if (item.id === projectId) {
        return { ...item, ...tempProject };
      }
      return item;
    });

    // 保存到全局
    app.saveProjectList(newList);
    this.setData({ project: tempProject });

    wx.showToast({ title: '修改保存成功！', icon: 'success' });
    // 检查超时状态
    app.checkProjectTimeout(projectId);
  },

  // 删除项目
  deleteProject() {
    wx.showModal({
      title: '确认删除',
      content: '删除后数据不可恢复，是否确认？',
      success: (res) => {
        if (res.confirm) {
          const { projectId } = this.data;
          const projectList = app.globalData.projectList;
          const newList = projectList.filter(item => item.id !== projectId);

          // 保存到全局
          app.saveProjectList(newList);
          wx.showToast({ title: '项目已删除', icon: 'success' });
          // 返回上一页
          wx.navigateBack();
        }
      }
    });
  }
});