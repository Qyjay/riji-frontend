# 半日 App — CLAUDE.md

## 项目概述

UniApp + Vue 3 + TypeScript 跨平台应用，AI 生活日记伙伴。
参赛项目：MiniMax AI 能力创作大赛。

## 技术栈

- **框架**: UniApp 4.x (uni-preset-vue)
- **语言**: Vue 3 Composition API + TypeScript
- **样式**: SCSS
- **构建**: Vite 5 + @dcloudio/vite-plugin-uni

## 关键规范

### CSS 单位规范（重要！）
- **所有尺寸单位使用 rpx**（UniApp 响应式单位，750rpx = 屏幕宽度）
- 基准：390px 宽设备，1px ≈ 2rpx
- **例外**：`border: 1px solid`、`box-shadow`、`outline` 保留 px
- **禁止**：在 `<style>` 中使用 `px` 作为布局尺寸单位

### DoodleIcon 组件
- `size` prop 单位为 **rpx**（不是 px）
- 默认 size = 24 → 24rpx（约 12px 物理像素）
- 使用示例：`:size="48"` 代表 48rpx ≈ 24px

### 目录结构
```
src/
  pages/          # 页面
  components/     # 公共组件（CustomNavBar, DoodleIcon, TabBar, SideDrawer）
  common/         # 公共样式（animations.scss, design-tokens.scss, doodle.scss）
  services/api/   # API 服务层
  static/         # 静态资源
scripts/          # 测试脚本
```

## 常用命令

```bash
npm run dev:h5      # H5 开发调试
npm run build:h5    # H5 发布构建
npm test            # 运行单元测试（CSS 规则验证）
npm run type-check  # TypeScript 类型检查
```

## 测试

- 测试脚本位于 `scripts/test-units.js`
- 验证 CSS px→rpx 迁移规则
- 运行：`npm test`
