# 日迹 App — 架构文档

## 概述

UniApp + Vue 3 + TypeScript 跨平台应用，AI 生活日记伙伴。
参赛项目：MiniMax AI 能力创作大赛。

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | UniApp 4.x (uni-preset-vue) |
| 语言 | Vue 3 Composition API + TypeScript |
| 样式 | SCSS |
| 构建 | Vite 5 + @dcloudio/vite-plugin-uni |
| 测试 | Node.js 脚本 (`scripts/test-units.js`) |

## 目录结构

```
src/
  pages/            # 页面（每个子目录对应一个路由）
    index/          # 首页（日记列表）
    write/          # 素材收集页
    diary/          # 日记详情 / 预览 / 漫画 / 分享 / 情绪日历 / 风格引擎
    anniversary/    # 纪念日管理
    chat/           # AI 对话
    social/         # 搭子匹配
    discover/       # 发现
    messages/       # 消息
    profile/        # 个人中心 / 设置
    study/          # 学习（番茄 / ToDo）
    fortune/        # 运势
    growth/         # 成长
    novel/          # 小说
    login/          # 登录
  components/       # 公共组件
    CustomNavBar.vue
    DoodleIcon.vue
    TabBar.vue
    SideDrawer.vue
    DiaryCard.vue
  common/           # 公共样式
    animations.scss
    design-tokens.scss
    doodle.scss
  services/
    api/            # API 接口层（真实请求）
    mock/           # Mock 数据层（USE_MOCK=true 时启用）
    config.ts       # 环境配置
    index.ts        # 统一导出
    request.ts      # HTTP 请求封装
  static/           # 静态资源
scripts/
  test-units.js     # 单元测试（CSS rpx 规范验证）
```

## 页面路由

由 `src/pages.json` 管理，所有页面使用 `navigationStyle: custom`（自定义导航栏）。

主要路由：
- `pages/index/index` — 首页（TabBar 第1项）
- `pages/discover/index` — 发现（TabBar 第2项）
- `pages/write/index` — 素材收集（TabBar 中间浮动按钮）
- `pages/messages/index` — 消息（TabBar 第4项）
- `pages/profile/index` — 我的（TabBar 第5项）
- `pages/diary/preview` — 日记预览 / 编辑
- `pages/anniversary/index` — 纪念日管理

## 服务层架构

通过环境变量 `USE_MOCK` 切换真实 API 与 Mock 数据：

```typescript
// services/index.ts 统一导出
export * from './api/diary'   // or mock/diary
```

API 模块：`ai`, `diary`, `social`, `study`, `user`, `anniversary`, `material`, `auth`

## 设计系统

Doodle 手绘风格：
- 主色：`#E8855A`（橙红）
- 背景：`#FDF8F3`（暖白）
- 文字：`#2C1F14`（深棕）
- 强调：`#F2B49B`（浅橙）
- 单位：所有布局使用 `rpx`（750rpx = 屏幕宽度）

## AI 能力集成

通过 MiniMax API 实现：
- 文本润色（`polishText`）
- 情绪提取（`extractEmotion`）
- 日记生成（`generateDiary`）
- 漫画/小说衍生（`generateDerivative`）
- 情绪趋势分析（`getEmotionTrend`）
- SSE 流式对话（`chat`）
