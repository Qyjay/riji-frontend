# 🦊 日迹 — 大学生 AI 生活伙伴

<p align="center">
  <img src="src/static/brand/logo-d-mascot.png" width="120" alt="日迹 Logo" />
</p>

<p align="center">
  <strong>记录生活 · AI 创作 · 精准社交 · 助力成长</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/UniApp-Vue%203-4FC08D?logo=vuedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.2-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-4.9-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Platform-H5%20%7C%20Android%20%7C%20iOS-orange" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## 📖 项目简介

**日迹**是一款面向大学生的 AI 生活伙伴 App，核心理念是"让每一天都值得被记住"。

用户通过拍照、语音、文字收集日常素材，AI 自动生成精美日记，并可将日记转化为漫画、小说、分享卡片等衍生内容。内置 AI 对话助手、情绪追踪、纪念日管理、社交匹配等功能。

### ✨ 核心功能

| 模块 | 功能 |
|------|------|
| 📝 **AI 日记** | 素材收集（拍照/语音/文字）→ AI 自动生成日记 → 支持修改（次数限制）→ 情绪趋势图 |
| 🎨 **衍生创作** | 日记一键生成漫画、小说章节、分享卡片 |
| 💬 **AI 对话** | 智能生活助手，流式打字机效果 |
| 🔮 **每日运势** | AI 生成个性化运势（学业/社交/健康） |
| 📅 **纪念日** | 手动添加 + AI 自动提取 + 那年今日回忆 |
| 👥 **社交匹配** | AI 用户画像 → 兴趣匹配 → 搭子申请 |
| 📈 **成长轨迹** | 写作统计、情绪趋势、成就系统、学期报告 |
| ✏️ **文风引擎** | 自定义写作风格标签 + AI 润色（文艺/幽默/简洁/温暖） |

### 🎨 设计风格

**Doodle 手绘涂鸦风** — 温暖、有趣、低压力的视觉体验。

- 主色：`#E8855A` 暖杏橙
- 背景：`#FDF8F3` 奶油白
- 手绘 SVG 图标（40+ 纯手写 SVG path，非图标库）
- SVG feTurbulence 滤镜模拟手绘抖动效果

---

## 🚀 从零开始部署

### 环境要求

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| **Node.js** | ≥ 18.0 | 推荐 20.x LTS 或更高 |
| **npm** | ≥ 8.0 | 随 Node.js 安装 |
| **Git** | 任意版本 | 克隆仓库用 |
| **HBuilderX** | ≥ 4.0 | 仅打包 Android/iOS APK 时需要（纯 H5 开发不需要） |

### 第一步：克隆仓库

```bash
git clone https://github.com/Qyjay/riji-frontend.git
cd riji-frontend
```

### 第二步：安装依赖

```bash
npm install
```

> ⏱️ 首次安装约需 1-3 分钟（取决于网络）。如果速度慢，可以先设置淘宝镜像：
> ```bash
> npm config set registry https://registry.npmmirror.com
> npm install
> ```

### 第三步：启动开发服务器（H5 模式）

```bash
npm run dev:h5
```

启动后终端会显示：

```
  VITE v5.2.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

在浏览器中打开 `http://localhost:5173/` 即可看到应用。

> 💡 **推荐用 Chrome 打开后按 F12，切换到手机模拟模式（iPhone 14 Pro / 390×844）** 获得最佳视觉效果。

### 第四步：切换 Mock 模式（无需后端即可体验）

打开 `src/services/config.ts`：

```typescript
// 改为 true 即可使用内置 Mock 数据，无需后端
export const USE_MOCK = true
export const API_BASE_URL = 'http://localhost:8000/api'
```

将 `USE_MOCK` 改为 `true`，保存后页面自动热更新。所有功能都可以用 Mock 数据正常体验。

> ⚠️ **注意：** 登录/注册功能（`/auth/*`）始终调用真实后端，不走 Mock。Mock 模式下跳过登录页直接进入首页即可：
> 在浏览器地址栏直接访问 `http://localhost:5173/#/pages/index/index`

---

## 📱 多平台运行

### H5（网页，开发首选）

```bash
npm run dev:h5          # 开发模式
npm run build:h5        # 生产构建 → dist/build/h5/
```

### Android APK（需要 HBuilderX）

