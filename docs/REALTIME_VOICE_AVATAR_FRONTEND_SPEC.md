# Avalin 实时语音分身前端 UX 与工程规格

> 状态：Draft v1.0
> 技术栈：uni-app + Vue 3 + TypeScript + Pinia
> 后端契约：`riji-backend/docs/REALTIME_VOICE_AVATAR_SPEC.md`
> 产品原则：记忆是证据，画像是理解，分身是行动；AI 建议，用户决策

---

## 1. 页面定位

### 1.1 用户与场景

用户在 vivo 手机上，用耳机或手机扬声器与自己的分身进行短时、自然的实时通话。常见场景：

- 回忆一段过去生活。
- 在走路或通勤时记录想法。
- 口头表达“想找人一起做某件事”。
- 查询正在进行的找人任务。

### 1.2 页面唯一任务

让用户在一个持续、低延迟的语音会话中完成：

```text
说话 -> 分身理解 -> 必要时查记忆/整理任务 -> 用户确认 -> 得到结果
```

这不是语音输入法，也不是传统聊天页加一个大麦克风。它是“和自己的分身通话”。

### 1.3 设计方向

气质：温暖、可信、克制、正在发生。

视觉策略：

- 保留 Avalin 暖杏橙与纸张感中性色。
- 不使用科技蓝紫渐变、发光球、玻璃卡片和持续旋转装饰。
- 主要动态元素是一条“声音脉络”：输入时响应用户音量，输出时响应分身音量。
- 记忆证据像从对话中长出的标注，不做独立大卡片墙。
- 所有业务动作都显示真实状态，不用拟人化动画掩盖等待。

页面记忆点：

> 实时字幕中的一句话可以向下延伸出一条细线，连接到对应日记证据或找人任务摘要。

---

## 2. 信息架构

### 2.1 入口

P0 保留两个入口：

1. AI 对话页 `pages/chat/index` 顶部的“语音通话”图标按钮。
2. 找朋友页 `pages/social/find` 的“语音说”入口。

第二个入口进入同一通话页，但携带：

```text
?mode=social_mission
```

该参数只影响初始欢迎语和工具优先级，不自动创建任务。

### 2.2 新路由

```json
{
  "path": "pages/chat/voice-call",
  "style": {
    "navigationStyle": "custom",
    "disableScroll": true
  }
}
```

### 2.3 不新增底部 Tab

实时语音是 AI 伙伴的交互模式，不是独立信息域。通话页为沉浸式二级页面，不显示 TabBar。

---

## 3. 页面布局

```text
┌────────────────────────────────┐
│ ←  和分身说话          仅本次通话 │
├────────────────────────────────┤
│                                │
│  [声音脉络 / 稳定高度波形带]      │
│  正在听 / 正在想 / 分身在说       │
│                                │
│  用户实时字幕                    │
│  分身实时回复字幕                │
│     │                          │
│     └─ 来自《同一片晚霞》8月6日  │
│                                │
│  [工具执行/任务摘要，按需出现]     │
│                                │
├────────────────────────────────┤
│ [确认动作面板，按需出现]           │
├────────────────────────────────┤
│  麦克风       结束       扬声器    │
└────────────────────────────────┘
```

结构要求：

- 顶栏、声音脉络和底部控制尺寸稳定，动态字幕不能推动控制栏。
- 字幕区独立滚动，底部保留安全区。
- 证据和确认面板出现时压缩字幕可视区，不覆盖字幕。
- 不把整个页面放进卡片。

---

## 4. 状态与文案

前端状态必须来自 Store，不允许各组件自行推断。

| 状态 | 主状态文案 | UI 行为 |
|---|---|---|
| `idle` | 准备通话 | 不采集音频 |
| `requesting_permission` | 等待麦克风权限 | 显示系统权限结果 |
| `connecting` | 正在连接分身 | 控制栏禁用，允许返回 |
| `ready` | 可以开始了 | 开始采集 |
| `listening` | 正在听 | 用户波形、实时 ASR |
| `thinking` | 正在想 | 波形收静，不做无限加载动画 |
| `speaking` | 分身在说 | 播放音频、显示回复字幕 |
| `interrupted` | 已停下 | 立即清空待播音频 |
| `tool_running` | 正在查找记忆 / 正在整理任务 | 显示具体工具动作 |
| `awaiting_confirmation` | 等你确认 | 显示确认面板 |
| `reconnecting` | 连接中断，正在恢复 | 暂停采集与播放 |
| `closing` | 正在结束 | 禁止重复点击 |
| `closed` | 通话已结束 | 显示摘要操作 |
| `error` | 使用具体错误文案 | 提供重试或退出 |

避免：

- “处理中……”
- “AI 正在施展魔法”
- 只有颜色变化、没有文字状态

---

## 5. 核心交互

