<template>
  <view class="diary-card" @click="handleClick">
    <!-- 顶部：情绪 + 时间 + 更多 -->
    <view class="card-top">
      <view class="top-left">
        <text class="emotion-emoji">{{ diary.emotion.emoji }}</text>
        <text class="time-text">{{ formatTime(diary.createdAt) }}</text>
      </view>
      <view class="more-btn" @click.stop="handleMore">
        <text class="more-icon">···</text>
      </view>
    </view>

    <!-- 照片宫格 -->
    <view v-if="displayImages.length > 0" class="photo-grid" :class="gridClass">
      <view
        v-for="(img, i) in displayImages"
        :key="i"
        class="photo-cell"
        :class="cellClass(i)"
      >
        <image class="photo-img" :src="img" mode="aspectFill" />
        <!-- 超过9张时最后一格显示 +N -->
        <view v-if="i === displayImages.length - 1 && overflowCount > 0" class="photo-overflow">
          <text class="photo-overflow-text">+{{ overflowCount }}</text>
        </view>
      </view>
    </view>

    <!-- 正文预览（3行截断） -->
    <text v-if="diary.content" class="content-text">{{ diary.content }}</text>

    <!-- 标签组 -->
    <view v-if="diary.tags && diary.tags.length > 0" class="tags-row">
      <view
        v-for="tag in diary.tags"
        :key="tag"
        class="tag-chip"
        @click.stop="emit('tagClick', tag)"
      >
        <text class="tag-text">#{{ tag }}</text>
      </view>
    </view>

    <!-- 虚线分隔 -->
    <view class="divider" />

    <!-- 操作栏：只保留分享 -->
    <view class="actions-row">
      <view class="action-item active" @click.stop="emit('actionClick', { action: 'share', diaryId: diary.id })">
        <text class="action-icon">📤</text>
        <text class="action-text">分享</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Diary } from '@/services/api/diary'

const props = defineProps<{
  diary: Diary
}>()

const emit = defineEmits<{
  click: [id: string]
  tagClick: [tag: string]
  actionClick: [payload: { action: string; diaryId: string }]
}>()

function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// 最多显示9张，超出在第9张上叠加 +N
const maxShow = 9
const displayImages = computed(() => {
  const imgs = props.diary.images ?? []
  return imgs.slice(0, maxShow)
})

const overflowCount = computed(() => {
  const total = props.diary.images?.length ?? 0
  return total > maxShow ? total - maxShow : 0
})

const gridClass = computed(() => {
  const len = displayImages.value.length
  if (len === 1) return 'grid-1'
  if (len === 2) return 'grid-2'
  if (len <= 4) return 'grid-4'
  if (len <= 6) return 'grid-6'
  return 'grid-9'
})

function cellClass(index: number): string {
  const len = displayImages.value.length
  // 3张图的特殊处理：第3张在第2行居中? 不，直接用2x2四宫格空一格
  // 简单处理：3张和4张都用2x2
  return ''
}

function handleClick() {
  emit('click', props.diary.id)
}

function handleMore() {
  uni.showActionSheet({
    itemList: ['编辑日记', '删除日记', '标记重要'],
    success: () => {
      uni.showToast({ title: '操作成功', icon: 'none' })
    }
  })
}
</script>

<style lang="scss" scoped>
.diary-card {
  background: #FFFFFF;
  border-radius: 24rpx 28rpx 20rpx 26rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 24rpx;
  margin: 0 24rpx 24rpx;
}

/* 顶部 */
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.top-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.emotion-emoji {
  font-size: 32rpx;
}

.time-text {
  font-size: 28rpx;
  color: #AE9D92;
}

.more-btn {
  padding: 4rpx 8rpx;
  &:active { opacity: 0.6; }
}

.more-icon {
  font-size: 28rpx;
  color: #AE9D92;
  letter-spacing: -2rpx;
}

/* ── 照片宫格 ── */
.photo-grid {
  margin-bottom: 16rpx;
  border-radius: 16rpx;
  overflow: hidden;
  display: grid;
  gap: 6rpx;
}

.photo-cell {
  position: relative;
  overflow: hidden;
  border-radius: 8rpx;
}

.photo-img {
  width: 100%;
  height: 100%;
  display: block;
}

.photo-overflow {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-overflow-text {
  font-size: 40rpx;
  color: #FFFFFF;
  font-weight: 700;
}

/* 1张：满宽 */
.grid-1 {
  grid-template-columns: 1fr;
}
.grid-1 .photo-cell {
  height: 320rpx;
  border-radius: 16rpx;
}

/* 2张：左右各半 */
.grid-2 {
  grid-template-columns: 1fr 1fr;
}
.grid-2 .photo-cell {
  height: 220rpx;
}

/* 3-4张：2×2 四宫格 */
.grid-4 {
  grid-template-columns: 1fr 1fr;
}
.grid-4 .photo-cell {
  height: 200rpx;
}

/* 5-6张：3×2 六宫格 */
.grid-6 {
  grid-template-columns: 1fr 1fr 1fr;
}
.grid-6 .photo-cell {
  height: 180rpx;
}

/* 7-9张：3×3 九宫格 */
.grid-9 {
  grid-template-columns: 1fr 1fr 1fr;
}
.grid-9 .photo-cell {
  height: 160rpx;
}

/* 正文 */
.content-text {
  display: block;
  font-size: 30rpx;
  color: #4A3628;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  margin-bottom: 12rpx;
}

/* 标签 */
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.tag-chip {
  background: #FDF0E8;
  border-radius: 20rpx;
  padding: 4rpx 16rpx;
  &:active { opacity: 0.7; }
}

.tag-text {
  font-size: 24rpx;
  color: #E8855A;
}

/* 虚线分隔 */
.divider {
  height: 1rpx;
  background: repeating-linear-gradient(
    to right,
    #D4C4B8 0,
    #D4C4B8 6rpx,
    transparent 6rpx,
    transparent 12rpx
  );
  margin: 12rpx 0;
}

/* 操作栏 */
.actions-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  opacity: 0.45;
  transition: opacity 0.15s;

  &.active {
    opacity: 1;
  }

  &:active { opacity: 0.7; }
}

.action-icon {
  font-size: 26rpx;
}

.action-text {
  font-size: 26rpx;
  color: #AE9D92;
}
</style>
