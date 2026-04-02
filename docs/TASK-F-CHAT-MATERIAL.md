# TASK-F：对话自动转素材（前端）

> **负责人：** Claude Code (Frontend)
> **依赖：** 后端 TASK-F 接口同步开发
> **优先级：** P0
> **预计工时：** 40 分钟
> **创建时间：** 2026-04-02

---

## 一、需求概述

用户与 AI 伙伴聊天时，对话内容自动按静默阈值切分成「对话段」，每段自动生成一条 `type="chat"` 的素材，在素材时间线中以 💬 卡片展示，与照片/文字素材平级。用户可在设置页控制相关行为。

**前端改动范围：**
1. API 服务层 — 新增 chat 接口 + 扩展 material/settings 类型
2. 素材时间线页 — 新增 💬 对话卡片
3. 对话详情 Bottom Sheet — 新建组件
4. 聊天页 — 离开时调 close-session + toast 提示
5. 设置页 — 新增「对话素材」设置区

---

## 二、接口契约（后端对齐）

以下接口格式已与后端任务书严格对齐，**前端按此实现**：

### 2.1 POST /api/chat（已有，响应变化）

```
Request:  { "message": "string" }
Response: {
  "code": 0,
  "data": "AI回复文本",
  "message": "ok",
  "meta": {                          // ⚠️ 仅在触发旧 session 封闭时出现
    "materialGenerated": true,
    "materialId": "uuid-xxx"
  }
}
```

前端需要在 chat 的请求响应中检查 `meta` 字段。

### 2.2 POST /api/chat/close-session（新增）🔒

```
Request:  无 body
Response: {
  "code": 0,
  "data": {
    "sessionClosed": boolean,
    "materialGenerated": boolean,
    "materialId": string | null
  },
  "message": "ok"
}
```

### 2.3 GET /api/chat/session/{session_id}/messages（新增）🔒

```
Response: {
  "code": 0,
  "data": {
    "session": {
      "id": "string",
      "title": "string",
      "summary": "string",
      "startTime": number,
      "endTime": number | null,
      "messageCount": number,
      "mood": "string",
      "moodEmoji": "string"
    },
    "messages": [
      {"role": "user" | "assistant", "content": "string", "timestamp": number}
    ]
  },
  "message": "ok"
}
```

### 2.4 GET /api/user/settings（新增返回字段）

```json
{
  "chatMaterialEnabled": true,
  "chatSilenceThreshold": 30,
  "chatMaterialToast": true,
  "chatMinRounds": 3
}
```

### 2.5 POST /api/user/settings（新增请求字段）

```json
{
  "chat_material_enabled": true,
  "chat_silence_threshold": 30,
  "chat_material_toast": true,
  "chat_min_rounds": 3
}
```

### 2.6 GET /api/materials（chat 类型新增字段）

```json
{
  "type": "chat",
  "chatSessionId": "uuid",
  "startTime": 1711440180000,
  "endTime": 1711440900000,
  "content": "AI 生成的摘要...",
  "emotion": {"label": "开心", "score": 0.88, "emoji": "😊"},
  "tags": ["骑行", "户外"]
}
```

---

## 三、文件改动清单

### 3.1 `src/services/api/chat.ts` — 新建

