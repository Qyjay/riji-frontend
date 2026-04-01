<template>
  <view class="page">
    <CustomNavBar title="设置" left-icon="back" />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view class="scroll" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view class="content">

        <!-- ── AI 写作偏好 ── -->
        <view class="card">
          <text class="card-title">── AI 写作偏好 ──</text>

          <view class="row" @click="showStylePickerFn">
            <text class="row-label">写作风格</text>
            <view class="row-right">
              <text class="row-value">{{ writingStyles[writingStyleIndex] }}▼</text>
            </view>
          </view>

          <!-- 风格标签选择 -->
          <view class="style-tags-wrap">
            <text class="style-tags-label">风格标签（可多选）</text>
            <view class="style-tags">
              <view
                v-for="tag in styleTagOptions"
                :key="tag"
                class="style-tag"
                :class="{ 'style-tag-selected': selectedStyleTags.includes(tag) }"
                @click="toggleStyleTag(tag)"
              >
                <text class="style-tag-text">{{ tag }}</text>
              </view>
            </view>
          </view>

          <view class="row row-border">
            <text class="row-label">个性化提示词</text>
          </view>
          <view class="prompt-input-wrap">
            <textarea
              v-model="customPrompt"
              class="prompt-input"
              placeholder="输入你希望AI写作时遵循的风格描述..."
              :placeholder-style="'color: #D4C4B8; font-size: 26rpx;'"
              maxlength="200"
            />
            <text class="prompt-count">{{ customPrompt.length }}/200</text>
          </view>

          <view class="save-prompt-btn press-feedback" @click="saveWritingPrefs">
            <text class="save-prompt-text">保存偏好设置</text>
          </view>
        </view>

        <!-- ── 通知设置 ── -->
        <view class="card">
          <text class="card-title">── 通知设置 ──</text>

          <view class="row">
            <text class="row-label">日记提醒</text>
            <switch
              class="row-switch"
              :checked="notify.diary"
              color="#E8855A"
              @change="notify.diary = $event.detail.value"
            />
          </view>

          <view class="row row-border" @click="showTimePicker">
            <text class="row-label">提醒时间</text>
            <view class="row-right">
              <text class="row-value">{{ notify.remindTime }}</text>
              <text class="row-arrow">›</text>
            </view>
          </view>

          <view class="row row-border">
            <text class="row-label">番茄完成提醒</text>
            <switch
              class="row-switch"
              :checked="notify.pomodoro"
              color="#E8855A"
              @change="notify.pomodoro = $event.detail.value"
            />
          </view>

          <view class="row row-border">
            <text class="row-label">搭子消息提醒</text>
            <switch
              class="row-switch"
              :checked="notify.buddy"
              color="#E8855A"
              @change="notify.buddy = $event.detail.value"
            />
          </view>
        </view>

        <!-- ── 隐私与安全 ── -->
        <view class="card">
          <text class="card-title">── 隐私与安全 ──</text>

          <view class="row">
            <text class="row-label">日记加密</text>
            <switch
              class="row-switch"
              :checked="privacy.encrypt"
              color="#E8855A"
              @change="onEncryptChange"
            />
          </view>

          <view class="row row-border">
            <text class="row-label">应用锁</text>
            <switch
              class="row-switch"
              :checked="privacy.appLock"
              color="#E8855A"
              @change="onAppLockChange"
            />
          </view>

          <view class="row row-border" @click="onExportData">
            <text class="row-label">数据导出</text>
            <text class="row-arrow">›</text>
          </view>

          <view class="row row-border" @click="onClearCache">
            <text class="row-label">清除缓存</text>
            <text class="row-arrow">›</text>
          </view>
        </view>

        <!-- ── 外观 ── -->
        <view class="card">
          <text class="card-title">── 外观 ──</text>

          <view class="row" @click="showThemePicker">
            <text class="row-label">主题</text>
            <view class="row-right">
              <text class="row-value">{{ themeOptions[appearance.themeIndex] }}▼</text>
            </view>
          </view>

          <view class="row row-border" @click="showFontPicker">
            <text class="row-label">字体大小</text>
            <view class="row-right">
              <text class="row-value">{{ fontOptions[appearance.fontIndex] }}▼</text>
            </view>
          </view>

          <view class="row row-border" @click="showDiaryFontPicker">
            <text class="row-label">日记字体</text>
            <view class="row-right">
              <text class="row-value">{{ diaryFontLabel }}▼</text>
            </view>
          </view>

          <!-- 字体预览选择面板 -->
          <view v-if="diaryFontPanelVisible" class="font-preview-panel">
            <view
              v-for="f in diaryFontOptions"
              :key="f.key"
              class="font-preview-item press-feedback"
              :class="{ 'font-preview-active': settingsStore.diaryFont === f.key }"
              @click="pickDiaryFont(f.key)"
            >
              <view class="font-preview-left">
                <text class="font-preview-name">{{ f.label }}</text>
                <text class="font-preview-sample" :style="{ fontFamily: f.family }">日迹，让每一天都值得被记住</text>
              </view>
              <text v-if="settingsStore.diaryFont === f.key" class="font-preview-check">✓</text>
            </view>
          </view>
        </view>

        <!-- ── 关于 ── -->
        <view class="card">
          <text class="card-title">── 关于 ──</text>

          <view class="row" @click="onVersion">
            <text class="row-label">版本信息</text>
            <view class="row-right">
              <text class="row-value">v1.0.0</text>
              <text class="row-arrow">›</text>
            </view>
          </view>

          <view class="row row-border" @click="onUserAgreement">
            <text class="row-label">用户协议</text>
            <text class="row-arrow">›</text>
          </view>

          <view class="row row-border" @click="onPrivacyPolicy">
            <text class="row-label">隐私政策</text>
            <text class="row-arrow">›</text>
          </view>

          <view class="row row-border" @click="onOpenSource">
            <text class="row-label">开源许可</text>
            <text class="row-arrow">›</text>
          </view>
        </view>

        <!-- ── 开发者选项 ── -->
        <view class="card dev-card">
          <text class="card-title">── 开发者选项 ──</text>

          <view class="row">
            <view class="row-label-wrap">
              <text class="row-label">Mock 模式</text>
              <text class="row-hint">开启后使用本地模拟数据，无需后端</text>
            </view>
            <switch
              class="row-switch"
              :checked="mockMode"
              color="#9B59B6"
              @change="onMockToggle"
            />
          </view>

          <view class="row row-border">
            <view class="row-label-wrap">
              <text class="row-label">后端地址</text>
              <text class="row-hint">关闭 Mock 后生效，同局域网填同学电脑 IP</text>
            </view>
          </view>
          <view class="api-url-wrap">
            <input
              v-model="apiBaseUrl"
              class="api-url-input"
              :placeholder="defaultApiUrl"
              placeholder-class="api-url-placeholder"
            />
            <view class="api-url-actions">
              <view class="api-url-btn api-url-btn--save" @click="saveApiUrl">
                <text class="api-url-btn-text">保存</text>
              </view>
              <view class="api-url-btn api-url-btn--reset" @click="resetApiUrl">
                <text class="api-url-btn-text api-url-btn-text--reset">重置</text>
              </view>
              <view class="api-url-btn api-url-btn--test" @click="testApiUrl">
                <text class="api-url-btn-text api-url-btn-text--test">测试</text>
              </view>
            </view>
            <text class="api-url-current">当前：{{ currentApiUrl }}</text>
          </view>
        </view>

        <!-- 退出登录 -->
        <view class="logout-wrap">
          <view class="logout-btn" @click="onLogout">
            <text class="logout-text">退出登录</text>
          </view>
        </view>

        <view class="bottom-safe" />
      </view>
    </scroll-view>

    <!-- 时间 Picker -->
    <picker
      v-if="timePickerVisible"
      mode="selector"
      :range="timeOptions"
      :value="notify.remindTimeIndex"
      @change="onTimePickerChange"
      @cancel="timePickerVisible = false"
    />

    <!-- 主题 Picker -->
    <picker
      v-if="themePickerVisible"
      mode="selector"
      :range="themeOptions"
      :value="appearance.themeIndex"
      @change="onThemePickerChange"
      @cancel="themePickerVisible = false"
    />

    <!-- 字体 Picker -->
    <picker
      v-if="fontPickerVisible"
      mode="selector"
      :range="fontOptions"
      :value="appearance.fontIndex"
      @change="onFontPickerChange"
      @cancel="fontPickerVisible = false"
    />
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, computed } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import { USE_MOCK, setMockMode, API_BASE_URL, setApiBaseUrl, getDefaultApiBaseUrl } from '@/services/config'
import { useSettingsStore } from '@/stores/settings'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 0
})

