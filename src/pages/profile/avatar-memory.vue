<template>
  <view class="page-wrapper">
    <!-- NavBar -->
    <CustomNavBar
      title="我的分身"
      leftIcon="back"
      rightIcon="🔍"
      @rightClick="onSearchClick"
    />

    <!-- 占位撑开 NavBar 高度 -->
    <view :style="{ height: navBarHeight + 'px' }" />

    <!-- 搜索浮层 -->
    <view v-if="showSearch" class="search-overlay" @click.self="showSearch = false">
      <view class="search-box">
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索记忆..."
          placeholder-style="color:#AE9D92"
          focus
          @input="onSearchInput"
        />
        <text class="search-cancel" @click="closeSearch">取消</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-container">

      <!-- ① 头像区 -->
      <view class="card avatar-card">
        <view class="avatar-icon-wrap">
          <DoodleIcon name="robot" :size="120" color="#E8855A" />
        </view>
        <text class="avatar-summary">{{ avatarFirstSentence }}</text>
        <view class="know-bar-wrap">
          <view class="know-bar-labels">
            <text class="know-bar-label">了解度</text>
            <text class="know-bar-pct">85%</text>
          </view>
          <view class="know-bar-track">
            <view class="know-bar-fill" style="width: 85%" />
          </view>
        </view>
      </view>

      <!-- ② 记忆分类 Tab -->
      <view class="card tab-card">
        <view class="tab-grid">
          <view
            v-for="tab in memoryTabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ 'tab-btn--active': activeTab === tab.key }"
            @click="switchTab(tab.key)"
          >
            <text class="tab-text" :class="{ 'tab-text--active': activeTab === tab.key }">
              {{ tab.label }}
            </text>
          </view>
        </view>
      </view>

      <!-- ③ 需求卡片区（只在 all / need tab 显示） -->
      <view v-if="showNeedSection && needMemories.length" class="need-section">
        <text class="section-header">💡 当前需求</text>
        <view
          v-for="item in needMemories"
          :key="item.id"
          class="need-card"
        >
          <view class="need-card-top">
            <view class="need-status-dot" :class="`need-dot--${item.matchStatus}`" />
            <text class="need-content">{{ item.content }}</text>
          </view>
          <text class="need-status-text">{{ matchStatusLabel(item.matchStatus) }}</text>
          <view v-if="item.tags && item.tags.length" class="need-tags">
            <text
              v-for="tag in item.tags"
              :key="tag"
              class="need-tag"
            >{{ tag }}</text>
          </view>
          <view class="need-actions">
            <text class="need-btn" @click="editNeed(item)">编辑</text>
            <text class="need-btn need-btn--close" @click="closeNeed(item)">关闭</text>
          </view>
        </view>
      </view>

      <!-- ④ 记忆条目列表 -->
      <view class="memory-list-section">
        <view
          v-for="group in groupedMemories"
          :key="group.label"
        >
          <view class="group-header">
            <text class="group-label">{{ group.label }}</text>
          </view>
          <view
            v-for="item in group.items"
            :key="item.id"
            class="memory-item"
          >
            <!-- 编辑模式 -->
            <view v-if="editingId === item.id" class="memory-edit-mode">
              <textarea
                v-model="editingContent"
                class="memory-edit-textarea"
                :auto-height="true"
              />
              <view class="memory-edit-actions">
                <text class="mem-act-btn mem-act-save" @click="saveEdit(item)">保存</text>
                <text class="mem-act-btn mem-act-cancel" @click="cancelEdit">取消</text>
              </view>
            </view>

            <!-- 正常模式 -->
            <view v-else class="memory-normal">
              <text class="mem-cat-icon">{{ categoryIcon(item.category) }}</text>
              <view class="mem-body">
                <text class="mem-content">{{ item.content }}</text>
                <text class="mem-source">来源：{{ sourceLabel(item.source) }} · 置信度 {{ Math.round(item.confidence * 100) }}%</text>
              </view>
              <view class="mem-btns">
                <text class="mem-btn" @click="startEdit(item)">✏️</text>
                <text class="mem-btn" @click="removeMemory(item.id)">🗑️</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 搜索无结果 -->
        <view v-if="searchKeyword && filteredMemories.length === 0" class="empty-tip">
          <text class="empty-tip-text">没有找到相关记忆</text>
        </view>
      </view>

      <!-- ⑤ 添加记忆 -->
      <view class="card add-memory-card" @click="showAddPanel = true">
        <text class="add-memory-text">➕ 添加记忆</text>
      </view>

      <!-- 添加记忆面板 -->
      <view v-if="showAddPanel" class="panel-overlay" @click.self="showAddPanel = false">
        <view class="add-panel">
          <text class="panel-title">添加记忆</text>
          <view class="panel-tabs">
            <view
              v-for="tab in memoryTabs.filter(t => t.key !== 'all')"
              :key="tab.key"
              class="panel-tab"
              :class="{ 'panel-tab--active': newMemCategory === tab.key }"
              @click="newMemCategory = tab.key"
            >
              <text class="panel-tab-text">{{ tab.label }}</text>
            </view>
          </view>
          <textarea
            v-model="newMemContent"
            class="panel-textarea"
            placeholder="写下这条记忆..."
            placeholder-style="color:#AE9D92"
          />
          <view class="panel-confirm-row">
            <text class="panel-cancel" @click="showAddPanel = false">取消</text>
            <text class="panel-confirm" @click="confirmAddMemory">确认添加</text>
          </view>
        </view>
      </view>

      <!-- ⑥ 分身侧写 -->
      <view class="card profile-card">
        <text class="section-header">分身侧写</text>
        <text v-if="isEditingProfile" class="profile-summary-text">
          <textarea
            v-model="editingProfileContent"
            class="profile-edit-textarea"
            :auto-height="true"
          />
        </text>
        <text v-else class="profile-summary-text">{{ avatarProfile?.summary }}</text>
        <text class="profile-meta">基于 {{ avatarProfile?.diaryCount ?? 47 }} 篇日记和 {{ avatarProfile?.chatCount ?? 23 }} 次对话生成</text>
        <view class="profile-actions">
          <text
            class="profile-btn"
            :class="{ 'profile-btn--loading': isRegenerating }"
            @click="onRegenerate"
          >{{ isRegenerating ? '生成中...' : '重新生成' }}</text>
          <text class="profile-btn profile-btn--primary" @click="onEditProfile">
            {{ isEditingProfile ? '保存' : '编辑' }}
          </text>
        </view>
      </view>

      <!-- ⑦ 分身设置 -->
      <view class="card settings-card">
        <text class="section-header">⚙️ 分身设置</text>

        <!-- 分身状态 -->
        <view class="setting-row">
          <text class="setting-label">分身状态</text>
          <view class="setting-right">
            <text class="setting-value-text">{{ avatarStatus?.isActive ? '冲浪中' : '休息中' }}</text>
            <switch
              :checked="avatarStatus?.isActive ?? false"
              color="#E8855A"
              @change="e => onToggle('isActive', e.detail.value)"
            />
          </view>
        </view>

        <!-- 自动浏览频道 -->
        <view class="setting-group">
          <text class="setting-group-label">自动浏览频道</text>
          <view class="setting-checkbox-grid">
            <view
              v-for="ch in channelOptions"
              :key="ch.key"
              class="setting-checkbox-item"
              @click="toggleChannel(ch.key)"
            >
              <view
                class="checkbox-box"
                :class="{ 'checkbox-box--checked': isChannelEnabled(ch.key) }"
              >
                <text v-if="isChannelEnabled(ch.key)" class="checkbox-check">✓</text>
              </view>
              <text class="checkbox-label">{{ ch.label }}</text>
            </view>
          </view>
        </view>

        <!-- 自动行为 -->
        <view class="setting-group">
          <text class="setting-group-label">自动行为</text>
          <view class="setting-checkbox-grid">
            <view
              v-for="act in actionOptions"
              :key="act.key"
              class="setting-checkbox-item"
              @click="toggleAction(act.key)"
            >
              <view
                class="checkbox-box"
                :class="{ 'checkbox-box--checked': isActionEnabled(act.key) }"
              >
                <text v-if="isActionEnabled(act.key)" class="checkbox-check">✓</text>
              </view>
              <text class="checkbox-label">{{ act.label }}</text>
            </view>
          </view>
        </view>

        <!-- 匹配范围 -->
        <view class="setting-group">
          <text class="setting-group-label">匹配范围</text>
          <view class="setting-row setting-row--inner">
            <text class="setting-label">学校</text>
            <view class="setting-right">
              <text class="setting-value-text">{{ avatarStatus?.matchRange?.school ?? '南开大学' }}</text>
              <text class="setting-btn-small" @click="onChangeSchool">切换</text>
            </view>
          </view>
          <view class="setting-row setting-row--inner">
            <text class="setting-label">距离</text>
            <view class="setting-right">
              <text class="setting-value-text">{{ avatarStatus?.matchRange?.distanceKm ?? 3 }} km</text>
              <view class="distance-btns">
                <text class="distance-btn" @click="adjustDistance(-1)">−</text>
                <text class="distance-btn" @click="adjustDistance(1)">+</text>
              </view>
            </view>
          </view>
        </view>

        <!-- AI 日记风格 -->
        <view class="setting-row">
          <view class="setting-label-wrap">
            <text class="setting-label">AI 日记风格</text>
            <text class="setting-hint">用分身画像影响日记生成风格</text>
          </view>
          <switch
            :checked="settings.aiDiaryStyle"
            color="#E8855A"
            @change="e => settings.aiDiaryStyle = e.detail.value"
          />
        </view>

        <!-- AI 聊天风格 -->
        <view class="setting-row">
          <view class="setting-label-wrap">
            <text class="setting-label">AI 聊天风格</text>
            <text class="setting-hint">用分身画像影响聊天语气</text>
          </view>
          <switch
            :checked="settings.aiChatStyle"
            color="#E8855A"
            @change="e => settings.aiChatStyle = e.detail.value"
          />
        </view>

        <!-- 隐私 -->
        <view class="setting-group">
          <text class="setting-group-label">隐私</text>
          <view class="setting-row setting-row--inner">
            <text class="setting-label">允许 AI 分析日记</text>
            <switch
              :checked="settings.allowAnalyzeDiary"
              color="#E8855A"
              @change="e => settings.allowAnalyzeDiary = e.detail.value"
            />
          </view>
          <view class="setting-row setting-row--inner">
            <text class="setting-label">允许分析对话记录</text>
            <switch
              :checked="settings.allowAnalyzeChat"
              color="#E8855A"
              @change="e => settings.allowAnalyzeChat = e.detail.value"
            />
          </view>
          <view class="setting-row setting-row--inner">
            <text class="setting-label">数据保留期限</text>
            <picker
              mode="selector"
              :range="dataRetentionOptions"
              :value="dataRetentionIndex"
              @change="onDataRetentionChange"
            >
              <view class="picker-display">
                <text class="setting-value-text">{{ dataRetentionOptions[dataRetentionIndex] }}</text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>
        </view>
      </view>

      <!-- ⑧ 底部留白 -->
      <view style="height: 60rpx" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import {
  getMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  getAvatarStatus,
  updateAvatarStatus,
  getAvatarProfile,
  regenerateProfile,
} from '@/services/api/avatar'
import type { AvatarMemory, AvatarStatus, AvatarProfile } from '@/services/api/avatar'

