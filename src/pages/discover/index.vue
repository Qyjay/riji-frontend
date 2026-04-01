<template>
  <view class="page">
    <!-- ① NavBar -->
    <CustomNavBar title="广场">
      <template #right>
        <view class="nav-right-icons">
          <text class="nav-icon" @click="go('/pages/plaza/search')">🔍</text>
          <text class="nav-icon" @click="go('/pages/messages/notifications')">🔔</text>
        </view>
      </template>
    </CustomNavBar>

    <!-- NavBar 占位 -->
    <view :style="{ height: navHeight + 'px' }" />

    <!-- 主滚动区 -->
    <scroll-view
      class="main-scroll"
      scroll-y
      :style="{ height: scrollHeight + 'px' }"
      @scrolltolower="loadMore"
    >
      <!-- ② 频道 Tab 栏 -->
      <scroll-view class="channel-bar" scroll-x :show-scrollbar="false">
        <view class="channel-list">
          <view
            v-for="ch in channels"
            :key="ch.key"
            class="channel-pill"
            :class="{ 'channel-pill--active': activeChannel === ch.key }"
            @click="switchChannel(ch.key)"
          >
            <text
              class="channel-text"
              :class="{ 'channel-text--active': activeChannel === ch.key }"
            >{{ ch.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- ③ 分身状态条 -->
      <view class="avatar-status-bar" @click="go('/pages/profile/avatar-memory')">
        <text class="avatar-status-robot">🤖</text>
        <text class="avatar-status-text">{{ avatarStatusText }}</text>
        <text class="avatar-status-arrow">›</text>
      </view>

      <!-- ④ 信息流 -->
      <view class="feed-list">
        <block v-for="(item, idx) in feedList" :key="item.id">
          <!-- 分身推荐卡片 -->
          <view v-if="item._type === 'match'" class="match-card">
            <view class="match-card-left-bar" />
            <view class="match-card-body">
              <view class="match-card-header">
                <text class="match-card-tag">🤖 分身推荐</text>
              </view>
              <text class="match-card-summary" :numberOfLines="2">{{ item.post.content }}</text>
              <!-- 匹配原因 -->
              <view class="match-reasons">
                <view
                  v-for="(reason, ri) in item.matchReasons.slice(0, 3)"
                  :key="ri"
                  class="match-reason-item"
                >
                  <text class="match-reason-dot">·</text>
                  <text class="match-reason-text">{{ reason }}</text>
                </view>
              </view>
              <!-- 匹配度进度条 -->
              <view class="match-score-row">
                <text class="match-score-label">匹配度</text>
                <view class="match-score-bar-bg">
                  <view
                    class="match-score-bar-fill"
                    :style="{ width: item.matchScore + '%' }"
                  />
                </view>
                <text class="match-score-val">{{ item.matchScore }}%</text>
              </view>
              <!-- 分身对话预览 -->
              <view v-if="item.agentConversation && item.agentConversation.length" class="agent-conv-preview">
                <view
                  v-for="(msg, mi) in item.agentConversation.slice(0, 2)"
                  :key="mi"
                  class="agent-conv-msg"
                  :class="msg.from === 'my_agent' ? 'agent-conv-msg--mine' : 'agent-conv-msg--theirs'"
                >
                  <text class="agent-conv-sender">{{ msg.from === 'my_agent' ? '我的分身' : 'TA的分身' }}：</text>
                  <text class="agent-conv-content">{{ msg.content }}</text>
                </view>
              </view>
              <!-- 操作按钮 -->
              <view class="match-card-actions">
                <view class="match-btn match-btn--ignore" @click.stop="dismissMatchItem(item.id)">
                  <text class="match-btn-text match-btn-text--ignore">忽略</text>
                </view>
                <view class="match-btn match-btn--chat" @click.stop="acceptMatchItem(item.id, item.post.id)">
                  <text class="match-btn-text match-btn-text--chat">私聊 Ta</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 普通帖子卡片 -->
          <view
            v-else
            class="post-card"
            @click="go('/pages/plaza/detail?id=' + item.id)"
          >
            <!-- 作者信息 -->
            <view class="post-author-row">
              <image class="post-avatar" :src="item.authorAvatar" mode="aspectFill" />
              <view class="post-author-info">
                <view class="post-author-name-row">
                  <text class="post-author-name">{{ item.authorName }}</text>
                  <view v-if="item.isFromAgent" class="agent-post-badge">
                    <text class="agent-post-badge-text">🤖 分身代发</text>
                  </view>
                </view>
                <text class="post-author-meta">{{ item.authorSchool }} · {{ formatTime(item.createdAt) }}</text>
              </view>
              <!-- 类型标签 -->
              <view class="post-type-tag" :style="{ backgroundColor: typeColor(item.type) + '18', borderColor: typeColor(item.type) + '40' }">
                <text class="post-type-text" :style="{ color: typeColor(item.type) }">{{ typeLabel(item.type) }}</text>
              </view>
            </view>

            <!-- 正文 -->
            <text class="post-content" :numberOfLines="3">{{ item.content }}</text>

            <!-- 图片区（最多3张） -->
            <view v-if="item.images && item.images.length" class="post-images">
              <image
                v-for="(img, ii) in item.images.slice(0, 3)"
                :key="ii"
                class="post-image"
                :src="img"
                mode="aspectFill"
              />
            </view>

            <!-- 话题 + 位置 -->
            <view v-if="item.tags && item.tags.length || item.location" class="post-meta-row">
              <text v-for="(tag, ti) in item.tags.slice(0, 3)" :key="ti" class="post-tag">#{{ tag }}</text>
              <text v-if="item.location" class="post-location">📍 {{ item.location }}</text>
            </view>

            <!-- 互动栏 -->
            <view class="post-actions-row">
              <view class="post-action-item" @click.stop="likeItem(item)">
                <text class="post-action-icon">{{ item._liked ? '❤️' : '♡' }}</text>
                <text class="post-action-count">{{ item.likes }}</text>
              </view>
              <view class="post-action-item">
                <text class="post-action-icon">💬</text>
                <text class="post-action-count">{{ item.comments }}</text>
              </view>
              <view class="post-action-item">
                <text class="post-action-icon">🤖</text>
                <text class="post-action-count">{{ item.agentResponses }}个分身已响应</text>
              </view>
            </view>
          </view>
        </block>

        <!-- 加载状态 -->
        <view v-if="loading" class="feed-loading">
          <text class="feed-loading-text">加载中…</text>
        </view>
        <view v-else-if="noMore" class="feed-loading">
          <text class="feed-loading-text">没有更多了</text>
        </view>

        <!-- ⑤ 工具箱折叠区 -->
        <view class="toolbox-wrap">
          <view class="toolbox-header" @click="toolboxExpanded = !toolboxExpanded">
            <text class="toolbox-header-text">📦 工具箱</text>
            <text class="toolbox-toggle">{{ toolboxExpanded ? '收起▲' : '展开▼' }}</text>
          </view>
          <view v-if="toolboxExpanded" class="toolbox-grid">
            <view
              v-for="(item, idx) in toolboxItems"
              :key="item.key"
              class="toolbox-item"
              @click="handleToolClick(item.key, item.toast)"
            >
              <view class="toolbox-icon-box" :style="{ borderColor: item.borderColor }">
                <DoodleIcon :name="item.iconName" :color="item.iconColor" :size="52" />
              </view>
              <text class="toolbox-item-name">{{ item.name }}</text>
              <view v-if="item.toast" class="toolbox-badge">
                <text class="toolbox-badge-text">{{ item.toast }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 底部安全间距 -->
        <view class="bottom-spacer" />
      </view>
    </scroll-view>

    <!-- ⑥ TabBar -->
    <TabBar :current="1" />

    <!-- ⑦ 悬浮发帖按钮 -->
    <view class="fab" @click="go('/pages/plaza/post')">
      <text class="fab-icon">✏️</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import TabBar from '@/components/TabBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { getPlazaPosts, getAgentMatches, dismissMatch, acceptMatch, likePost, type PlazaPost, type AgentMatch } from '@/services/api/plaza'
import { getAvatarStatus, type AvatarStatus } from '@/services/api/avatar'

// ── 导航栏高度 ──────────────────────────────────────────────────
const navHeight = ref(64)
const scrollHeight = ref(600)

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navHeight.value = (info.statusBarHeight ?? 20) + 44
  // TabBar 约 60px
  scrollHeight.value = info.windowHeight - navHeight.value - 60

  await Promise.all([loadPosts(), loadAvatarStatus()])
})

// ── 频道 Tab ────────────────────────────────────────────────────
const channels = [
  { key: '', label: '推荐' },
  { key: 'buddy', label: '找搭子' },
  { key: 'help', label: '求助' },
  { key: 'dating', label: '恋爱' },
  { key: 'share', label: '分享' },
]
const activeChannel = ref('')

async function switchChannel(key: string) {
  if (activeChannel.value === key) return
  activeChannel.value = key
  page.value = 1
  posts.value = []
  matches.value = []
  noMore.value = false
  await loadPosts()
}

// ── 分身状态条 ──────────────────────────────────────────────────
const avatarStatus = ref<AvatarStatus | null>(null)
const avatarStatusText = computed(() => {
  if (!avatarStatus.value) return '冲浪中 · 加载中…'
  const s = avatarStatus.value
  return `冲浪中 · 已浏览${s.browsedCount}条 · 匹配${s.matchedCount}条`
})

async function loadAvatarStatus() {
  try {
    avatarStatus.value = await getAvatarStatus()
  } catch (e) {
    console.warn('getAvatarStatus failed', e)
  }
}

// ── 信息流 ──────────────────────────────────────────────────────
type FeedPost = PlazaPost & { _type: 'post'; _liked?: boolean }
type FeedMatch = AgentMatch & { _type: 'match' }
type FeedItem = FeedPost | FeedMatch

const posts = ref<PlazaPost[]>([])
const matches = ref<AgentMatch[]>([])
const page = ref(1)
const loading = ref(false)
const noMore = ref(false)

// 推荐卡片穿插位置（第2、5条帖子之后，即 index 1, 4）
const MATCH_INSERT_POSITIONS = [1, 4]

const feedList = computed<FeedItem[]>(() => {
  const result: FeedItem[] = []
  let matchIdx = 0
  posts.value.forEach((post, idx) => {
    result.push({ ...post, _type: 'post' })
    if (MATCH_INSERT_POSITIONS.includes(idx) && matchIdx < matches.value.length) {
      result.push({ ...matches.value[matchIdx++], _type: 'match' })
    }
  })
  return result
})

async function loadPosts() {
  if (loading.value || noMore.value) return
  loading.value = true
  try {
    const [postsRes, matchesRes] = await Promise.all([
      getPlazaPosts(activeChannel.value || undefined, page.value),
      page.value === 1 ? getAgentMatches() : Promise.resolve(null),
    ])
    if (postsRes.items.length === 0) {
      noMore.value = true
    } else {
      posts.value = page.value === 1 ? postsRes.items : [...posts.value, ...postsRes.items]
      page.value++
    }
    if (matchesRes) {
      matches.value = matchesRes.filter(m => m.status !== 'dismissed')
    }
  } catch (e) {
    console.error('loadPosts error', e)
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  await loadPosts()
}

// ── 互动操作 ─────────────────────────────────────────────────────
async function likeItem(item: FeedPost) {
  item._liked = !item._liked
  item.likes += item._liked ? 1 : -1
  try {
    await likePost(item.id)
  } catch (e) {
    // 回滚
    item._liked = !item._liked
    item.likes += item._liked ? 1 : -1
  }
}

async function dismissMatchItem(matchId: string) {
  matches.value = matches.value.filter(m => m.id !== matchId)
  try {
    await dismissMatch(matchId)
  } catch (e) {
    console.warn('dismissMatch failed', e)
  }
}

async function acceptMatchItem(matchId: string, postId: string) {
  try {
    await acceptMatch(matchId)
    uni.navigateTo({ url: `/pages/chat/index?postId=${postId}` })
  } catch (e) {
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  }
}

// ── 工具箱 ──────────────────────────────────────────────────────
const toolboxExpanded = ref(false)

const toolboxItems = [
  { key: 'comic',        iconName: 'grid',      iconColor: '#5CA06E', borderColor: '#9BC8A8', name: '漫画生成', toast: '' },
  { key: 'share-card',   iconName: 'share',     iconColor: '#D4728A', borderColor: '#E8A0B4', name: '分享卡片', toast: '' },
  { key: 'style-engine', iconName: 'wand',      iconColor: '#9B72C8', borderColor: '#C4A8E8', name: '文风引擎', toast: '' },
  { key: 'pomodoro',     iconName: 'tomato',    iconColor: '#E8855A', borderColor: '#F2B49B', name: '番茄钟',   toast: '' },
  { key: 'todo',         iconName: 'list',      iconColor: '#C87290', borderColor: '#E8B4C4', name: '待办清单', toast: '' },
  { key: 'growth',       iconName: 'chart',     iconColor: '#C8A86B', borderColor: '#E8C49B', name: '成长轨迹', toast: '' },
  { key: 'achievements', iconName: 'trophy',    iconColor: '#C8A86B', borderColor: '#E8C49B', name: '成就系统', toast: '' },
  { key: 'novel',        iconName: 'novel',     iconColor: '#9B72C8', borderColor: '#C4A8E8', name: '自传小说', toast: '' },
]

const toolboxRoutes: Record<string, string> = {
  comic:          '/pages/diary/comic',
  'share-card':   '/pages/diary/share-card',
  'style-engine': '/pages/diary/style-engine',
  pomodoro:       '/pages/study/pomodoro',
  todo:           '/pages/study/todo',
  growth:         '/pages/growth/index',
  achievements:   '/pages/growth/achievements',
  novel:          '/pages/novel/index',
}

function handleToolClick(key: string, toast?: string) {
  if (toast) {
    uni.showToast({ title: toast, icon: 'none' })
    return
  }
  const path = toolboxRoutes[key]
  if (path) uni.navigateTo({ url: path })
}

// ── 工具函数 ─────────────────────────────────────────────────────
function go(url: string) {
  uni.navigateTo({ url })
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    buddy: '找搭子',
    help: '求助',
    share: '分享',
    dating: '恋爱',
  }
  return map[type] ?? type
}

function typeColor(type: string) {
  const map: Record<string, string> = {
    buddy: '#6B8EB4',
    help: '#E8855A',
    share: '#5BBF8E',
    dating: '#D4728A',
  }
  return map[type] ?? '#AE9D92'
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = Date.now()
  const diff = Math.floor((now - ts) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style lang="scss" scoped>
/* ── 页面根 ──────────────────────────────────────────────────── */
.page {
  background: #FDF8F3;
  min-height: 100vh;
}

/* ── NavBar 右侧图标 ─────────────────────────────────────────── */
.nav-right-icons {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.nav-icon {
  font-size: 40rpx;
  line-height: 1;
}

/* ── 主滚动区 ────────────────────────────────────────────────── */
.main-scroll {
  -webkit-overflow-scrolling: touch;
}

/* ── ② 频道 Tab 栏 ───────────────────────────────────────────── */
.channel-bar {
  background: #FDF8F3;
  white-space: nowrap;
}

.channel-list {
  display: flex;
  padding: 16rpx 24rpx 12rpx;
  gap: 16rpx;
  white-space: nowrap;
}

.channel-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 56rpx;
  padding: 0 28rpx;
  border-radius: 28rpx;
  background: #F5F0EB;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.15s;
}

.channel-pill--active {
  background: #E8855A;
}

.channel-text {
  font-size: 26rpx;
  color: #4A3628;
  font-weight: 500;
}

.channel-text--active {
  color: #FFFFFF;
  font-weight: 700;
}

/* ── ③ 分身状态条 ────────────────────────────────────────────── */
.avatar-status-bar {
  display: flex;
  align-items: center;
  background: #FFFDF9;
  margin: 0 24rpx 16rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  border: 1px solid rgba(232, 133, 90, 0.12);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

.avatar-status-robot {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.avatar-status-text {
  flex: 1;
  font-size: 26rpx;
  color: #4A3628;
}

.avatar-status-arrow {
  font-size: 32rpx;
  color: #AE9D92;
  font-weight: 700;
}

/* ── ④ 信息流 ────────────────────────────────────────────────── */
.feed-list {
  padding: 0 24rpx;
}

/* 普通帖子卡片 */
.post-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2px 8px rgba(44, 31, 20, 0.06);
  border: 1px solid rgba(232, 133, 90, 0.08);
  cursor: pointer;
  &:active { opacity: 0.9; }
}

.post-author-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.post-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 16rpx;
}

.post-author-info {
  flex: 1;
}

.post-author-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 4rpx;
}

.post-author-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2C1F14;
}

.agent-post-badge {
  display: inline-flex;
  align-items: center;
  padding: 2rpx 12rpx;
  border-radius: 12rpx;
  background: rgba(232, 133, 90, 0.12);
  flex-shrink: 0;
}

.agent-post-badge-text {
  font-size: 20rpx;
  color: #E8855A;
  font-weight: 500;
  white-space: nowrap;
}

.post-author-meta {
  font-size: 22rpx;
  color: #8A7668;
}

.post-type-tag {
  border: 1px solid;
  border-radius: 12rpx;
  padding: 4rpx 14rpx;
  flex-shrink: 0;
}

.post-type-text {
  font-size: 22rpx;
  font-weight: 600;
}

.post-content {
  display: block;
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.6;
  margin-bottom: 16rpx;
  overflow: hidden;
  /* 3行截断（UniApp 兼容） */
}

.post-images {
  display: flex;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.post-image {
  flex: 1;
  height: 180rpx;
  border-radius: 12rpx;
  max-width: 226rpx; /* (750 - 24*2 - 24*2 - 8*2) / 3 ≈ 226 */
}

.post-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.post-tag {
  font-size: 22rpx;
  color: #E8855A;
  background: rgba(232, 133, 90, 0.08);
  padding: 2rpx 12rpx;
  border-radius: 10rpx;
}

.post-location {
  font-size: 22rpx;
  color: #8A7668;
}

.post-actions-row {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding-top: 12rpx;
  border-top: 1px solid rgba(232, 133, 90, 0.08);
}

.post-action-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  cursor: pointer;
}

.post-action-icon {
  font-size: 30rpx;
}

.post-action-count {
  font-size: 24rpx;
  color: #8A7668;
}

/* 分身推荐卡片 */
.match-card {
  display: flex;
  background: #FFFDF9;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2px 10px rgba(232, 133, 90, 0.1);
  border: 1px solid rgba(232, 133, 90, 0.2);
  overflow: hidden;
}

.match-card-left-bar {
  width: 3px;
  background: #E8855A;
  flex-shrink: 0;
}

.match-card-body {
  flex: 1;
  padding: 20rpx 20rpx 20rpx 18rpx;
}

.match-card-header {
  margin-bottom: 12rpx;
}

.match-card-tag {
  display: inline-block;
  font-size: 22rpx;
  color: #E8855A;
  font-weight: 600;
  background: rgba(232, 133, 90, 0.1);
  padding: 4rpx 14rpx;
  border-radius: 10rpx;
}

.match-card-summary {
  display: block;
  font-size: 26rpx;
  color: #4A3628;
  line-height: 1.5;
  margin-bottom: 14rpx;
  overflow: hidden;
}

.match-reasons {
  margin-bottom: 14rpx;
}

.match-reason-item {
  display: flex;
  align-items: flex-start;
  gap: 6rpx;
  margin-bottom: 6rpx;
}

.match-reason-dot {
  font-size: 26rpx;
  color: #E8855A;
  line-height: 1.4;
  flex-shrink: 0;
}

.match-reason-text {
  font-size: 24rpx;
  color: #4A3628;
  line-height: 1.4;
}

.match-score-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 14rpx;
}

