// 项目卡片组件逻辑
const app = getApp();

Component({
  properties: {
    // 接收父组件传入的项目数据
    project: {
      type: Object,
      value: {},
      observer: function(newVal) {
        // 当project数据更新时，更新组件内部数据
        if (newVal) {
          // 更新格式化时间
          if (newVal.totalTime !== undefined) {
            const formattedTime = this.formatTime(newVal.totalTime);
            this.setData({
              formattedTotalTime: formattedTime
            });
          }
          // 更新项目数据，确保使用最新的项目信息
          this.setData({
            project: newVal
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
    },
    // 接收管理模式状态
    isManageMode: {
      type: Boolean,
      value: false
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
      const { project } = this.data;
      
      // 改进检查逻辑：支持收入为0的情况
      const hasDeadline = project.deadline && project.deadline !== '未设置' && project.deadline.trim() !== '';
      const hasIncome = project.income !== undefined && project.income !== null && project.income !== '' && !isNaN(Number(project.income));
      
      if (!hasDeadline || !hasIncome) {
        // 显示提示信息并振动
        wx.vibrateShort({ type: 'light' });
        wx.showToast({
          title: '请设置项目信息',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      // 向父组件传递事件
      this.triggerEvent('toggleTimer', { projectId });
    },

    // 标记项目完成（触发激励反馈）
    finishProject(e) {
      const projectId = e.currentTarget.dataset.projectid;
      this.triggerEvent('finishProject', { projectId });
    },

    // 删除项目
    deleteProject(e) {
      const projectId = e.currentTarget.dataset.projectid;
      wx.showModal({
        title: '确认删除',
        content: '删除后数据不可恢复，是否确认？',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('deleteProject', { projectId });
          }
        }
      });
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