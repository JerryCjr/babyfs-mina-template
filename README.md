# MINA GULP WORKFLOW

MINA: 保留 MINA (微信小程序官方框架)
GULP: Gulp 构建

## 工程结构

```javascript
mina-gulp
├── dist                  // 编译后目录
│    ├── miniprogram_npm  // 真正参与构建打包的npm资源
│    ├── components       // 微信小程序自定义组件
│    ├── images           // 页面中的图片和icon
│    ├── pages            // 小程序page文件
│    ├── styles           // ui框架，公共样式
│    ├── template         // 模板
│    ├── app.js
│    ├── app.json
│    ├── app.less
│    ├── project.config.json // 项目配置文件
├── gulpfile.js           // 打包相关的配置
│    ├── auto.js          // 命令行快速创建
│    ├── codemod.js       // jscodeshift
│    ├── index.js         // gulpfile.js
│    ├── install.js       // 安装模块依赖
│    ├── qiniu.js         // 七牛cdn
│    ├── replace.js       // 路径解析
│    ├── tinify.js        // 图片压缩
├── node_modules          // 项目依赖
├── src
│    ├── components       // 微信小程序自定义组件
│    ├── images           // 页面中的图片和icon
│    ├── pages            // 小程序page文件
│    ├── styles           // ui框架，公共样式
│    ├── template         // 模板
│    ├── app.js
│    ├── app.json
│    ├── app.less
│    ├── project.config.json  // 项目配置文件
├── tools                 // 工具方法
├── .editorconfig.js
├── .eslintrc.js
├── .gitignore
├── npm-shrinkwrap.json
├── package-lock.json
├── package.json
└── README.md
```

### 功能特性

1. Less 支持
2. Eslint 支持
3. Image 图片CDN上传 压缩支持
4. Async await 支持
5. NPM 支持
6. 命令行快速创建页面,组件,模板支持

### 创建页面,组件,模板

- gulp auto -p mypage 创建名为 mypage 的 page 文件
- gulp auto -t mytpl 创建名为 mytpl 的 template 文件
- gulp auto -c mycomponent 创建名为 mycomponent 的 component 文件
- gulp auto -s index -p mypage 复制 pages/index 中的文件创建名称为 mypage 的页面


### Notice

1. 以package.json的version和name作为小程序的版本和名称

```javascript
// proConf会在构建时自动注入到app.js中 供有需要的开发者使用
const proConf = {
  wxaName: 'babyfs-mina-template', // 微信小程序名称
  wxaVersion: '1.3.1' // 当前微信小程序的版本号
};
```

