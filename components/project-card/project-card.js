// 项目卡片组件逻辑
const app = getApp();

Component({
  properties: {
    // 接收父组件传入的项目数据
    project: {
      type: Object,
      value: {},
      observer: function(newVal) {
        // 当project数据更新时，计算格式化时间
        if (newVal && newVal.totalTime !== undefined) {
          const formattedTime = this.formatTime(newVal.totalTime);
          this.setData({
            formattedTotalTime: formattedTime
          });
        }
      }
    },
    // 接收追踪项目列表（多项目追踪）
    trackingProjects: {
      type: Array,
      value: [],
      observer: function(newVal) {
        // 当追踪项目列表更新时，计算当前项目是否在追踪中
        const isTracking = newVal.some(item => item.projectId === this.data.project.id);
        this.setData({
          isProjectTracking: isTracking
        });
      }
    }
  },

  data: {
    formattedTotalTime: '00:00:00', // 预先格式化的累计时长
    isProjectTracking: false // 当前项目是否在追踪中
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