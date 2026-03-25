<template>
  <view class="doodle-icon" :style="iconStyle">
    <image :src="svgDataUri" mode="aspectFit" :style="imgStyle" :width="size + 'rpx'" :height="size + 'rpx'" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  color?: string
  size?: number
  strokeWidth?: number
  filtered?: boolean
}>(), {
  color: '#E8855A',
  size: 24,
  strokeWidth: 2,
  filtered: true,
})

// 图标 SVG path 映射
const iconPaths: Record<string, string> = {
  home: '<path d="M3.5 10.5 L12 3.5 L20.5 10.5"/><path d="M5 9.5 L5 20.2 Q5 20.8 5.6 20.8 L9.5 20.8 L9.5 15 Q9.5 14.5 10 14.5 L14 14.5 Q14.5 14.5 14.5 15 L14.5 20.8 L18.4 20.8 Q19 20.8 19 20.2 L19 9.5"/>',
  book: '<path d="M4 3.5 Q4 3 4.5 3 L14 3 Q14.5 3 15 3.5 L15 20.5 Q15 21 14.5 21 L4.5 21 Q4 21 4 20.5 Z"/><path d="M15 4 L19.5 5.5 Q20 5.8 20 6.3 L20 21.5 L15 20.5"/><line x1="7" y1="8" x2="12" y2="8"/><line x1="7" y1="11.5" x2="12" y2="11.5"/><line x1="7" y1="15" x2="10" y2="15"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.8" x2="20.5" y2="20.5"/>',
  pen: '<path d="M17 3 L21 7 L8 20 L3 21 L4 16 Z"/><line x1="14" y1="6" x2="18" y2="10"/>',
  chat: '<path d="M4 3.5 Q3.5 3.5 3.5 4 L3.5 15.5 Q3.5 16 4 16 L8.5 16 L12 20 L15.5 16 L20 16 Q20.5 16 20.5 15.5 L20.5 4 Q20.5 3.5 20 3.5 Z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="12" x2="13" y2="12"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21 Q4 15 12 15 Q20 15 20 21"/>',
  heart: '<path d="M12 21 L4.5 13.5 Q2 11 2 8 Q2 4.5 5.5 3.5 Q8.5 2.5 12 6 Q15.5 2.5 18.5 3.5 Q22 4.5 22 8 Q22 11 19.5 13.5 Z"/>',
  star: '<path d="M12 2.5 L14.5 9 L21.5 9.5 L16.5 14 L18.5 21 L12 17 L5.5 21 L7.5 14 L2.5 9.5 L9.5 9 Z"/>',
  tomato: '<circle cx="12" cy="14" r="7.5"/><path d="M12 6.5 L12 3"/><path d="M10 5 Q12 3 14 5"/><path d="M9 4.5 Q8 2 10 2.5"/>',
  camera: '<path d="M3 8 Q3 7 4 7 L6.5 7 L8 5 L16 5 L17.5 7 L20 7 Q21 7 21 8 L21 18 Q21 19 20 19 L4 19 Q3 19 3 18 Z"/><circle cx="12" cy="13" r="3.5"/>',
  robot: '<rect x="5" y="8" width="14" height="11" rx="2"/><circle cx="9" cy="13" r="1.5" fill="currentColor"/><circle cx="15" cy="13" r="1.5" fill="currentColor"/><line x1="9" y1="17" x2="15" y2="17"/><path d="M12 8 L12 5"/><circle cx="12" cy="4" r="1.5"/><line x1="5" y1="12" x2="2" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>',
  trophy: '<path d="M8 3 L16 3 L16 12 Q16 16 12 16 Q8 16 8 12 Z"/><path d="M8 5 L4 5 Q3 5 3 6 L3 9 Q3 11 5.5 11.5"/><path d="M16 5 L20 5 Q21 5 21 6 L21 9 Q21 11 18.5 11.5"/><line x1="12" y1="16" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11 L8 7 Q8 3 12 3 Q16 3 16 7 L16 11"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/>',
  palette: '<path d="M12 3 Q19 3 21 10 Q22.5 16 18 19 Q15 21 12 20 Q10 20 10 18 Q10 16 12 16 Q14 16 14 14 Q14 11 11 11 Q7 11 5 14.5 Q3 18 4 21"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="13" cy="6" r="1.2" fill="currentColor"/><circle cx="17" cy="9" r="1.2" fill="currentColor"/><circle cx="17" cy="14" r="1.2" fill="currentColor"/>',
  crystal: '<circle cx="12" cy="13" r="8"/><ellipse cx="12" cy="13" rx="4" ry="8"/><line x1="4.5" y1="10" x2="19.5" y2="10"/><path d="M12 2 L12 5"/><path d="M10 3 Q12 2 14 3"/>',
  music: '<path d="M9 18 L9 6 L21 4 L21 16"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  fire: '<path d="M12 22 Q6 20 6 14 Q6 10 9 8 Q8 12 11 12 Q10 9 12 4 Q15 8 16 12 Q18 10 17 7 Q20 10 20 14 Q20 20 12 22 Z"/>',
  check: '<polyline points="4,13 9,18 20,7"/>',
  cross: '<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>',
  plus: '<line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/>',
  loading: '<path d="M6 3 L18 3 Q18 9 12 12 Q6 15 6 21 L18 21 Q18 15 12 12 Q6 9 6 3"/>',
  sparkle: '<path d="M12 2 L13.5 9 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 9 Z"/><path d="M19 16 L20 19 L23 20 L20 21 L19 24" stroke-width="1.5"/><path d="M5 4 L5.7 6.3 L8 7 L5.7 7.7 L5 10" stroke-width="1.5"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><line x1="8.5" y1="10.8" x2="15.5" y2="6.2"/><line x1="8.5" y1="13.2" x2="15.5" y2="17.8"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><rect x="7" y="13" width="3" height="3" rx="0.5"/><rect x="14" y="13" width="3" height="3" rx="0.5"/>',
  run: '<circle cx="14" cy="4" r="2"/><path d="M11 8 L8 12 L5 12"/><path d="M11 8 L14 12 L12 18 L15 22"/><path d="M14 12 L18 10"/>',
  handshake: '<path d="M2 9 L6 7 L9 10 L12 9 L15 10 L18 7 L22 9"/><path d="M6 7 L8 13 Q9 15 11 14 L16 12"/><path d="M18 7 L16 12 Q15 14 13 13"/><line x1="2" y1="9" x2="2" y2="16"/><line x1="22" y1="9" x2="22" y2="16"/>',
  bookopen: '<path d="M2 4 Q2 3 3 3 L10 3 Q11 3 12 5 Q13 3 14 3 L21 3 Q22 3 22 4 L22 19 Q22 20 21 20 L14 20 Q13 20 12 18 Q11 20 10 20 L3 20 Q2 20 2 19 Z"/><line x1="12" y1="5" x2="12" y2="20"/>',
  medal: '<path d="M12 2 L14 7 L19 8 L15 12 L16 17 L12 14.5 L8 17 L9 12 L5 8 L10 7 Z"/><circle cx="12" cy="10" r="3"/>',
  chart: '<line x1="3" y1="20" x2="21" y2="20"/><rect x="5" y="12" width="3.5" height="8" rx="1"/><rect x="10.5" y="7" width="3.5" height="13" rx="1"/><rect x="16" y="4" width="3.5" height="16" rx="1"/>',
  settings: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2 L13 5.5 Q14.5 5.8 15.5 6.6 L19 5.5 L21 8.5 L18.5 11 Q18.7 12 18.5 13 L21 15.5 L19 18.5 L15.5 17.4 Q14.5 18.2 13 18.5 L12 22 L10 22 L9 18.5 Q7.5 18.2 6.5 17.4 L3 18.5 L1 15.5 L3.5 13 Q3.3 12 3.5 11 L1 8.5 L3 5.5 L6.5 6.6 Q7.5 5.8 9 5.5 L10 2 Z"/>',
  moon: '<path d="M21 12.8 Q18 16 13 16 Q7.5 16 4 11.5 Q4 6 8 3.5 Q6 8 9 11 Q12.5 14.5 17 13 Q19 12.5 21 12.8 Z"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><line x1="12" y1="2.5" x2="12" y2="5.5"/><line x1="12" y1="18.5" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5.5" y2="12"/><line x1="18.5" y1="12" x2="21.5" y2="12"/><line x1="5.6" y1="5.6" x2="7.8" y2="7.8"/><line x1="16.2" y1="16.2" x2="18.4" y2="18.4"/><line x1="18.4" y1="5.6" x2="16.2" y2="7.8"/><line x1="7.8" y1="16.2" x2="5.6" y2="18.4"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="18.5" r="1" fill="currentColor"/><line x1="10" y1="5" x2="14" y2="5"/>',
  flower: '<circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="6.5" r="2.5"/><circle cx="17" cy="9" r="2.5"/><circle cx="17" cy="15" r="2.5"/><circle cx="12" cy="17.5" r="2.5"/><circle cx="7" cy="15" r="2.5"/><circle cx="7" cy="9" r="2.5"/>',
  puzzle: '<path d="M11 3 L11 5.5 Q10 6.5 9 6.5 Q8 6.5 7 5.5 L7 11 L9.5 11 Q10.5 10 10.5 9 Q10.5 8 9.5 7 L9.5 11"/><path d="M13 3 L13 11 L15.5 11 Q16.5 10 16.5 9 Q16.5 8 15.5 7 L15.5 11"/><path d="M3 13 L5.5 13 Q6.5 12 6.5 11 Q6.5 10 5.5 9 L3 9 L3 21 L11 21 L11 18.5 Q10 17.5 9 17.5 Q8 17.5 7 18.5 L7 13"/><path d="M13 21 L21 21 L21 13 L18.5 13 Q17.5 14 17.5 15 Q17.5 16 18.5 17 L21 17"/>',
  wand: '<line x1="3" y1="21" x2="14" y2="10"/><path d="M14 10 L17 7 Q18 6 17 5 Q16 4 15 5 L14 6"/><line x1="17" y1="4" x2="20" y2="2"/><line x1="20" y1="6" x2="22" y2="5"/><line x1="18" y1="8" x2="20" y2="10"/><path d="M6 6 L7 4 L8 6 L10 7 L8 8 L7 10 L6 8 L4 7 Z" stroke-width="1.5"/>',
  novel: '<path d="M2 4.5 Q2 4 3 4 L10 4 Q11.5 4 12 6 Q12.5 4 14 4 L21 4 Q22 4 22 4.5 L22 19.5 Q22 20 21 20 L14 20 Q12.5 20 12 18 Q11.5 20 10 20 L3 20 Q2 20 2 19.5 Z"/><line x1="12" y1="6" x2="12" y2="20"/><path d="M5 9 L10 9"/><path d="M5 12.5 L10 12.5"/><path d="M14 9 L19 9"/><path d="M14 12.5 L17 12.5"/>',
  grid: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  send: '<path d="M3 12 L21 3 L12 21 L10 13 Z"/><line x1="10" y1="13" x2="21" y2="3"/>',
  back: '<polyline points="15,4 7,12 15,20"/>',
  discover: '<circle cx="12" cy="12" r="9"/><path d="M16.5 7.5 L14 14 L7.5 16.5 L10 10 Z"/>',
  list: '<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="5" cy="6" r="1.5" fill="currentColor"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="18" r="1.5" fill="currentColor"/>',
  voice: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11 Q5 17 12 17 Q19 17 19 11"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/>',
  attach: '<path d="M21 13 L11 23 Q7 27 4 23 Q0 19 4 15 L14.5 4.5 Q17.5 1.5 20 4 Q22.5 6.5 20 9 L10 19 Q8.5 20.5 7 19 Q5.5 17.5 7 16 L17 6"/>',
  pin: '<path d="M12 2 Q17 2 17 8 Q17 13 12 21 Q7 13 7 8 Q7 2 12 2 Z"/><circle cx="12" cy="8" r="2.5"/>',
  cloud: '<path d="M8 18 Q4 18 4 14 Q4 11 7 10.5 Q7 7 10 6 Q13 5 15 8 Q18 7.5 19 10 Q21 10.5 21 13 Q21 17 17 18 Z"/>',
  'emoji-happy': '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5 Q10 17 12 17 Q14 17 15.5 14.5"/><circle cx="9" cy="10.5" r="1.2" fill="currentColor"/><circle cx="15" cy="10.5" r="1.2" fill="currentColor"/>',
}

// fallback SVG
const fallbackPath = '<circle cx="12" cy="12" r="9"/><path d="M9.5 9 Q9.5 6 12 6 Q14.5 6 14.5 8.5 Q14.5 11 12 12"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor"/>'

const iconStyle = computed(() => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: `${props.size}rpx`,
  height: `${props.size}rpx`,
  flexShrink: '0',
}))

const imgStyle = computed(() => ({
  width: `${props.size}rpx`,
  height: `${props.size}rpx`,
}))

const svgDataUri = computed(() => {
  const paths = iconPaths[props.name] || fallbackPath
  // 替换 fill="currentColor" 为实际颜色
  const coloredPaths = paths.replace(/fill="currentColor"/g, `fill="${props.color}"`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${props.color}" stroke-width="${props.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${coloredPaths}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})
</script>
