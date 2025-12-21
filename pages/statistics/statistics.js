// 数据统计页逻辑（简化语音播报，保留弹窗反馈）
import * as echarts from '../../ec-canvas/echarts';
const app = getApp();

Page({
  data: {
    ec: {
      onInit: null
    },
    activeTab: 'time',
    projectList: [],
    trackingProjects: [], // 追踪中的项目列表
    totalTime: 0,
    totalIncome: 0,
    formattedTotalTime: '00:00:00'
  },

  onLoad() {
    this.initData();
    this.initChart();
  },

  // 初始化数据
  initData() {
    const projectList = app.globalData.projectList;
    console.log('项目列表数据:', projectList);
    
    // 获取追踪中的项目（状态为tracking的项目）
    const trackingProjects = projectList.filter(item => item.status === 'tracking');
    
    const totalTime = projectList.reduce((sum, item) => sum + (item.totalTime || 0), 0);
    const totalIncome = projectList.reduce((sum, item) => sum + (item.income || 0), 0);
    const formattedTotalTime = app.formatTime(totalTime);
    
    console.log('总时长:', totalTime, '格式化后:', formattedTotalTime);
    console.log('追踪中的项目:', trackingProjects);

    this.setData({
      projectList,
      trackingProjects,
      totalTime,
      totalIncome,
      formattedTotalTime
    });
  },

  // 切换统计维度
  switchTab(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ activeTab: type });
    this.initChart();
  },

  // 初始化ECharts图表
  initChart() {
    const { activeTab, projectList } = this.data;
    const validProjects = projectList.filter(item => 
      activeTab === 'time' ? item.totalTime > 0 : (item.income || 0) > 0
    );

    const initFn = (canvas, width, height) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height
      });
      canvas.setChart(chart);

      const xData = validProjects.map(item => item.name);
      const yData = activeTab === 'time' 
        ? validProjects.map(item => item.totalTime / 3600) 
        : validProjects.map(item => item.income || 0);

      const option = {
        title: {
          text: activeTab === 'time' ? '项目时间分配（小时）' : '项目收入统计（元）',
          left: 'center',
          textStyle: { fontSize: 32 }
        },
        tooltip: {
          trigger: 'click',
          formatter: (params) => `${params.name}：${activeTab === 'time' ? app.formatTime(params.value * 3600) : params.value}${activeTab === 'time' ? '' : '元'}`,
          textStyle: { fontSize: 28 }
        },
        series: [
          {
            name: activeTab === 'time' ? '耗时' : '收入',
            type: 'pie',
            radius: ['40%', '70%'],
            data: xData.map((name, index) => ({
              value: yData[index],
              name: name
            })),
            color: ['#2E7DFF', '#4CAF50', '#FF9800', '#9C27B0', '#FFCDD2', '#607D8B'],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              fontSize: 24
            }
          }
        ]
      };

      chart.setOption(option);

      // 增强数据可视化：添加语音解读功能
      chart.on('click', (params) => {
        const text = `本月${params.name}${activeTab === 'time' ? '耗时' : '收入'}${activeTab === 'time' ? app.formatTime(params.value * 3600) : params.value}${activeTab === 'time' ? '' : '元'}`;
        
        // 显示弹窗反馈
        wx.showToast({ title: text, icon: 'none' });
        
        // 语音解读功能（如果用户授权了录音权限）
        if (wx.getStorageSync('voiceEnabled')) {
          const speechText = `${params.name}${activeTab === 'time' ? '项目耗时' : '项目收入'}${activeTab === 'time' ? app.formatTime(params.value * 3600) : params.value}${activeTab === 'time' ? '' : '元'}`;
          
          // 使用微信语音合成API
          wx.createInnerAudioContext().play();
          // 实际项目中可以接入百度语音API进行更自然的语音播报
          console.log('语音解读:', speechText);
        }
      });

      return chart;
    };

    this.setData({
      ec: { onInit: initFn }
    });
  },
  // 处理优先级更改事件
  onPriorityChange(e) {
    const { projectId, priority } = e.detail;
    console.log('项目优先级更改:', projectId, '优先级:', priority);
    
    // 更新项目优先级
    const projectList = this.data.projectList;
    const projectIndex = projectList.findIndex(item => item.id === projectId);
    
    if (projectIndex !== -1) {
      projectList[projectIndex].priority = priority;
      
      // 保存到全局数据
      app.globalData.projectList = projectList;
      wx.setStorageSync('projectList', projectList);
      
      // 更新追踪项目列表
      const trackingProjects = projectList.filter(item => item.status === 'tracking');
      this.setData({ trackingProjects });
      
      wx.showToast({
        title: '优先级设置成功',
        icon: 'success'
      });
    }
  },

  // 处理追踪状态切换事件
  onToggleTracking(e) {
    const { projectId } = e.detail;
    const projectList = this.data.projectList;
    const projectIndex = projectList.findIndex(item => item.id === projectId);
    
    if (projectIndex !== -1) {
      const project = projectList[projectIndex];
      
      if (project.status === 'tracking') {
        // 暂停追踪
        app.pauseTrackingProject(projectId);
        project.status = 'paused';
      } else {
        // 开始追踪
        app.startTrackingProject(projectId, project.name);
        project.status = 'tracking';
      }
      
      // 保存到全局数据
      app.globalData.projectList = projectList;
      wx.setStorageSync('projectList', projectList);
      
      // 更新追踪项目列表
      const trackingProjects = projectList.filter(item => item.status === 'tracking');
      this.setData({ trackingProjects });
      
      wx.showToast({
        title: project.status === 'tracking' ? '开始追踪' : '暂停追踪',
        icon: 'success'
      });
    }
  },

  // 格式化时间
  formatTime(seconds) {
    return app.formatTime(seconds);
  }
});