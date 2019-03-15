// const cj = require('babyfs-wxapp-cj');
// import cj from 'babyfs-wxapp-cj';
import moduleC from '@chengjinrui/module_c';
App({

  /**
   * 当小程序初始化完成时，会触发 onLaunch（全局只触发一次）
   */
  async onLaunch(options) {
    console.log('test async');
    // console.log(cj);
    console.log(moduleC);
  },

  /**
   * 当小程序启动，或从后台进入前台显示，会触发 onShow
   */
  onShow(options) {},

  /**
   * 当小程序从前台进入后台，会触发 onHide
   */
  onHide() {

  },

  /**
   * 当小程序发生脚本错误，或者 api 调用失败时，会触发 onError 并带上错误信息
   */
  onError(msg) {

  },

  globalData: {
    userInfo: {},
    wx_group_key: {},
    host: '',
    ratioIslow: false,
    pointsEvents: [],
    autoUpdate: false
  }
});
