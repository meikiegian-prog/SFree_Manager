// 追踪项目卡片组件逻辑
const app = getApp();

Component({
  properties: {
    // 接收父组件传入的项目数据
    project: {
      type: Object,
      value: {},
      observer: function(newVal) {
        // 当项目数据更新时，重新计算剩余时间、颜色和格式化时间
        if (newVal) {
          // 计算格式化时间
          const formattedTotalTime = newVal.totalTime ? this.formatTime(newVal.totalTime) : '00:00:00';
          this.setData({ formattedTotalTime });
          
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

    // 启动计时器，每秒更新剩余时间
    startTimer() {
      const timer = setInterval(() => {
        this.calculateRemainingTime();
        this.updateCardStyle();
      }, 1000);
      
      this.setData({ timer });
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
