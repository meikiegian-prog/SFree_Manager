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
    filteredProjectList: [], // 筛选后的项目列表（不包含追踪中项目）
    trackingProjects: [], // 追踪中的项目列表
    totalTime: 0,
    totalIncome: 0,
    formattedTotalTime: '00:00:00',
    filterType: 'all', // 筛选类型：all, year, month
    filterYear: new Date().getFullYear(), // 当前年份
    filterMonth: new Date().getMonth() + 1, // 当前月份
    years: [], // 可选的年份列表
    months: Array.from({length: 12}, (_, i) => i + 1) // 1-12月
  },

  onLoad() {
    this.initYears();
    this.initData();
    this.initChart();
  },

  // 初始化年份列表（从2024年到当前年份）
  initYears() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = 2024; year <= currentYear; year++) {
      years.push(year);
    }
    this.setData({ years });
  },

    // 初始化数据
    initData() {
      const projectList = app.globalData.projectList;
      console.log('项目列表数据:', projectList);
      
      // 获取追踪中的项目（状态为tracking的项目）
      const trackingProjects = projectList.filter(item => item.status === 'tracking');
      
      // 过滤掉追踪中的项目，只显示已完成的项目
      const filteredProjectList = projectList.filter(item => 
        item.status === 'finished'
      );
      
      // 根据筛选条件进一步过滤
      const finalFilteredList = this.applyTimeFilter(filteredProjectList);
      
      const totalTime = finalFilteredList.reduce((sum, item) => sum + (item.totalTime || 0), 0);
      const totalIncome = finalFilteredList.reduce((sum, item) => sum + (item.income || 0), 0);
      const formattedTotalTime = app.formatTime(totalTime);
      
      console.log('总时长:', totalTime, '格式化后:', formattedTotalTime);
      console.log('总收入:', totalIncome);
      console.log('追踪中的项目:', trackingProjects);
      console.log('筛选后的项目:', finalFilteredList);
      
      // 详细检查收入数据
      console.log('收入数据详情:');
      finalFilteredList.forEach(item => {
        console.log(`项目: ${item.name}, 收入: ${item.income || 0}, 状态: ${item.status}`);
      });

      this.setData({
        projectList,
        filteredProjectList: finalFilteredList,
        trackingProjects,
        totalTime,
        totalIncome,
        formattedTotalTime
      });
    },

  // 应用时间筛选
  applyTimeFilter(projects) {
    const { filterType, filterYear, filterMonth } = this.data;
    console.log('筛选条件:', { filterType, filterYear, filterMonth });
    
    if (filterType === 'all') {
      console.log('全部筛选，返回所有项目，数量:', projects.length);
      return projects;
    }
    
    const filtered = projects.filter(project => {
      // 使用完成时间进行筛选，如果没有完成时间则使用创建时间
      const timeField = project.finishTime || project.createTime;
      if (!timeField) {
        console.log('项目缺少时间字段:', project.name);
        return false;
      }
      
      const projectDate = new Date(timeField);
      const projectYear = projectDate.getFullYear();
      const projectMonth = projectDate.getMonth() + 1;
      
      console.log('项目时间信息:', project.name, '时间字段:', timeField, '项目年:', projectYear, '项目月:', projectMonth);
      
      if (filterType === 'year') {
        const match = projectYear === filterYear;
        console.log('年份筛选:', project.name, '匹配:', match);
        return match;
      } else if (filterType === 'month') {
        const match = projectYear === filterYear && projectMonth === filterMonth;
        console.log('月份筛选:', project.name, '匹配:', match);
        return match;
      }
      
      return true;
    });
    
    console.log('筛选后项目数量:', filtered.length);
    return filtered;
  },

  // 切换筛选类型
  onFilterTypeChange(e) {
    const filterType = e.detail.value;
    this.setData({ filterType }, () => {
      this.initData();
      this.initChart();
    });
  },

  // 切换年份
  onYearChange(e) {
    const selectedIndex = parseInt(e.detail.value);
    const filterYear = this.data.years[selectedIndex];
    this.setData({ filterYear }, () => {
      this.initData();
      this.initChart();
    });
  },

  // 切换月份
  onMonthChange(e) {
    const selectedIndex = parseInt(e.detail.value);
    const filterMonth = this.data.months[selectedIndex];
    this.setData({ filterMonth }, () => {
      this.initData();
      this.initChart();
    });
  },

  // 切换统计维度
  switchTab(e) {
    const type = e.currentTarget.dataset.type;
    
    // 先清除图表实例，确保重新初始化
    this.setData({ 
      activeTab: type,
      ec: { onInit: null }  // 清除图表实例
    }, () => {
      // 延迟一小段时间再重新初始化图表
      setTimeout(() => {
        this.initChart();
      }, 100);
    });
  },

    // 初始化ECharts图表
    initChart() {
      const { activeTab, filteredProjectList } = this.data;
      const validProjects = filteredProjectList.filter(item => 
        activeTab === 'time' ? item.totalTime > 0 : (item.income || 0) > 0
      );

      console.log('当前统计维度:', activeTab);
      console.log('有效项目数量:', validProjects.length);
      console.log('有效项目数据:', validProjects);

      // 计算总时间或总收入用于占比计算
      const totalValue = activeTab === 'time' 
        ? validProjects.reduce((sum, item) => sum + (item.totalTime || 0), 0) // 总时间（秒）
        : validProjects.reduce((sum, item) => sum + (item.income || 0), 0); // 总收入

      console.log('总数值:', totalValue);
      console.log('activeTab:', activeTab);

      const xData = validProjects.map(item => item.name);
      const yData = activeTab === 'time' 
        ? validProjects.map(item => totalValue > 0 ? (item.totalTime / totalValue) * 100 : 0) // 时间占比：百分比（数值类型）
        : validProjects.map(item => totalValue > 0 ? (item.income / totalValue) * 100 : 0); // 收入占比：百分比（数值类型）

      console.log('xData:', xData);
      console.log('yData:', yData);

      const option = {
        title: {
          text: this.getChartTitle(activeTab),
          left: 'center',
          textStyle: { fontSize: 32 }
        },
        tooltip: {
          trigger: 'click',
          formatter: (params) => {
            const timeText = this.getTimeRangeText();
            const percentage = params.value;
            const absoluteValue = activeTab === 'time' 
              ? app.formatTime((percentage / 100) * totalValue)
              : (percentage / 100 * totalValue).toFixed(2);
            const unit = activeTab === 'time' ? '' : '元';
            return `${timeText}${params.name}：${absoluteValue}${unit}（占比${percentage}%）`;
          },
          textStyle: { fontSize: 28 }
        },
        series: [
          {
            name: activeTab === 'time' ? '耗时占比' : '收入占比',
            type: 'pie',
            radius: ['35%', '60%'], // 减小半径，为外部标签提供更多空间
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
              fontSize: 20,
              formatter: function(params) {
                // 限制项目名称长度，防止文字过长
                const name = params.name.length > 6 ? params.name.substring(0, 6) + '...' : params.name;
                return `${name}\n${params.percent}%`;
              },
              position: 'outside',
              alignTo: 'labelLine',
              bleedMargin: 5,
              distanceToLabelLine: 5,
              textBorderColor: 'transparent'
            },
            labelLine: {
              length: 15,
              length2: 10,
              smooth: true
            }
          }
        ]
      };

      // 如果图表实例已存在，使用setOption更新；否则重新初始化
      if (this.chartInstance) {
        console.log('使用setOption更新图表');
        this.chartInstance.setOption(option);
      } else {
        console.log('重新初始化图表');
        this.setData({
          ec: {
            onInit: (canvas, width, height) => {
              const chart = echarts.init(canvas, null, {
                width: width,
                height: height
              });
              canvas.setChart(chart);
              chart.setOption(option);

              // 保存图表实例引用
              this.chartInstance = chart;

              // 增强数据可视化：添加语音解读功能
              chart.on('click', (params) => {
                const timeText = this.getTimeRangeText();
                const percentage = params.value;
                const absoluteValue = activeTab === 'time' 
                  ? app.formatTime((percentage / 100) * totalValue)
                  : (percentage / 100 * totalValue).toFixed(2);
                const text = `${timeText}${params.name}${activeTab === 'time' ? '耗时' : '收入'}${absoluteValue}${activeTab === 'time' ? '' : '元'}（占比${percentage}%）`;
                
                // 显示弹窗反馈
                wx.showToast({ title: text, icon: 'none' });
                
                // 语音解读功能（如果用户授权了录音权限）
                if (wx.getStorageSync('voiceEnabled')) {
                  const speechText = `${timeText}${params.name}${activeTab === 'time' ? '项目耗时' : '项目收入'}${absoluteValue}${activeTab === 'time' ? '' : '元'}（占比${percentage}%）`;
                  
                  // 使用微信语音合成API
                  wx.createInnerAudioContext().play();
                  // 实际项目中可以接入百度语音API进行更自然的语音播报
                  console.log('语音解读:', speechText);
                }
              });

              return chart;
            }
          }
        });
      }
  },
  // 处理优先级更改事件
  async onPriorityChange(e) {
    const { projectId, priority } = e.detail;
    console.log('项目优先级更改:', projectId, '优先级:', priority);
    
    // 更新项目优先级
    const projectList = app.globalData.projectList; // 使用完整的项目列表
    const projectIndex = projectList.findIndex(item => item.id === projectId);
    
    if (projectIndex !== -1) {
      projectList[projectIndex].priority = priority;
      
      // 保存到全局数据
      await app.saveProjectList(projectList);
      
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
  async onToggleTracking(e) {
    const { projectId } = e.detail;
    const projectList = app.globalData.projectList; // 使用完整的项目列表
    const projectIndex = projectList.findIndex(item => item.id === projectId);
    
    if (projectIndex !== -1) {
      const project = projectList[projectIndex];
      
      if (project.status === 'tracking') {
        // 暂停追踪
        await app.pauseTrackingProject(projectId);
        project.status = 'paused';
      } else {
        // 开始追踪
        await app.startTrackingProject(projectId, project.name);
        project.status = 'tracking';
      }
      
      // 保存到全局数据
      await app.saveProjectList(projectList);
      
      // 更新追踪项目列表
      const trackingProjects = projectList.filter(item => item.status === 'tracking');
      this.setData({ trackingProjects });
      
      wx.showToast({
        title: project.status === 'tracking' ? '开始追踪' : '暂停追踪',
        icon: 'success'
      });
    }
  },

  // 获取图表标题
  getChartTitle(activeTab) {
    const { filterType, filterYear, filterMonth } = this.data;
    
    let timeRange = '';
    if (filterType === 'all') {
      timeRange = '全部';
    } else if (filterType === 'year') {
      timeRange = `${filterYear}年`;
    } else if (filterType === 'month') {
      timeRange = `${filterYear}年${filterMonth}月`;
    }
    
    return activeTab === 'time' 
      ? `${timeRange}项目时间分配（占比）` 
      : `${timeRange}项目收入统计（占比）`;
  },

  // 处理项目完成事件（统计页面中项目已经是完成状态，给出提示）
  handleFinishProject(e) {
    wx.showToast({
      title: '项目已经是完成状态',
      icon: 'none'
    });
  },

  // 处理删除项目事件
  async onDeleteProject(e) {
    const { projectId } = e.detail;
    const projectList = app.globalData.projectList; // 使用完整的项目列表，而不是筛选后的列表
    const projectIndex = projectList.findIndex(item => item.id === projectId);
    
    if (projectIndex !== -1) {
      // 从列表中移除项目
      projectList.splice(projectIndex, 1);
      
      // 保存到全局数据
      await app.saveProjectList(projectList);
      
      // 重新初始化数据
      this.initData();
      this.initChart();
      
      wx.showToast({
        title: '项目已删除',
        icon: 'success'
      });
    }
  },

  // 获取时间范围文本（用于语音解读）
  getTimeRangeText() {
    const { filterType, filterYear, filterMonth } = this.data;
    
    if (filterType === 'all') {
      return '全部';
    } else if (filterType === 'year') {
      return `${filterYear}年`;
    } else if (filterType === 'month') {
      return `${filterYear}年${filterMonth}月`;
    }
    return '';
  },

  // 格式化时间
  formatTime(seconds) {
    return app.formatTime(seconds);
  }
});