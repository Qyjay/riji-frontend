<template>
  <view class="page">

    <!-- ── 顶栏 ── -->
    <CustomNavBar title="编辑资料" leftIcon="back" />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <!-- ── 内容滚动区 ── -->
    <scroll-view class="page-scroll" scroll-y :style="{ height: scrollHeight + 'px' }">

      <!-- 头像区域 -->
      <view class="avatar-section">
        <view class="avatar-deco-bg" />
        <view class="avatar-wrap" @click="chooseAvatar">
          <image
            class="avatar-img"
            :src="form.avatar || '/static/brand/logo-d-mascot.png'"
            mode="aspectFill"
          />
          <view class="avatar-camera-badge">
            <DoodleIcon name="camera" :size="32" color="#FFFFFF" />
          </view>
        </view>
        <text class="avatar-hint">点击更换头像</text>
      </view>

      <!-- 表单区域 -->
      <view class="form-section">

        <!-- 昵称 -->
        <view class="form-card">
          <view class="form-row">
            <view class="form-label-wrap">
              <DoodleIcon name="user" :size="36" color="#E8855A" />
              <text class="form-label">昵称</text>
            </view>
            <input
              class="form-input"
              v-model="form.name"
              placeholder="请输入昵称"
              placeholder-class="form-placeholder"
              maxlength="20"
            />
          </view>
        </view>

        <!-- 个性签名 -->
        <view class="form-card">
          <view class="form-row form-row-top">
            <view class="form-label-wrap">
              <DoodleIcon name="pen" :size="36" color="#5BBF8E" />
              <text class="form-label">签名</text>
            </view>
            <textarea
              class="form-textarea"
              v-model="form.bio"
              placeholder="写一句话介绍自己..."
              placeholder-class="form-placeholder"
              maxlength="60"
              :auto-height="false"
            />
          </view>
          <text class="textarea-count">{{ form.bio.length }}/60</text>
        </view>

        <!-- 学校 -->
        <view class="form-card">
          <view class="form-row">
            <view class="form-label-wrap">
              <DoodleIcon name="star" :size="36" color="#6B8EC4" />
              <text class="form-label">学校</text>
            </view>
            <input
              class="form-input"
              v-model="form.school"
              placeholder="请输入学校名称"
              placeholder-class="form-placeholder"
              maxlength="30"
            />
          </view>
        </view>

        <!-- 专业 -->
        <view class="form-card">
          <view class="form-row">
            <view class="form-label-wrap">
              <DoodleIcon name="book" :size="36" color="#E8C44E" />
              <text class="form-label">专业</text>
            </view>
            <input
              class="form-input"
              v-model="form.major"
              placeholder="请输入专业名称"
              placeholder-class="form-placeholder"
              maxlength="30"
            />
          </view>
        </view>

        <!-- 年级 -->
        <view class="form-card">
          <view class="form-row" @click="showGradePicker = true">
            <view class="form-label-wrap">
              <DoodleIcon name="chart" :size="36" color="#AE9D92" />
              <text class="form-label">年级</text>
            </view>
            <view class="form-picker-row">
              <text class="form-picker-value" :class="{ placeholder: !form.grade }">
                {{ form.grade || '请选择年级' }}
              </text>
              <text class="form-picker-arrow">›</text>
            </view>
          </view>
        </view>

        <!-- 年级选择弹层 -->
        <view v-if="showGradePicker" class="picker-mask" @click="showGradePicker = false">
          <view class="picker-sheet" @click.stop>
            <view class="picker-header">
              <text class="picker-title">选择年级</text>
              <view class="picker-close" @click="showGradePicker = false">
                <DoodleIcon name="cross" :size="36" color="#857268" />
              </view>
            </view>
            <view class="picker-list">
              <view
                v-for="grade in gradeOptions"
                :key="grade"
                class="picker-item"
                :class="{ active: form.grade === grade }"
                @click="selectGrade(grade)"
              >
                <text class="picker-item-text">{{ grade }}</text>
                <DoodleIcon v-if="form.grade === grade" name="check" :size="36" color="#E8855A" />
              </view>
            </view>
          </view>
        </view>

      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- ── 底部保存按钮 ── -->
    <view class="save-bar" :style="{ paddingBottom: safeAreaBottom + 'px' }">
      <view class="save-btn" :class="{ loading: saving }" @click="handleSave">
        <DoodleIcon v-if="!saving" name="check" :size="40" color="#FFFFFF" />
        <text class="save-btn-text">{{ saving ? '保存中...' : '保存资料' }}</text>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getUserProfile, updateUserProfile } from '@/services/api/user'
import DoodleIcon from '@/components/DoodleIcon.vue'
import CustomNavBar from '@/components/CustomNavBar.vue'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
const safeAreaBottom = ref(0)
const saving = ref(false)
const showGradePicker = ref(false)

const gradeOptions = ['大一', '大二', '大三', '大四', '研一', '研二', '研三']