// ── NavBar 高度 ────────────────────────────────────────────────────
const navBarHeight = ref(64) // (statusBarHeight ?? 20) + 44

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navBarHeight.value = (info.statusBarHeight ?? 20) + 44
  await Promise.all([loadMemories(), loadStatus(), loadProfile()])
})

// ── 搜索 ───────────────────────────────────────────────────────────
const showSearch = ref(false)
const searchKeyword = ref('')

function onSearchClick() {
  showSearch.value = true
}
function closeSearch() {
  showSearch.value = false
  searchKeyword.value = ''
}
function onSearchInput() {
  // 实时过滤（由 filteredMemories 计算属性驱动）
}

// ── 分类 Tab ──────────────────────────────────────────────────────
const memoryTabs = [
  { key: 'all',         label: '全部' },
  { key: 'fact',        label: '📋 事实' },
  { key: 'interest',    label: '⭐ 偏好' },
  { key: 'personality', label: '🧠 性格' },
  { key: 'need',        label: '💡 需求' },
  { key: 'habit',       label: '🌙 习惯' },
  { key: 'relation',    label: '👥 关系' },
]

const activeTab = ref('all')

async function switchTab(key: string) {
  activeTab.value = key
  await loadMemories(key === 'all' ? undefined : key)
}

// ── 记忆数据 ──────────────────────────────────────────────────────
const memories = ref<AvatarMemory[]>([])

