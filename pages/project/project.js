// 项目详情页逻辑
const app = getApp();

Page({
  data: {
    projectId: '',   // 当前项目ID
    project: null,   // 当前项目数据
    tempProject: {}, // 临时修改的数据
    formattedTotalTime: '00:00:00' // 预先格式化的累计时长
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

    this.setData({
      projectId,
      project,
      tempProject: { ...project }, // 复制一份用于临时修改
      formattedTotalTime
    });
  },

  // 格式化时间
  formatTime(seconds) {
    return app.formatTime(seconds);
  },

  // 选择截止日期
  onDateChange(e) {
    this.setData({
      'tempProject.deadline': e.detail.value
    });
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