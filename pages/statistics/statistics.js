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
    months: Array.from({length: 12}, (_, i) => i + 1), // 1-12月
    isManageMode: false // 管理模式状态
  },

  onLoad() {
    this.initYears();
    this.initData();
    this.initChart();
  },

  onShow() {
    // 确保每次页面显示时都重新加载数据，保持数据同步
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
      // 强制重新从存储读取数据，确保数据同步
      const storedProjectList = wx.getStorageSync('projectList') || [];
      app.globalData.projectList = storedProjectList;
      
      const projectList = app.globalData.projectList;
      console.log('=== 统计页面数据初始化开始 ===');
      console.log('从存储读取的项目列表:', storedProjectList);
      console.log('全局项目列表:', projectList);
      console.log('项目总数:', projectList.length);
      
      // 详细检查每个项目的状态
      console.log('=== 项目状态详情 ===');
      projectList.forEach((item, index) => {
        console.log(`项目${index + 1}:`, item.name, '状态:', item.status, 'ID:', item.id, '完成时间:', item.finishTime);
      });
      
      // 特别检查已完成项目的数量
      const finishedProjects = projectList.filter(item => item.status === 'finished');
      console.log('=== 已完成项目统计 ===');
      console.log('已完成项目数量:', finishedProjects.length);
      console.log('已完成项目详情:', finishedProjects);
      
      // 获取追踪中的项目（状态为tracking的项目）
      const trackingProjects = projectList.filter(item => item.status === 'tracking');
      
      // 过滤掉追踪中的项目，只显示已完成的项目
      const filteredProjectList = projectList.filter(item => 
        item.status === 'finished'
      );
      
      console.log('已完成项目列表:', filteredProjectList);
      console.log('已完成项目数量:', filteredProjectList.length);
      
      // 根据筛选条件进一步过滤
      const finalFilteredList = this.applyTimeFilter(filteredProjectList);
      
      const totalTime = finalFilteredList.reduce((sum, item) => sum + (item.totalTime || 0), 0);
      const totalIncome = finalFilteredList.reduce((sum, item) => sum + (item.income || 0), 0);
      const formattedTotalTime = app.formatTime(totalTime);
      
      console.log('总时长:', totalTime, '格式化后:', formattedTotalTime);
      console.log('总收入:', totalIncome);
      console.log('追踪中的项目:', trackingProjects);
      console.log('筛选后的项目:', finalFilteredList);
      console.log('最终显示项目数量:', finalFilteredList.length);
      
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
      
      console.log('=== 统计页面数据初始化完成 ===');
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
      
      // 使用更可靠的日期解析方法，支持ISO格式
      const projectDate = new Date(timeField);
      let projectYear, projectMonth;
      
      // 检查日期是否有效
      if (isNaN(projectDate.getTime())) {
        console.log('日期解析失败，使用当前日期:', timeField);
        // 如果日期解析失败，使用当前日期
        const currentDate = new Date();
        projectYear = currentDate.getFullYear();
        projectMonth = currentDate.getMonth() + 1;
      } else {
        projectYear = projectDate.getFullYear();
        projectMonth = projectDate.getMonth() + 1;
      }
      
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

			  // 切换统计维度 - 强制重新编译测试
			  switchTab(e) {
			    const type = e.currentTarget.dataset.type;
			    console.log('=== 切换统计维度开始 ===', type);
			    
			    // 直接设置activeTab并重新初始化图表
			    this.setData({ 
			      activeTab: type
			    }, () => {
			      console.log('=== activeTab已设置为 ===:', this.data.activeTab);
			      // 直接重新初始化图表，不使用延迟
			      this.initChart();
			    });
			  },

		    // 初始化ECharts图表
		    initChart() {
		      const { activeTab, filteredProjectList } = this.data;
		      console.log('=== initChart开始执行 === 当前activeTab:', activeTab);
		      
		      // 确保activeTab的值不会被重置
		      const currentActiveTab = activeTab;
		      
		      const validProjects = filteredProjectList.filter(item => 
		        currentActiveTab === 'time' ? item.totalTime > 0 : (item.income || 0) > 0
		      );

		      console.log('当前统计维度:', currentActiveTab);
		      console.log('有效项目数量:', validProjects.length);
		      console.log('有效项目数据:', validProjects);

		      // 计算总时间或总收入用于占比计算
		      const totalValue = currentActiveTab === 'time' 
		        ? validProjects.reduce((sum, item) => sum + (item.totalTime || 0), 0) // 总时间（秒）
		        : validProjects.reduce((sum, item) => sum + (item.income || 0), 0); // 总收入

		      console.log('总数值:', totalValue);
		      console.log('activeTab:', currentActiveTab);

		      const xData = validProjects.map(item => item.name);
		      const yData = currentActiveTab === 'time' 
		        ? validProjects.map(item => totalValue > 0 ? (item.totalTime / totalValue) * 100 : 0) // 时间占比：百分比（数值类型）
		        : validProjects.map(item => totalValue > 0 ? (item.income / totalValue) * 100 : 0); // 收入占比：百分比（数值类型）

		      console.log('xData:', xData);
		      console.log('yData:', yData);

	      const option = {
	        title: {
	          text: this.getChartTitle(currentActiveTab),
	          left: 'center',
	          textStyle: { fontSize: 32 }
	        },
	        tooltip: {
	          trigger: 'click',
	          formatter: (params) => {
	            const percentage = params.value.toFixed(1); // 精确到小数点后1位
	            
	            // 时间模式：显示整数时间，收入模式：显示带小数的收入
	            const absoluteValue = currentActiveTab === 'time' 
	              ? app.formatTime(Math.round((percentage / 100) * totalValue)) // 时间取整
	              : (percentage / 100 * totalValue).toFixed(1) + '元';
	            
	            // 项目名加粗，后面跟冒号
	            return `<b>${params.name}：</b>${absoluteValue}（占比${percentage}%）`;
	          },
	          textStyle: { fontSize: 28 }
	        },
	        series: [
	          {
	            name: currentActiveTab === 'time' ? '耗时占比' : '收入占比',
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
	                console.log('图表点击事件触发，当前统计维度:', currentActiveTab);
	                console.log('点击的项目数据:', params);
	                console.log('总数值:', totalValue);
	                console.log('有效项目数据:', validProjects);
	                
	                const percentage = params.value.toFixed(1); // 精确到小数点后1位
	                
	                // 时间模式：显示整数时间，收入模式：显示带小数的收入
	                const absoluteValue = currentActiveTab === 'time' 
	                  ? app.formatTime(Math.round((percentage / 100) * totalValue)) // 时间取整
	                  : (percentage / 100 * totalValue).toFixed(1) + '元';
	                const text = `${params.name}：${absoluteValue}（占比${percentage}%）`;
	                
	                console.log('弹窗显示内容:', text);
	                console.log('计算详情 - 百分比:', percentage, '总数值:', totalValue, '绝对数值:', absoluteValue);
	                
	                // 显示弹窗反馈
	                wx.showToast({ title: text, icon: 'none' });
	                
	                // 语音解读功能（如果用户授权了录音权限）
	                if (wx.getStorageSync('voiceEnabled')) {
	                  const speechText = `${params.name}：${absoluteValue}（占比${percentage}%）`;
	                  
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
	      
	      // 保存到全局数据（saveProjectList会自动更新全局数据）
	      await app.saveProjectList(projectList);
	      
	      // 重新初始化数据并强制刷新UI
	      await this.initData();
	      await this.initChart();
	      
	      // 强制刷新页面数据
	      this.setData({
	        filteredProjectList: this.data.filteredProjectList.filter(item => item.id !== projectId)
	      });
	      
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
  },

  // 切换管理模式
  toggleManageMode() {
    const { isManageMode } = this.data;
    this.setData({
      isManageMode: !isManageMode
    });
  }
});