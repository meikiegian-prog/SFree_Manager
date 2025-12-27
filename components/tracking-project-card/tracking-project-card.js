// 追踪项目卡片组件逻辑
const app = getApp();

Component({
  properties: {
    // 接收父组件传入的项目数据
    project: {
      type: Object,
      value: {},
      observer: function(newVal) {
        // 当项目数据更新时，重新计算剩余时间和颜色
        if (newVal) {
          // 如果项目已完成，不执行任何操作
          if (newVal.status === 'finished') {
            return;
          }
          
          // 累计时间由计时器统一更新，避免闪烁
          if (newVal.deadline) {
            this.calculateRemainingTime();
            this.updateCardStyle();
          }
        }
      }
    }
  },

  data: {
    remainingTime: '', // 剩余时间文本
    remainingDays: 0, // 剩余天数
    cardColor: '#4CAF50', // 卡片颜色（默认绿色）
    isShaking: false, // 是否晃动
    priority: 1, // 优先级（1-5，1为最高）
    timer: null, // 计时器
    formattedTotalTime: '00:00:00' // 格式化后的累计时长
  },

  lifetimes: {
    attached() {
      // 组件挂载时启动计时器
      this.startTimer();
    },
    detached() {
      // 组件卸载时清除计时器
      if (this.data.timer) {
        clearInterval(this.data.timer);
      }
    }
  },

  methods: {
    // 格式化时间（调用全局方法）
    formatTime(seconds) {
      return app.formatTime(seconds);
    },

    // 启动计时器，每秒更新剩余时间和累计时长
    startTimer() {
      const timer = setInterval(() => {
        this.calculateRemainingTime();
        this.updateCardStyle();
        this.updateTotalTime();
      }, 1000);
      
      this.setData({ timer });
    },

    // 更新累计时长
    updateTotalTime() {
      const { project } = this.data;
      if (!project) return;
      
      // 如果项目已完成，停止计时器
      if (project.status === 'finished') {
        if (this.data.timer) {
          clearInterval(this.data.timer);
          this.setData({ timer: null });
        }
        return;
      }
      
      // 检查当前项目是否正在追踪
      const isTracking = app.globalData.timerData.trackingProjects.some(
        item => item.projectId === project.id
      );
      
      if (isTracking) {
        // 项目正在追踪，实时更新累计时长（每秒增加1秒）
        const totalTime = (project.totalTime || 0) + 1;
        const formattedTotalTime = this.formatTime(totalTime);
        
        // 只更新本地显示数据，不修改project对象
        this.setData({
          formattedTotalTime
        });
        
        // 通知父组件累计时长已更新
        this.triggerEvent('timeUpdate', {
          projectId: project.id,
          totalTime: totalTime
        });
      }
    },

    // 计算剩余时间
    calculateRemainingTime() {
      const { project } = this.data;
      if (!project || !project.deadline) return;

      const deadline = new Date(project.deadline);
      const now = new Date();
      const diffMs = deadline - now;
      
      if (diffMs <= 0) {
        // 已过期
        this.setData({
          remainingTime: '已过期',
          remainingDays: 0
        });
        return;
      }

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      let timeText = '';
      if (diffDays > 0) {
        timeText = `${diffDays}天${diffHours}小时`;
      } else if (diffHours > 0) {
        timeText = `${diffHours}小时${diffMinutes}分`;
      } else {
        timeText = `${diffMinutes}分${diffSeconds}秒`;
      }

      this.setData({
        remainingTime: timeText,
        remainingDays: diffDays
      });
    },

    // 更新卡片样式（颜色和晃动效果）
    updateCardStyle() {
      const { remainingDays } = this.data;
      
      // 计算颜色（绿→红渐变）
      let color;
      if (remainingDays >= 7) {
        color = '#4CAF50'; // 绿色
      } else if (remainingDays >= 3) {
        color = '#FF9800'; // 橙色
      } else if (remainingDays >= 1) {
        color = '#F44336'; // 红色
      } else {
        color = '#D32F2F'; // 深红色（已过期或不足1天）
      }

      // 检查是否需要晃动（剩余时间不足1天）
      const shouldShake = remainingDays < 1 && remainingDays >= 0;

      this.setData({
        cardColor: color,
        isShaking: shouldShake
      });
    },

    // 设置优先级
    setPriority(e) {
      const priority = parseInt(e.currentTarget.dataset.priority);
      if (priority >= 1 && priority <= 5) {
        this.setData({ priority });
        
        // 通知父组件优先级已更改
        this.triggerEvent('priorityChange', {
          projectId: this.data.project.id,
          priority: priority
        });
      }
    },

    // 暂停/继续追踪
    toggleTracking(e) {
      const projectId = e.currentTarget.dataset.projectid;
      this.triggerEvent('toggleTracking', { projectId });
    },

    // 查看项目详情
    viewDetails(e) {
      const projectId = e.currentTarget.dataset.projectid;
      wx.navigateTo({
        url: `/pages/project/project?projectId=${projectId}`
      });
    }
  }
});