.match-score-label {
  font-size: 22rpx;
  color: #8A7668;
  flex-shrink: 0;
}

.match-score-bar-bg {
  flex: 1;
  height: 8rpx;
  background: #F0EAE4;
  border-radius: 4rpx;
  overflow: hidden;
}

.match-score-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #E8855A, #F0A882);
  border-radius: 4rpx;
  transition: width 0.4s;
}

.match-score-val {
  font-size: 24rpx;
  color: #E8855A;
  font-weight: 700;
  flex-shrink: 0;
  width: 60rpx;
  text-align: right;
}

.agent-conv-preview {
  background: rgba(232, 133, 90, 0.05);
  border-radius: 12rpx;
  padding: 12rpx 14rpx;
  margin-bottom: 16rpx;
}

.agent-conv-msg {
  font-size: 24rpx;
  line-height: 1.5;
  margin-bottom: 6rpx;
  &:last-child { margin-bottom: 0; }
}

.agent-conv-msg--mine .agent-conv-sender {
  color: #E8855A;
}

.agent-conv-msg--theirs .agent-conv-sender {
  color: #6B8EB4;
}

.agent-conv-sender {
  font-weight: 600;
}

.agent-conv-content {
  color: #4A3628;
}

.match-card-actions {
  display: flex;
  gap: 16rpx;
}