```typescript
import { USE_MOCK } from '../config'
import { request } from '../request'

// ===== 类型定义 =====

export interface CloseSessionResult {
  sessionClosed: boolean
  materialGenerated: boolean
  materialId: string | null
}

export interface ChatSessionDetail {
  id: string
  title: string
  summary: string
  startTime: number
  endTime: number | null
  messageCount: number
  mood: string
  moodEmoji: string
}

export interface ChatSessionMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface SessionMessagesResult {
  session: ChatSessionDetail
  messages: ChatSessionMessage[]
}

// ===== API 函数 =====

/**
 * 关闭当前 open 的对话段（用户离开聊天页时调用）
 */
export async function closeSession(): Promise<CloseSessionResult> {
  if (USE_MOCK) {
    return { sessionClosed: true, materialGenerated: false, materialId: null }
  }
  return request<CloseSessionResult>({ url: '/chat/close-session', method: 'POST' })
}

/**
 * 获取对话段的原始消息列表（素材卡片「展开对话」时调用）
 */
export async function getSessionMessages(sessionId: string): Promise<SessionMessagesResult> {
  if (USE_MOCK) {
    return {
      session: {
        id: sessionId,
        title: '和 AI 聊天',
        summary: '聊了一些日常话题...',
        startTime: Date.now() - 3600000,
        endTime: Date.now() - 3000000,
        messageCount: 8,
        mood: '平静',
        moodEmoji: '😌',
      },
      messages: [
        { role: 'user', content: '今天天气真好', timestamp: Date.now() - 3600000 },
        { role: 'assistant', content: '是啊，适合出去走走！', timestamp: Date.now() - 3598000 },
        { role: 'user', content: '我下午想去海河边骑车', timestamp: Date.now() - 3500000 },
        { role: 'assistant', content: '听起来很棒！要注意防晒哦', timestamp: Date.now() - 3498000 },
      ],
    }
  }
  return request<SessionMessagesResult>({ url: `/chat/session/${sessionId}/messages` })
}
```

### 3.2 `src/services/api/material.ts` — 修改

扩展 `RawMaterial` 接口：

```typescript
export interface RawMaterial {
  id: string
  userId: string
  type: 'image' | 'voice' | 'text' | 'chat'  // ← 新增 chat
  content: string
  mediaUrl: string
  thumbnailUrl: string
  location: { lat?: number; lng?: number; address?: string }
  emotion: { label: string; score: number; emoji: string }
  tags: string[]
  date: string
  createdAt: number
  // 新增 chat 专属字段
  chatSessionId?: string
  startTime?: number
  endTime?: number
}
```

### 3.3 `src/services/mock/chat.ts` — 新建

为 Mock 模式提供假数据。内容参照 3.1 中的 Mock 返回值即可。

### 3.4 `src/pages/write/index.vue` — 修改（素材时间线）

在今日素材列表中新增 💬 对话素材卡片。

**找到现有的素材列表渲染部分**（`todayMaterials` 的 `v-for` 循环），在已有的 image/text 卡片之后添加 chat 类型：

```vue
<!-- 💬 对话素材卡片 -->
<view v-if="mat.type === 'chat'" class="material-item chat-material" @click="openChatDetail(mat)">
  <view class="mat-left">
    <view class="mat-type-indicator chat-indicator" />
    <text class="mat-time">{{ formatTimeRange(mat.startTime, mat.endTime) }}</text>
  </view>
  <view class="mat-body">
    <view class="mat-header-row">
      <text class="mat-icon">💬</text>
      <text class="mat-title">{{ getChatTitle(mat) }}</text>
      <text class="mat-mood-emoji">{{ mat.emotion?.emoji || '' }}</text>
    </view>
    <text class="mat-summary">{{ mat.content }}</text>
    <view class="mat-expand-row">
      <text class="mat-expand-text">展开对话 ›</text>
    </view>
  </view>
</view>
```

**新增函数：**

```typescript
import { getSessionMessages, type SessionMessagesResult } from '@/services/api/chat'

// 格式化时间范围
function formatTimeRange(start?: number, end?: number): string {
  if (!start) return ''
  const fmt = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  if (!end) return fmt(start)
  return `${fmt(start)} ~ ${fmt(end)}`
}

// 获取对话标题
function getChatTitle(mat: RawMaterial): string {
  // content 是摘要，取第一句作为标题
  const firstSentence = mat.content?.split(/[。！？\n]/)?.[0] || '对话记录'
  return firstSentence.length > 15 ? firstSentence.slice(0, 15) + '...' : firstSentence
}

// 打开对话详情 Bottom Sheet
const chatDetailVisible = ref(false)
const chatDetailData = ref<SessionMessagesResult | null>(null)

async function openChatDetail(mat: RawMaterial) {
  if (!mat.chatSessionId) return
  try {
    const data = await getSessionMessages(mat.chatSessionId)
    chatDetailData.value = data
    chatDetailVisible.value = true
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}
```