### 5.1 建立会话

1. 页面加载。
2. 请求麦克风权限。
3. `POST /api/realtime-voice/tickets`。
4. 建立 Avalin WebSocket。
5. 发送 `session.start`。
6. 收到 `session.ready` 后启动音频采集。

未收到 `session.ready` 前不得发送音频。

### 5.2 用户说话

- 每 20 ms 产生一帧 PCM。
- 转 Base64 后发送 `audio.append`。
- 实时展示 `asr.delta`，`asr.done` 后冻结为一条用户字幕。
- 按键说话模式松开时发送 `audio.commit`。
- 自由对话模式由上游 VAD 判断结束。

### 5.3 分身回复

- `assistant.text.delta` 追加到当前回复字幕。
- `assistant.audio.delta` 进入播放队列。
- 文本和音频是同一条回复，不创建两条消息。
- `assistant.audio.done` 后等待播放队列排空，再回到 listening。

### 5.4 打断

打断必须本地优先：

1. 收到 `asr.started` 或本地 VAD 检测到用户开口。
2. 立即停止播放器并清空未播放 PCM。
3. 发送 `response.cancel`。
4. 收到 `response.canceled` 后更新为 listening。

不能等服务器确认后才停止声音。

### 5.5 记忆证据

收到 `tool.result(name=search_personal_memory)`：

- 在对应分身回复下展示最多 3 条证据。
- 每条显示：来源类型、标题、日期、短摘要。
- 点击后结束或挂起通话，再通过 Deep Link 打开日记。
- 回到通话页时不自动重连已结束会话。

证据行示例：

```text
来自日记
《同一片晚霞》 · 8月6日
“傍晚在湖边拍到一片很低的橙色晚霞……”
```

不显示向量分数、document ID、chunk ID。

### 5.6 找人任务草稿

收到 `draft_social_mission` 结果：

```text
今晚看科幻电影
时间：今晚
地点：南开大学附近 5 km
人数：再找 1 人
范围：公开帖子与授权名片
```

如果存在待确认问题：

- 只显示当前问题。
- 用户继续语音回答。
- 不出现“开始寻找”按钮。

草稿完整后显示确认面板：

- 主按钮：`确认开始`
- 次按钮：`再改一下`
- 权限说明：`不会自动发帖或申请认识`

### 5.7 页面跳转建议

收到 `navigation.suggested` 后：

- 只展示可点击动作，不自动跳转。
- 文案使用业务语言，例如“查看这篇日记”“查看任务进度”。
- 前端再次校验路由白名单。

---

## 6. 组件设计

```text
src/components/voice/
├── VoiceCallHeader.vue
├── VoiceSignal.vue
├── VoiceTranscript.vue
├── VoiceEvidenceList.vue
├── VoiceToolStatus.vue
├── VoiceConfirmation.vue
├── VoiceControls.vue
├── VoiceErrorState.vue
└── VoiceCallSummary.vue
```

### 6.1 `VoiceSignal`

- 固定高度，不因音量变化改变布局。
- 输入态使用暖橙；输出态使用克制的森林绿或暖棕。
- Canvas 或 WebGL 都可，但首版优先 Canvas 2D。
- 每秒刷新上限 30 FPS。
- `prefers-reduced-motion` 时改为静态音量刻度和文字状态。
- 不使用无限自转、弹跳、发光或粒子背景。

### 6.2 `VoiceTranscript`

- 用户和分身通过对齐、字重、标签区分，不只靠颜色。
- 正文最小视觉字号等效 16px，行高至少 1.5。
- 实时 delta 更新时不触发整页重排。
- 只保留当前会话最近 20 条可见记录，旧记录可折叠。
- 工具结果与触发它的回复关联。

### 6.3 `VoiceConfirmation`

- 底部固定在控制栏上方。
- 内容可滚动，但主操作始终可见。
- 触控区不小于 48dp。
- 审批和拒绝使用文字，不只使用图标。
- 倒计时少于 30 秒时显示明确剩余时间。
- 过期后按钮禁用，提示“确认已过期，请重新整理任务”。

### 6.4 `VoiceControls`

首版三个控制：

- 麦克风开关。
- 结束通话。
- 扬声器静音。

要求：

- 结束按钮位于稳定中心位置。
- 图标按钮有 `aria-label` / `accessibilityLabel`。
- 按下反馈 80-150 ms，不改变外部布局尺寸。
- 底部包含 `env(safe-area-inset-bottom)`。

---

## 7. Store 设计

新增：

```text
src/stores/realtime-voice.ts
```

状态：

