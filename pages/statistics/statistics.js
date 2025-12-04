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
    totalTime: 0,
    totalIncome: 0
  },

  onLoad() {
    this.initData();
    this.initChart();
  },

  // 初始化数据
  initData() {
    const projectList = app.globalData.projectList;
    const totalTime = projectList.reduce((sum, item) => sum + item.totalTime, 0);
    const totalIncome = projectList.reduce((sum, item) => sum + (item.income || 0), 0);

    this.setData({
      projectList,
      totalTime,
      totalIncome
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
          formatter: (params) => `${params.name}：${params.value}${activeTab === 'time' ? '小时' : '元'}`,
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

      // 核心修改：仅保留弹窗反馈，移除语音播报
      chart.on('click', (params) => {
        const text = `本月${params.name}${activeTab === 'time' ? '耗时' : '收入'}${params.value}${activeTab === 'time' ? '小时' : '元'}`;
        wx.showToast({ title: text, icon: 'none' });
      });

      return chart;
    };

    this.setData({
      ec: { onInit: initFn }
    });
  },
  // 格式化时间
  formatTime(seconds) {
    return app.formatTime(seconds);
  }
});