**样式要点（SCSS）：**

```scss
.chat-indicator {
  width: 6rpx;
  background: #7C6FE3;  // 紫色，区别于照片的 #E8855A 和文字的 #7BAE6E
  border-radius: 3rpx;
}

.chat-material {
  .mat-summary {
    font-size: 26rpx;
    color: #4A3628;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .mat-expand-row {
    margin-top: 12rpx;
  }
  .mat-expand-text {
    font-size: 24rpx;
    color: #7C6FE3;
  }
}
```

### 3.5 `src/components/ChatDetailSheet.vue` — 新建

对话详情 Bottom Sheet 组件，点击素材卡片「展开对话」时弹出：

```vue
<template>
  <view v-if="visible" class="sheet-mask" @click="close">
    <view class="sheet-container doodle-box" @click.stop>
      <!-- 头部 -->
      <view class="sheet-header">
        <view class="sheet-handle" />
        <view class="sheet-title-row">
          <text class="sheet-title">{{ session?.title || '对话记录' }}</text>
          <text class="sheet-close" @click="close">×</text>
        </view>
        <view class="sheet-meta">
          <text class="sheet-time">{{ formatTimeRange(session?.startTime, session?.endTime) }}</text>
          <text class="sheet-mood">{{ session?.moodEmoji }} {{ session?.mood }}</text>
        </view>
      </view>

      <!-- 对话消息列表 -->
      <scroll-view class="sheet-messages" scroll-y :style="{ height: '600rpx' }">
        <view v-for="(msg, idx) in messages" :key="idx"
          class="sheet-msg"
          :class="msg.role === 'user' ? 'sheet-msg--user' : 'sheet-msg--ai'"
        >
          <view class="sheet-msg-bubble" :class="msg.role === 'user' ? 'bubble--user' : 'bubble--ai'">
            <text class="sheet-msg-text">{{ msg.content }}</text>
          </view>
          <text class="sheet-msg-time">{{ formatTime(msg.timestamp) }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ChatSessionDetail, ChatSessionMessage } from '@/services/api/chat'

const props = defineProps<{
  visible: boolean
  session: ChatSessionDetail | null
  messages: ChatSessionMessage[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function close() {
  emit('close')
}

function formatTimeRange(start?: number, end?: number | null): string {
  if (!start) return ''
  const fmt = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  if (!end) return fmt(start)
  return `${fmt(start)} ~ ${fmt(new Date(end))}`
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
/* 样式遵循 Doodle 手绘风 + rpx 单位规范 */
.sheet-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.sheet-container {
  width: 100%;
  background: #FDF8F3;
  border-radius: 32rpx 32rpx 0 0;
  padding: 24rpx 32rpx 48rpx;
  max-height: 75vh;
}

.sheet-handle {
  width: 60rpx; height: 8rpx;
  background: #D4C4B8;
  border-radius: 4rpx;
  margin: 0 auto 24rpx;
}

.sheet-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sheet-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2C1F14;
}

.sheet-close {
  font-size: 40rpx;
  color: #AE9D92;
  padding: 8rpx 16rpx;
}

.sheet-meta {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}

.sheet-time, .sheet-mood {
  font-size: 24rpx;
  color: #8A7668;
}

.sheet-messages {
  margin-top: 24rpx;
}

.sheet-msg {
  margin-bottom: 20rpx;
}

.sheet-msg--user {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.sheet-msg--ai {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.sheet-msg-bubble {
  max-width: 80%;
  padding: 16rpx 24rpx;
  border-radius: 24rpx 28rpx 20rpx 24rpx;
}

.bubble--user {
  background: #E8855A;
}

.bubble--ai {
  background: #FFFFFF;
  border: 2px solid #E8D5C4;
}

.bubble--user .sheet-msg-text {
  color: #FFFFFF;
}

.bubble--ai .sheet-msg-text {
  color: #2C1F14;
}

.sheet-msg-text {
  font-size: 28rpx;
  line-height: 1.6;
}

.sheet-msg-time {
  font-size: 20rpx;
  color: #AE9D92;
  margin-top: 4rpx;
}
</style>
```