```ts
interface RealtimeVoiceState {
  phase: VoicePhase
  sessionId: string
  providerSessionId: string
  socketState: 'idle' | 'connecting' | 'open' | 'closed'
  micPermission: 'unknown' | 'granted' | 'denied'
  isMicEnabled: boolean
  isSpeakerEnabled: boolean
  inputLevel: number
  outputLevel: number
  transcripts: VoiceTranscriptItem[]
  activeUserText: string
  activeAssistantText: string
  audioQueueSize: number
  activeTool?: VoiceToolState
  evidence: VoiceEvidence[]
  confirmation?: VoiceConfirmationState
  reconnectAttempt: number
  error?: VoiceError
}
```

Actions：

```ts
requestPermission()
connect(options)
startCapture()
stopCapture()
appendAudio(frame)
commitAudio()
cancelResponse()
resolveConfirmation(decision)
handleServerEvent(event)
close(reason)
reset()
```

生命周期：

- `onMounted` 连接。
- `onHide` 暂停采集；30 秒未返回则关闭。
- `onShow` 若仍在宽限期则恢复采集。
- `onUnmounted/onUnload` 清理 WebSocket、AudioContext、Worklet、计时器和事件监听。
- Store 不使用持久化插件保存音频队列和 ticket。

---

## 8. Service 与协议类型

```text
src/services/realtime/
├── voice-api.ts
├── voice-socket.ts
├── voice-protocol.ts
└── voice-errors.ts
```

### 8.1 `voice-api.ts`

```ts
createRealtimeVoiceTicket(options): Promise<VoiceTicket>
getRealtimeVoiceHealth(): Promise<VoiceHealth>
```

### 8.2 `voice-socket.ts`

职责：

- 构造 `ws/wss` URL。
- 建立连接。
- JSON 序列化与解析。
- 事件 ID。
- 心跳与关闭。
- 不处理 UI 状态。
- 不保存 ticket。

### 8.3 协议校验

为每个服务端事件定义判别联合类型：

```ts
type VoiceServerEvent =
  | SessionReadyEvent
  | SessionStateEvent
  | AsrDeltaEvent
  | AsrDoneEvent
  | AssistantTextDeltaEvent
  | AssistantAudioDeltaEvent
  | ToolResultEvent
  | ConfirmationRequiredEvent
  | NavigationSuggestedEvent
  | VoiceErrorEvent
  | SessionClosedEvent
```

未知事件：

- 记录开发日志。
- 不导致页面崩溃。
- 不能当作音频处理。

---

## 9. 音频适配层

```text
src/services/realtime/audio/
├── types.ts
├── h5-audio.ts
├── app-audio.ts
└── pcm.ts
```

接口：

```ts
interface RealtimeAudioAdapter {
  requestPermission(): Promise<void>
  startCapture(onFrame: (pcm16: ArrayBuffer, level: number) => void): Promise<void>
  stopCapture(): Promise<void>
  enqueuePlayback(pcm24: ArrayBuffer): void
  interruptPlayback(): void
  setMicEnabled(value: boolean): void
  setSpeakerEnabled(value: boolean): void
  dispose(): Promise<void>
}
```

### 9.1 H5

实现：

- `navigator.mediaDevices.getUserMedia`
- `AudioWorklet` 采集
- 重采样至 16 kHz
- Float32 转 int16 PCM
- 播放器使用 24 kHz PCM 环形缓冲

文件建议：

```text
src/static/audio-worklets/pcm-capture.js
src/static/audio-worklets/pcm-playback.js
```

限制：

- 必须 HTTPS 或 localhost。
- Safari 需要用户手势后恢复 AudioContext。
- 页面首次进入不能自动播放欢迎语，必须通过用户点击入口建立音频上下文。

### 9.2 vivo Android App

不要把 H5 Web Audio 作为最终真机方案。

建议创建：

```text
uni_modules/avalin-realtime-audio/
```

使用 UTS/原生插件封装：

- `AudioRecord`：16 kHz、mono、PCM 16-bit。
- `AudioTrack`：24 kHz、mono、PCM 16-bit、stream mode。
- Android Audio Focus。
- 蓝牙耳机路由。
- 来电、闹钟、媒体焦点中断。

