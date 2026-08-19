<template>
  <view class="page">
    <CustomNavBar title="一起做件事" left-icon="back" />
    <view :style="{ height: navHeight + 'px' }" />
    <scroll-view class="scroll" scroll-y :style="{ height: scrollHeight + 'px' }">
      <MissionEditor v-if="ready" mode="short_term" :mission-id="editId || undefined" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CustomNavBar from '@/components/CustomNavBar.vue'
import MissionEditor from '@/components/social/MissionEditor.vue'
import { getMission } from '@/services/api/mission'
import { saveMissionDraft } from '@/utils/mission'
import { decodeQueryParam } from '@/utils/query'

const navHeight = ref(64)
const scrollHeight = ref(600)
const editId = ref('')
const ready = ref(true)

onLoad(async (options: any) => {
  editId.value = decodeQueryParam(options?.editId)
  if (!editId.value) return
  ready.value = false
  try {
    const mission = await getMission(editId.value)
    saveMissionDraft({
      mode: mission.mode,
      purposeType: mission.purposeType,
      title: mission.title,
      description: mission.description,
      source: mission.source,
      timeWindow: mission.timeWindow,
      location: mission.location,
      headcount: mission.headcount,
      budget: mission.budget,
      mustHaves: mission.mustHaves,
      preferences: mission.preferences,
      boundaries: mission.boundaries,
      publicMemoryIds: mission.publicMemoryIds,
      permissions: mission.permissions,
      searchStrategy: mission.searchStrategy,
      expiresAt: mission.expiresAt,
    })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '任务加载失败', icon: 'none' })
  } finally {
    ready.value = true
  }
})

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navHeight.value = Math.max(info.statusBarHeight ?? 0, info.uniPlatform === 'web' ? 36 : 20) + 44
  scrollHeight.value = info.windowHeight - navHeight.value
})
</script>

<style lang="scss" scoped>
.page { min-height: 100%; background: #FDF8F3; }
.scroll { -webkit-overflow-scrolling: touch; }
</style>