async function loadMemories(category?: string) {
  memories.value = await getMemories(category)
}

// 过滤（搜索关键词）
const filteredMemories = computed(() => {
  if (!searchKeyword.value.trim()) return memories.value
  const kw = searchKeyword.value.trim().toLowerCase()
  return memories.value.filter(m => m.content.toLowerCase().includes(kw))
})

// 需求卡片
const showNeedSection = computed(() => activeTab.value === 'all' || activeTab.value === 'need')
const needMemories = computed(() =>
  filteredMemories.value.filter(m => m.category === 'need')
)

// 非需求记忆，按时间分组
const now = Date.now()
const DAY = 86400000
const WEEK = 7 * DAY

const nonNeedMemories = computed(() =>
  filteredMemories.value.filter(m => !(showNeedSection.value && m.category === 'need'))
)

interface MemoryGroup {
  label: string
  items: AvatarMemory[]
}

const groupedMemories = computed<MemoryGroup[]>(() => {
  const today: AvatarMemory[] = []
  const thisWeek: AvatarMemory[] = []
  const earlier: AvatarMemory[] = []

  for (const m of nonNeedMemories.value) {
    const diff = now - m.createdAt
    if (diff < DAY) today.push(m)
    else if (diff < WEEK) thisWeek.push(m)
    else earlier.push(m)
  }

  const groups: MemoryGroup[] = []
  if (today.length)    groups.push({ label: '今天', items: today })
  if (thisWeek.length) groups.push({ label: '本周', items: thisWeek })
  if (earlier.length)  groups.push({ label: '更早', items: earlier })
  return groups
})