Manifest 增加：

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
```

Android 12+ 如支持蓝牙耳机，再按目标 SDK 增加 `BLUETOOTH_CONNECT`。

### 9.3 音频队列

- 输入帧 20 ms。
- 输出播放器预缓冲约 80-120 ms。
- 最大输出缓冲 2 秒。
- 打断时立即清空。
- 页面不可见时停止采集。
- 不把 PCM 放入 Vue 响应式状态。

---

## 10. 错误设计

| 场景 | 用户文案 | 操作 |
|---|---|---|
| 麦克风拒绝 | 未获得麦克风权限 | 打开系统设置 / 返回 |
| Feature Flag 关闭 | 实时语音暂未开放 | 返回文字对话 |
| 上游鉴权失败 | 语音服务配置异常 | 退出，不循环重试 |
| 网络断开 | 连接中断，正在恢复 | 自动重连 2 次 |
| 重连失败 | 未能恢复通话 | 重新连接 / 结束 |
| 无记忆结果 | 没有找到对应记录 | 继续对话 |
| Tool 超时 | 这次查询没有完成 | 重试工具，不重建通话 |
| 确认过期 | 确认已过期 | 重新整理任务 |
| 会话到时 | 本次通话已结束 | 查看摘要 / 返回 |

错误区域使用 `role=alert` 或等价可访问语义。

---

## 11. 通话结束

用户点击结束：

1. 立即停止采集。
2. 停止并清空播放。
3. 发送 `session.close`。
4. 等待 `session.closed`，显示简短摘要页。

摘要页只显示：

- 通话时长。
- 本轮找到的记忆数量。
- 创建或启动的找人任务。
- “返回消息”。

不默认展示聊天全文，不把统计做成营销式大数字。

---

## 12. 性能要求

- PCM 不进入 Pinia 响应式对象。
- 波形最大 30 FPS。
- 字幕 delta 合并到动画帧刷新，避免每 token 重排。
- 证据最多 3 条首屏展示。
- 页面组件按需加载；通话组件不进入首页初始包。
- 页面销毁后所有音频、Socket、Timer、Visibility Listener 均清理。
- 避免 Base64 多次复制，统一在音频适配层编码和解码。

---

## 13. 可访问性

- 所有控制至少 48×48 dp。
- 图标按钮有可访问名称。
- 状态同时用文字和视觉变化表达。
- 用户与分身字幕不能只靠颜色区分。
- 正文对比度至少 4.5:1。
- 支持系统大字体，最长状态文案不截断。
- 减少动态效果时禁用实时波形动画，但保留音量文本状态。
- 录音、错误、确认状态通过无障碍 Live Region 通知。
- H5 支持键盘操作开始、静音、结束和确认。

---

## 14. 埋点

不记录语音内容，仅记录结构化行为：

- `voice_call_entry_clicked`
- `voice_permission_result`
- `voice_session_ready`
- `voice_first_asr`
- `voice_first_audio`
- `voice_interrupt`
- `voice_tool_started`
- `voice_tool_result`
- `voice_confirmation_shown`
- `voice_confirmation_resolved`
- `voice_session_closed`
- `voice_session_error`

字段：

- platform
- network type
- duration
- latency bucket
- tool name
- confirmation decision
- close reason

---

## 15. 前端测试

### 15.1 单元测试

- 服务器事件解析。
- 未知事件忽略。
- Store 状态机合法转换。
- ASR/Text delta 合并。
- `asr.started` 触发本地打断。
- Confirmation 过期。
- Deep Link 白名单。
- 错误码到用户文案映射。
- dispose 清理全部资源。

### 15.2 音频 Fake

实现 `FakeRealtimeAudioAdapter`：

- 生成固定 PCM。
- 模拟输入音量。
- 记录播放队列。
- 验证 interrupt 清空队列。
- 验证 dispose。

### 15.3 WebSocket Fake

- 正常会话。
- 记忆 Tool。
- 找人草稿与确认。
- 用户打断。
- 重连。
- 鉴权失败。
- Tool 超时。

### 15.4 真机检查

- vivo 手机内置麦克风。
- 扬声器与听筒。
- 有线/蓝牙耳机。
- 锁屏和切后台。
- 来电或其他音频抢占。
- 弱网、Wi-Fi/移动网络切换。
- 375px H5、小屏 vivo、大屏 vivo。

---

## 16. 验收路径

### 16.1 记忆

```text
进入 AI 伙伴 -> 点击语音通话
-> “你记得我上次拍晚霞吗”
-> 实时字幕
-> 分身引用日记
-> 展示证据
-> 点击打开正确日记
```

### 16.2 找搭子

```text
“今晚想找人看科幻电影”
-> 分身复述任务
-> 屏幕展示权限和条件
-> 用户说“确认开始”或点击确认
-> 显示真实候选数
-> 提供“查看任务”入口
```

### 16.3 人机边界

```text
“直接替我申请第一个人”
-> 分身拒绝自动执行
-> 展示“查看候选”入口
-> 由用户在候选页决定
```

---

## 17. 前端 Definition of Done

- H5 可完成持续双向语音、字幕和打断。
- vivo Android 使用原生音频适配器完成同一协议。
- 记忆证据可追溯到日记。
- 找人任务确认前不启动。
- 通话页没有火山 Key 或供应商协议细节。
- 所有确认动作可访问、可取消、可过期。
- 页面切后台、返回、卸载均无麦克风泄漏。
- 减少动态效果和大字体下可用。
- 类型检查、单元测试、H5 构建通过。
- 真机完成记忆和电影搭子两条演示链路。