// ── AI 写作偏好 ──
const writingStyles = ['文艺', '幽默', '简洁', '温暖', '中二', '古风', '科幻', '电影']
const writingStyleIndex = ref(2)
const styleTagOptions = ['善用比喻', '多用细节', '情感充沛', '简短干练', '哲理感', '画面感强', '幽默自嘲', '诗意唯美']
const selectedStyleTags = ref<string[]>(['情感充沛', '画面感强'])
const customPrompt = ref('')

function showStylePickerFn() {
  uni.showActionSheet({
    itemList: writingStyles,
    success: (res) => {
      writingStyleIndex.value = res.tapIndex
      uni.showToast({ title: `已选择「${writingStyles[res.tapIndex]}」风格`, icon: 'none' })
    }
  })
}

function toggleStyleTag(tag: string) {
  const idx = selectedStyleTags.value.indexOf(tag)
  if (idx >= 0) {
    selectedStyleTags.value.splice(idx, 1)
  } else {
    selectedStyleTags.value.push(tag)
  }
}

function saveWritingPrefs() {
  uni.showToast({ title: '写作偏好已保存 ✓', icon: 'success' })
}

// ── 通知 ──
const notify = reactive({
  diary: true,
  remindTime: '21:00',
  remindTimeIndex: 2,
  pomodoro: true,
  buddy: true,
})