### 3.6 `src/pages/chat/index.vue` — 修改

**改动 1：导入 closeSession + 读取设置**

```typescript
import { closeSession } from '@/services/api/chat'
```

**改动 2：页面卸载时关闭 session**

在 `<script setup>` 中添加：

```typescript
import { onUnmounted } from 'vue'

// 页面即将卸载时，主动关闭对话段
onUnmounted(async () => {
  try {
    const result = await closeSession()
    if (result.materialGenerated) {
      // 如果用户开启了 toast 提示
      uni.showToast({
        title: '已记录为今日素材 ✓',
        icon: 'none',
        duration: 1500,
      })
    }
  } catch (e) {
    // 静默失败，不影响用户
  }
})
```

> **注意：** UniApp 中页面卸载用 `onUnload`（pages 生命周期），不是 Vue 的 `onUnmounted`。需要改为：

```typescript
import { onUnload } from '@dcloudio/uni-app'

onUnload(async () => {
  try {
    const result = await closeSession()
    if (result.materialGenerated) {
      uni.showToast({
        title: '已记录为今日素材 ✓',
        icon: 'none',
        duration: 1500,
      })
    }
  } catch (e) {
    // 静默
  }
})
```

**改动 3：发送消息后检查 meta（可选优化）**

如果在聊天过程中触发了旧 session 封闭（静默超时后再次发消息），后端会在响应中附带 `meta`。前端可以在发消息的响应处理中检查：

```typescript
// 在发送消息的函数中，解析响应
// request.ts 需要能透传 meta 字段
// 如果 meta.materialGenerated === true，显示 toast
```

这个改动取决于 `request.ts` 的封装方式。如果 `request.ts` 只返回 `data` 字段，需要做一层适配。**如果改动复杂度太高，可以跳过此处，仅依赖 close-session 时的 toast。**

### 3.7 `src/pages/profile/settings.vue` — 修改

在现有设置卡片之后，新增「对话素材」设置区域。

**找到最后一个 `<view class="card">` 块之后，添加：**

```vue
<!-- ── 对话素材 ── -->
<view class="card">
  <text class="card-title">── 对话素材 ──</text>

  <!-- 总开关 -->
  <view class="row">
    <text class="row-label">对话自动记录为素材</text>
    <switch
      class="row-switch"
      :checked="chatSettings.enabled"
      color="#7C6FE3"
      @change="chatSettings.enabled = $event.detail.value; saveChatSettings()"
    />
  </view>
  <view class="row-hint">
    <text class="row-hint-text">开启后，与 AI 伙伴的对话会自动整理为素材，参与每日日记生成</text>
  </view>

  <!-- 静默阈值 -->
  <view class="row row-border" @click="showSilenceThresholdPicker">
    <text class="row-label">静默间隔</text>
    <view class="row-right">
      <text class="row-value">{{ chatSettings.silenceThreshold }} 分钟 ▼</text>
    </view>
  </view>
  <view class="row-hint">
    <text class="row-hint-text">超过此时间未发消息，自动将前段对话整理为素材</text>
  </view>

  <!-- 最少轮数 -->
  <view class="row row-border" @click="showMinRoundsPicker">
    <text class="row-label">最少对话轮数</text>
    <view class="row-right">
      <text class="row-value">{{ chatSettings.minRounds }} 轮 ▼</text>
    </view>
  </view>
  <view class="row-hint">
    <text class="row-hint-text">对话不足此轮数时不生成素材</text>
  </view>

  <!-- toast 开关 -->
  <view class="row row-border">
    <text class="row-label">生成时提示</text>
    <switch
      class="row-switch"
      :checked="chatSettings.toast"
      color="#7C6FE3"
      @change="chatSettings.toast = $event.detail.value; saveChatSettings()"
    />
  </view>
  <view class="row-hint">
    <text class="row-hint-text">素材生成时显示「已记录为今日素材 ✓」提示</text>
  </view>
</view>
```