1. 用 [HBuilderX](https://www.dcloud.io/hbuilderx.html) 打开项目根目录
2. 菜单：`发行` → `原生 App - 云打包`
3. 选择"使用公共测试证书"（开发测试用）
4. 等待云打包完成，下载 APK 安装到手机

### 微信小程序

```bash
npm run dev:mp-weixin   # 开发模式
npm run build:mp-weixin # 生产构建 → dist/build/mp-weixin/
```

构建产物导入微信开发者工具即可预览。

### 其他平台

```bash
npm run dev:mp-alipay       # 支付宝小程序
npm run dev:mp-toutiao      # 抖音小程序
npm run dev:mp-qq           # QQ 小程序
npm run dev:mp-lark         # 飞书小程序
```

---

## 📂 项目结构

```
riji-frontend/
├── src/
│   ├── pages/                    # 页面（31 个）
│   │   ├── login/index.vue       #   登录/注册
│   │   ├── index/index.vue       #   首页（时间线 + 今日概览）
│   │   ├── write/index.vue       #   素材收集（拍照/语音/文字）
│   │   ├── diary/
│   │   │   ├── detail.vue        #   日记详情
│   │   │   ├── preview.vue       #   日记预览/编辑
│   │   │   ├── comic.vue         #   AI 漫画
│   │   │   ├── share-card.vue    #   分享卡片
│   │   │   ├── emotion-calendar.vue  #   情绪日历
│   │   │   └── style-engine.vue  #   文风引擎
│   │   ├── chat/index.vue        #   AI 对话
│   │   ├── fortune/index.vue     #   每日运势
│   │   ├── anniversary/index.vue #   纪念日管理
│   │   ├── social/
│   │   │   ├── index.vue         #   社交首页
│   │   │   └── match.vue         #   搭子匹配
│   │   ├── growth/
│   │   │   ├── index.vue         #   成长轨迹
│   │   │   └── achievements.vue  #   成就殿堂
│   │   ├── novel/
│   │   │   ├── index.vue         #   自传小说
│   │   │   └── reader.vue        #   小说阅读器
│   │   ├── profile/
│   │   │   ├── index.vue         #   个人中心
│   │   │   ├── edit.vue          #   编辑资料
│   │   │   ├── settings.vue      #   设置
│   │   │   ├── agent-portrait.vue    #   AI 画像
│   │   │   └── semester-report.vue   #   学期报告
│   │   ├── messages/index.vue    #   消息列表
│   │   ├── discover/index.vue    #   发现页
│   │   ├── study/                #   学习模块（番茄钟/待办）
│   │   └── settings/about.vue    #   关于页面
│   │
│   ├── components/               # 公共组件（5 个）
│   │   ├── CustomNavBar.vue      #   自定义导航栏
│   │   ├── DiaryCard.vue         #   日记卡片
│   │   ├── DoodleIcon.vue        #   手绘 SVG 图标（40+ 图标）
│   │   ├── SideDrawer.vue        #   侧边栏抽屉
│   │   └── TabBar.vue            #   底部导航栏
│   │
│   ├── services/                 # API 服务层
│   │   ├── config.ts             #   全局配置（USE_MOCK / API_BASE_URL）
│   │   ├── request.ts            #   请求封装（JWT 自动注入 / 统一响应解析 / 401 拦截）
│   │   ├── index.ts              #   统一导出
│   │   ├── api/                  #   真实 API 调用（8 个模块）
│   │   │   ├── auth.ts           #     认证（登录/注册/Token 管理）
│   │   │   ├── material.ts       #     素材 CRUD + AI 情绪提取 + 润色
│   │   │   ├── diary.ts          #     日记 CRUD + AI 生成 + 衍生内容
│   │   │   ├── ai.ts             #     AI 对话 + TTS + 运势
│   │   │   ├── user.ts           #     用户资料 + 成就 + 设置
│   │   │   ├── social.ts         #     社交匹配 + 用户画像
│   │   │   ├── anniversary.ts    #     纪念日管理
│   │   │   └── study.ts          #     番茄钟 + 待办
│   │   └── mock/                 #   Mock 数据（完整模拟后端响应）
│   │       ├── diary.ts
│   │       ├── material.ts
│   │       ├── ai.ts
│   │       ├── user.ts
│   │       ├── social.ts
│   │       ├── anniversary.ts
│   │       └── study.ts
│   │
│   ├── stores/                   # Pinia 状态管理
│   ├── common/                   # 全局样式
│   │   ├── design-tokens.scss    #   设计变量（颜色/间距/圆角）
│   │   ├── animations.scss       #   动画 keyframes
│   │   └── doodle.scss           #   手绘风格工具类
│   ├── static/                   # 静态资源（Logo/图标/插图）
│   └── manifest.json             # App 配置
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── unpackage/res/                # Android 图标 & 启动图
```

---

## 🔌 后端对接

本项目配套 API 接口文档：[`API-SPEC.md`](./API-SPEC.md)（52 个接口的完整规范）。

### 快速对接步骤

1. **启动后端**（默认 `http://localhost:8000`）

2. **关闭 Mock 模式**：编辑 `src/services/config.ts`
   ```typescript
   export const USE_MOCK = false
   export const API_BASE_URL = 'http://localhost:8000/api'
   ```

3. **后端响应格式要求**：
   ```json
   {
     "code": 0,
     "data": { ... },
     "message": "success"
   }
   ```

4. **认证方式**：JWT Bearer Token（`Authorization: Bearer <token>`）

### API 模块总览

| 模块 | 接口数 | 关键接口 |
|------|--------|----------|
| Auth | 2 | 登录、注册 |
| Material | 8 | 素材 CRUD、AI 情绪提取、AI 润色、语音转写 |
| Diary | 10 | AI 生成日记、日记 CRUD、情绪趋势、信息提取、衍生内容 |
| AI | 4 | AI 对话、聊天历史、TTS、运势 |
| User | 8 | 用户资料、成就、成长数据、设置、学期报告 |
| Social | 9 | 匹配、消息、匹配报告、搭子、用户画像 |
| Anniversary | 5 | 纪念日 CRUD、那年今日 |
| Study | 6 | 番茄钟、待办 |

---

## 🛠️ 开发指南

### 常用命令

```bash
npm run dev:h5          # 启动 H5 开发服务器
npm run build:h5        # H5 生产构建
npm run type-check      # TypeScript 类型检查
npm test                # 运行单元测试
```

### 新增页面

1. 在 `src/pages/` 下创建 `.vue` 文件
2. 在 `src/pages.json` 中注册路由
3. 页面模板参考已有页面：
   - 使用 `<CustomNavBar>` 组件
   - 使用 `scroll-view` + JS 计算精确高度
   - 使用 `<DoodleIcon>` 替代 emoji 图标

### 代码规范

- **不使用 inline SVG**（UniApp App 模式不支持）→ 使用 `<DoodleIcon>` 或 `<image>` + data URI
- **不使用 `<transition>`**（UniApp App 模式不可靠）→ 用 `v-if`/`v-show` 直接控制
- **全局 `box-sizing: border-box`** 已在 `App.vue` 中设置
- **单位统一使用 `rpx`**（`1px ≈ 2rpx @390px`），border 和 box-shadow 除外
- **scroll-view 高度**必须用 JS 精确计算：`windowHeight - navPlaceholderHeight - (hasTabBar ? 50 : 0)`

### 设计 Token

```scss
// 颜色
$primary: #E8855A;        // 暖杏橙
$bg-main: #FDF8F3;        // 奶油白
$accent-coral: #F2B49B;   // 淡珊瑚粉
$text-title: #2C1F14;     // 深暖棕
$text-body: #4A3628;      // 暖棕

// 圆角
$radius-card: 24rpx;
$radius-btn: 16rpx;

// 间距
$spacing-sm: 16rpx;
$spacing-md: 24rpx;
$spacing-lg: 32rpx;
```

---

## 🏆 比赛信息

本项目为参加**第三届（2026）中国高校计算机大赛 · AIGC 创新赛 · 应用赛道**的参赛作品。

- 承办：南开大学 & vivo
- 赛道：移动终端 AI 应用
- 初赛截止：2026 年 5 月 11 日
- [赛事官网](https://aigc.vivo.com.cn/#/info/CPN20260310-069)

---

## 📄 License

[MIT](LICENSE)

---

## 🤝 贡献

欢迎提 Issue 和 PR。开发前请阅读项目结构和代码规范部分。

```bash
# Fork 后
git clone https://github.com/<你的用户名>/riji-frontend.git
cd riji-frontend
npm install
npm run dev:h5
# 修改代码 → 提 PR
```
