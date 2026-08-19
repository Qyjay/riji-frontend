<template>
  <view class="page">
    <CustomNavBar title="确认分身权限" left-icon="back" />
    <view :style="{ height: navHeight + 'px' }" />

    <scroll-view class="scroll" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view v-if="draft" class="content">
        <view class="summary">
          <view class="summary-mark" :style="{ background: softColor }">
            <DoodleIcon :name="draft.mode === 'short_term' ? 'calendar' : 'heart'" :size="42" :color="accent" />
          </view>
          <view class="summary-main">
            <text class="summary-mode">{{ missionModeLabel(draft.mode) }}</text>
            <text class="summary-title">{{ draft.title }}</text>
            <text class="summary-meta">{{ draft.location.label }} · {{ timeLabel }}</text>
          </view>
        </view>

        <view class="section">
          <text class="section-title">这次会公开什么</text>
          <text class="section-desc">候选只会看到本次摘要，不会读取或收到日记原文。</text>

          <view class="public-preview">
            <text class="preview-label">找人目的</text>
            <text class="preview-copy">{{ draft.description }}</text>
            <view class="preview-divider" />
            <view class="preview-row">
              <text class="preview-key">范围</text>
              <text class="preview-value">{{ draft.location.label }}附近 {{ draft.location.radiusKm }} km</text>
            </view>
            <view v-if="draft.preferences.length" class="preview-row top">
              <text class="preview-key">加分项</text>
              <view class="preview-tags">
                <text v-for="item in draft.preferences" :key="item" class="preview-tag">{{ item }}</text>
              </view>
            </view>
            <view v-if="draft.boundaries.length" class="preview-row top">
              <text class="preview-key">边界</text>
              <view class="preview-tags">
                <text v-for="item in draft.boundaries" :key="item" class="preview-tag boundary">{{ item }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="section">
          <text class="section-title">分身可以做什么</text>
          <text class="section-desc">权限只对这项任务生效，开始后仍可暂停。</text>

          <view class="permission-list">
            <view class="permission-row" @click="togglePermission('search')">
              <view class="permission-icon allowed">
                <DoodleIcon name="search" :size="30" color="#4F8765" />
              </view>
              <view class="permission-copy">
                <text class="permission-title">搜索公开帖子和名片</text>
                <text class="permission-desc">只读取对方主动公开的信息</text>
              </view>
              <switch
                :checked="draft.permissions.search"
                color="#6BA87B"
                @change.stop="setPermission('search', $event)"
              />
            </view>

            <view class="permission-row" @click="togglePermission('atoaProbe')">
              <view class="permission-icon allowed">
                <DoodleIcon name="chat" :size="30" color="#4F8765" />
              </view>
              <view class="permission-copy">
                <text class="permission-title">与对方分身试聊</text>
                <text class="permission-desc">每次先聊 1 组，继续前由你决定</text>
              </view>
              <switch
                :checked="draft.permissions.atoaProbe"
                color="#6BA87B"
                @change.stop="setPermission('atoaProbe', $event)"
              />
            </view>

            <view class="permission-row" @click="togglePermission('draftPost')">
              <view class="permission-icon allowed">
                <DoodleIcon name="pen" :size="30" color="#4F8765" />
              </view>
              <view class="permission-copy">
                <text class="permission-title">生成招募帖草稿</text>
                <text class="permission-desc">只有你确认后才会公开发布</text>
              </view>
              <switch
                :checked="draft.permissions.draftPost"
                color="#6BA87B"
                @change.stop="setPermission('draftPost', $event)"
              />
            </view>

            <view class="permission-row locked">
              <view class="permission-icon denied">
                <DoodleIcon name="lock" :size="30" color="#A16655" />
              </view>
              <view class="permission-copy">
                <text class="permission-title">发布、申请和接受关系</text>
                <text class="permission-desc">始终需要你本人当次确认</text>
              </view>
              <text class="locked-label">不可自动</text>
            </view>
          </view>
        </view>

        <view class="privacy-note">
          <DoodleIcon name="lock" :size="30" color="#5E866E" />
          <text class="privacy-copy">联系方式、精确位置、日记原文和私聊原文不会由分身自动发送。</text>
        </view>

        <view class="bottom-actions">
          <view class="secondary-action press-feedback" role="button" tabindex="0" @click="goBackEdit" @keyup.enter="goBackEdit">
            <text class="secondary-copy">返回修改</text>
          </view>
          <view
            class="primary-action press-feedback"
            :class="{ disabled: starting || !draft.permissions.search }"
            :style="{ background: accent }"
            role="button"
            tabindex="0"
            @click="confirmAndStart"
            @keyup.enter="confirmAndStart"
          >
            <text class="primary-copy">{{ starting ? '正在保存' : editId ? '确认修改并重新搜索' : '确认并开始寻找' }}</text>
          </view>
        </view>
      </view>

      <view v-else class="missing">
        <text class="missing-title">找不到这次任务草稿</text>
        <text class="missing-desc">返回重新描述你的找人目的。</text>
        <view class="missing-action" @click="goFind"><text>重新发起</text></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { createMission, searchMission, startMission, updateMission } from '@/services/api/mission'
import type { MissionDraft, MissionMode, MissionPermissions } from '@/services/api/mission'
import {
  clearMissionDraft,
  formatMissionTime,
  missionAccent,
  missionModeLabel,
  missionSoftBackground,
  readMissionDraft,
  saveMissionDraft,
} from '@/utils/mission'
import { decodeQueryParam, withQuery } from '@/utils/query'

const navHeight = ref(64)
const scrollHeight = ref(600)
const mode = ref<MissionMode>('short_term')
const draft = ref<MissionDraft | null>(null)
const starting = ref(false)
const editId = ref('')
const accent = computed(() => missionAccent(mode.value))
const softColor = computed(() => missionSoftBackground(mode.value))
const timeLabel = computed(() => draft.value ? formatMissionTime(draft.value as any) : '')

onLoad((options: any) => {
  mode.value = decodeQueryParam(options?.mode) === 'long_term' ? 'long_term' : 'short_term'
  editId.value = decodeQueryParam(options?.editId)
  draft.value = readMissionDraft(mode.value)
})

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navHeight.value = Math.max(info.statusBarHeight ?? 0, info.uniPlatform === 'web' ? 36 : 20) + 44
  scrollHeight.value = info.windowHeight - navHeight.value
})