// ── 分类图标 & 标签 ────────────────────────────────────────────────
function categoryIcon(cat: string) {
  const map: Record<string, string> = {
    fact: '📋', interest: '⭐', personality: '🧠',
    need: '💡', habit: '🌙', relation: '👥',
  }
  return map[cat] ?? '📝'
}

function sourceLabel(source: string) {
  const map: Record<string, string> = {
    diary: '日记', chat: '对话', manual: '手动', behavior: '行为',
  }
  return map[source] ?? source
}

function matchStatusLabel(status?: string) {
  const map: Record<string, string> = {
    searching: '🟢 搜索中', matched: '🟡 已匹配', expired: '⚪ 已过期',
  }
  return map[status ?? ''] ?? ''
}

// ── 需求卡片操作 ────────────────────────────────────────────────────
async function editNeed(item: AvatarMemory) {
  startEdit(item)
}

async function closeNeed(item: AvatarMemory) {
  await updateMemory(item.id, { matchStatus: 'expired' })
  await loadMemories(activeTab.value === 'all' ? undefined : activeTab.value)
}

// ── 记忆编辑 ──────────────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editingContent = ref('')

function startEdit(item: AvatarMemory) {
  editingId.value = item.id
  editingContent.value = item.content
}
function cancelEdit() {
  editingId.value = null
  editingContent.value = ''
}
async function saveEdit(item: AvatarMemory) {
  await updateMemory(item.id, { content: editingContent.value })
  const idx = memories.value.findIndex(m => m.id === item.id)
  if (idx >= 0) memories.value[idx] = { ...memories.value[idx], content: editingContent.value }
  cancelEdit()
}

