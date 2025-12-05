// SFree_Manager/components/record-panel/record-panel.js
// 快速记录面板逻辑（百度语音识别）
const app = getApp();
const recorderManager = wx.getRecorderManager();

Component({
  properties: {
    showPanel: {
      type: Boolean,
      value: false
    }
  },

  data: {
    recordText: '', // 录入的文本（语音/手动）
    isRecording: false // 是否正在录音
  },

  lifetimes: {
    attached() {
      // 监听录音结束事件
      this.bindRecorderStopEvent();
    }
  },

  observers: {
    // 关闭面板时清空输入
    showPanel(newVal) {
      if (!newVal) {
        this.setData({ recordText: '' });
        // 如果正在录音，停止录音
        if (this.data.isRecording) {
          recorderManager.stop();
          this.setData({ isRecording: false });
        }
      }
    }
  },

  methods: {
    // 手动输入文本变化
    onInputChange(e) {
      this.setData({ recordText: e.detail.value });
    },

    // 关闭面板
    closePanel() {
      this.triggerEvent('closePanel');
    },

    // 开始录音
    startVoiceInput() {
      // 1. 检查录音权限
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.record']) {
            // 申请录音权限
            wx.authorize({
              scope: 'scope.record',
              success: () => this.startRecording(),
              fail: () => {
                wx.showModal({
                  title: '权限提示',
                  content: '需要录音权限才能使用语音输入功能',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting(); // 引导用户手动开启权限
                    }
                  }
                });
              }
            });
          } else {
            this.startRecording();
          }
        }
      });
    },

    // 开始录音
    startRecording() {
      // 录音参数配置（百度语音识别要求）
      const options = {
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: 'PCM'
      };
      
      this.setData({ isRecording: true });
      recorderManager.start(options);
      wx.showLoading({ title: '正在录音...' });
    },

    // 停止录音（触摸结束时调用）
    stopVoiceInput() {
      if (this.data.isRecording) {
        recorderManager.stop();
        this.setData({ isRecording: false });
      }
    },

    // 绑定录音结束事件
    bindRecorderStopEvent() {
      const that = this;
      
      recorderManager.onStop((res) => {
        wx.hideLoading();
        const tempFilePath = res.tempFilePath; // 音频文件临时路径
        
        // 读取文件并转为base64
        const fs = wx.getFileSystemManager();
        fs.readFile({
          filePath: tempFilePath,
          success(readRes) {
            const base64 = wx.arrayBufferToBase64(readRes.data);
            const fileSize = readRes.data.byteLength;
            
            // 调用百度语音识别API
            that.callBaiduVoiceApi(base64, fileSize);
          },
          fail(err) {
            console.error('读取录音文件失败：', err);
            wx.showToast({
              title: '语音处理失败',
              icon: 'none'
            });
            that.fallbackVoiceInput();
          }
        });
      });
    },

    // 调用百度语音识别API
    callBaiduVoiceApi(base64, fileSize) {
      const that = this;
      const accessToken = wx.getStorageSync("baidu_yuyin_access_token");
      
      if (!accessToken) {
        wx.showToast({
          title: '语音识别初始化失败',
          icon: 'none'
        });
        app.getBaiduYuyinAccessToken(); // 重新获取token
        that.fallbackVoiceInput();
        return;
      }
      
      wx.showLoading({ title: '正在识别...' });
      
      wx.request({
        url: 'https://vop.baidu.com/server_api',
        data: {
          format: 'pcm',
          rate: 16000,
          channel: 1,
          cuid: wx.getStorageSync('openid') || 'default_cuid',
          token: accessToken,
          speech: base64,
          len: fileSize
        },
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        success(res) {
          wx.hideLoading();
          
          if (res.data.err_no === 0 && res.data.result && res.data.result.length > 0) {
            // 识别成功
            const text = res.data.result[0].replace(/。/g, '');
            that.setData({ recordText: text });
            wx.showToast({ title: '识别成功！', icon: 'success' });
          } else {
            // 识别失败，使用降级方案
            console.error('百度语音识别失败：', res.data);
            wx.showToast({
              title: '识别失败',
              icon: 'none'
            });
            that.fallbackVoiceInput();
          }
        },
        fail(err) {
          wx.hideLoading();
          console.error('调用百度语音识别API失败：', err);
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          });
          that.fallbackVoiceInput();
        }
      });
    },

    // 降级方案：使用微信原生语音输入弹窗（100%兼容）
    fallbackVoiceInput() {
      wx.showModal({
        title: '语音输入',
        editable: true,
        placeholderText: '按住下方麦克风说话',
        voice: true, // 显示语音输入按钮
        success: (res) => {
          if (res.confirm && res.content) {
            this.setData({ recordText: res.content });
            wx.showToast({ title: '识别成功！', icon: 'success' });
          }
        }
      });
    },

    // 保存任务到首页
    saveRecord() {
      const { recordText } = this.data;
      if (!recordText.trim()) return;
      
      // 向父组件传递任务文本
      this.triggerEvent('saveRecord', { text: recordText });
      this.setData({ recordText: '' });
      this.closePanel();
    }
  }
});