**新增响应式数据和函数：**

```typescript
// 对话素材设置
const chatSettings = reactive({
  enabled: true,
  silenceThreshold: 30,
  minRounds: 3,
  toast: true,
})

// 初始化时从 API 获取
onMounted(async () => {
  // ... 已有的设置获取逻辑 ...
  // 补充：读取 chat 相关设置
  // settings 响应中会包含 chatMaterialEnabled, chatSilenceThreshold, chatMaterialToast, chatMinRounds
  chatSettings.enabled = settingsData.chatMaterialEnabled ?? true
  chatSettings.silenceThreshold = settingsData.chatSilenceThreshold ?? 30
  chatSettings.minRounds = settingsData.chatMinRounds ?? 3
  chatSettings.toast = settingsData.chatMaterialToast ?? true
})

// 保存 chat 设置
async function saveChatSettings() {
  try {
    await updateSettings({
      chat_material_enabled: chatSettings.enabled,
      chat_silence_threshold: chatSettings.silenceThreshold,
      chat_material_toast: chatSettings.toast,
      chat_min_rounds: chatSettings.minRounds,
    })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

// 静默阈值选择器
const silenceOptions = [15, 20, 30, 45, 60, 90, 120]
function showSilenceThresholdPicker() {
  uni.showActionSheet({
    itemList: silenceOptions.map(v => `${v} 分钟`),
    success: (res) => {
      chatSettings.silenceThreshold = silenceOptions[res.tapIndex]
      saveChatSettings()
    },
  })
}

// 最少轮数选择器
const roundOptions = [1, 2, 3, 5, 8, 10, 15, 20]
function showMinRoundsPicker() {
  uni.showActionSheet({
    itemList: roundOptions.map(v => `${v} 轮`),
    success: (res) => {
      chatSettings.minRounds = roundOptions[res.tapIndex]
      saveChatSettings()
    },
  })
}
```

**样式新增（如果没有 `.row-hint` 样式）：**

```scss
.row-hint {
  padding: 0 32rpx 16rpx;
}
.row-hint-text {
  font-size: 22rpx;
  color: #AE9D92;
  line-height: 1.5;
}
```

---

## 四、设计规范

### 4.1 颜色

- 对话素材模块色：`#7C6FE3`（薰衣紫偏蓝）
- 卡片左侧竖线：`#7C6FE3`
- 「展开对话 ›」文字色：`#7C6FE3`
- 设置页 switch 选中色：`#7C6FE3`

### 4.2 卡片视觉

对话素材卡片与照片/文字卡片视觉统一但有区分：
- 左侧竖线颜色不同（紫色 vs 橙色/绿色）
- 时间显示为时间段（`14:03 ~ 14:15`），而非单个时间点
- 有「展开对话 ›」点击入口

### 4.3 Bottom Sheet

- 从底部弹出，高度占屏幕 75%
- 顶部拖拽条 + 标题 + 关闭按钮
- 对话气泡样式与聊天页一致（用户橙色靠右，AI 白色靠左）
- 只读模式，不可输入

### 4.4 单位规范

- **所有布局尺寸使用 rpx**
- **例外：** `border: 1px solid`、`box-shadow` 保留 px

---

## 五、Mock 数据

### 5.1 Mock 对话素材

在 `services/mock/material.ts` 中，`getMaterials()` 返回的数组中新增 chat 类型的假数据：

