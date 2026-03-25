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

    <!-- 照片网格 -->
    <view v-if="diary.images && diary.images.length > 0" class="photo-grid" :class="photoGridClass">
      <!-- 1张 -->
      <template v-if="diary.images.length === 1">
        <image class="photo-item photo-single" :src="diary.images[0]" mode="aspectFill" />
      </template>
      <!-- 2张 -->
      <template v-else-if="diary.images.length === 2">
        <image v-for="(img, i) in diary.images" :key="i" class="photo-item photo-double" :src="img" mode="aspectFill" />
      </template>
      <!-- 3张：左1大右2小 -->
      <template v-else-if="diary.images.length === 3">
        <image class="photo-item photo-triple-main" :src="diary.images[0]" mode="aspectFill" />
        <view class="photo-triple-right">
          <image class="photo-item photo-triple-sub" :src="diary.images[1]" mode="aspectFill" />
          <image class="photo-item photo-triple-sub" :src="diary.images[2]" mode="aspectFill" />
        </view>
      </template>
      <!-- 4-9张：3列网格 -->
      <template v-else>
        <image v-for="(img, i) in diary.images" :key="i" class="photo-item photo-grid-item" :src="img" mode="aspectFill" />
      </template>
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

    <!-- 操作栏 -->
    <view class="actions-row">
      <view class="action-item" :class="{ active: diary.hasComic }" @click.stop="emit('actionClick', { action: 'comic', diaryId: diary.id })">
        <text class="action-icon">🎬</text>
        <text class="action-text">漫画</text>
      </view>
      <view class="action-item" @click.stop="emit('actionClick', { action: 'share', diaryId: diary.id })">
        <text class="action-icon">📤</text>
        <text class="action-text">分享</text>
      </view>
      <view class="action-item" :class="{ active: diary.hasBGM }" @click.stop="emit('actionClick', { action: 'bgm', diaryId: diary.id })">
        <text class="action-icon">🎵</text>
        <text class="action-text">BGM</text>
      </view>
      <view class="action-item" @click.stop="emit('actionClick', { action: 'tts', diaryId: diary.id })">
        <text class="action-icon">🎙️</text>
        <text class="action-text">朗读</text>
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

const photoGridClass = computed(() => {
  const len = props.diary.images?.length ?? 0
  if (len === 1) return 'grid-1'
  if (len === 2) return 'grid-2'
  if (len === 3) return 'grid-3'
  if (len >= 4) return 'grid-many'
  return ''
})

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
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 24rpx;
  margin-bottom: 24rpx;
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

/* 照片网格 */
.photo-grid {
  margin-bottom: 16rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.photo-item {
  width: 100%;
  height: 100%;
  display: block;
}

/* 1张：满宽 300rpx */
.grid-1 .photo-single {
  width: 100%;
  height: 300rpx;
  border-radius: 16rpx;
}

/* 2张：并排各50% */
.grid-2 {
  display: flex;
  gap: 8rpx;
  height: 200rpx;
}

.grid-2 .photo-double {
  flex: 1;
  border-radius: 12rpx;
}

/* 3张：左2/3 + 右1/3上下 */
.grid-3 {
  display: flex;
  gap: 8rpx;
  height: 300rpx;
}

.grid-3 .photo-triple-main {
  flex: 2;
  border-radius: 12rpx;
}

.photo-triple-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.photo-triple-sub {
  flex: 1;
  border-radius: 12rpx;
}

/* 4-9张：3列网格 */
.grid-many {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8rpx;
  height: 220rpx;
}

.grid-many .photo-grid-item {
  border-radius: 8rpx;
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
  justify-content: space-around;
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
