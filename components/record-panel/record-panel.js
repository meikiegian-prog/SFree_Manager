// 快速记录面板逻辑（原生语音输入版 - 无插件依赖）
const app = getApp();

Component({
  properties: {
    // 接收面板显隐状态
    showPanel: {
      type: Boolean,
      value: false
    }
  },

  data: {
    recordText: '' // 录入的文本（语音/手动）
  },

  observers: {
    // 监听面板显隐，关闭时清空输入
    showPanel(newVal) {
      if (!newVal) {
        this.setData({ recordText: '' });
      }
    }
  },

  methods: {
    // 输入框内容变化（手动输入）
    onInputChange(e) {
      this.setData({ recordText: e.detail.value });
    },

    // 关闭面板
    closePanel() {
      this.triggerEvent('closePanel');
    },

    // 核心：原生语音输入回调（识别完成自动触发）
    onVoiceInput(e) {
      // e.detail.value 是微信原生识别后的文字
      if (e.detail.value) {
        this.setData({ recordText: e.detail.value });
        // HCI交互：即时反馈识别成功
        wx.showToast({ 
          title: '语音识别成功！', 
          icon: 'success',
          duration: 1500
        });
      }
    },

    // 保存任务到首页
    saveRecord() {
      const { recordText } = this.data;
      // 向父组件（首页）传递任务文本
      this.triggerEvent('saveRecord', { text: recordText });
      // 清空输入并关闭面板
      this.setData({ recordText: '' });
      this.closePanel();
    }
  }
});