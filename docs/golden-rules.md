# 日迹 App — Golden Rules

## 代码规范

### CSS / 样式
1. **所有布局尺寸使用 `rpx`**（UniApp 响应式单位，750rpx = 屏幕宽度）
2. **例外**：`border`、`box-shadow`、`outline` 保留 `px`
3. **禁止**：在 `<style>` 中使用 `px` 作为布局尺寸单位
4. `backdrop-filter: blur()` 也需使用 `rpx`（如 `blur(8rpx)`）

### Vue 组件
1. 所有页面使用 `<script setup lang="ts">` 语法
2. 使用 `uni.getSystemInfoSync()` 计算动态高度，在 `onMounted` 中执行
3. 导航栏高度公式：`(statusBarHeight ?? 20) + 44`（单位 px）
4. 滚动区高度 = `windowHeight - navPlaceholderHeight - tabBarHeight`

### DoodleIcon 组件
1. `size` prop 单位为 **rpx**（不是 px），默认 24rpx
2. 示例：`:size="48"` 代表 48rpx ≈ 24px

### API 服务层
1. 统一从 `@/services/api/<module>` 导入，不直接引用 mock
2. Mock 切换由 `services/config.ts` 中 `USE_MOCK` 控制
3. API 调用使用 `try/catch`，失败时静默处理或 `uni.showToast`

### 错误处理
1. 网络请求失败：`uni.showToast({ title: '加载失败', icon: 'none' })`
2. 用户操作成功：`uni.showToast({ title: '...', icon: 'success' })`
3. 功能未实现：`uni.showToast({ title: '功能开发中', icon: 'none' })`

## 测试规范

1. 单元测试文件：`scripts/test-units.js`
2. 运行：`npm test`
3. 测试内容：CSS rpx 规范验证（检测不合规的 px 用法）
4. 所有 PR 必须通过测试（0 failures）

## Git 规范

1. 功能分支：`feat/req-<6位ID>`
2. Commit 格式：遵循 Conventional Commits
3. 禁止直接 push 到 `main`，必须通过 PR

## 设计一致性

1. 保持 Doodle 手绘风格（不规则圆角、手绘边框）
2. 颜色使用设计 token（见 `src/common/design-tokens.scss`）
3. 动画使用 `src/common/animations.scss` 中的预设类
4. 交互反馈：按钮使用 `.press-feedback` 类（`&:active { opacity: 0.7 }`）
