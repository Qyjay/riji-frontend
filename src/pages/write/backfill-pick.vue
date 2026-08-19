<template>
  <view class="page">
    <CustomNavBar title="补写日记" left-icon="back" />
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view class="page-scroll" scroll-y :style="{ height: scrollHeight + 'px' }">
      <!-- 空态：引导选图 -->
      <view v-if="photos.length === 0" class="empty-state">
        <text class="empty-emoji">🖼️</text>
        <text class="empty-title">补写忘记记录的日子</text>
        <text class="empty-desc">从相册选择照片，我们会自动识别拍摄时间，把同一天的照片归到一起</text>
        <view class="primary-btn" @click="choosePhotos">
          <text class="primary-btn-text">+ 选择相册照片</text>
        </view>
      </view>

      <template v-else>
        <!-- EXIF 缺失提示 -->
        <view v-if="allFallback" class="warn-tip">
          <text>未能读取照片的拍摄时间，已使用文件时间。如不准确，可在下一步手动调整。</text>
        </view>

        <!-- 按天分组展示 -->
        <view v-for="group in groups" :key="group.date" class="group-card">
          <view class="group-header">
            <text class="group-date">{{ formatGroupDate(group.date) }}</text>
            <text class="group-count">{{ group.items.length }} 张</text>
          </view>
          <view class="group-grid">
            <view
              v-for="item in group.items"
              :key="item.id"
              class="thumb-wrap"
            >
              <image class="thumb" :src="item.localPath" mode="aspectFill" />
              <text class="thumb-time">{{ formatTime(item.takenAt) }} {{ detectPeriod(item.takenAt).label }}</text>
              <view class="thumb-remove" @click="removePhoto(item.id)">
                <text>×</text>
              </view>
              <view v-if="!item.uploaded" class="thumb-uploading">
                <text>上传中…</text>
              </view>
            </view>
          </view>
        </view>

        <view class="add-more" @click="choosePhotos">
          <text class="add-more-text">+ 继续添加（最多 {{ MAX_PHOTOS }} 张）</text>
        </view>
      </template>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="photos.length > 0" class="footer-bar">
      <view class="footer-summary">
        <text>{{ photos.length }} 张 · {{ groups.length }} 天</text>
      </view>
      <view class="footer-btn" :class="{ disabled: uploading }" @click="goNext">
        <text class="footer-btn-text">{{ uploading ? '处理中…' : '开始补写' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CustomNavBar from '@/components/CustomNavBar.vue'
import { useBackfillStore, type BackfillPhotoItem } from '@/stores/backfill'
import { uploadDiaryImage } from '@/services/api/material'
import { extractTakenAt, extractTakenAtFromPath, formatDate, formatTime, detectPeriod } from '@/utils/exif'
import type { PhotoTakenMeta } from '@/utils/exif'

const MAX_PHOTOS = 9
const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
const store = useBackfillStore()
const photos = ref<BackfillPhotoItem[]>([])
const uploading = ref(false)
// 从情绪日历指定日期进入时的目标日期（用于无 EXIF 照片的兜底归档）
const presetDate = ref('')

onLoad((options: any) => {
  const date = (options?.date || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    presetDate.value = date
  }
})

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 120
})

const allFallback = computed(
  () => photos.value.length > 0 && photos.value.every((p) => p.takenAtSource !== 'exif'),
)

interface DateGroup {
  date: string
  items: BackfillPhotoItem[]
}

const groups = computed<DateGroup[]>(() => {
  const map = new Map<string, BackfillPhotoItem[]>()
  const sorted = [...photos.value].sort((a, b) => a.takenAt - b.takenAt)
  for (const p of sorted) {
    const date = formatDate(p.takenAt)
    if (!map.has(date)) map.set(date, [])
    map.get(date)!.push(p)
  }
  return [...map.entries()].map(([date, items]) => ({ date, items }))
})