function setPermission(key: keyof MissionPermissions, event: any) {
  if (!draft.value) return
  const checked = Boolean(event.detail.value)
  if (key === 'autoPublish' || key === 'autoConnect') return
  ;(draft.value.permissions as any)[key] = checked
  saveMissionDraft(draft.value)
}

function togglePermission(key: 'search' | 'atoaProbe' | 'draftPost') {
  if (!draft.value) return
  draft.value.permissions[key] = !draft.value.permissions[key]
  saveMissionDraft(draft.value)
}

function goBackEdit() {
  uni.navigateBack()
}

function goFind() {
  uni.redirectTo({ url: '/pages/social/find' })
}

async function confirmAndStart() {
  if (!draft.value || starting.value || !draft.value.permissions.search) return
  starting.value = true
  let missionId = ''
  try {
    const mission = editId.value
      ? await updateMission(editId.value, draft.value)
      : await createMission(draft.value)
    missionId = mission.id
    clearMissionDraft(draft.value.mode)
    const result = editId.value
      ? await searchMission(mission.id)
      : await startMission(mission.id)
    uni.redirectTo({
      url: withQuery('/pages/social/mission-detail', { id: result.mission.id, created: 1 }),
    })
  } catch (error: any) {
    if (missionId) {
      clearMissionDraft(mode.value)
      uni.showToast({
        title: '任务已创建，搜索稍后可以重试',
        icon: 'none',
      })
      setTimeout(() => {
        uni.redirectTo({
          url: withQuery('/pages/social/mission-detail', { id: missionId }),
        })
      }, 800)
    } else {
      uni.showToast({
        title: error?.message || '任务创建失败，请检查网络后重试',
        icon: 'none',
      })
    }
  } finally {
    starting.value = false
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100%; background: #FDF8F3; }
.scroll { -webkit-overflow-scrolling: touch; }
.content { padding: 22rpx 32rpx 70rpx; }
.summary { display: flex; align-items: center; gap: 20rpx; padding: 22rpx 0 32rpx; border-bottom: 1rpx solid #E7DBD1; }
.summary-mark { width: 84rpx; height: 84rpx; border-radius: 26rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.summary-main { flex: 1; min-width: 0; }
.summary-mode { display: block; color: #8A7467; font-size: 21rpx; margin-bottom: 4rpx; }
.summary-title { display: block; color: #30231C; font-size: 33rpx; font-weight: 700; }
.summary-meta { display: block; color: #806B60; font-size: 22rpx; margin-top: 7rpx; }
.section { padding-top: 42rpx; }
.section-title { display: block; color: #31241D; font-size: 34rpx; font-weight: 700; }
.section-desc { display: block; color: #7D695E; font-size: 24rpx; line-height: 1.55; margin-top: 8rpx; }
.public-preview { margin-top: 20rpx; padding: 25rpx; border-radius: 24rpx; background: #FFFDFC; border: 1rpx solid #E3D6CB; }
.preview-label { color: #927664; font-size: 20rpx; letter-spacing: 2rpx; }
.preview-copy { display: block; color: #403027; font-size: 27rpx; line-height: 1.65; margin-top: 9rpx; }
.preview-divider { height: 1rpx; background: #ECE2DA; margin: 22rpx 0; }
.preview-row { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin-top: 14rpx; }
.preview-row.top { align-items: flex-start; }
.preview-key { width: 100rpx; color: #8A7569; font-size: 23rpx; }
.preview-value { flex: 1; text-align: right; color: #59473D; font-size: 24rpx; }
.preview-tags { flex: 1; display: flex; gap: 10rpx; flex-wrap: wrap; justify-content: flex-end; }
.preview-tag { padding: 7rpx 13rpx; border-radius: 14rpx; background: #EDF3F8; color: #55758F; font-size: 21rpx; }
.preview-tag.boundary { background: #F5EAED; color: #9B5D70; }
.permission-list { margin-top: 16rpx; }
.permission-row { display: flex; align-items: center; gap: 16rpx; min-height: 118rpx; border-bottom: 1rpx solid #E7DBD1; }
.permission-row.locked { opacity: 0.9; }
.permission-icon { width: 62rpx; height: 62rpx; border-radius: 19rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.permission-icon.allowed { background: #E9F3ED; }
.permission-icon.denied { background: #F6EBE6; }
.permission-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5rpx; }
.permission-title { color: #3F3028; font-size: 26rpx; font-weight: 600; }
.permission-desc { color: #806D61; font-size: 22rpx; line-height: 1.45; }
.locked-label { padding: 8rpx 12rpx; border-radius: 14rpx; background: #F3E6E1; color: #9B604E; font-size: 20rpx; }
.privacy-note { display: flex; align-items: flex-start; gap: 12rpx; margin-top: 34rpx; padding: 20rpx; border-radius: 20rpx; background: #EDF5F0; }
.privacy-copy { flex: 1; color: #5B7465; font-size: 23rpx; line-height: 1.55; }
.bottom-actions { display: flex; gap: 14rpx; margin-top: 42rpx; }
.secondary-action, .primary-action { min-height: 92rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; }
.secondary-action { width: 190rpx; background: #EEE5DE; }
.primary-action { flex: 1; }
.primary-action.disabled { opacity: 0.45; }
.secondary-copy { color: #68564C; font-size: 26rpx; font-weight: 600; }
.primary-copy { color: #FFF9F5; font-size: 27rpx; font-weight: 650; }
.missing { padding: 180rpx 46rpx; text-align: center; }
.missing-title { display: block; color: #33261F; font-size: 33rpx; font-weight: 700; }
.missing-desc { display: block; color: #7B675C; font-size: 25rpx; margin-top: 12rpx; }
.missing-action { width: 240rpx; height: 84rpx; margin: 30rpx auto; border-radius: 22rpx; background: #D96F42; color: #FFF9F5; display: flex; align-items: center; justify-content: center; }
</style>
