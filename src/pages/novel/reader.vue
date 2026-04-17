<template>
  <view class="page">
    <CustomNavBar :title="navTitle" left-icon="back" />

    <scroll-view scroll-y class="content-scroll" :style="{ height: scrollHeight + 'px' }">
      <view v-if="loading" class="state-wrap">
        <text class="state-text">正在加载小说...</text>
      </view>

      <view v-else-if="!novelContent" class="state-wrap">
        <text class="state-text">暂无可阅读内容</text>
      </view>

      <view v-else class="reader-wrap">
        <text class="novel-title">{{ novelTitle }}</text>
        <text v-if="novelSubTitle" class="novel-subtitle">{{ novelSubTitle }}</text>

        <view class="divider" />

        <text
          v-for="(para, idx) in paragraphs"
          :key="idx"
          class="novel-paragraph"
        >{{ para }}</text>

        <view class="bottom-space" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import { generateDerivative, getDerivatives, getDiaryDetail } from '@/services/api/diary'
import type { DiaryDerivative } from '@/services/api/diary'

const loading = ref(true)
const navTitle = ref('小说阅读')
const novelTitle = ref('AI 小说')
const novelSubTitle = ref('')
const novelContent = ref('')
const scrollHeight = ref(600)

const paragraphs = computed(() => {
  const text = (novelContent.value || '').trim()
  if (!text) return []
  return text.split(/\n+/).map(item => item.trim()).filter(Boolean)
})

async function loadNovelDerivative(diaryId: string, derivativeId?: string): Promise<DiaryDerivative | null> {
  const list = await getDerivatives(diaryId)

  if (derivativeId) {
    const exact = list.find(item => item.id === derivativeId)
    if (exact && exact.type === 'novel') return exact
  }

  const latestNovel = list.find(item => item.type === 'novel')
  if (latestNovel) return latestNovel

  return null
}

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  scrollHeight.value = info.windowHeight - ((info.statusBarHeight ?? 20) + 44)

  const pages = getCurrentPages()
  const current = pages[pages.length - 1] as any
  const options = current?.$page?.options ?? current?.options ?? {}
  const diaryId = (options as any).diaryId as string | undefined
  const derivativeId = (options as any).derivativeId as string | undefined

  if (!diaryId) {
    loading.value = false
    uni.showToast({ title: '缺少日记ID', icon: 'none' })
    return
  }

  try {
    const diary = await getDiaryDetail(diaryId)
    navTitle.value = diary.title || '小说阅读'
    novelSubTitle.value = `${diary.date} · ${diary.weather || '未记录天气'}`
  } catch {
    // ignore
  }

  try {
    let derivative = await loadNovelDerivative(diaryId, derivativeId)
    if (!derivative) {
      derivative = await generateDerivative(diaryId, 'novel')
    }

    if (derivative?.content) {
      novelContent.value = derivative.content
      if (!novelTitle.value || novelTitle.value === 'AI 小说') {
        novelTitle.value = 'AI 生成小说'
      }
    }
  } catch {
    uni.showToast({ title: '小说加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #FDF8F3;
}

.content-scroll {
  padding: 24rpx 28rpx 0;
}

.state-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 380rpx;
}

.state-text {
  font-size: 30rpx;
  color: #AE9D92;
}

.reader-wrap {
  background: #FFFFFF;
  border-radius: 22rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 28rpx 26rpx;
}

.novel-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2C1F14;
  line-height: 1.4;
}

.novel-subtitle {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #AE9D92;
}

.divider {
  margin: 22rpx 0;
  height: 2rpx;
  background: rgba(232, 133, 90, 0.2);
}

.novel-paragraph {
  display: block;
  margin-bottom: 22rpx;
  font-size: 31rpx;
  line-height: 1.9;
  color: #4A3628;
  text-indent: 2em;
}

.bottom-space {
  height: 48rpx;
}
</style>