const timeOptions = ['19:00', '20:00', '21:00', '22:00', '23:00']
const timePickerVisible = ref(false)

function showTimePicker() {
  timePickerVisible.value = true
  // UniApp picker 通过绑定显示；直接用 picker 组件内联即可
  // 用 uni.showActionSheet 作为替代以确保跨端兼容
  uni.showActionSheet({
    itemList: timeOptions,
    success: (res) => {
      notify.remindTimeIndex = res.tapIndex
      notify.remindTime = timeOptions[res.tapIndex]
    },
  })
}

function onTimePickerChange(e: any) {
  notify.remindTimeIndex = e.detail.value
  notify.remindTime = timeOptions[e.detail.value]
  timePickerVisible.value = false
}

// ── 隐私 ──
const privacy = reactive({
  encrypt: false,
  appLock: false,
})

function onEncryptChange(e: any) {
  uni.showModal({
    title: '提示',
    content: '加密功能开发中，敬请期待',
    showCancel: false,
  })
  // 不改变状态
}

function onAppLockChange(e: any) {
  uni.showModal({
    title: '提示',
    content: '应用锁功能开发中，敬请期待',
    showCancel: false,
  })
}

function onExportData() {
  uni.showToast({ title: '数据导出功能开发中', icon: 'none' })
}

function onClearCache() {
  uni.showToast({ title: '已清除 12.3MB 缓存', icon: 'success' })
}

// ── 外观 ──
const themeOptions = ['浅色', '深色', '跟随系统']
const fontOptions = ['小', '中', '大']
const themePickerVisible = ref(false)
const fontPickerVisible = ref(false)

const appearance = reactive({
  themeIndex: 2,
  fontIndex: 1,
})

function showThemePicker() {
  uni.showActionSheet({
    itemList: themeOptions,
    success: (res) => {
      appearance.themeIndex = res.tapIndex
    },
  })
}

function showFontPicker() {
  uni.showActionSheet({
    itemList: fontOptions,
    success: (res) => {
      appearance.fontIndex = res.tapIndex
    },
  })
}

function onThemePickerChange(e: any) {
  appearance.themeIndex = e.detail.value
  themePickerVisible.value = false
}

function onFontPickerChange(e: any) {
  appearance.fontIndex = e.detail.value
  fontPickerVisible.value = false
}

// ── 日记字体 ──
const settingsStore = useSettingsStore()
const diaryFontPanelVisible = ref(false)

const diaryFontOptions = [
  { key: 'handwrite', label: '站酷快乐体', family: "'ZCOOL KuaiLe', 'STXingkai', sans-serif" },
  { key: 'zhaizaijia', label: '宅在家粉條甜', family: "'ZhaiZaiJia', 'PingFang SC', sans-serif" },
  { key: 'nailao', label: '小可奶酪体', family: "'XiaoKeNaiLao', 'PingFang SC', sans-serif" },
  { key: 'songti', label: '宋体', family: "'Noto Serif SC', 'STSong', 'SimSun', serif" },
  { key: 'kaiti', label: '楷体', family: "'STKaiti', 'KaiTi', serif" },
  { key: 'default', label: '默认', family: "'PingFang SC', 'Helvetica Neue', sans-serif" },
]