const form = reactive({
  name: '',
  bio: '',
  school: '',
  major: '',
  grade: '',
  avatar: '',
})

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  const statusBarH = info.statusBarHeight ?? 20
  navPlaceholderHeight.value = statusBarH + 44
  safeAreaBottom.value = info.safeAreaInsets?.bottom ?? 0
  // Reserve space for save bar (88rpx ≈ 44px + safe area)
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 44 - safeAreaBottom.value - 10

  try {
    const profile = await getUserProfile()
    form.name = profile.name
    form.school = profile.school
    form.major = profile.major
    form.avatar = profile.avatar
    form.bio = ''
    form.grade = '大三'
  } catch {
    // keep default form values
  }
})

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success(res) {
      form.avatar = res.tempFilePaths[0]
    },
  })
}

function selectGrade(grade: string) {
  form.grade = grade
  showGradePicker.value = false
}

async function handleSave() {
  if (saving.value) return
  if (!form.name.trim()) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await updateUserProfile({
      name: form.name.trim(),
      school: form.school.trim(),
      major: form.major.trim(),
      avatar: form.avatar,
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1200)
  } catch {
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {
  width: 100%;
}

.page-scroll {
  -webkit-overflow-scrolling: touch;
}

/* ── 头像区域 ── */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56rpx 0 48rpx;
  position: relative;
}

.avatar-deco-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 220rpx;
  background: linear-gradient(180deg, rgba(232,133,90,0.12) 0%, transparent 100%);
  border-radius: 0 0 60rpx 60rpx;
}

.avatar-wrap {
  position: relative;
  width: 192rpx;
  height: 192rpx;
  border-radius: 19998rpx;
  box-shadow: 0 6px 24px rgba(232, 133, 90, 0.22);
  cursor: pointer;
  &:active { opacity: 0.85; }
}

.avatar-img {
  width: 192rpx;
  height: 192rpx;
  border-radius: 19998rpx;
  border: 6rpx solid #FFFFFF;
  background: #F5EDE4;
}

.avatar-camera-badge {
  position: absolute;
  bottom: 4rpx;
  right: 4rpx;
  width: 60rpx;
  height: 60rpx;
  background: #E8855A;
  border-radius: 19998rpx;
  border: 4rpx solid #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-hint {
  margin-top: 20rpx;
  font-size: 24rpx;
  color: #AE9D92;
}

/* ── 表单区域 ── */
.form-section {
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.form-card {
  background: #FFFFFF;
  border-radius: 28rpx;
  padding: 0 32rpx;
  box-shadow: 0 1px 6px rgba(44, 31, 20, 0.06);
  overflow: hidden;
}

.form-row {
  display: flex;
  align-items: center;
  min-height: 104rpx;
  gap: 20rpx;
}

.form-row-top {
  align-items: flex-start;
  padding-top: 32rpx;
}

.form-label-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
  width: 120rpx;
}

.form-label {
  font-size: 28rpx;
  color: #2C1F14;
  font-weight: 500;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #2C1F14;
  text-align: right;
  height: 104rpx;
  line-height: 104rpx;
}

.form-textarea {
  flex: 1;
  font-size: 28rpx;
  color: #2C1F14;
  text-align: right;
  height: 120rpx;
  line-height: 1.5;
  padding-top: 8rpx;
}

.form-placeholder {
  color: #C4B5AC;
}

.textarea-count {
  font-size: 22rpx;
  color: #C4B5AC;
  text-align: right;
  padding-bottom: 20rpx;
  display: block;
}

.form-picker-row {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
}

.form-picker-value {
  font-size: 28rpx;
  color: #2C1F14;
  &.placeholder { color: #C4B5AC; }
}

.form-picker-arrow {
  font-size: 36rpx;
  color: #AE9D92;
}

/* ── 年级选择弹层 ── */
.picker-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(44, 31, 20, 0.38);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.picker-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 40rpx 40rpx 0 0;
  padding-bottom: 60rpx;
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 36rpx 40rpx 28rpx;
  border-bottom: 1px solid rgba(44, 31, 20, 0.06);
}

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C1F14;
}

.picker-close {
  padding: 8rpx;
  cursor: pointer;
}

.picker-list {
  padding: 16rpx 0;
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 40rpx;
  cursor: pointer;
  &:active { background: rgba(232, 133, 90, 0.06); }
  &.active { background: rgba(232, 133, 90, 0.06); }
}

.picker-item-text {
  font-size: 30rpx;
  color: #2C1F14;
}

.picker-item.active .picker-item-text {
  color: #E8855A;
  font-weight: 600;
}

/* ── 底部保存栏 ── */
.save-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FDF8F3;
  padding: 16rpx 32rpx 20rpx;
  border-top: 1px solid rgba(44, 31, 20, 0.06);
  box-shadow: 0 -4px 16px rgba(44, 31, 20, 0.06);
}

.save-btn {
  background: linear-gradient(135deg, #E8855A, #F0A882);
  border-radius: 28rpx;
  padding: 28rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  box-shadow: 0 4px 16px rgba(232, 133, 90, 0.36);
  cursor: pointer;
  &:active { opacity: 0.88; }
  &.loading { opacity: 0.7; }
}

.save-btn-text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.bottom-spacer { height: 80rpx; }
</style>
