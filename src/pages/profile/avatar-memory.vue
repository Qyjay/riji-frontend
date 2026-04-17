<template>
  <view class="avatar-page">
    <CustomNavBar title="我的分身" leftIcon="back" rightIcon="搜索" @rightClick="openSearch" />
    <view :style="{ height: navBarHeight + 'px' }" />

    <scroll-view scroll-y class="avatar-scroll" :style="{ height: scrollHeight + 'px' }">
      <view class="page-content">
        <view class="hero-card">
          <view class="hero-row">
            <view class="robot-box">
              <DoodleIcon name="robot" :size="98" color="#E8855A" />
            </view>
            <view class="hero-info">
              <view class="hero-topline">
                <text class="eyebrow light">RIJI AVATAR</text>
                <view class="status-chip" :class="avatarStatus?.isActive ? 'status-chip--active' : 'status-chip--sleep'">
                  <text class="status-chip-text">{{ avatarStatus?.isActive ? '冲浪中' : '待机' }}</text>
                </view>
              </view>
              <text class="hero-title">{{ heroTitle }}</text>
              <text class="hero-desc">{{ avatarFirstSentence }}</text>
            </view>
          </view>

          <view class="stats-row">
            <view v-for="item in heroMetrics" :key="item.label" class="stat-card">
              <text class="stat-value">{{ item.value }}</text>
              <text class="stat-label">{{ item.label }}</text>
            </view>
          </view>

          <view class="meter-card">
            <view class="meter-head">
              <text class="meter-title">了解度 {{ knowledgeLevel }}%</text>
              <text class="meter-hint">{{ memoryHealthHint }}</text>
            </view>
            <view class="meter-track">
              <view class="meter-fill" :style="{ width: knowledgeLevel + '%' }" />
            </view>
          </view>
        </view>

        <view class="quick-row">
          <view class="quick-card quick-card--main" @click="onRegenerate">
            <DoodleIcon name="star" :size="42" color="#E8855A" />
            <text class="quick-title light-text">{{ isRegenerating ? '正在重建' : '重建侧写' }}</text>
            <text class="quick-desc light-desc">用最新素材刷新画像</text>
          </view>
          <view class="quick-card" @click="showAddPanel = true">
            <DoodleIcon name="pen" :size="42" color="#E8855A" />
            <text class="quick-title">添加记忆</text>
            <text class="quick-desc">写入偏好和边界</text>
          </view>
          <view class="quick-card" @click="onExportMemory">
            <DoodleIcon name="book" :size="42" color="#6BA87B" />
            <text class="quick-title">导出备份</text>
            <text class="quick-desc">保存记忆快照</text>
          </view>
        </view>

        <view v-if="draftActions.length" class="section-card">
          <view class="section-head">
            <view class="section-title-wrap">
              <text class="eyebrow">APPROVAL</text>
              <text class="section-title">等待你点头的行动</text>
            </view>
            <view class="count-chip orange"><text class="count-chip-text">{{ draftActions.length }} 条</text></view>
          </view>
          <view v-for="action in draftActions" :key="action.id" class="draft-card">
            <view class="draft-head">
              <text class="draft-type">广场评论草稿</text>
              <text class="draft-date">{{ formatDate(action.createdAt) }}</text>
            </view>
            <MarkdownRenderer class="markdown-box" :content="action.outputText" />
            <view class="button-row">
              <view class="button soft" @click="onRejectAction(action.id)"><text class="button-text soft-text">先不要</text></view>
              <view class="button primary" @click="onApproveAction(action.id)"><text class="button-text primary-text">确认发布</text></view>
            </view>
          </view>
        </view>

        <view class="section-card">
          <view class="section-head">
            <view class="section-title-wrap">
              <text class="eyebrow">PORTRAIT</text>
              <text class="section-title">分身侧写</text>
            </view>
            <view class="link-button" @click="onRegenerate"><text class="link-button-text">刷新</text></view>
          </view>
          <view class="portrait-box">
            <MarkdownRenderer class="markdown-box" :content="profileMarkdown" />
          </view>
          <view v-if="profileKeywords.length" class="tag-wrap">
            <view v-for="keyword in profileKeywords" :key="keyword" class="tag"><text class="tag-text">{{ keyword }}</text></view>
          </view>
          <text class="footnote">基于 {{ avatarProfile?.diaryCount ?? 0 }} 篇日记、{{ avatarProfile?.chatCount ?? memoryDocCount }} 条对话/记忆线索生成</text>
        </view>

        <view class="section-card">
          <view class="section-head">
            <view class="section-title-wrap">
              <text class="eyebrow">MEMORY FACTS</text>
              <text class="section-title">结构化记忆</text>
            </view>
            <view class="link-button" @click="showAddPanel = true"><text class="link-button-text">新增</text></view>
          </view>
          <scroll-view scroll-x class="tabs-scroll" show-scrollbar="false">
            <view class="tabs-line">
              <view v-for="tab in memoryTabs" :key="tab.key" class="tab" :class="{ 'tab--active': activeTab === tab.key }" @click="activeTab = tab.key">
                <text class="tab-text" :class="{ 'tab-text--active': activeTab === tab.key }">{{ tab.label }}</text>
              </view>
            </view>
          </scroll-view>

          <view v-if="showNeedSection && needFacts.length" class="need-panel">
            <view class="need-head">
              <text class="need-title">当前需求</text>
              <view class="count-chip"><text class="count-chip-text green">{{ needFacts.length }} 条</text></view>
            </view>
            <view v-for="item in needFacts" :key="item.id" class="need-card">
              <text class="fact-content">{{ item.content }}</text>
              <view class="fact-meta"><text class="fact-meta-text">{{ percent(item.confidence) }} · {{ stabilityLabel(item.stability) }}</text></view>
              <view class="button-row small-row">
                <view class="button soft" @click="startEdit(item)"><text class="button-text soft-text">编辑</text></view>
                <view class="button danger" @click="disableFact(item)"><text class="button-text danger-text">停用</text></view>
              </view>
            </view>
          </view>

          <view v-if="!hasVisibleFacts" class="empty-box">
            <DoodleIcon name="book" :size="72" color="#E8855A" />
            <text class="empty-title">{{ emptyCopy.title }}</text>
            <text class="empty-desc">{{ emptyCopy.desc }}</text>
            <view class="empty-button" @click="showAddPanel = true"><text class="empty-button-text">添加第一条</text></view>
          </view>

          <view v-for="group in groupedFacts" :key="group.label" class="fact-group">
            <view class="group-head">
              <text class="group-title">{{ group.label }}</text>
              <text class="group-count">{{ group.items.length }}</text>
            </view>
            <view v-for="item in group.items" :key="item.id" class="fact-card" :class="{ 'fact-card--pinned': item.isPinned }">
              <view v-if="editingId === item.id" class="edit-box">
                <view class="mini-tabs">
                  <view v-for="tab in factTabs" :key="tab.key" class="mini-tab" :class="{ 'mini-tab--active': editingCategory === tab.key }" @click="editingCategory = tab.key">
                    <text class="mini-tab-text" :class="{ 'mini-tab-text--active': editingCategory === tab.key }">{{ tab.label }}</text>
                  </view>
                </view>
                <textarea v-model="editingContent" class="memory-textarea" :auto-height="true" />
                <view class="button-row">
                  <view class="button soft" @click="cancelEdit"><text class="button-text soft-text">取消</text></view>
                  <view class="button primary" @click="saveEdit(item)"><text class="button-text primary-text">保存</text></view>
                </view>
              </view>
              <view v-else class="fact-row">
                <view class="fact-icon"><text class="fact-icon-text">{{ categoryIcon(item.category) }}</text></view>
                <view class="fact-main">
                  <view class="fact-title-row">
                    <text class="fact-category">{{ categoryLabel(item.category) }}</text>
                    <view v-if="item.isPinned" class="pin-chip"><text class="pin-chip-text">置顶</text></view>
                  </view>
                  <text class="fact-content">{{ item.content }}</text>
                  <text class="fact-meta-text">{{ percent(item.confidence) }} · {{ stabilityLabel(item.stability) }} · {{ formatDate(item.updatedAt) }}</text>
                </view>
                <view class="fact-actions">
                  <view class="fact-action" @click="togglePinned(item)"><text class="fact-action-text">{{ item.isPinned ? '取消' : '置顶' }}</text></view>
                  <view class="fact-action" @click="startEdit(item)"><text class="fact-action-text">编辑</text></view>
                  <view class="fact-action danger-action" @click="removeFact(item.id)"><text class="fact-action-text danger-text">删除</text></view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="section-card">
          <view class="section-head">
            <view class="section-title-wrap">
              <text class="eyebrow">LONG MEMORY</text>
              <text class="section-title">长期记忆底座</text>
            </view>
            <view class="count-chip orange"><text class="count-chip-text">{{ memoryDocCount }} 条</text></view>
          </view>
          <text class="body-copy">日记、对话、素材、广场互动会先沉淀为原文记忆，再抽取成上方可编辑的结构化侧写。</text>
          <view v-if="latestMemoryDocs.length" class="doc-list">
            <view v-for="doc in latestMemoryDocs" :key="doc.id" class="doc-card">
              <view class="doc-source"><text class="doc-source-text">{{ sourceTypeLabel(doc.sourceType) }}</text></view>
              <text class="doc-title">{{ doc.title || doc.summary || '未命名记忆' }}</text>
            </view>
          </view>
          <view class="button-row">
            <view class="button soft" @click="onExportMemory"><text class="button-text soft-text">导出</text></view>
            <view class="button danger" @click="onDeleteAllMemory"><text class="button-text danger-text">清空记忆</text></view>
          </view>
        </view>

        <view class="section-card">
          <view class="section-head">
            <view class="section-title-wrap">
              <text class="eyebrow">CONTROLS</text>
              <text class="section-title">分身社交设置</text>
            </view>
            <switch :checked="avatarStatus?.isActive ?? false" color="#E8855A" @change="handleAvatarActiveChange" />
          </view>
          <view class="mode-card"><text class="mode-label">当前模式</text><text class="mode-text">{{ agentModeText }}</text></view>
          <view class="setting-block">
            <text class="setting-title">自动浏览频道</text>
            <view class="setting-grid">
              <view v-for="item in channelOptions" :key="item.key" class="setting-chip" :class="{ 'setting-chip--active': isChannelEnabled(item.key) }" @click="toggleChannel(item.key)">
                <text class="setting-chip-text" :class="{ 'setting-chip-text--active': isChannelEnabled(item.key) }">{{ item.label }}</text>
              </view>
            </view>
            <text class="setting-hint">已开启：{{ activeChannelLabels }}</text>
          </view>
          <view class="setting-block">
            <text class="setting-title">允许的分身动作</text>
            <view class="setting-grid">
              <view v-for="item in actionOptions" :key="item.key" class="setting-chip" :class="{ 'setting-chip--active': isActionEnabled(item.key) }" @click="toggleAction(item.key)">
                <text class="setting-chip-text" :class="{ 'setting-chip-text--active': isActionEnabled(item.key) }">{{ item.label }}</text>
              </view>
            </view>
            <text class="setting-hint">已允许：{{ enabledActionLabels }}</text>
          </view>
          <view class="setting-block">
            <text class="setting-title">分身评论自动化</text>
            <view class="toggle-row">
              <view class="toggle-copy">
                <text class="setting-label">分身回无需批准</text>
                <text class="setting-hint">手动点击“分身回”后，草稿生成成功会直接发布。</text>
              </view>
              <switch :checked="isActionEnabled('auto_approve_comment')" color="#E8855A" @change="toggleBooleanAction('auto_approve_comment', $event)" />
            </view>
            <view class="toggle-row">
              <view class="toggle-copy">
                <text class="setting-label">冲浪时自动回复</text>
                <text class="setting-hint">分身会按兴趣阈值挑选帖子评论，并受频率限制保护。</text>
              </view>
              <switch :checked="isActionEnabled('auto_surf_comment')" color="#E8855A" @change="toggleBooleanAction('auto_surf_comment', $event)" />
            </view>
            <view class="setting-row"><text class="setting-label">每日上限</text><view class="setting-right"><text class="setting-value">{{ autoReplyDailyLimit }} 条</text><view class="round-button" @click="adjustAutoSetting('autoReplyDailyLimit', -1, 1, 30)"><text class="round-text">−</text></view><view class="round-button" @click="adjustAutoSetting('autoReplyDailyLimit', 1, 1, 30)"><text class="round-text">+</text></view></view></view>
            <view class="setting-row"><text class="setting-label">回复间隔</text><view class="setting-right"><text class="setting-value">{{ autoReplyIntervalMinutes }} 分钟</text><view class="round-button" @click="adjustAutoSetting('autoReplyIntervalMinutes', -5, 5, 240)"><text class="round-text">−</text></view><view class="round-button" @click="adjustAutoSetting('autoReplyIntervalMinutes', 5, 5, 240)"><text class="round-text">+</text></view></view></view>
            <view class="setting-row"><text class="setting-label">兴趣阈值</text><view class="setting-right"><text class="setting-value">{{ autoReplyMinScore }} 分</text><view class="round-button" @click="adjustAutoSetting('autoReplyMinScore', -5, 20, 95)"><text class="round-text">−</text></view><view class="round-button" @click="adjustAutoSetting('autoReplyMinScore', 5, 20, 95)"><text class="round-text">+</text></view></view></view>
            <view class="button-row">
              <view class="button soft" @click="openCommentInbox"><text class="button-text soft-text">评论流</text></view>
              <view class="button primary" @click="runAutoSurfNow"><text class="button-text primary-text">{{ isAutoSurfing ? '冲浪中...' : '立即冲浪一次' }}</text></view>
            </view>
          </view>
          <view class="setting-block last-block">
            <text class="setting-title">匹配范围</text>
            <view class="setting-row"><text class="setting-label">学校</text><view class="setting-right"><text class="setting-value">{{ avatarStatus?.matchRange?.school || '不限学校' }}</text><view class="link-button" @click="onChangeSchool"><text class="link-button-text">切换</text></view></view></view>
            <view class="setting-row"><text class="setting-label">距离</text><view class="setting-right"><text class="setting-value">{{ avatarStatus?.matchRange?.distanceKm ?? 3 }} km</text><view class="round-button" @click="adjustDistance(-1)"><text class="round-text">−</text></view><view class="round-button" @click="adjustDistance(1)"><text class="round-text">+</text></view></view></view>
          </view>
        </view>
        <view class="bottom-space" />
      </view>
    </scroll-view>

    <view v-if="showSearch" class="overlay search-overlay" @click.self="closeSearch">
      <view class="search-panel">
        <view class="search-box"><input v-model="searchKeyword" class="search-input" placeholder="搜索记忆、偏好、边界..." placeholder-style="color:#AE9D92" focus /></view>
        <view class="search-cancel" @click="closeSearch"><text class="search-cancel-text">取消</text></view>
      </view>
    </view>

    <view v-if="showAddPanel" class="overlay sheet-overlay" @click.self="showAddPanel = false">
      <view class="add-sheet">
        <view class="sheet-handle" />
        <text class="sheet-title">添加结构化记忆</text>
        <text class="sheet-desc">写下你希望分身稳定记住的信息。它会进入画像、匹配和对话上下文。</text>
        <view class="mini-tabs sheet-tabs">
          <view v-for="tab in factTabs" :key="tab.key" class="mini-tab" :class="{ 'mini-tab--active': newFactCategory === tab.key }" @click="newFactCategory = tab.key">
            <text class="mini-tab-text" :class="{ 'mini-tab-text--active': newFactCategory === tab.key }">{{ tab.label }}</text>
          </view>
        </view>
        <textarea v-model="newFactContent" class="memory-textarea sheet-textarea" placeholder="例如：我喜欢低压力、慢慢熟悉的社交方式。" placeholder-style="color:#AE9D92" />
        <view class="check-row" @click="newFactPinned = !newFactPinned"><view class="checkbox" :class="{ 'checkbox--checked': newFactPinned }"><text v-if="newFactPinned" class="checkbox-text">✓</text></view><text class="check-label">作为重要记忆置顶</text></view>
        <view class="button-row"><view class="button soft" @click="showAddPanel = false"><text class="button-text soft-text">取消</text></view><view class="button primary" @click="confirmAddFact"><text class="button-text primary-text">写入记忆</text></view></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import {
  approveAgentAction,
  getAgentActions,
  getAvatarProfile,
  getAvatarStatus,
  regenerateProfile,
  rejectAgentAction,
  runAutoSurf,
  updateAvatarStatus,
} from '@/services/api/avatar'
import type { AgentAction, AvatarProfile, AvatarStatus } from '@/services/api/avatar'
import {
  createMemoryFact,
  deleteAllMemory,
  deleteMemoryFact,
  exportMemory,
  getMemoryDocuments,
  getMemoryFacts,
  updateMemoryFact,
} from '@/services/api/memory'
import type { MemoryDocument, MemoryFact } from '@/services/api/memory'