const diaryFontLabel = computed(() => {
  const f = diaryFontOptions.find(o => o.key === settingsStore.diaryFont)
  return f?.label ?? '站酷快乐体'
})

function showDiaryFontPicker() {
  diaryFontPanelVisible.value = !diaryFontPanelVisible.value
}

function pickDiaryFont(key: string) {
  settingsStore.diaryFont = key as any
  uni.showToast({ title: `已切换为「${diaryFontOptions.find(o => o.key === key)?.label}」`, icon: 'none' })
}

// ── 关于 ──
function onVersion() {
  uni.showToast({ title: '已是最新版本', icon: 'success' })
}
function onUserAgreement() {
  uni.showToast({ title: '即将跳转到用户协议', icon: 'none' })
}
function onPrivacyPolicy() {
  uni.showToast({ title: '即将跳转到隐私政策', icon: 'none' })
}
function onOpenSource() {
  uni.showToast({ title: '即将跳转到开源许可', icon: 'none' })
}

// ── 开发者选项 ──
const mockMode = ref(USE_MOCK)
const apiBaseUrl = ref('')
const defaultApiUrl = getDefaultApiBaseUrl()
const currentApiUrl = ref(API_BASE_URL)

// 初始化时读取已保存的地址
onMounted(() => {
  // 如果当前地址不是默认地址，显示在输入框中
  if (API_BASE_URL !== defaultApiUrl) {
    apiBaseUrl.value = API_BASE_URL
  }
})

function onMockToggle(e: any) {
  const val = e.detail.value as boolean
  mockMode.value = val
  setMockMode(val)
  uni.showToast({
    title: val ? 'Mock 模式已开启' : 'Mock 模式已关闭',
    icon: 'none',
  })
}

function saveApiUrl() {
  const url = apiBaseUrl.value.trim()
  if (url && !url.startsWith('http')) {
    uni.showToast({ title: '地址必须以 http:// 或 https:// 开头', icon: 'none' })
    return
  }
  setApiBaseUrl(url)
  currentApiUrl.value = API_BASE_URL
  uni.showToast({ title: url ? '后端地址已保存' : '已恢复默认地址', icon: 'success' })
}

function resetApiUrl() {
  apiBaseUrl.value = ''
  setApiBaseUrl('')
  currentApiUrl.value = API_BASE_URL
  uni.showToast({ title: '已恢复默认地址', icon: 'success' })
}

async function testApiUrl() {
  const testUrl = apiBaseUrl.value.trim() || defaultApiUrl
  uni.showLoading({ title: '测试连接中...' })
  uni.request({
    url: `${testUrl.replace(/\/+$/, '')}/auth/health`,
    method: 'GET',
    timeout: 5000,
    success(res) {
      uni.hideLoading()
      if (res.statusCode >= 200 && res.statusCode < 500) {
        uni.showToast({ title: `✅ 连接成功 (${res.statusCode})`, icon: 'none' })
      } else {
        uni.showToast({ title: `⚠️ HTTP ${res.statusCode}`, icon: 'none' })
      }
    },
    fail(err) {
      uni.hideLoading()
      uni.showToast({ title: '❌ 无法连接，检查地址和网络', icon: 'none', duration: 3000 })
    },
  })
}

// ── 退出登录 ──
function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出登录吗？',
    confirmColor: '#D4645C',
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '已退出登录', icon: 'success' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {
}

.scroll {
}

.content {
  padding: 24rpx 32rpx 0;
}

/* 卡片 */
.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 0 32rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.card-title {
  display: block;
  font-size: 24rpx;
  color: #AE9D92;
  font-weight: 600;
  letter-spacing: 2rpx;
  text-align: center;
  padding: 24rpx 0 16rpx;
}

/* 行 */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 0;
  min-height: 104rpx;
  box-sizing: border-box;
}

/* ── AI 写作偏好 ── */
.style-tags-wrap {
  padding: 0 0 20rpx;
  border-top: 1rpx solid rgba(174, 157, 146, 0.1);
}

.style-tags-label {
  font-size: 24rpx;
  color: #AE9D92;
  display: block;
  margin: 16rpx 0 12rpx;
}

.style-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.style-tag {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  background: #F5F0EB;
  border: 2rpx solid #EAE0D6;
  cursor: pointer;
  &:active { transform: scale(0.95); }
}