```typescript
{
  id: 'mock-chat-1',
  userId: 'mock-user-1',
  type: 'chat' as const,
  content: '下午和小李骑车去了海河边，阳光很好，聊了很多暑假计划',
  mediaUrl: '',
  thumbnailUrl: '',
  location: {},
  emotion: { label: '开心', score: 0.88, emoji: '😊' },
  tags: ['骑行', '户外'],
  date: new Date().toISOString().split('T')[0],
  createdAt: Date.now() - 7200000,
  chatSessionId: 'mock-session-1',
  startTime: Date.now() - 7200000,
  endTime: Date.now() - 6480000,
}
```

### 5.2 Mock 设置

在 `services/mock/user.ts`（或对应的 settings mock）中，确保返回新增字段：

```typescript
{
  // ... 已有字段 ...
  chatMaterialEnabled: true,
  chatSilenceThreshold: 30,
  chatMaterialToast: true,
  chatMinRounds: 3,
}
```

---

## 六、文档更新（必须）

完成代码后，更新以下文档：

### 6.1 `docs/DESIGN.md`

1. 在 §三 全功能用户交互链路中，**§3.4 AI 对话** 部分追加对话转素材的说明：

```markdown
### 3.4 AI 对话

... (已有内容) ...

**对话自动转素材：**
- 用户与 AI 聊天后，对话按静默阈值（默认30分钟，可在设置页调整）自动切分为对话段
- 每段对话由 AI 自动生成标题、摘要、情绪标签，创建为 `type="chat"` 的素材
- 💬 对话素材在素材时间线中与 📷 照片、✍️ 文字素材平级展示
- 点击「展开对话 ›」可查看原始对话记录（Bottom Sheet 只读展示）
- 所有类型素材统一参与每日 AI 日记生成
- 设置页可控制：总开关、静默阈值、最小轮数、toast 提示
```

2. 在 §三 新增 **§3.11 对话自动转素材**：

```markdown
### 3.11 对话自动转素材

\```
用户与 AI 聊天
      │
      ▼
静默超过阈值（默认30分钟）/ 用户离开聊天页
      │
      ▼
后端自动封闭对话段 → AI 提取标题/摘要/情绪/标签 → 生成 chat 素材
      │
      ▼
素材时间线新增 💬 卡片（可展开查看原始对话）
      │
      ▼
每日汇总时，与照片/文字素材一起参与 AI 日记生成
\```

**设计亮点：**
- **零操作**：用户正常聊天即可，素材生成完全自动
- **可控**：设置页可关闭、调整阈值、控制最小轮数
- **轻提示**：可选 toast「已记录为今日素材 ✓」，1.5秒消失，不打断聊天
- **可追溯**：素材卡片支持展开查看原始对话记录
```

### 6.2 `docs/architecture.md`

1. API 模块列表新增 `chat`：

```
API 模块：`ai`, `chat`, `diary`, `social`, `study`, `user`, `anniversary`, `material`, `auth`
```

2. 组件清单新增 `ChatDetailSheet`

### 6.3 `docs/golden-rules.md`

无需修改（现有规则已覆盖）。

### 6.4 `CLAUDE.md`（项目根目录）

- 组件列表新增 ChatDetailSheet
- API 模块列表新增 chat

---

## 七、注意事项

1. **所有样式使用 rpx**，仅 `border` 和 `box-shadow` 用 px
2. DoodleIcon 的 `size` 单位是 rpx
3. 页面生命周期用 UniApp 的 `onUnload`，不是 Vue 的 `onUnmounted`
4. Mock 模式下所有新功能也能正常展示
5. 不要修改已有组件的公共接口（CustomNavBar、TabBar、DoodleIcon）
6. 完成后运行 `npm test` 确保 CSS 规范测试通过
7. 完成后 `git add -A && git commit -m "feat(chat): 对话素材前端 — 💬卡片 + 详情Sheet + 设置页" && git push`

---

*创建时间：2026-04-02 | 作者：BB*
