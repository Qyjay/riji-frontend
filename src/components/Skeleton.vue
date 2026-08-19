<template>
  <view
    class="skeleton-block"
    :class="[`skeleton-${variant}`, { 'skeleton-no-anim': !animated }]"
    :style="blockStyle"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  width?: string | number
  height?: string | number
  radius?: string | number
  variant?: 'rect' | 'text' | 'circle'
  animated?: boolean
  marginBottom?: string | number
}>(), {
  width: '100%',
  height: '32rpx',
  radius: '12rpx',
  variant: 'rect',
  animated: true,
  marginBottom: 0,
})

function toSize(v: string | number): string {
  if (typeof v === 'number') return v + 'rpx'
  return v
}

const blockStyle = computed(() => {
  const radius = props.variant === 'circle' ? '50%' : toSize(props.radius)
  return {
    width: toSize(props.width),
    height: toSize(props.height),
    borderRadius: radius,
    marginBottom: toSize(props.marginBottom),
  }
})
</script>

<style lang="scss" scoped>
.skeleton-block {
  display: block;
  background: #EFE7DF;
  position: relative;
  overflow: hidden;
}

.skeleton-block::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.55) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: translateX(-100%);
  animation: skeleton-shimmer 1.4s infinite;
}

.skeleton-no-anim::after {
  display: none;
}

.skeleton-text {
  background: #ECE3DA;
}

.skeleton-circle {
  background: #EFE7DF;
}

@keyframes skeleton-shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