interface FactGroup {
  label: string
  items: MemoryFact[]
}

const navBarHeight = ref(64)
const scrollHeight = ref(0)
const showSearch = ref(false)
const searchKeyword = ref('')
const activeTab = ref('all')
const memoryFacts = ref<MemoryFact[]>([])
const memoryDocs = ref<MemoryDocument[]>([])
const draftActions = ref<AgentAction[]>([])
const memoryDocCount = ref(0)
const avatarProfile = ref<AvatarProfile | null>(null)
const avatarStatus = ref<AvatarStatus | null>(null)
const isRegenerating = ref(false)
const isAutoSurfing = ref(false)
const showAddPanel = ref(false)
const newFactCategory = ref('profile')
const newFactContent = ref('')
const newFactPinned = ref(false)
const editingId = ref<string | null>(null)
const editingContent = ref('')
const editingCategory = ref('profile')

const memoryTabs = [
  { key: 'all', label: '全部' },
  { key: 'profile', label: '画像' },
  { key: 'interest', label: '兴趣' },
  { key: 'preference', label: '偏好' },
  { key: 'habit', label: '习惯' },
  { key: 'need', label: '需求' },
  { key: 'relationship', label: '关系' },
  { key: 'boundary', label: '边界' },
]
const factTabs = memoryTabs.filter(item => item.key !== 'all')
const channelOptions = [{ key: 'buddy', label: '找搭子' }, { key: 'help', label: '求助' }, { key: 'dating', label: '恋爱' }, { key: 'share', label: '分享' }]
const actionOptions = [{ key: 'browse', label: '浏览广场' }, { key: 'match', label: '发现匹配' }, { key: 'comment', label: '生成评论草稿' }]

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navBarHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = Math.max(0, info.windowHeight - navBarHeight.value)
  await Promise.all([loadFacts(), loadStatus(), loadProfile(), loadActions(), loadMemoryDocuments()])
})
const factCount = computed(() => memoryFacts.value.length)
const knowledgeLevel = computed(() => Math.min(98, Math.max(12, Math.round(memoryDocCount.value * 4 + factCount.value * 7))))
const profileMarkdown = computed(() => avatarProfile.value?.summary?.trim() || '还没有生成侧写。让日记、对话和素材先沉淀一些记忆，或者点击 **重建侧写**。')
const heroTitle = computed(() => avatarStatus.value?.isActive ? '分身正在替你整理世界' : '分身在安静待机')
const avatarFirstSentence = computed(() => {
  const summary = stripMarkdown(profileMarkdown.value) || '我还在学习你的表达方式、偏好和边界。'
  const dot = summary.search(/[。！？!?]/)
  return dot >= 0 ? summary.slice(0, dot + 1) : summary.slice(0, 46)
})
const heroMetrics = computed(() => [
  { label: '长期记忆', value: memoryDocCount.value },
  { label: '结构侧写', value: factCount.value },
  { label: '待确认', value: draftActions.value.length },
])
const profileKeywords = computed(() => memoryFacts.value
  .filter(item => item.isPinned || ['interest', 'preference', 'habit'].includes(item.category))
  .slice(0, 7)
  .map(item => item.object || stripMarkdown(item.content).slice(0, 8)))