.match-btn {
  flex: 1;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:active { opacity: 0.8; }
}

.match-btn--ignore {
  background: #F5F0EB;
  border: 1px solid rgba(74, 54, 40, 0.15);
}

.match-btn--chat {
  background: #E8855A;
}

.match-btn-text {
  font-size: 26rpx;
  font-weight: 600;
}

.match-btn-text--ignore {
  color: #4A3628;
}

.match-btn-text--chat {
  color: #FFFFFF;
}

/* 加载状态 */
.feed-loading {
  display: flex;
  justify-content: center;
  padding: 24rpx 0;
}

.feed-loading-text {
  font-size: 24rpx;
  color: #AE9D92;
}

/* ── ⑤ 工具箱 ────────────────────────────────────────────────── */
.toolbox-wrap {
  background: #FFFFFF;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  border: 1px solid rgba(232, 133, 90, 0.08);
  box-shadow: 0 2px 8px rgba(44, 31, 20, 0.04);
}

.toolbox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  cursor: pointer;
  &:active { background: rgba(232, 133, 90, 0.04); }
}

.toolbox-header-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #2C1F14;
}

.toolbox-toggle {
  font-size: 24rpx;
  color: #E8855A;
  font-weight: 500;
}

.toolbox-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 16rpx 20rpx;
  gap: 12rpx;
}

.toolbox-item {
  width: calc(25% - 9rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 4rpx;
  position: relative;
  cursor: pointer;
  &:active { opacity: 0.75; }
}

.toolbox-icon-box {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  border-width: 1.5px;
  border-style: solid;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FDF8F3;
}

.toolbox-item-name {
  font-size: 22rpx;
  color: #4A3628;
  text-align: center;
}

.toolbox-badge {
  position: absolute;
  top: 6rpx;
  right: 0rpx;
  background: #C87290;
  border-radius: 8rpx;
  padding: 2rpx 8rpx;
}

.toolbox-badge-text {
  font-size: 18rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* ── 底部安全间距 ─────────────────────────────────────────────── */
.bottom-spacer {
  height: 200rpx;
}

/* ── ⑦ 悬浮发帖按钮 ──────────────────────────────────────────── */
.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(120rpx + env(safe-area-inset-bottom));
  /* TabBar 约 120rpx，再上方 120rpx */
  bottom: 240rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #E8855A;
  box-shadow: 0 4px 16px rgba(232, 133, 90, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  cursor: pointer;
  &:active { transform: scale(0.92); }
}

.fab-icon {
  font-size: 40rpx;
  line-height: 1;
}
</style>