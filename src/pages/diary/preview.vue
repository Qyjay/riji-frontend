<template>
  <view class="page">
    <!-- ── 自定义顶栏 ── -->
    <view class="preview-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-content">
        <view class="nav-left press-feedback" @click="goBack">
          <text class="nav-back">←</text>
        </view>
        <text class="nav-title">日记预览</text>
        <view class="nav-right press-feedback" @click="handlePublish">
          <text class="nav-publish">发布</text>
        </view>
      </view>
    </view>

    <scroll-view class="scroll" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view class="content">
        <!-- ── 标题区 ── -->
        <view class="title-section">
          <view class="title-row">
            <DoodleIcon name="sparkle" color="#E8855A" :size="40" />
            <text v-if="!editingTitle" class="diary-title" @click="startEditTitle">{{ title }}</text>
            <input
              v-else
              v-model="editTitle"
              class="title-input"
              :focus="editingTitle"
              @blur="confirmEditTitle"
              @confirm="confirmEditTitle"
            />
          </view>
          <text class="diary-meta">{{ diaryDate }} · 多云 18°C</text>
        </view>

        <!-- ── 编辑计数 ── -->
        <view class="edit-count-row">
          <DoodleIcon name="pen" color="#AE9D92" :size="24" />
          <text class="edit-count-text">剩余修改次数：{{ remainingEdits }}/{{ maxEdits }}</text>
        </view>

        <!-- ── 正文编辑区 ── -->
        <view class="body-section">
          <textarea
            v-model="content"
            class="diary-body"
            :disabled="remainingEdits <= 0"
            :placeholder="remainingEdits <= 0 ? '修改次数已用完' : ''"
            :placeholder-style="'color: #D4C4B8; font-size: 32rpx;'"
            :auto-height="true"
            maxlength="-1"
            @input="onContentChange"
          />
          <view v-if="remainingEdits <= 0" class="no-edit-tip">
            <text class="no-edit-text">修改次数已用完，内容已锁定</text>
          </view>
        </view>

        <!-- 保存按钮 -->
        <view v-if="contentChanged && remainingEdits > 0" class="save-row">
          <view class="save-btn press-feedback" :class="{ saving: saving }" @click="handleSave">
            <text class="save-text">{{ saving ? '保存中...' : '保存修改' }}</text>
          </view>
        </view>

        <!-- ── 情绪趋势 ── -->
        <view class="emotion-section">
          <view class="section-divider">
            <view class="divider-line" />
            <text class="divider-label">今日情绪</text>
            <view class="divider-line" />
          </view>

          <view class="emotion-summary">
            <text class="dominant-emoji">{{ dominantEmoji }}</text>
            <view class="dominant-info">
              <text class="dominant-label">主要情绪：{{ dominantLabel }}</text>
              <text class="dominant-sub">基于今日 {{ trend.length }} 条记录</text>
            </view>
          </view>

          <!-- 简易情绪趋势图 -->
          <view class="emotion-chart">
            <view v-for="(point, i) in trend" :key="i" class="chart-col">
              <view class="chart-bar-wrap">
                <view
                  class="chart-bar"
                  :style="{ height: (point.score * 80) + 'rpx', background: getEmotionColor(point.label) }"
                />
              </view>
              <text class="chart-label">{{ point.hour }}:00</text>
              <text class="chart-emoji">{{ getEmotionEmoji(point.label) }}</text>
            </view>
          </view>
        </view>

        <!-- ── 衍生内容按钮 ── -->
        <view class="derivative-section">
          <view class="section-divider">
            <view class="divider-line" />
            <text class="divider-label">创作衍生</text>
            <view class="divider-line" />
          </view>

          <view class="derivative-grid">
            <view class="deriv-btn press-feedback" @click="handleDerivative('comic')">
              <text class="deriv-icon">🎨</text>
              <text class="deriv-label">漫画</text>
              <text class="deriv-sub">AI 绘制</text>
            </view>
            <view class="deriv-btn press-feedback" @click="handleDerivative('novel')">
              <text class="deriv-icon">📖</text>
              <text class="deriv-label">小说</text>
              <text class="deriv-sub">AI 续写</text>
            </view>
            <view class="deriv-btn press-feedback" @click="handleDerivative('share_card')">
              <text class="deriv-icon">📤</text>
              <text class="deriv-label">分享</text>
              <text class="deriv-sub">生成卡片</text>
            </view>
          </view>
        </view>

        <view class="bottom-spacer" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { updateDiary, generateDerivative } from '@/services/api/diary'

