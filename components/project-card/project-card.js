// 项目卡片组件逻辑
const app = getApp();

Component({
  properties: {
    // 接收父组件传入的项目数据
    project: {
      type: Object,
      value: {}
    },
    // 接收当前计时状态
    isTracking: {
      type: Boolean,
      value: false
    },
    // 接收当前计时项目ID
    currentProjectId: {
      type: String,
      value: ''
    }
  },

  methods: {
    // 格式化时间（调用全局方法）
    formatTime(seconds) {
      return app.formatTime(seconds);
    },

    // 一键开始/暂停计时
    toggleTimer(e) {
      const projectId = e.currentTarget.dataset.projectid;
      // 向父组件传递事件
      this.triggerEvent('toggleTimer', { projectId });
    },

    // 标记项目完成（触发激励反馈）
    finishProject(e) {
      const projectId = e.currentTarget.dataset.projectid;
      this.triggerEvent('finishProject', { projectId });
    },

    // 跳转到项目详情页
    goToDetail(e) {
      const projectId = e.currentTarget.dataset.projectid;
      wx.navigateTo({
        url: `/pages/project/project?projectId=${projectId}`
      });
    }
  }
});