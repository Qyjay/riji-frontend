<template>
  <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="nav-bar-content">
      <!-- 左侧 -->
      <view class="nav-left" @click="handleLeftClick">
        <image
          v-if="leftIcon === 'avatar'"
          class="nav-avatar"
          src="https://picsum.photos/seed/navavatar/80/80"
          mode="aspectFill"
        />
        <text v-else-if="leftIcon === 'back'" class="nav-back">←</text>
        <view v-else />
      </view>

      <!-- 中间标题 -->
      <text class="nav-title">{{ title }}</text>

      <!-- 右侧 -->
      <view class="nav-right" @click="emit('rightClick')">
        <slot name="right">
          <text v-if="rightText" class="nav-right-text">{{ rightText }}</text>
          <text v-else-if="rightIcon" class="nav-right-icon">{{ rightIcon }}</text>
          <view v-else />
        </slot>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  leftIcon?: 'avatar' | 'back' | 'none'
  rightIcon?: string
  rightText?: string
}>(), {
  leftIcon: 'none',
})

const emit = defineEmits<{
  leftClick: []
  rightClick: []
}>()

const statusBarHeight = ref(20)

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight ?? 20
})

// 导出总高度（px），方便父组件计算占位
const totalHeightPx = computed(() => statusBarHeight.value + 44) // 44px ≈ 88rpx on 2x

defineExpose({ statusBarHeight, totalHeightPx })

function handleLeftClick() {
  if (props.leftIcon === 'back') {
    uni.navigateBack()
  } else {
    emit('leftClick')
  }
}
</script>

<style lang="scss" scoped>
.nav-bar {
  background: #FDF8F3;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.nav-bar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
}

.nav-left,
.nav-right {
  width: 120rpx;
  display: flex;
  align-items: center;
}

.nav-left {
  justify-content: flex-start;
}

.nav-right {
  justify-content: flex-end;
}

.nav-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 4rpx solid #E8855A;
}

.nav-back {
  font-size: 44rpx;
  color: #2C1F14;
  line-height: 1;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2C1F14;
  flex: 1;
  text-align: center;
}

.nav-right-text {
  font-size: 30rpx;
  color: #E8855A;
  font-weight: 500;
}

.nav-right-icon {
  font-size: 40rpx;
}
</style>
