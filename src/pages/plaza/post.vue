<template>
  <view class="page" :style="{ background: '#FDF8F3' }">
    <!-- 导航栏占位 -->
    <view :style="{ height: navBarHeight + 'px' }" />

    <!-- 自定义导航栏 -->
    <CustomNavBar
      title="发帖"
      leftIcon="back"
      rightText="发布"
      @rightClick="handlePublish"
    />

    <scroll-view scroll-y class="content" :style="{ paddingBottom: '40rpx' }">
      <!-- 类型选择 -->
      <view class="section">
        <view class="type-row">
          <view
            v-for="t in postTypes"
            :key="t.value"
            class="type-btn"
            :style="selectedType === t.value ? { background: t.color + '22', borderColor: t.color } : {}"
            @click="selectedType = t.value"
          >
            <text class="type-emoji">{{ t.emoji }}</text>
            <text class="type-label" :style="selectedType === t.value ? { color: t.color } : {}">{{ t.label }}</text>
          </view>
        </view>
      </view>

      <!-- 正文输入 -->
      <view class="section">
        <textarea
          v-model="content"
          class="content-input"
          placeholder="说点什么..."
          placeholder-class="input-placeholder"
          :auto-height="true"
          :show-confirm-bar="false"
        />
      </view>

      <!-- 图片区 -->
      <view class="section">
        <scroll-view scroll-x class="image-scroll">
          <view class="image-row">
            <view
              v-for="(img, idx) in images"
              :key="idx"
              class="image-item"
            >
              <image :src="img" class="preview-image" mode="aspectFill" />
              <view class="image-delete" @click="removeImage(idx)">
                <text class="image-delete-text">×</text>
              </view>
            </view>
            <view v-if="images.length < 9" class="image-add" @click="chooseImage">
              <text class="image-add-icon">➕</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 位置 -->
      <view class="section">
        <view class="row-item" @click="handleLocationClick">
          <text class="row-label">📍 {{ location }}</text>
          <text class="row-arrow">›</text>
        </view>
      </view>

      <!-- 标签 -->
      <view class="section">
        <view class="tag-section">
          <view class="tag-chips">
            <view
              v-for="(tag, idx) in tags"
              :key="idx"
              class="tag-chip"
            >
              <text class="tag-text">#{{ tag }}</text>
              <text class="tag-remove" @click="removeTag(idx)">×</text>
            </view>
          </view>
          <view class="tag-input-row">
            <text class="tag-prefix">#</text>
            <input
              v-model="tagInput"
              class="tag-input"
              placeholder="添加标签，回车确认"
              placeholder-class="input-placeholder"
              confirm-type="done"
              @confirm="addTag"
            />
          </view>
        </view>
      </view>

      <!-- 选项 -->
      <view class="section">
        <view class="option-item" @click="allowAgentReply = !allowAgentReply">
          <view class="checkbox" :class="{ checked: allowAgentReply }">
            <text v-if="allowAgentReply" class="checkbox-mark">✓</text>
          </view>
          <text class="option-label">允许分身代我回复评论</text>
        </view>
        <view class="option-item" @click="schoolOnly = !schoolOnly">
          <view class="checkbox" :class="{ checked: schoolOnly }">
            <text v-if="schoolOnly" class="checkbox-mark">✓</text>
          </view>
          <text class="option-label">仅限本校可见</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import { createPost } from '@/services/api/plaza'
import type { PlazaPost } from '@/services/api/plaza'

// 导航栏高度
const navBarHeight = ref(64)
onMounted(() => {
  const info = uni.getSystemInfoSync()
  navBarHeight.value = (info.statusBarHeight ?? 20) + 44
})

// 帖子类型
const postTypes: Array<{
  value: PlazaPost['type']
  emoji: string
  label: string
  color: string
}> = [
  { value: 'buddy', emoji: '🏃', label: '找搭子', color: '#6B8EB4' },
  { value: 'help', emoji: '🆘', label: '求助', color: '#E8855A' },
  { value: 'share', emoji: '📷', label: '分享', color: '#5BBF8E' },
  { value: 'dating', emoji: '💕', label: '恋爱', color: '#D4728A' },
]

const selectedType = ref<PlazaPost['type']>('buddy')
const content = ref('')
const images = ref<string[]>([])
const location = ref('南开大学')
const tagInput = ref('')
const tags = ref<string[]>([])
const allowAgentReply = ref(false)
const schoolOnly = ref(false)