async function removeMemory(id: string) {
  uni.showModal({
    title: '删除记忆',
    content: '确定删除这条记忆吗？',
    confirmColor: '#E8855A',
    success: async (res) => {
      if (res.confirm) {
        await deleteMemory(id)
        memories.value = memories.value.filter(m => m.id !== id)
      }
    },
  })
}

// ── 添加记忆 ──────────────────────────────────────────────────────
const showAddPanel = ref(false)
const newMemCategory = ref('fact')
const newMemContent = ref('')

async function confirmAddMemory() {
  if (!newMemContent.value.trim()) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }
  const mem = await addMemory({ category: newMemCategory.value, content: newMemContent.value.trim() })
  memories.value.unshift(mem)
  newMemContent.value = ''
  showAddPanel.value = false
}

// ── 分身侧写 ──────────────────────────────────────────────────────
const avatarProfile = ref<AvatarProfile | null>(null)
const isRegenerating = ref(false)
const isEditingProfile = ref(false)
const editingProfileContent = ref('')

const avatarFirstSentence = computed(() => {
  const s = avatarProfile.value?.summary ?? ''
  const dot = s.search(/[。！？!?]/)
  return dot >= 0 ? s.slice(0, dot + 1) : s.slice(0, 40)
})

async function loadProfile() {
  avatarProfile.value = await getAvatarProfile()
}

async function onRegenerate() {
  if (isRegenerating.value) return
  isRegenerating.value = true
  try {
    avatarProfile.value = await regenerateProfile()
    uni.showToast({ title: '侧写已更新', icon: 'success' })
  } finally {
    isRegenerating.value = false
  }
}

function onEditProfile() {
  if (isEditingProfile.value) {
    // 保存
    if (avatarProfile.value) {
      avatarProfile.value = { ...avatarProfile.value, summary: editingProfileContent.value }
    }
    isEditingProfile.value = false
  } else {
    editingProfileContent.value = avatarProfile.value?.summary ?? ''
    isEditingProfile.value = true
  }
}

// ── 分身状态 ──────────────────────────────────────────────────────
const avatarStatus = ref<AvatarStatus | null>(null)

async function loadStatus() {
  avatarStatus.value = await getAvatarStatus()
}

async function onToggle(field: keyof AvatarStatus, value: boolean) {
  if (!avatarStatus.value) return
  avatarStatus.value = { ...avatarStatus.value, [field]: value }
  await updateAvatarStatus({ [field]: value })
}

// 频道选项
const channelOptions = [
  { key: 'buddy',  label: '找搭子' },
  { key: 'help',   label: '求助' },
  { key: 'dating', label: '恋爱' },
  { key: 'share',  label: '分享' },
]

function isChannelEnabled(key: string) {
  return avatarStatus.value?.enabledChannels?.includes(key) ?? false
}

async function toggleChannel(key: string) {
  if (!avatarStatus.value) return
  const channels = [...(avatarStatus.value.enabledChannels ?? [])]
  const idx = channels.indexOf(key)
  if (idx >= 0) channels.splice(idx, 1)
  else channels.push(key)
  avatarStatus.value = { ...avatarStatus.value, enabledChannels: channels }
  await updateAvatarStatus({ enabledChannels: channels })
}

// 行为选项
const actionOptions = [
  { key: 'reply_buddy', label: '帮我回复找搭子帖' },
  { key: 'reply_help',  label: '帮我回复求助帖' },
  { key: 'auto_post',   label: '自动发帖' },
  { key: 'push_match',  label: '发现匹配推送给我' },
]

function isActionEnabled(key: string) {
  return avatarStatus.value?.enabledActions?.includes(key) ?? false
}