const filteredFacts = computed(() => {
  const list = activeTab.value === 'all' ? memoryFacts.value : memoryFacts.value.filter(item => item.category === activeTab.value)
  const keyword = searchKeyword.value.trim().toLowerCase()
  return keyword ? list.filter(item => `${item.content} ${item.category} ${item.object}`.toLowerCase().includes(keyword)) : list
})
const showNeedSection = computed(() => activeTab.value === 'all' || activeTab.value === 'need')
const needFacts = computed(() => filteredFacts.value.filter(item => item.category === 'need'))
const nonNeedFacts = computed(() => filteredFacts.value.filter(item => !(showNeedSection.value && item.category === 'need')))
const latestMemoryDocs = computed(() => memoryDocs.value.slice(0, 3))
const memoryHealthHint = computed(() => {
  if (knowledgeLevel.value >= 75) return '画像已经比较稳定，可以承担更主动的社交建议。'
  if (knowledgeLevel.value >= 42) return '画像正在成形，继续记录会让它更像你。'
  return '记忆还很轻，先喂给它一些生活碎片。'
})
const emptyCopy = computed(() => ({
  title: searchKeyword.value.trim() ? '没有搜到相关记忆' : '还没有这类结构化记忆',
  desc: searchKeyword.value.trim() ? '换个关键词试试，或者把这条信息手动写入分身。' : '你可以手动添加，也可以从长期记忆文档里抽取事实。',
}))
const activeChannelLabels = computed(() => {
  const labels = channelOptions.filter(item => isChannelEnabled(item.key)).map(item => item.label)
  return labels.length ? labels.join('、') : '暂未开启'
})
const enabledActionLabels = computed(() => {
  const labels = actionOptions.filter(item => isActionEnabled(item.key)).map(item => item.label)
  return labels.length ? labels.join('、') : '暂未允许'
})
const autoReplyDailyLimit = computed(() => avatarStatus.value?.matchRange?.autoReplyDailyLimit ?? 5)
const autoReplyIntervalMinutes = computed(() => avatarStatus.value?.matchRange?.autoReplyIntervalMinutes ?? 30)
const autoReplyMinScore = computed(() => avatarStatus.value?.matchRange?.autoReplyMinScore ?? 55)
const agentModeText = computed(() => avatarStatus.value?.isActive ? '允许分身浏览广场并生成需确认的行动草稿。' : '分身不会主动浏览或生成草稿，你仍然可以管理记忆。')
const groupedFacts = computed<FactGroup[]>(() => {
  const pinned = nonNeedFacts.value.filter(item => item.isPinned)
  const regular = nonNeedFacts.value.filter(item => !item.isPinned)
  const groups: FactGroup[] = []
  if (pinned.length) groups.push({ label: '置顶记忆', items: pinned })
  if (regular.length) groups.push({ label: activeTab.value === 'all' ? '全部侧写' : categoryLabel(activeTab.value), items: regular })
  return groups
})
const hasVisibleFacts = computed(() => groupedFacts.value.length > 0 || needFacts.value.length > 0)