// 选择图片
function chooseImage() {
  const remaining = 9 - images.value.length
  uni.chooseImage({
    count: remaining,
    sizeType: ['original', 'compressed'],
    sourceType: ['album', 'camera'],
    success(res) {
      images.value.push(...res.tempFilePaths)
    },
  })
}

function removeImage(idx: number) {
  images.value.splice(idx, 1)
}

// 位置
function handleLocationClick() {
  uni.showActionSheet({
    itemList: ['南开大学', '天津大学', '自定义'],
    success(res) {
      if (res.tapIndex === 2) {
        uni.showModal({
          title: '输入位置',
          editable: true,
          placeholderText: '请输入位置',
          success(r) {
            if (r.confirm && r.content) {
              location.value = r.content
            }
          },
        })
      } else {
        location.value = ['南开大学', '天津大学'][res.tapIndex]
      }
    },
  })
}

// 标签
function addTag() {
  const t = tagInput.value.trim().replace(/^#/, '')
  if (t && !tags.value.includes(t)) {
    tags.value.push(t)
  }
  tagInput.value = ''
}

function removeTag(idx: number) {
  tags.value.splice(idx, 1)
}

// 发布
async function handlePublish() {
  if (!content.value.trim()) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }
  try {
    uni.showLoading({ title: '发布中...' })
    await createPost({
      type: selectedType.value,
      content: content.value,
      images: images.value,
      location: location.value,
      tags: tags.value,
      allowAgentReply: allowAgentReply.value,
      schoolOnly: schoolOnly.value,
    })
    uni.hideLoading()
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '发布失败，请重试', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #FDF8F3;
}

.content {
  flex: 1;
}

.section {
  padding: 24rpx 32rpx;
  border-bottom: 1px solid #F0E8E0;
}

/* 类型选择 */
.type-row {
  display: flex;
  gap: 16rpx;
}

.type-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
  border-radius: 16rpx;
  border: 1px solid #E8DDD4;
  background: #FEFAF7;
  transition: all 0.2s;
}

.type-emoji {
  font-size: 36rpx;
  margin-bottom: 8rpx;
}

.type-label {
  font-size: 22rpx;
  color: #4A3628;
}

/* 正文 */
.content-input {
  width: 100%;
  min-height: 300rpx;
  font-size: 30rpx;
  color: #2C1F14;
  line-height: 1.7;
  background: transparent;
  box-sizing: border-box;
}

.input-placeholder {
  color: #AE9D92;
}

/* 图片 */
.image-scroll {
  width: 100%;
  white-space: nowrap;
}

.image-row {
  display: flex;
  gap: 16rpx;
  padding-bottom: 8rpx;
}

.image-item {
  position: relative;
  flex-shrink: 0;
}

.preview-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  display: block;
}

.image-delete {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-delete-text {
  color: #fff;
  font-size: 28rpx;
  line-height: 1;
}

.image-add {
  flex-shrink: 0;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  border: 1px dashed #C8B8AE;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FEFAF7;
}

.image-add-icon {
  font-size: 44rpx;
}

/* 位置 */
.row-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row-label {
  font-size: 28rpx;
  color: #4A3628;
}

.row-arrow {
  font-size: 36rpx;
  color: #AE9D92;
}

/* 标签 */
.tag-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 20rpx;
  border-radius: 40rpx;
  background: #F0E8E0;
}

.tag-text {
  font-size: 26rpx;
  color: #4A3628;
}

.tag-remove {
  font-size: 28rpx;
  color: #AE9D92;
  line-height: 1;
}

.tag-input-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  border-bottom: 1px solid #E8DDD4;
  padding-bottom: 8rpx;
}

.tag-prefix {
  font-size: 28rpx;
  color: #AE9D92;
}

.tag-input {
  flex: 1;
  font-size: 28rpx;
  color: #2C1F14;
  height: 56rpx;
}

/* 选项 */
.option-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 0;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  border: 1px solid #C8B8AE;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #FEFAF7;

  &.checked {
    background: #E8855A;
    border-color: #E8855A;
  }
}

.checkbox-mark {
  font-size: 22rpx;
  color: #fff;
  line-height: 1;
}

.option-label {
  font-size: 28rpx;
  color: #4A3628;
}
</style>