async function toggleAction(key: string) {
  if (!avatarStatus.value) return
  const actions = [...(avatarStatus.value.enabledActions ?? [])]
  const idx = actions.indexOf(key)
  if (idx >= 0) actions.splice(idx, 1)
  else actions.push(key)
  avatarStatus.value = { ...avatarStatus.value, enabledActions: actions }
  await updateAvatarStatus({ enabledActions: actions })
}

// 匹配范围
function onChangeSchool() {
  uni.showModal({
    title: '切换学校',
    editable: true,
    placeholderText: '输入学校名称',
    success: async (res) => {
      if (res.confirm && res.content && avatarStatus.value) {
        const matchRange = { ...avatarStatus.value.matchRange, school: res.content }
        avatarStatus.value = { ...avatarStatus.value, matchRange }
        await updateAvatarStatus({ matchRange })
      }
    },
  })
}

async function adjustDistance(delta: number) {
  if (!avatarStatus.value) return
  const current = avatarStatus.value.matchRange?.distanceKm ?? 3
  const next = Math.max(1, Math.min(50, current + delta))
  const matchRange = { ...avatarStatus.value.matchRange, distanceKm: next }
  avatarStatus.value = { ...avatarStatus.value, matchRange }
  await updateAvatarStatus({ matchRange })
}

// 本地设置（AI 风格 & 隐私）
const settings = reactive({
  aiDiaryStyle: true,
  aiChatStyle: true,
  allowAnalyzeDiary: true,
  allowAnalyzeChat: false,
})

const dataRetentionOptions = ['30天', '90天', '180天', '365天']
const dataRetentionIndex = ref(1) // 默认 90天

function onDataRetentionChange(e: any) {
  dataRetentionIndex.value = e.detail.value
}
</script>

<style lang="scss" scoped>
// ── 颜色变量 ────────────────────────────────────────────────────────
$primary: #E8855A;
$bg: #FDF8F3;
$text-title: #2C1F14;
$text-body: #4A3628;
$hint: #AE9D92;
$card-bg: #FFFFFF;
$need-bg: #FFFDF9;

// ── 整体 ────────────────────────────────────────────────────────────
.page-wrapper {
  background: $bg;
  min-height: 100vh;
  position: relative;
}

.scroll-container {
  height: 100vh;
  box-sizing: border-box;
}

// ── 通用卡片 ────────────────────────────────────────────────────────
.card {
  background: $card-bg;
  border-radius: 24rpx;
  margin: 20rpx 32rpx;
  padding: 32rpx;
  box-shadow: 0 2px 12px rgba(44, 31, 20, 0.06);
}

// ── section header ───────────────────────────────────────────────────
.section-header {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-title;
  display: block;
  margin-bottom: 24rpx;
}

// ── 搜索浮层 ────────────────────────────────────────────────────────
.search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.3);
  z-index: 200;
  display: flex;
  align-items: flex-start;
}

.search-box {
  background: $card-bg;
  width: 100%;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 0;
}

.search-input {
  flex: 1;
  height: 72rpx;
  background: $bg;
  border-radius: 36rpx;
  padding: 0 28rpx;
  font-size: 28rpx;
  color: $text-body;
}

.search-cancel {
  font-size: 28rpx;
  color: $primary;
  white-space: nowrap;
}

// ── 头像区 ───────────────────────────────────────────────────────────
.avatar-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-icon-wrap {
  margin-bottom: 20rpx;
}

.avatar-summary {
  font-size: 28rpx;
  color: $text-body;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 28rpx;
}

.know-bar-wrap {
  width: 100%;
}

.know-bar-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.know-bar-label {
  font-size: 24rpx;
  color: $hint;
}

.know-bar-pct {
  font-size: 24rpx;
  color: $primary;
  font-weight: 600;
}

.know-bar-track {
  width: 100%;
  height: 12rpx;
  background: #F0E8E0;
  border-radius: 6rpx;
  overflow: hidden;
}

