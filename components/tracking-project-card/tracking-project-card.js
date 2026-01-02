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
    startColor: '#2196F3', // 渐变起始颜色（默认蓝色）
    endColor: '#2196F3', // 渐变结束颜色（默认蓝色）
    borderColor: '#2196F3', // 边框颜色（默认蓝色）
    textColor: '#FFFFFF', // 字体颜色（默认白色）
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
        // 已过期，设置remainingDays为-1以确保显示灰色
        this.setData({
          remainingTime: '已过期',
          remainingDays: -1
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

    // 十六进制颜色转RGB
    hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    },

    // RGB转十六进制颜色
    rgbToHex(r, g, b) {
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    // 颜色线性插值
    interpolateColor(color1, color2, factor) {
      const rgb1 = this.hexToRgb(color1);
      const rgb2 = this.hexToRgb(color2);
      
      if (!rgb1 || !rgb2) return color1;
      
      const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
      const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
      const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
      
      return this.rgbToHex(r, g, b);
    },

    // 降低颜色饱和度
    desaturateColor(hexColor, saturationFactor = 0.7) {
      const rgb = this.hexToRgb(hexColor);
      if (!rgb) return hexColor;
      
      // 将RGB转换为HSL
      let r = rgb.r / 255;
      let g = rgb.g / 255;
      let b = rgb.b / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      
      if (max === min) {
        h = s = 0; // 灰色
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      
      // 降低饱和度
      s = Math.max(0, Math.min(1, s * saturationFactor));
      
      // 将HSL转换回RGB
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      if (s === 0) {
        r = g = b = l;
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      
      return this.rgbToHex(
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
      );
    },

    // 计算颜色反色
    getInverseColor(hexColor) {
      const rgb = this.hexToRgb(hexColor);
      if (!rgb) return '#000000'; // 默认黑色
      
      // 计算反色
      const r = 255 - rgb.r;
      const g = 255 - rgb.g;
      const b = 255 - rgb.b;
      
      // 确保颜色不太亮或太暗，提高可读性
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      // 如果反色太亮（接近白色），调整为深色
      if (brightness > 200) {
        return '#333333'; // 深灰色
      }
      // 如果反色太暗（接近黑色），调整为浅色
      else if (brightness < 50) {
        return '#FFFFFF'; // 白色
      }
      
      return this.rgbToHex(r, g, b);
    },



    // 根据剩余天数计算渐变颜色
    calculateGradientColors(remainingDays) {
      // 颜色定义
      const BLUE = this.desaturateColor('#2196F3');      // 蓝色
      const BLUE_GREEN = this.desaturateColor('#4A89DC'); // 蓝绿色
      const GREEN = this.desaturateColor('#4CAF50');     // 绿色
      const GREEN_YELLOW = this.desaturateColor('#8BC34A'); // 黄绿色
      const YELLOW = this.desaturateColor('#FFEB3B');    // 黄色
      const ORANGE = this.desaturateColor('#FF9800');    // 橙色
      const ORANGE_RED = this.desaturateColor('#FF5252'); // 橙红色
      const RED = this.desaturateColor('#F44336');       // 红色
      const DARK_RED = this.desaturateColor('#D32F2F');  // 深红色
      const GRAY = '#9E9E9E';      // 灰色（用于已过期项目）
      
      // 已过期项目显示灰色
      if (remainingDays < 0) {
        return {
          startColor: GRAY,
          endColor: GRAY,
          borderColor: GRAY
        };
      }
      
      if (remainingDays >= 365) {
        // 1年及以上：纯蓝色
        return {
          startColor: BLUE,
          endColor: BLUE,
          borderColor: BLUE
        };
      } else if (remainingDays > 180) {
        // 1年-半年（365天-180天）：左侧蓝色，右侧从蓝绿色渐变到绿色
        const factor = (365 - remainingDays) / (365 - 180); // 0到1之间，0表示365天（纯蓝色），1表示180天（纯绿色）
        return {
          startColor: BLUE,
          endColor: this.interpolateColor(BLUE_GREEN, GREEN, factor),
          borderColor: this.interpolateColor(BLUE, GREEN, factor)
        };
      } else if (remainingDays >= 90) {
        // 半年-3个月（180天-90天）：左侧绿色，右侧从黄绿色渐变到黄色
        const factor = (180 - remainingDays) / (180 - 90); // 0到1之间，0表示180天（纯绿色），1表示90天（纯黄色）
        return {
          startColor: GREEN,
          endColor: this.interpolateColor(GREEN_YELLOW, YELLOW, factor),
          borderColor: this.interpolateColor(GREEN, YELLOW, factor)
        };
      } else if (remainingDays >= 30) {
        // 3个月-1个月（90天-30天）：左侧橙色，右侧从橙红色渐变到红色
        const factor = (90 - remainingDays) / (90 - 30); // 0到1之间，0表示90天（纯橙色），1表示30天（纯红色）
        return {
          startColor: ORANGE,
          endColor: this.interpolateColor(ORANGE_RED, RED, factor),
          borderColor: this.interpolateColor(ORANGE, RED, factor)
        };
      } else if (remainingDays >= 10) {
        // 1个月-10天（30天-10天）：左侧橙红色，右侧红色
        const factor = (30 - remainingDays) / 20; // 0到1之间，0表示30天（橙红色），1表示10天（红色）
        return {
          startColor: ORANGE_RED,
          endColor: RED,
          borderColor: this.interpolateColor(ORANGE_RED, RED, factor)
        };
      } else if (remainingDays >= 5) {
        // 10天-5天：红色
        return {
          startColor: RED,
          endColor: RED,
          borderColor: RED
        };
      } else {
        // 5天以内：深红色 + 晃动
        return {
          startColor: DARK_RED,
          endColor: DARK_RED,
          borderColor: DARK_RED,
          shouldShake: true
        };
      }
    },

    // 更新卡片样式（颜色和晃动效果）
    updateCardStyle() {
      const { remainingDays } = this.data;
      
      // 计算渐变颜色
      const colors = this.calculateGradientColors(remainingDays);
      
      // 计算剩余时间字体颜色（使用borderColor的反色）
      const textColor = this.getInverseColor(colors.borderColor);

      this.setData({
        startColor: colors.startColor,
        endColor: colors.endColor,
        borderColor: colors.borderColor,
        textColor: textColor,
        isShaking: colors.shouldShake || (remainingDays <= 5 && remainingDays >= 0)
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