function genId() {
  return `bf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function formatGroupDate(date: string): string {
  const [y, m, d] = date.split('-')
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][new Date(date).getDay()]
  return `${y}年${Number(m)}月${Number(d)}日 周${weekday}`
}

function choosePhotos() {
  const remain = MAX_PHOTOS - photos.value.length
  if (remain <= 0) {
    uni.showToast({ title: `最多选择 ${MAX_PHOTOS} 张`, icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['original', 'compressed'],
    sourceType: ['album'],
    success: async (res: any) => {
      const tempFilePaths: string[] = res.tempFilePaths || []
      const tempFiles: any[] = res.tempFiles || []
      uploading.value = true
      try {
        for (let i = 0; i < tempFilePaths.length; i++) {
          const localPath = tempFilePaths[i]
          const rawFile = tempFiles[i]?.file || tempFiles[i]
          const lastModifiedTime = tempFiles[i]?.lastModifiedTime
          let meta: PhotoTakenMeta = { takenAt: Date.now(), takenAtSource: 'lastModified' }

          // H5 下可拿到原生 File 对象，交给 exifr；
          // App 端只有临时路径，读文件字节自行解析 EXIF。
          // #ifdef H5
          if (rawFile instanceof File) {
            meta = (await extractTakenAt(rawFile)) as any
          } else if (typeof lastModifiedTime === 'number') {
            meta = { takenAt: lastModifiedTime, takenAtSource: 'lastModified' }
          }
          // #endif

          // #ifndef H5
          meta = await extractTakenAtFromPath(
            localPath,
            typeof lastModifiedTime === 'number' ? lastModifiedTime : undefined,
          )
          // #endif
          // 从日历指定日期进入且照片无 EXIF 时，归档到指定日期（设为当天中午）。
          if (presetDate.value && meta.takenAtSource !== 'exif') {
            const ts = new Date(`${presetDate.value}T12:00:00`).getTime()
            if (!Number.isNaN(ts)) {
              meta = { takenAt: ts, takenAtSource: 'manual' }
            }
          }
          const item: BackfillPhotoItem = {
            id: genId(),
            url: '',
            localPath,
            takenAt: meta.takenAt,
            takenAtSource: meta.takenAtSource,
            userNote: '',
            uploaded: false,
          }
          photos.value.push(item)
          // 异步上传
          void uploadOne(item)
        }
      } finally {
        uploading.value = false
      }
    },
    fail: () => {
      uni.showToast({ title: '已取消选择', icon: 'none' })
    },
  })
}

async function uploadOne(item: BackfillPhotoItem) {
  try {
    const result = await uploadDiaryImage(item.localPath)
    const target = photos.value.find((p) => p.id === item.id)
    if (target) {
      target.url = result.url
      target.uploaded = true
    }
  } catch (e) {
    const target = photos.value.find((p) => p.id === item.id)
    if (target) {
      target.uploaded = false
    }
    uni.showToast({ title: '部分照片上传失败', icon: 'none' })
  }
}

function removePhoto(id: string) {
  photos.value = photos.value.filter((p) => p.id !== id)
}

async function goNext() {
  if (uploading.value) return
  const notUploaded = photos.value.filter((p) => !p.uploaded || !p.url)
  if (notUploaded.length > 0) {
    uni.showToast({ title: '照片还在上传，请稍候', icon: 'none' })
    return
  }
  // 默认取张数最多的那一天作为主日期；多天时仍逐张携带各自时间。
  const sortedGroups = [...groups.value].sort((a, b) => b.items.length - a.items.length)
  const mainDate = sortedGroups[0]?.date || formatDate(Date.now())

  store.reset()
  store.targetDate = mainDate
  store.setPhotos([...photos.value].sort((a, b) => a.takenAt - b.takenAt))

  uni.navigateTo({ url: '/pages/write/backfill-canvas' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #FDF8F3;
}
.nav-placeholder { width: 100%; }
.page-scroll { box-sizing: border-box; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 60rpx;
  gap: 20rpx;
  .empty-emoji { font-size: 96rpx; }
  .empty-title { font-size: 38rpx; font-weight: 600; color: #2C1F14; }
  .empty-desc { font-size: 26rpx; color: #AE9D92; text-align: center; line-height: 1.6; }
}

.primary-btn {
  margin-top: 40rpx;
  background: #E8855A;
  border-radius: 48rpx;
  padding: 24rpx 64rpx;
  .primary-btn-text { color: #fff; font-size: 30rpx; font-weight: 600; }
}

.warn-tip {
  margin: 24rpx 32rpx 0;
  background: #FFF3E8;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  text { font-size: 24rpx; color: #C2733E; line-height: 1.5; }
}

.group-card {
  margin: 24rpx 32rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
}
.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  .group-date { font-size: 30rpx; font-weight: 600; color: #2C1F14; }
  .group-count { font-size: 24rpx; color: #AE9D92; }
}
.group-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.thumb-wrap {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
  overflow: hidden;
}
.thumb { width: 100%; height: 100%; }
.thumb-time {
  position: absolute;
  left: 0;
  bottom: 0;
  right: 0;
  background: rgba(0,0,0,0.45);
  color: #fff;
  font-size: 20rpx;
  padding: 6rpx 8rpx;
  text-align: center;
}
.thumb-remove {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  text { color: #fff; font-size: 32rpx; line-height: 1; }
}
.thumb-uploading {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  text { font-size: 22rpx; color: #C2733E; }
}

.add-more {
  margin: 24rpx 32rpx 0;
  border: 2rpx dashed #E0CDBD;
  border-radius: 24rpx;
  padding: 32rpx;
  text-align: center;
  .add-more-text { font-size: 28rpx; color: #C2733E; }
}

.bottom-spacer { height: 40rpx; }

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 120rpx;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
  gap: 24rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0,0,0,0.04);
}
.footer-summary { flex: 1; text { font-size: 26rpx; color: #6B5B4F; } }
.footer-btn {
  background: #E8855A;
  border-radius: 40rpx;
  padding: 22rpx 56rpx;
  &.disabled { opacity: 0.5; }
  .footer-btn-text { color: #fff; font-size: 30rpx; font-weight: 600; }
}
</style>