.style-tag-selected {
  background: #FDF0E8;
  border-color: #E8855A;
}

.style-tag-text {
  font-size: 24rpx;
  color: #4A3628;
  .style-tag-selected & { color: #E8855A; font-weight: 600; }
}

.prompt-input-wrap {
  border-top: 1rpx solid rgba(174, 157, 146, 0.1);
  padding: 16rpx 0;
  position: relative;
}

.prompt-input {
  width: 100%;
  min-height: 120rpx;
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.6;
  background: #FDF8F3;
  border-radius: 12rpx;
  padding: 16rpx;
  box-sizing: border-box;
  border: 2rpx solid #EAE0D6;
}

.prompt-count {
  font-size: 22rpx;
  color: #AE9D92;
  display: block;
  text-align: right;
  margin-top: 6rpx;
}

.save-prompt-btn {
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 20rpx;
  padding: 20rpx;
  text-align: center;
  margin: 0 0 24rpx;
  &:active { opacity: 0.85; }
}

.save-prompt-text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.row-border {
  border-top: 1rpx solid rgba(174, 157, 146, 0.15);
}

.row-label {
  font-size: 30rpx;
  color: #2C1F14;
  font-weight: 500;
  flex: 1;
}

.row-right {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.row-value {
  font-size: 28rpx;
  color: #AE9D92;
}

.row-arrow {
  font-size: 36rpx;
  color: #AE9D92;
  line-height: 1;
  margin-left: 4rpx;
}

.row-switch {
  transform: scale(0.85);
  transform-origin: right center;
}

/* 退出登录 */
.logout-wrap {
  margin: 8rpx 0 40rpx;
  display: flex;
  justify-content: center;
}

.logout-btn {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  width: 100%;
  padding: 36rpx 0;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: opacity 0.15s;

  &:active {
    opacity: 0.7;
  }
}

.logout-text {
  font-size: 32rpx;
  color: #D4645C;
  font-weight: 600;
}

.bottom-safe {
  height: 40rpx;
}

/* 开发者选项 */
.dev-card {
  border: 2rpx dashed rgba(155, 89, 182, 0.3);
}

.row-label-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.row-hint {
  font-size: 22rpx;
  color: #AE9D92;
  margin-top: 4rpx;
}

/* 后端地址输入 */
.api-url-wrap {
  padding: 0 0 24rpx;
  border-top: 1rpx solid rgba(174, 157, 146, 0.1);
}

.api-url-input {
  width: 100%;
  height: 72rpx;
  font-size: 26rpx;
  color: #2C1F14;
  background: #FDF8F3;
  border: 2rpx solid #EAE0D6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  margin-top: 16rpx;
}

.api-url-placeholder {
  color: #D4C4B8;
  font-size: 26rpx;
}

.api-url-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}

.api-url-btn {
  flex: 1;
  height: 60rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { opacity: 0.8; }
}

.api-url-btn--save {
  background: #9B59B6;
}

.api-url-btn--reset {
  background: #F5F0EB;
  border: 1rpx solid #EAE0D6;
}

.api-url-btn--test {
  background: #5BBF8E;
}

.api-url-btn-text {
  font-size: 26rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.api-url-btn-text--reset {
  color: #4A3628;
}

.api-url-btn-text--test {
  color: #FFFFFF;
}

.api-url-current {
  display: block;
  font-size: 22rpx;
  color: #AE9D92;
  margin-top: 12rpx;
  word-break: break-all;
}

/* 字体预览面板 */
.font-preview-panel {
  padding: 0 0 16rpx;
  border-top: 1rpx solid rgba(174, 157, 146, 0.15);
}

.font-preview-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 8rpx;
  border-bottom: 1rpx solid rgba(174, 157, 146, 0.08);
  &:last-child { border-bottom: none; }
  &:active { background: rgba(232, 133, 90, 0.04); }
}

.font-preview-active {
  background: rgba(232, 133, 90, 0.06);
}

.font-preview-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.font-preview-name {
  font-size: 26rpx;
  color: #2C1F14;
  font-weight: 500;
}

.font-preview-sample {
  font-size: 30rpx;
  color: #4A3628;
  line-height: 1.6;
}

.font-preview-check {
  font-size: 32rpx;
  color: #E8855A;
  font-weight: 700;
  flex-shrink: 0;
  margin-left: 16rpx;
}
</style>
