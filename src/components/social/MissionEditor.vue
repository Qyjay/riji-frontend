<template>
  <view class="editor">
    <view class="mode-intro">
      <view class="mode-symbol" :style="{ background: softColor }">
        <DoodleIcon :name="mode === 'short_term' ? 'calendar' : 'heart'" :size="46" :color="accent" />
      </view>
      <view class="mode-copy">
        <text class="mode-kicker">{{ mode === 'short_term' ? 'SHORT TERM' : 'LONG TERM' }}</text>
        <text class="mode-title">{{ mode === 'short_term' ? '把活动条件说清楚' : '把关系期待说清楚' }}</text>
      </view>
    </view>

    <view class="field-group">
      <text class="field-label">{{ mode === 'short_term' ? '想一起做什么' : '想建立什么关系' }}</text>
      <scroll-view scroll-x :show-scrollbar="false" class="choice-scroll">
        <view class="choice-row">
          <view
            v-for="item in purposeOptions"
            :key="item.value"
            class="choice-pill"
            :class="{ active: draft.purposeType === item.value }"
            :style="draft.purposeType === item.value ? { borderColor: accent, background: softColor } : {}"
            @click="selectPurpose(item)"
          >
            <text class="choice-text" :style="draft.purposeType === item.value ? { color: accent } : {}">{{ item.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="field-group">
      <text class="field-label">任务名称</text>
      <input
        v-model="draft.title"
        class="text-field"
        maxlength="80"
        placeholder="给这次找人一个清楚的名字"
        placeholder-class="field-placeholder"
      />
    </view>

    <view class="field-group">
      <text class="field-label">你具体希望怎样</text>
      <textarea
        v-model="draft.description"
        class="text-area"
        maxlength="1000"
        :placeholder="descriptionPlaceholder"
        placeholder-class="field-placeholder"
        :show-confirm-bar="false"
      />
      <text class="field-help">这段话会先被整理成公开摘要，日记原文不会被发送。</text>
    </view>

    <template v-if="mode === 'short_term'">
      <view class="two-columns">
        <view class="field-group compact">
          <text class="field-label">时间</text>
          <input
            v-model="draft.timeWindow.label"
            class="text-field"
            placeholder="例如：本周六晚上"
            placeholder-class="field-placeholder"
          />
        </view>
        <view class="field-group compact">
          <text class="field-label">再找几人</text>
          <view class="stepper">
            <view class="stepper-btn" @click="changeWanted(-1)"><text>−</text></view>
            <text class="stepper-value">{{ draft.headcount.wanted }}</text>
            <view class="stepper-btn" @click="changeWanted(1)"><text>＋</text></view>
          </view>
        </view>
      </view>

      <view class="field-group">
        <text class="field-label">预算方式</text>
        <view class="segmented">
          <view
            v-for="item in budgetOptions"
            :key="item.value"
            class="segment"
            :class="{ active: draft.budget.type === item.value }"
            @click="draft.budget.type = item.value as MissionBudget['type']"
          >
            <text class="segment-text">{{ item.label }}</text>
          </view>
        </view>
      </view>
    </template>

    <view class="field-group">
      <text class="field-label">{{ mode === 'short_term' ? '寻找范围' : '地域范围' }}</text>
      <view class="location-line">
        <input
          v-model="draft.location.label"
          class="location-input"
          placeholder="学校、商圈或城市"
          placeholder-class="field-placeholder"
        />
        <text class="location-radius">{{ draft.location.radiusKm }} km</text>
      </view>
      <slider
        :value="draft.location.radiusKm"
        :min="1"
        :max="50"
        :step="1"
        :activeColor="accent"
        backgroundColor="#E8DDD3"
        block-color="#FDF8F3"
        :block-size="22"
        @change="onRadiusChange"
      />
    </view>

    <view class="field-group">
      <text class="field-label">必须满足</text>
      <view class="tag-editor">
        <view v-for="(item, index) in draft.mustHaves" :key="`${item}-${index}`" class="tag">
          <text class="tag-copy">{{ item }}</text>
          <text class="tag-remove" @click="draft.mustHaves.splice(index, 1)">×</text>
        </view>
        <input
          v-model="mustInput"
          class="tag-input"
          placeholder="输入后回车"
          placeholder-class="field-placeholder"
          confirm-type="done"
          @confirm="appendTag('must')"
        />
      </view>
    </view>

    <view class="field-group">
      <text class="field-label">加分项</text>
      <view class="tag-editor">
        <view v-for="(item, index) in draft.preferences" :key="`${item}-${index}`" class="tag preference">
          <text class="tag-copy">{{ item }}</text>
          <text class="tag-remove" @click="draft.preferences.splice(index, 1)">×</text>
        </view>
        <input
          v-model="preferenceInput"
          class="tag-input"
          placeholder="例如：新手友好、慢热"
          placeholder-class="field-placeholder"
          confirm-type="done"
          @confirm="appendTag('preference')"
        />
      </view>
    </view>

    <view class="field-group">
      <text class="field-label">明确边界</text>
      <view class="tag-editor">
        <view v-for="(item, index) in draft.boundaries" :key="`${item}-${index}`" class="tag boundary">
          <text class="tag-copy">{{ item }}</text>
          <text class="tag-remove" @click="draft.boundaries.splice(index, 1)">×</text>
        </view>
        <input
          v-model="boundaryInput"
          class="tag-input"
          placeholder="例如：不交换联系方式"
          placeholder-class="field-placeholder"
          confirm-type="done"
          @confirm="appendTag('boundary')"
        />
      </view>
    </view>

    <view class="field-group">
      <text class="field-label">分身怎么帮你找</text>
      <view
        v-for="item in strategyOptions"
        :key="item.value"
        class="strategy-row"
        @click="draft.searchStrategy = item.value"
      >
        <view class="radio" :class="{ selected: draft.searchStrategy === item.value }">
          <view v-if="draft.searchStrategy === item.value" class="radio-dot" />
        </view>
        <view class="strategy-copy">
          <text class="strategy-title">{{ item.title }}</text>
          <text class="strategy-desc">{{ item.description }}</text>
        </view>
      </view>
    </view>

    <view class="next-action press-feedback" role="button" tabindex="0" :style="{ background: accent }" @click="continueToPermission" @keyup.enter="continueToPermission">
      <text class="next-action-text">查看公开信息和权限</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import type { MissionBudget, MissionDraft, MissionMode } from '@/services/api/mission'
import {
  defaultMissionDraft,
  missionAccent,
  missionSoftBackground,
  readMissionDraft,
  saveMissionDraft,
} from '@/utils/mission'

const props = defineProps<{ mode: MissionMode; missionId?: string }>()
const cached = readMissionDraft(props.mode)
const draft = reactive<MissionDraft>(cached || defaultMissionDraft(props.mode))
const mustInput = ref('')
const preferenceInput = ref('')
const boundaryInput = ref('')

const accent = computed(() => missionAccent(props.mode))
const softColor = computed(() => missionSoftBackground(props.mode))
const descriptionPlaceholder = computed(() => props.mode === 'short_term'
  ? '例如：本周六想找人看一场科幻电影，结束后可以一起吃饭。'
  : '例如：想认识一个能周末探索城市，平时也愿意分享生活的人。')

const purposeOptions = computed(() => props.mode === 'short_term'
  ? [
      { value: 'movie', label: '看电影' },
      { value: 'murder_mystery', label: '剧本杀' },
      { value: 'meal', label: '吃饭探店' },
      { value: 'sport', label: '运动' },
      { value: 'study', label: '学习自习' },
      { value: 'exhibition', label: '看展' },
      { value: 'travel', label: '旅行' },
      { value: 'activity', label: '其他活动' },
    ]
  : [
      { value: 'friendship', label: '交朋友' },
      { value: 'dating', label: '恋爱' },
      { value: 'roommate', label: '合租' },
      { value: 'study_partner', label: '长期学习' },
      { value: 'sport_partner', label: '长期运动' },
      { value: 'long_term', label: '其他长期伙伴' },
    ])

const budgetOptions = [
  { value: 'aa', label: 'AA' },
  { value: 'free', label: '免费' },
  { value: 'range', label: '有预算' },
  { value: 'host', label: '我来安排' },
]

const strategyOptions = computed(() => props.mode === 'short_term'
  ? [
      { value: 'search_then_draft' as const, title: '先找现有活动', description: '没有合适的，再生成招募帖草稿' },
      { value: 'search_only' as const, title: '只找现有活动', description: '不帮我生成公开帖子' },
      { value: 'post_only' as const, title: '直接准备招募帖', description: '由我确认后再发布' },
    ]
  : [
      { value: 'search_only' as const, title: '从公开名片中寻找', description: '只联系已开启相关意图的人' },
      { value: 'search_then_draft' as const, title: '先定向寻找', description: '无结果时再准备长期寻友帖' },
    ])

function selectPurpose(item: { value: string; label: string }) {
  draft.purposeType = item.value
  if (!draft.description.trim() || draft.title === '一起做件事' || draft.title === '慢慢认识一个人') {
    draft.title = item.label
  }
}

function changeWanted(delta: number) {
  draft.headcount.wanted = Math.max(1, Math.min(20, draft.headcount.wanted + delta))
}

function onRadiusChange(event: any) {
  draft.location.radiusKm = Number(event.detail.value || 1)
}

function appendTag(type: 'must' | 'preference' | 'boundary') {
  const refs = {
    must: mustInput,
    preference: preferenceInput,
    boundary: boundaryInput,
  }
  const lists = {
    must: draft.mustHaves,
    preference: draft.preferences,
    boundary: draft.boundaries,
  }
  const input = refs[type]
  const value = input.value.trim()
  if (value && !lists[type].includes(value)) lists[type].push(value)
  input.value = ''
}

function continueToPermission() {
  if (!draft.title.trim()) {
    uni.showToast({ title: '请给这次找人一个名称', icon: 'none' })
    return
  }
  if (!draft.description.trim()) {
    uni.showToast({ title: '请描述你具体希望怎样', icon: 'none' })
    return
  }
  saveMissionDraft({ ...draft })
  uni.navigateTo({
    url: `/pages/social/mission-permission?mode=${draft.mode}${props.missionId ? `&editId=${encodeURIComponent(props.missionId)}` : ''}`,
  })
}
</script>

<style lang="scss" scoped>
.editor { padding: 18rpx 32rpx 80rpx; }
.mode-intro { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 0 38rpx; border-bottom: 1rpx solid #E8DDD3; }
.mode-symbol { width: 88rpx; height: 88rpx; border-radius: 28rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mode-copy { display: flex; flex-direction: column; gap: 6rpx; }
.mode-kicker { font-size: 19rpx; letter-spacing: 2rpx; color: #8D776A; }
.mode-title { font-size: 36rpx; color: #2F231C; font-weight: 700; }
.field-group { padding: 34rpx 0 8rpx; }
.field-group.compact { flex: 1; min-width: 0; }
.field-label { display: block; font-size: 27rpx; color: #3F3028; font-weight: 650; margin-bottom: 16rpx; }
.field-help { display: block; margin-top: 12rpx; font-size: 22rpx; color: #8C786C; line-height: 1.55; }
.choice-scroll { width: 100%; white-space: nowrap; }
.choice-row { display: inline-flex; gap: 12rpx; padding-right: 24rpx; }
.choice-pill { flex-shrink: 0; min-width: 136rpx; min-height: 72rpx; padding: 0 22rpx; border-radius: 22rpx; border: 1rpx solid #DED1C6; background: #FFFDFC; display: flex; align-items: center; justify-content: center; }
.choice-text { font-size: 24rpx; color: #6C5A50; font-weight: 550; white-space: nowrap; }
.text-field, .location-line, .tag-editor { min-height: 88rpx; border: 1rpx solid #DED1C6; background: #FFFDFC; border-radius: 22rpx; }
.text-field { box-sizing: border-box; width: 100%; padding: 0 24rpx; font-size: 27rpx; color: #3F3028; }
.text-area { box-sizing: border-box; width: 100%; min-height: 220rpx; padding: 22rpx 24rpx; font-size: 27rpx; line-height: 1.65; color: #3F3028; border: 1rpx solid #DED1C6; background: #FFFDFC; border-radius: 22rpx; }
.field-placeholder { color: #A8998F; }
.two-columns { display: flex; gap: 24rpx; }
.stepper { height: 88rpx; border: 1rpx solid #DED1C6; background: #FFFDFC; border-radius: 22rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 12rpx; }
.stepper-btn { width: 64rpx; height: 64rpx; border-radius: 18rpx; background: #F2E9E2; display: flex; align-items: center; justify-content: center; font-size: 30rpx; color: #67554B; }
.stepper-value { font-size: 30rpx; color: #33261F; font-weight: 700; }
.segmented { display: flex; padding: 6rpx; background: #EEE5DE; border-radius: 22rpx; }
.segment { flex: 1; min-height: 72rpx; border-radius: 17rpx; display: flex; align-items: center; justify-content: center; }
.segment.active { background: #FFFDFC; box-shadow: 0 2px 8px rgba(79, 51, 34, 0.08); }
.segment-text { font-size: 24rpx; color: #66544A; font-weight: 550; }
.location-line { display: flex; align-items: center; padding: 0 22rpx; }
.location-input { flex: 1; min-width: 0; font-size: 27rpx; color: #3F3028; }
.location-radius { color: #756157; font-size: 24rpx; }
.tag-editor { display: flex; align-items: center; flex-wrap: wrap; gap: 12rpx; padding: 14rpx; }
.tag { min-height: 58rpx; border-radius: 17rpx; padding: 0 12rpx 0 18rpx; background: #F2E8E1; display: flex; align-items: center; gap: 10rpx; }
.tag.preference { background: #EDF3F8; }
.tag.boundary { background: #F4ECEE; }
.tag-copy { color: #624D41; font-size: 23rpx; }
.tag-remove { color: #8F7769; font-size: 30rpx; line-height: 1; }
.tag-input { flex: 1; min-width: 220rpx; height: 58rpx; padding: 0 10rpx; font-size: 24rpx; color: #44332A; }
.strategy-row { min-height: 108rpx; display: flex; align-items: flex-start; gap: 18rpx; padding: 20rpx 0; border-bottom: 1rpx solid #E8DDD3; }
.radio { margin-top: 4rpx; width: 36rpx; height: 36rpx; border-radius: 50%; border: 2rpx solid #B7A79D; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.radio.selected { border-color: #D96F42; }
.radio-dot { width: 18rpx; height: 18rpx; border-radius: 50%; background: #D96F42; }
.strategy-copy { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.strategy-title { color: #3D2D25; font-size: 27rpx; font-weight: 600; }
.strategy-desc { color: #826E62; font-size: 23rpx; line-height: 1.5; }
.next-action { min-height: 92rpx; margin-top: 44rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; }
.next-action-text { color: #FFF9F5; font-size: 28rpx; font-weight: 650; }
</style>