const statusBarHeight = ref(20)
const scrollHeight = ref(600)

// 从路由参数获取
const diaryId = ref('')
const title = ref('春日食堂小确幸')
const editTitle = ref('')
const editingTitle = ref(false)
const content = ref('')
const editCount = ref(0)
const maxEdits = ref(3)
const contentChanged = ref(false)
const saving = ref(false)

const diaryDate = computed(() => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}年${m}月${day}日`
})

const remainingEdits = computed(() => Math.max(0, maxEdits.value - editCount.value))

// 情绪趋势数据（Mock）
const trend = ref([
  { hour: 9, label: '开心', score: 0.85 },
  { hour: 12, label: '幸福', score: 0.92 },
  { hour: 15, label: '平静', score: 0.70 },
  { hour: 18, label: '疲惫', score: 0.65 },
  { hour: 21, label: '满足', score: 0.80 },
])

const dominantLabel = computed(() => {
  if (trend.value.length === 0) return '开心'
  const sorted = [...trend.value].sort((a, b) => b.score - a.score)
  return sorted[0].label
})

const dominantEmoji = computed(() => getEmotionEmoji(dominantLabel.value))

function getEmotionEmoji(label: string): string {
  const map: Record<string, string> = {
    '开心': '😊', '幸福': '🥰', '平静': '😌', '疲惫': '😴',
    '满足': '😎', '难过': '😢', '烦躁': '😤', '兴奋': '🤩',
  }
  return map[label] ?? '😊'
}

function getEmotionColor(label: string): string {
  const map: Record<string, string> = {
    '开心': '#E8855A', '幸福': '#F2B49B', '平静': '#6B8EC4', '疲惫': '#AE9D92',
    '满足': '#5BBF8E', '难过': '#6B8EC4', '烦躁': '#D4645C', '兴奋': '#C8A86B',
  }
  return map[label] ?? '#E8855A'
}

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight ?? 20
  scrollHeight.value = info.windowHeight - statusBarHeight.value - 44

  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const options = (current as any)?.options ?? {}

  if (options.id) diaryId.value = options.id
  if (options.title) title.value = decodeURIComponent(options.title)
  if (options.content) content.value = decodeURIComponent(options.content)
  if (options.editCount) editCount.value = Number(options.editCount)
  if (options.maxEdits) maxEdits.value = Number(options.maxEdits)
})

function startEditTitle() {
  editTitle.value = title.value
  editingTitle.value = true
}

function confirmEditTitle() {
  if (editTitle.value.trim()) {
    title.value = editTitle.value.trim()
    contentChanged.value = true
  }
  editingTitle.value = false
}

function onContentChange() {
  contentChanged.value = true
}

async function handleSave() {
  if (!contentChanged.value || saving.value) return
  if (remainingEdits.value <= 0) return

  saving.value = true
  try {
    await updateDiary(diaryId.value || '1', content.value)
    editCount.value++
    contentChanged.value = false
    uni.showToast({ title: '保存成功 ✓', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function handleDerivative(type: 'comic' | 'novel' | 'share_card') {
  uni.showLoading({ title: 'AI 生成中...', mask: true })
  try {
    await generateDerivative(diaryId.value || '1', type)
    uni.hideLoading()
    const labels: Record<string, string> = { comic: '漫画', novel: '小说', share_card: '分享卡片' }
    uni.showToast({ title: `${labels[type]}生成成功 ✨`, icon: 'success' })

    if (type === 'comic') {
      uni.navigateTo({ url: `/pages/diary/comic?id=${diaryId.value}` })
    } else if (type === 'share_card') {
      uni.navigateTo({ url: `/pages/diary/share-card?id=${diaryId.value}` })
    }
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '生成失败，请重试', icon: 'none' })
  }
}

function handlePublish() {
  uni.showModal({
    title: '发布日记',
    content: '确定发布这篇日记吗？',
    confirmText: '发布',
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '日记已发布 ✓', icon: 'success' })
        setTimeout(() => {
          // Navigate back to home
          uni.reLaunch({ url: '/pages/index/index' })
        }, 1000)
      }
    }
  })
}

function goBack() {
  if (contentChanged.value) {
    uni.showModal({
      title: '提示',
      content: '有未保存的修改，确定退出吗？',
      success: (res) => {
        if (res.confirm) uni.navigateBack()
      }
    })
  } else {
    uni.navigateBack()
  }
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

/* ── 顶栏 ── */
.preview-navbar {
  background: #FDF8F3;
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
}

.nav-left, .nav-right {
  width: 120rpx;
  display: flex;
  align-items: center;
}

.nav-left { justify-content: flex-start; }
.nav-right { justify-content: flex-end; }

.nav-back {
  font-size: 44rpx;
  color: #2C1F14;
  cursor: pointer;
  &:active { opacity: 0.6; }
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2C1F14;
  flex: 1;
  text-align: center;
}

.nav-publish {
  font-size: 30rpx;
  color: #E8855A;
  font-weight: 700;
  cursor: pointer;
  &:active { opacity: 0.7; }
}

/* ── 内容区 ── */
.scroll {}

.content {
  padding: 24rpx 32rpx;
}

/* 标题区 */
.title-section {
  background: #FFFFFF;
  border-radius: 20rpx 24rpx 16rpx 22rpx;
  padding: 32rpx 32rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.diary-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2C1F14;
  flex: 1;
  line-height: 1.3;
}

.title-input {
  flex: 1;
  font-size: 40rpx;
  font-weight: 700;
  color: #2C1F14;
  border-bottom: 2rpx solid #E8855A;
  padding-bottom: 4rpx;
}

.diary-meta {
  font-size: 26rpx;
  color: #AE9D92;
}

/* 编辑计数 */
.edit-count-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 0;
  margin-bottom: 8rpx;
}

.edit-count-text {
  font-size: 24rpx;
  color: #AE9D92;
}

/* 正文 */
.body-section {
  background: #FFFFFF;
  border-radius: 16rpx 20rpx 16rpx 18rpx;
  padding: 28rpx 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  margin-bottom: 16rpx;
}

.diary-body {
  width: 100%;
  min-height: 400rpx;
  font-size: 32rpx;
  color: #4A3628;
  line-height: 1.8;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
}

.no-edit-tip {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #FDF0E8;
  border-radius: 12rpx;
  text-align: center;
}

.no-edit-text {
  font-size: 26rpx;
  color: #E8855A;
}

/* 保存行 */
.save-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16rpx;
}

.save-btn {
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 20rpx;
  padding: 16rpx 40rpx;
  &:active { opacity: 0.85; }

  &.saving {
    background: #D4C4B8;
  }
}

.save-text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* 情绪区 */
.emotion-section {
  margin-bottom: 16rpx;
}

.section-divider {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent 6rpx,
    #D4C4B8 6rpx,
    #D4C4B8 12rpx
  );
}

.divider-label {
  font-size: 24rpx;
  color: #AE9D92;
  white-space: nowrap;
  padding: 0 4rpx;
}

.emotion-summary {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.dominant-emoji {
  font-size: 64rpx;
}

.dominant-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.dominant-label {
  font-size: 30rpx;
  color: #2C1F14;
  font-weight: 600;
}

.dominant-sub {
  font-size: 24rpx;
  color: #AE9D92;
}

/* 情绪图 */
.emotion-chart {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 8rpx;
}

.chart-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.chart-bar-wrap {
  height: 80rpx;
  display: flex;
  align-items: flex-end;
  width: 40rpx;
}

.chart-bar {
  width: 100%;
  border-radius: 6rpx 6rpx 0 0;
  min-height: 8rpx;
  transition: height 0.3s ease;
}

.chart-label {
  font-size: 18rpx;
  color: #AE9D92;
  white-space: nowrap;
}

.chart-emoji {
  font-size: 28rpx;
}

/* 衍生内容 */
.derivative-section {
  margin-bottom: 16rpx;
}

.derivative-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.deriv-btn {
  background: #FFFFFF;
  border-radius: 16rpx 20rpx 14rpx 18rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  cursor: pointer;
  transition: transform 0.15s;
  &:active { transform: scale(0.96); }
}

.deriv-icon {
  font-size: 48rpx;
}

.deriv-label {
  font-size: 28rpx;
  color: #2C1F14;
  font-weight: 600;
}

.deriv-sub {
  font-size: 22rpx;
  color: #AE9D92;
}

.bottom-spacer {
  height: 60rpx;
}
</style>