.know-bar-fill {
  height: 100%;
  border-radius: 6rpx;
  background: linear-gradient(90deg, #E8855A, #D4645C);
}

// ── 分类 Tab ─────────────────────────────────────────────────────────
.tab-card {
  padding: 24rpx;
}

.tab-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tab-btn {
  padding: 14rpx 24rpx;
  border-radius: 32rpx;
  background: #F5EDE4;
  transition: background 0.2s;
}

.tab-btn--active {
  background: $primary;
}

.tab-text {
  font-size: 26rpx;
  color: $text-body;
}

.tab-text--active {
  color: #FFFFFF;
  font-weight: 600;
}

// ── 需求卡片区 ────────────────────────────────────────────────────────
.need-section {
  margin: 0 32rpx;
}

.need-card {
  background: $need-bg;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  border: 1px solid #F0E0D0;
}

.need-card-top {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.need-status-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6rpx;
}

.need-dot--searching { background: #4CAF50; }
.need-dot--matched   { background: #FFC107; }
.need-dot--expired   { background: #BDBDBD; }

.need-content {
  font-size: 28rpx;
  color: $text-body;
  line-height: 1.6;
  flex: 1;
}

.need-status-text {
  font-size: 24rpx;
  color: $hint;
  display: block;
  margin-bottom: 12rpx;
}

.need-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.need-tag {
  font-size: 22rpx;
  color: $primary;
  background: rgba(232, 133, 90, 0.1);
  border-radius: 20rpx;
  padding: 6rpx 18rpx;
}

.need-actions {
  display: flex;
  gap: 20rpx;
  justify-content: flex-end;
}

.need-btn {
  font-size: 26rpx;
  color: $primary;
  padding: 8rpx 24rpx;
  border: 1px solid $primary;
  border-radius: 24rpx;
}

.need-btn--close {
  color: $hint;
  border-color: $hint;
}

// ── 记忆条目 ──────────────────────────────────────────────────────────
.memory-list-section {
  margin: 0 32rpx;
}

.group-header {
  margin: 24rpx 0 12rpx;
}

.group-label {
  font-size: 24rpx;
  color: $hint;
  font-weight: 500;
}

.memory-item {
  background: $card-bg;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 1px 8px rgba(44, 31, 20, 0.04);
}

.memory-normal {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.mem-cat-icon {
  font-size: 36rpx;
  flex-shrink: 0;
  line-height: 1.2;
}

.mem-body {
  flex: 1;
  min-width: 0;
}

.mem-content {
  font-size: 28rpx;
  color: $text-body;
  line-height: 1.6;
  display: block;
  margin-bottom: 8rpx;
}

.mem-source {
  font-size: 22rpx;
  color: $hint;
  display: block;
}

.mem-btns {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex-shrink: 0;
}

.mem-btn {
  font-size: 32rpx;
  padding: 4rpx;
}

// 编辑模式
.memory-edit-mode {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.memory-edit-textarea {
  width: 100%;
  min-height: 80rpx;
  font-size: 28rpx;
  color: $text-body;
  border: 1px solid #F0E0D0;
  border-radius: 12rpx;
  padding: 16rpx;
  box-sizing: border-box;
}

.memory-edit-actions {
  display: flex;
  gap: 16rpx;
  justify-content: flex-end;
}

.mem-act-btn {
  font-size: 26rpx;
  padding: 10rpx 28rpx;
  border-radius: 24rpx;
}

.mem-act-save {
  background: $primary;
  color: #FFFFFF;
}

.mem-act-cancel {
  background: #F5EDE4;
  color: $hint;
}

// ── 空提示 ───────────────────────────────────────────────────────────
.empty-tip {
  display: flex;
  justify-content: center;
  padding: 48rpx 0;
}

.empty-tip-text {
  font-size: 28rpx;
  color: $hint;
}

// ── 添加记忆 ─────────────────────────────────────────────────────────
.add-memory-card {
  border: 2px dashed #D4B8A8;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx;
  box-shadow: none;
}

.add-memory-text {
  font-size: 30rpx;
  color: $hint;
}

// 添加面板
.panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 300;
  display: flex;
  align-items: flex-end;
}

.add-panel {
  background: $card-bg;
  width: 100%;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 40rpx 60rpx;
}

.panel-title {
  font-size: 34rpx;
  font-weight: 600;
  color: $text-title;
  display: block;
  margin-bottom: 28rpx;
  text-align: center;
}

.panel-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.panel-tab {
  padding: 12rpx 24rpx;
  border-radius: 32rpx;
  background: #F5EDE4;
}

.panel-tab--active {
  background: $primary;
}

.panel-tab-text {
  font-size: 26rpx;
  color: $text-body;
}

.panel-tab--active .panel-tab-text {
  color: #FFFFFF;
}

.panel-textarea {
  width: 100%;
  min-height: 160rpx;
  font-size: 28rpx;
  color: $text-body;
  background: $bg;
  border-radius: 16rpx;
  padding: 24rpx;
  box-sizing: border-box;
  margin-bottom: 28rpx;
}

.panel-confirm-row {
  display: flex;
  gap: 24rpx;
}

.panel-cancel {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 24rpx;
  background: #F5EDE4;
  font-size: 30rpx;
  color: $hint;
}

.panel-confirm {
  flex: 2;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 24rpx;
  background: $primary;
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 600;
}

// ── 分身侧写 ─────────────────────────────────────────────────────────
.profile-card {
  // inherits .card
}

.profile-summary-text {
  font-size: 28rpx;
  color: $text-body;
  line-height: 1.8;
  display: block;
  margin-bottom: 20rpx;
}

.profile-edit-textarea {
  width: 100%;
  min-height: 200rpx;
  font-size: 28rpx;
  color: $text-body;
  border: 1px solid #F0E0D0;
  border-radius: 12rpx;
  padding: 16rpx;
  box-sizing: border-box;
}

.profile-meta {
  font-size: 22rpx;
  color: $hint;
  display: block;
  margin-bottom: 24rpx;
}

.profile-actions {
  display: flex;
  gap: 20rpx;
  justify-content: flex-end;
}

.profile-btn {
  font-size: 26rpx;
  color: $primary;
  padding: 10rpx 28rpx;
  border: 1px solid $primary;
  border-radius: 24rpx;
}

.profile-btn--primary {
  background: $primary;
  color: #FFFFFF;
  border-color: $primary;
}

.profile-btn--loading {
  opacity: 0.5;
}

// ── 分身设置 ─────────────────────────────────────────────────────────
.settings-card {
  // inherits .card
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1px solid #F5EDE4;
  &:last-child {
    border-bottom: none;
  }
}

.setting-row--inner {
  padding: 16rpx 0;
}

.setting-label {
  font-size: 28rpx;
  color: $text-body;
}

.setting-label-wrap {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.setting-hint {
  font-size: 22rpx;
  color: $hint;
}

.setting-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.setting-value-text {
  font-size: 26rpx;
  color: $hint;
}

.setting-btn-small {
  font-size: 24rpx;
  color: $primary;
  padding: 6rpx 20rpx;
  border: 1px solid $primary;
  border-radius: 20rpx;
}

.setting-group {
  padding: 20rpx 0;
  border-bottom: 1px solid #F5EDE4;
  &:last-child {
    border-bottom: none;
  }
}

.setting-group-label {
  font-size: 26rpx;
  color: $hint;
  display: block;
  margin-bottom: 16rpx;
}

.setting-checkbox-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.setting-checkbox-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  width: calc(50% - 10rpx);
}

.checkbox-box {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  border: 2px solid #D4B8A8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkbox-box--checked {
  background: $primary;
  border-color: $primary;
}

.checkbox-check {
  font-size: 22rpx;
  color: #FFFFFF;
  font-weight: 700;
}

.checkbox-label {
  font-size: 26rpx;
  color: $text-body;
}

.distance-btns {
  display: flex;
  gap: 8rpx;
}

.distance-btn {
  width: 52rpx;
  height: 52rpx;
  border-radius: 26rpx;
  border: 1px solid $primary;
  color: $primary;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 52rpx;
}

.picker-display {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.picker-arrow {
  font-size: 28rpx;
  color: $hint;
}
</style>