function openSearch() { showSearch.value = true }
function closeSearch() { showSearch.value = false; searchKeyword.value = '' }
async function loadFacts() { try { memoryFacts.value = (await getMemoryFacts({ activeOnly: true })).items } catch { memoryFacts.value = [] } }
async function loadMemoryDocuments() { try { const res = await getMemoryDocuments({ limit: 100, offset: 0 }); memoryDocs.value = res.items; memoryDocCount.value = res.items.length } catch { memoryDocs.value = []; memoryDocCount.value = 0 } }
async function loadActions() { try { draftActions.value = await getAgentActions('draft') } catch { draftActions.value = [] } }
async function loadProfile() { try { avatarProfile.value = await getAvatarProfile() } catch { avatarProfile.value = null } }
async function loadStatus() { try { avatarStatus.value = await getAvatarStatus() } catch { avatarStatus.value = null } }
async function confirmAddFact() {
  const content = newFactContent.value.trim()
  if (!content) { uni.showToast({ title: '请输入记忆内容', icon: 'none' }); return }
  try {
    const fact = await createMemoryFact({ category: newFactCategory.value, content, object: stripMarkdown(content).slice(0, 80), confidence: 1, stability: 'stable', isPinned: newFactPinned.value })
    memoryFacts.value.unshift(fact)
    newFactContent.value = ''
    newFactPinned.value = false
    showAddPanel.value = false
    uni.showToast({ title: '已写入记忆', icon: 'success' })
  } catch (e: any) { uni.showToast({ title: e?.message || '添加失败', icon: 'none' }) }
}
function startEdit(item: MemoryFact) { editingId.value = item.id; editingContent.value = item.content; editingCategory.value = item.category }
function cancelEdit() { editingId.value = null; editingContent.value = '' }
async function saveEdit(item: MemoryFact) {
  const content = editingContent.value.trim()
  if (!content) { uni.showToast({ title: '记忆不能为空', icon: 'none' }); return }
  replaceFact(await updateMemoryFact(item.id, { category: editingCategory.value, content, object: stripMarkdown(content).slice(0, 80) }))
  cancelEdit()
}
async function togglePinned(item: MemoryFact) { replaceFact(await updateMemoryFact(item.id, { isPinned: !item.isPinned })) }
async function disableFact(item: MemoryFact) { const updated = await updateMemoryFact(item.id, { isActive: false }); memoryFacts.value = memoryFacts.value.filter(fact => fact.id !== updated.id) }
function removeFact(id: string) { uni.showModal({ title: '删除结构化记忆', content: '删除后这条侧写不会再参与分身画像和匹配。确定继续吗？', confirmColor: '#B55248', success: async (res) => { if (!res.confirm) return; await deleteMemoryFact(id); memoryFacts.value = memoryFacts.value.filter(item => item.id !== id) } }) }
function replaceFact(next: MemoryFact) { const index = memoryFacts.value.findIndex(item => item.id === next.id); if (index >= 0) memoryFacts.value[index] = next }
async function onRegenerate() {
  if (isRegenerating.value) return
  isRegenerating.value = true
  try { avatarProfile.value = await regenerateProfile(); uni.showToast({ title: '侧写已更新', icon: 'success' }) }
  catch (e: any) { uni.showToast({ title: e?.message || '生成失败', icon: 'none' }) }
  finally { isRegenerating.value = false }
}
async function onApproveAction(actionId: string) { try { await approveAgentAction(actionId); draftActions.value = draftActions.value.filter(item => item.id !== actionId); await loadMemoryDocuments(); uni.showToast({ title: '已发布', icon: 'success' }) } catch (e: any) { uni.showToast({ title: e?.message || '发布失败', icon: 'none' }) } }
async function onRejectAction(actionId: string) { try { await rejectAgentAction(actionId) } finally { draftActions.value = draftActions.value.filter(item => item.id !== actionId) } }
async function onExportMemory() { try { const payload = await exportMemory(); console.log('memory export', payload); uni.showToast({ title: `已导出 ${payload.documents.length} 条`, icon: 'success' }) } catch (e: any) { uni.showToast({ title: e?.message || '导出失败', icon: 'none' }) } }
function onDeleteAllMemory() { uni.showModal({ title: '清空全部记忆', content: '这会删除长期记忆、结构化侧写、分身名片、草稿行动和旧分身记忆。确定继续吗？', confirmColor: '#B55248', success: async (res) => { if (!res.confirm) return; await deleteAllMemory(); memoryFacts.value = []; memoryDocs.value = []; draftActions.value = []; memoryDocCount.value = 0; avatarProfile.value = { summary: '', diaryCount: 0, chatCount: 0, generatedAt: 0 }; uni.showToast({ title: '已清空', icon: 'success' }) } }) }
function handleAvatarActiveChange(event: any) { return updateStatusField('isActive', Boolean(event?.detail?.value)) }
async function updateStatusField(field: keyof AvatarStatus, value: any) { if (!avatarStatus.value) return; avatarStatus.value = { ...avatarStatus.value, [field]: value }; await updateAvatarStatus({ [field]: value }) }
function isChannelEnabled(key: string) { return avatarStatus.value?.enabledChannels?.includes(key) ?? false }
async function toggleChannel(key: string) { if (!avatarStatus.value) return; const channels = [...(avatarStatus.value.enabledChannels ?? [])]; const index = channels.indexOf(key); if (index >= 0) channels.splice(index, 1); else channels.push(key); avatarStatus.value = { ...avatarStatus.value, enabledChannels: channels }; await updateAvatarStatus({ enabledChannels: channels }) }
function isActionEnabled(key: string) { return avatarStatus.value?.enabledActions?.includes(key) ?? false }
async function toggleAction(key: string) { if (!avatarStatus.value) return; const actions = [...(avatarStatus.value.enabledActions ?? [])]; const index = actions.indexOf(key); if (index >= 0) actions.splice(index, 1); else actions.push(key); avatarStatus.value = { ...avatarStatus.value, enabledActions: actions }; await updateAvatarStatus({ enabledActions: actions }) }
async function toggleBooleanAction(key: string, event: any) {
  if (!avatarStatus.value) return
  const enabled = Boolean(event?.detail?.value)
  const actions = [...(avatarStatus.value.enabledActions ?? [])].filter(item => item !== key)
  if (enabled) actions.push(key)
  avatarStatus.value = { ...avatarStatus.value, enabledActions: actions }
  await updateAvatarStatus({ enabledActions: actions })
}
function onChangeSchool() { uni.showModal({ title: '切换学校', editable: true, placeholderText: '输入学校名称，留空表示不限', success: async (res) => { if (!res.confirm || !avatarStatus.value) return; const matchRange = { ...avatarStatus.value.matchRange, school: res.content || '' }; avatarStatus.value = { ...avatarStatus.value, matchRange }; await updateAvatarStatus({ matchRange }) } }) }
async function adjustDistance(delta: number) { if (!avatarStatus.value) return; const current = avatarStatus.value.matchRange?.distanceKm ?? 3; const next = Math.max(1, Math.min(50, current + delta)); const matchRange = { ...avatarStatus.value.matchRange, distanceKm: next }; avatarStatus.value = { ...avatarStatus.value, matchRange }; await updateAvatarStatus({ matchRange }) }
async function adjustAutoSetting(key: 'autoReplyDailyLimit' | 'autoReplyIntervalMinutes' | 'autoReplyMinScore', delta: number, min: number, max: number) {
  if (!avatarStatus.value) return
  const current = Number(avatarStatus.value.matchRange?.[key] ?? (key === 'autoReplyDailyLimit' ? 5 : key === 'autoReplyIntervalMinutes' ? 30 : 55))
  const next = Math.max(min, Math.min(max, current + delta))
  const matchRange = { ...avatarStatus.value.matchRange, [key]: next }
  avatarStatus.value = { ...avatarStatus.value, matchRange }
  await updateAvatarStatus({ matchRange })
}
async function runAutoSurfNow() {
  if (isAutoSurfing.value) return
  isAutoSurfing.value = true
  try {
    const result = await runAutoSurf(1)
    await Promise.all([loadActions(), loadStatus()])
    if (result.publishedCount > 0) uni.showToast({ title: '分身已自动回复', icon: 'success' })
    else if (result.draftCount > 0) uni.showToast({ title: '已生成待确认草稿', icon: 'success' })
    else uni.showToast({ title: result.skippedReason || '这次没有合适帖子', icon: 'none' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '自动冲浪失败', icon: 'none' })
  } finally {
    isAutoSurfing.value = false
  }
}
function openCommentInbox() { uni.navigateTo({ url: '/pages/profile/avatar-comments' }) }
function categoryIcon(category: string) { return ({ profile: '像', interest: '趣', preference: '偏', habit: '习', need: '需', relationship: '联', boundary: '界', experience: '历' } as Record<string, string>)[category] ?? '记' }
function categoryLabel(category: string) { return factTabs.find(item => item.key === category)?.label ?? category }
function stabilityLabel(stability: string) { return ({ stable: '稳定记忆', recent: '近期线索', temporary: '临时状态' } as Record<string, string>)[stability] ?? (stability || '未标注') }
function sourceTypeLabel(sourceType: string) { return ({ diary: '日记', chat_session: '对话', material: '素材', plaza_post: '广场', plaza_post_index: '公开索引', plaza_comment: '评论', social_message: '私聊' } as Record<string, string>)[sourceType] ?? sourceType }
function percent(value: number) { return `${Math.round((value || 0) * 100)}%` }
function formatDate(ts: number) { if (!ts) return '未知'; const date = new Date(ts); return `${date.getMonth() + 1}/${date.getDate()}` }
function stripMarkdown(value: string) { return String(value || '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```[\s\S]*?```/g, '').replace(/`([^`]+)`/g, '$1').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_~\-]+/g, '').replace(/\s+/g, ' ').trim() }
</script>

<style lang="scss" scoped>
.avatar-page { min-height: 100vh; background: #FDF8F3; color: #2C1F14; }
.avatar-scroll { box-sizing: border-box; }
.page-content { padding: 28rpx; padding-bottom: 0; }
.hero-card { padding: 34rpx 30rpx; border-radius: 38rpx 30rpx 42rpx 32rpx; background: #FFFDFC; border: 1px solid rgba(232, 133, 90, 0.20); box-shadow: 0 14rpx 34rpx rgba(74, 54, 40, 0.07); }
.hero-row { display: flex; flex-direction: row; align-items: center; }
.robot-box { width: 136rpx; height: 136rpx; border-radius: 36rpx 28rpx 40rpx 30rpx; background: #FFF1E8; border: 1px solid rgba(232, 133, 90, 0.20); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.hero-info { flex: 1; min-width: 0; margin-left: 24rpx; }
.hero-topline { display: flex; flex-direction: row; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.eyebrow { display: block; color: #B88465; font-size: 20rpx; font-weight: 800; letter-spacing: 2rpx; }
.light { color: #C28A68; }
.status-chip { padding: 8rpx 16rpx; border-radius: 999rpx; background: #F4E8DC; border: 1px solid rgba(74, 54, 40, 0.08); }
.status-chip--active { background: #EEF8F1; border-color: rgba(107, 168, 123, 0.24); }
.status-chip--sleep { background: #F7EFE7; }
.status-chip-text { color: #6B8A55; font-size: 22rpx; font-weight: 800; }
.hero-title { display: block; color: #2C1F14; font-size: 40rpx; font-weight: 900; line-height: 1.25; }
.hero-desc { display: block; margin-top: 12rpx; color: #6C5545; font-size: 25rpx; line-height: 1.55; }
.stats-row { display: flex; flex-direction: row; margin-top: 28rpx; }
.stat-card { flex: 1; padding: 18rpx 8rpx; margin-right: 12rpx; border-radius: 24rpx 20rpx 26rpx 22rpx; background: #FFF8F0; border: 1px solid rgba(232, 133, 90, 0.12); align-items: center; }
.stat-card:last-child { margin-right: 0; }
.stat-value { display: block; color: #E8855A; font-size: 36rpx; font-weight: 900; text-align: center; }
.stat-label { display: block; margin-top: 4rpx; color: #8A7668; font-size: 21rpx; text-align: center; }
.meter-card { margin-top: 24rpx; padding: 18rpx; border-radius: 24rpx 28rpx 22rpx 30rpx; background: #FFF6EA; border: 1px solid rgba(232, 133, 90, 0.12); }
.meter-head { display: flex; flex-direction: row; align-items: flex-end; justify-content: space-between; margin-bottom: 12rpx; }
.meter-title { color: #4A3628; font-size: 25rpx; font-weight: 900; }
.meter-hint { flex: 1; margin-left: 18rpx; color: #9B7B65; font-size: 21rpx; line-height: 1.35; text-align: right; }
.meter-track { height: 16rpx; border-radius: 999rpx; background: #F0DED0; overflow: hidden; }
.meter-fill { height: 16rpx; border-radius: 999rpx; background: #E8855A; }
.quick-row { display: flex; flex-direction: row; margin-top: 22rpx; }
.quick-card { flex: 1; min-height: 130rpx; margin-right: 14rpx; padding: 20rpx 16rpx; border-radius: 30rpx 24rpx 32rpx 26rpx; background: #FFFDFC; border: 1px solid rgba(74, 54, 40, 0.08); box-shadow: 0 10rpx 24rpx rgba(74, 54, 40, 0.055); }
.quick-card:last-child { margin-right: 0; }
.quick-card--main { background: #FFF2E8; border-color: rgba(232, 133, 90, 0.22); }
.quick-title { display: block; margin-top: 10rpx; color: #2C1F14; font-size: 26rpx; font-weight: 900; }
.quick-desc { display: block; margin-top: 6rpx; color: #8A7668; font-size: 21rpx; line-height: 1.35; }
.light-text { color: #2C1F14; }
.light-desc { color: #8A7668; }
.section-card { margin-top: 22rpx; padding: 30rpx; border-radius: 34rpx 28rpx 36rpx 30rpx; background: #FFFDFC; border: 1px solid rgba(74, 54, 40, 0.07); box-shadow: 0 10rpx 28rpx rgba(74, 54, 40, 0.055); }
.section-head { display: flex; flex-direction: row; align-items: center; justify-content: space-between; margin-bottom: 22rpx; }
.section-title-wrap { flex: 1; }
.section-title { display: block; margin-top: 6rpx; color: #2C1F14; font-size: 32rpx; font-weight: 900; }
.count-chip, .link-button { padding: 8rpx 18rpx; border-radius: 999rpx; background: #F0FAF3; border: 1px solid rgba(107, 168, 123, 0.12); }
.orange { background: #FFF1E8; border-color: rgba(232, 133, 90, 0.16); }
.count-chip-text { color: #E8855A; font-size: 22rpx; font-weight: 800; }
.green { color: #376F4A; }
.link-button { background: #FFF1E8; border-color: rgba(232, 133, 90, 0.16); }
.link-button-text { color: #D47449; font-size: 22rpx; font-weight: 800; }
.draft-card, .need-card, .fact-card { margin-top: 16rpx; padding: 24rpx; border-radius: 28rpx 24rpx 30rpx 26rpx; background: #FFF9F2; border: 1px solid rgba(232, 133, 90, 0.10); }
.draft-head, .need-head, .group-head, .fact-title-row, .setting-row, .doc-card { display: flex; flex-direction: row; align-items: center; justify-content: space-between; }
.draft-type, .draft-date, .footnote, .body-copy, .setting-hint, .fact-meta-text { color: #8A7668; font-size: 23rpx; line-height: 1.5; }
.markdown-box { margin-top: 14rpx; }
.portrait-box { padding: 24rpx; border-radius: 28rpx 24rpx 30rpx 26rpx; background: #FFF8F0; border: 1px solid rgba(232, 133, 90, 0.10); }
.tag-wrap, .mini-tabs, .setting-grid { display: flex; flex-direction: row; flex-wrap: wrap; margin-top: 18rpx; }
.tag, .tab, .mini-tab, .setting-chip { padding: 12rpx 22rpx; margin-right: 12rpx; margin-bottom: 12rpx; border-radius: 999rpx; background: #F5ECE3; border: 1px solid rgba(74, 54, 40, 0.05); }
.tag-text, .tab-text, .mini-tab-text, .setting-chip-text { color: #4A3628; font-size: 24rpx; font-weight: 800; }
.tabs-scroll { width: 100%; white-space: nowrap; }
.tabs-line { display: flex; flex-direction: row; }
.tab--active, .mini-tab--active, .setting-chip--active { background: #E8855A; border-color: #E8855A; }
.tab-text--active, .mini-tab-text--active, .setting-chip-text--active { color: #FFFDFC; }
.need-panel { margin-top: 20rpx; padding: 22rpx; border-radius: 28rpx 24rpx 30rpx 26rpx; background: #FFF4E7; border: 1px solid rgba(232, 133, 90, 0.12); }
.need-title, .group-title { color: #2C1F14; font-size: 28rpx; font-weight: 900; }
.fact-content { display: block; color: #4A3628; font-size: 28rpx; line-height: 1.65; }
.button-row { display: flex; flex-direction: row; margin-top: 20rpx; }
.small-row { margin-top: 16rpx; }
.button { flex: 1; padding: 18rpx 0; margin-right: 14rpx; border-radius: 999rpx; align-items: center; }
.button:last-child { margin-right: 0; }
.primary { background: #E8855A; box-shadow: 0 8rpx 18rpx rgba(232, 133, 90, 0.18); }
.soft { background: #F5ECE3; }
.danger { background: #FFF0EE; }
.button-text { display: block; text-align: center; font-size: 25rpx; font-weight: 900; }
.primary-text { color: #FFFDFC; }
.soft-text { color: #8A7668; }
.danger-text { color: #B55248; }
.empty-box { padding: 42rpx 28rpx; align-items: center; }
.empty-title { display: block; margin-top: 14rpx; color: #2C1F14; font-size: 30rpx; font-weight: 900; text-align: center; }
.empty-desc { display: block; margin-top: 8rpx; color: #8A7668; font-size: 24rpx; line-height: 1.55; text-align: center; }
.empty-button { margin-top: 22rpx; padding: 16rpx 30rpx; border-radius: 999rpx; background: #E8855A; }
.empty-button-text { color: #FFFDFC; font-size: 25rpx; font-weight: 900; }
.group-count { color: #8A7668; font-size: 23rpx; font-weight: 900; }
.fact-card--pinned { background: #FFF8E6; border-color: rgba(200, 168, 107, 0.20); }
.fact-row { display: flex; flex-direction: row; align-items: flex-start; }
.fact-icon { width: 58rpx; height: 58rpx; border-radius: 18rpx 14rpx 20rpx 16rpx; background: #EEF8F1; border: 1px solid rgba(107, 168, 123, 0.16); align-items: center; justify-content: center; flex-shrink: 0; }
.fact-icon-text { color: #376F4A; font-size: 25rpx; font-weight: 900; }
.fact-main { flex: 1; min-width: 0; margin-left: 18rpx; }
.fact-category { color: #376F4A; font-size: 24rpx; font-weight: 900; }
.pin-chip { margin-left: 10rpx; padding: 4rpx 12rpx; border-radius: 999rpx; background: #FFF0C8; }
.pin-chip-text { color: #986710; font-size: 20rpx; font-weight: 900; }
.fact-actions { width: 72rpx; margin-left: 12rpx; }
.fact-action { margin-bottom: 10rpx; padding: 8rpx 0; border-radius: 999rpx; background: #EEF8F1; align-items: center; }
.fact-action-text { color: #376F4A; font-size: 22rpx; font-weight: 900; }
.danger-action { background: #FFF0EE; }
.edit-box { display: flex; flex-direction: column; }
.memory-textarea { width: 100%; min-height: 154rpx; box-sizing: border-box; padding: 22rpx; border-radius: 24rpx; color: #4A3628; font-size: 28rpx; line-height: 1.6; background: #FFFDFC; border: 1px solid rgba(232, 133, 90, 0.16); }
.doc-list { margin-top: 20rpx; }
.doc-card { padding: 18rpx; margin-bottom: 12rpx; border-radius: 24rpx 20rpx 26rpx 22rpx; background: #FFF8F0; border: 1px solid rgba(232, 133, 90, 0.10); }
.doc-source { padding: 7rpx 15rpx; border-radius: 999rpx; background: #FFF1E8; }
.doc-source-text { color: #D47449; font-size: 22rpx; font-weight: 800; }
.doc-title { flex: 1; margin-left: 14rpx; color: #4A3628; font-size: 25rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mode-card { padding: 22rpx; border-radius: 26rpx 22rpx 28rpx 24rpx; background: #FFF8F0; border: 1px solid rgba(232, 133, 90, 0.10); }
.mode-label { color: #D47449; font-size: 22rpx; font-weight: 900; }
.mode-text { display: block; margin-top: 8rpx; color: #4A3628; font-size: 26rpx; line-height: 1.5; }
.setting-block { padding: 24rpx 0; border-top: 1px solid rgba(74, 54, 40, 0.10); }
.last-block { padding-bottom: 0; }
.setting-title { display: block; margin-bottom: 16rpx; color: #8A7668; font-size: 25rpx; font-weight: 900; }
.setting-label { color: #4A3628; font-size: 27rpx; }
.toggle-row { display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 18rpx 0; }
.toggle-copy { flex: 1; min-width: 0; margin-right: 20rpx; }
.setting-right { display: flex; flex-direction: row; align-items: center; }
.setting-value { color: #8A7668; font-size: 25rpx; margin-right: 12rpx; }
.round-button { width: 48rpx; height: 48rpx; margin-left: 10rpx; border-radius: 999rpx; background: #E8855A; align-items: center; justify-content: center; }
.round-text { color: #FFFDFC; font-size: 32rpx; font-weight: 900; }
.overlay { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 300; background: rgba(74, 54, 40, 0.24); }
.search-overlay { align-items: flex-start; }
.search-panel { display: flex; flex-direction: row; padding: 30rpx; background: #FDF8F3; border-bottom: 1px solid rgba(74, 54, 40, 0.08); }
.search-box { flex: 1; height: 78rpx; padding: 0 26rpx; border-radius: 999rpx; background: #FFFDFC; border: 1px solid rgba(232, 133, 90, 0.14); }
.search-input { height: 78rpx; color: #4A3628; font-size: 27rpx; }
.search-cancel { height: 78rpx; margin-left: 18rpx; justify-content: center; }
.search-cancel-text { color: #E8855A; font-size: 27rpx; font-weight: 900; }
.sheet-overlay { justify-content: flex-end; }
.add-sheet { padding: 26rpx 36rpx 58rpx; border-radius: 38rpx 38rpx 0 0; background: #FDF8F3; border-top: 1px solid rgba(232, 133, 90, 0.16); }
.sheet-handle { width: 88rpx; height: 10rpx; margin: 0 auto 26rpx; border-radius: 999rpx; background: rgba(74, 54, 40, 0.16); }
.sheet-title { display: block; color: #2C1F14; font-size: 34rpx; font-weight: 900; text-align: center; }
.sheet-desc { display: block; margin-top: 10rpx; color: #8A7668; font-size: 24rpx; line-height: 1.5; text-align: center; }
.sheet-tabs { margin-top: 24rpx; }
.sheet-textarea { margin-top: 10rpx; }
.check-row { display: flex; flex-direction: row; align-items: center; margin: 20rpx 0 8rpx; }
.checkbox { width: 34rpx; height: 34rpx; border-radius: 10rpx; border: 1px solid rgba(74, 54, 40, 0.24); align-items: center; justify-content: center; background: #FFFDFC; }
.checkbox--checked { border-color: #E8855A; background: #E8855A; }
.checkbox-text { color: #FFFDFC; font-weight: 900; }
.check-label { margin-left: 14rpx; color: #4A3628; font-size: 25rpx; }
.bottom-space { height: 92rpx; }
</style>

