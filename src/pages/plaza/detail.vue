<template>
  <view class="page">
    <!-- 导航栏占位 -->
    <view :style="{ height: navBarHeight + 'px' }" />

    <!-- 自定义导航栏 -->
    <CustomNavBar
      title=""
      leftIcon="back"
      rightIcon="···"
      @rightClick="handleMore"
    />

    <scroll-view
      scroll-y
      class="scroll-content"
      :style="{ paddingBottom: '140rpx' }"
      @scrolltolower="loadMore"
    >
      <!-- 加载中 -->
      <view v-if="loading" class="loading-wrap">
        <text class="loading-text">加载中...</text>
      </view>

      <template v-else-if="post">
        <!-- 帖子正文区 -->
        <view class="post-section">
          <!-- 作者信息 -->
          <view class="author-row">
            <image :src="post.authorAvatar" class="avatar" mode="aspectFill" />
            <view class="author-info">
              <view class="author-name-row">
                <text class="author-name">{{ post.authorName }}</text>
                <view v-if="post.isFromAgent" class="agent-post-badge">
                  <text class="agent-post-badge-text">🤖 分身代发</text>
                </view>
              </view>
              <text class="author-meta">{{ post.authorSchool }} · {{ post.authorMajor }}</text>
              <text class="post-time">{{ formatTime(post.createdAt) }}</text>
            </view>
            <!-- 类型标签 -->
            <view class="type-tag" :style="{ background: typeColor(post.type) + '22', borderColor: typeColor(post.type) }">
              <text class="type-tag-text" :style="{ color: typeColor(post.type) }">{{ typeLabel(post.type) }}</text>
            </view>
          </view>

          <!-- 正文 -->
          <text class="post-content">{{ post.content }}</text>

          <!-- 图片宫格 -->
          <view v-if="post.images && post.images.length" class="image-grid" :class="gridClass(post.images.length)">
            <image
              v-for="(img, idx) in post.images"
              :key="idx"
              :src="img"
              class="grid-image"
              mode="aspectFill"
              @click="previewImage(post.images, idx)"
            />
          </view>

          <!-- 话题标签 + 位置 -->
          <view class="meta-row">
            <text v-for="tag in post.tags" :key="tag" class="meta-tag">#{{ tag }}</text>
            <text v-if="post.location" class="meta-location">📍 {{ post.location }}</text>
          </view>

          <!-- 互动栏 -->
          <view class="action-bar">
            <view class="action-item" @click="handleLike">
              <text class="action-icon" :style="liked ? { color: '#E8855A' } : {}">{{ liked ? '♥' : '♡' }}</text>
              <text class="action-count">{{ post.likes + (liked ? 1 : 0) }}</text>
            </view>
            <view class="action-item" @click="focusComment">
              <text class="action-icon">💬</text>
              <text class="action-count">{{ post.comments }}</text>
            </view>
            <view class="action-item" @click="handleShare">
              <text class="action-icon">📤</text>
              <text class="action-count">分享</text>
            </view>
          </view>
        </view>

        <!-- 分身对话区 -->
        <view v-if="agentMatch" class="section">
          <view class="section-header">
            <text class="section-title">分身对话({{ agentMatch.agentConversation.length }})</text>
          </view>
          <view class="agent-conversation">
            <view
              v-for="(msg, idx) in agentMatch.agentConversation"
              :key="idx"
              class="agent-msg"
              :class="msg.from === 'my_agent' ? 'agent-msg--mine' : 'agent-msg--theirs'"
            >
              <view class="agent-msg-bubble">
                <text class="agent-msg-source">{{ msg.from === 'my_agent' ? '🤖 你的分身' : '🤖 对方分身' }}</text>
                <text class="agent-msg-content">{{ msg.content }}</text>
              </view>
            </view>
          </view>
          <view class="agent-continue-btn" @click="handleAgentContinue">
            <text class="agent-continue-text">让分身继续聊</text>
          </view>
        </view>

        <!-- 评论区 -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">评论({{ comments.length }})</text>
          </view>
          <view v-if="comments.length === 0" class="empty-comments">
            <text class="empty-text">还没有评论，来说点什么吧</text>
          </view>
          <view
            v-for="comment in comments"
            :key="comment.id"
            class="comment-item"
            :style="comment.isAgent ? { background: '#F5F0EB' } : {}"
          >
            <image :src="comment.authorAvatar" class="comment-avatar" mode="aspectFill" />
            <view class="comment-body">
              <view class="comment-header">
                <text class="comment-name">{{ comment.authorName }}</text>
                <view v-if="comment.isAgent" class="agent-badge">
                  <text class="agent-badge-text">分身</text>
                </view>
              </view>
              <text class="comment-content">{{ comment.content }}</text>
              <text class="comment-time">{{ formatTime(comment.createdAt) }}</text>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>

    <!-- 底部评论输入栏 -->
    <view class="bottom-bar" :style="{ paddingBottom: safeBottom + 'px' }">
      <view class="comment-input-wrap">
        <input
          ref="commentInputRef"
          v-model="commentText"
          class="comment-input"
          placeholder="写评论..."
          placeholder-class="input-placeholder"
          confirm-type="send"
          @confirm="submitComment(false)"
        />
      </view>
      <view class="bottom-actions">
        <view class="send-btn" @click="submitComment(false)">
          <text class="send-btn-text">发送</text>
        </view>
        <view class="agent-reply-btn" @click="submitComment(true)">
          <text class="agent-reply-text">🤖分身回</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import {
  getPostDetail,
  getPostComments,
  addComment,
  likePost,
  getAgentMatches,
} from '@/services/api/plaza'
import type { PlazaPost, PlazaComment, AgentMatch } from '@/services/api/plaza'

// 导航栏高度
const navBarHeight = ref(64)
const safeBottom = ref(0)

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navBarHeight.value = (info.statusBarHeight ?? 20) + 44
  safeBottom.value = info.safeAreaInsets?.bottom ?? 0

  // 获取页面参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.options ?? {}
  const id = options.id as string | undefined

  if (id) {
    await loadPost(id)
  }
})

const post = ref<PlazaPost | null>(null)
const comments = ref<PlazaComment[]>([])
const agentMatch = ref<AgentMatch | null>(null)
const loading = ref(true)
const liked = ref(false)
const commentText = ref('')

async function loadPost(id: string) {
  loading.value = true
  try {
    const [postData, commentsData, matches] = await Promise.all([
      getPostDetail(id),
      getPostComments(id),
      getAgentMatches(),
    ])
    post.value = postData
    comments.value = commentsData
    // 查找与当前帖子匹配的分身对话
    const match = matches.find(m => m.postId === id)
    agentMatch.value = match ?? null
  } finally {
    loading.value = false
  }
}

function loadMore() {
  // 分页加载更多评论（预留）
}

// 点赞
async function handleLike() {
  if (!post.value) return
  liked.value = !liked.value
  if (liked.value) {
    try {
      await likePost(post.value.id)
    } catch {
      liked.value = false
    }
  }
}

// 分享
function handleShare() {
  uni.showShareMenu({ withShareTicket: true })
}

// 更多操作
function handleMore() {
  uni.showActionSheet({
    itemList: ['举报', '屏蔽该用户'],
    success() {},
  })
}

// 分身继续聊
function handleAgentContinue() {
  uni.showToast({ title: '分身已继续对话', icon: 'none' })
}

// 评论
function focusComment() {
  // 聚焦底部输入框
}

async function submitComment(isAgent: boolean) {
  if (!post.value || !commentText.value.trim()) {
    uni.showToast({ title: '请输入评论内容', icon: 'none' })
    return
  }
  try {
    const newComment = await addComment(post.value.id, commentText.value, isAgent)
    comments.value.push(newComment)
    commentText.value = ''
    uni.showToast({ title: isAgent ? '分身已回复' : '评论成功', icon: 'success' })
  } catch {
    uni.showToast({ title: '评论失败，请重试', icon: 'none' })
  }
}

// 预览图片
function previewImage(urls: string[], current: number) {
  uni.previewImage({
    urls,
    current: String(current),
  })
}

// 工具函数
function formatTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const typeMap: Record<string, { label: string; color: string }> = {
  buddy: { label: '🏃 找搭子', color: '#6B8EB4' },
  help: { label: '🆘 求助', color: '#E8855A' },
  share: { label: '📷 分享', color: '#5BBF8E' },
  dating: { label: '💕 恋爱', color: '#D4728A' },
}

function typeLabel(type: string): string {
  return typeMap[type]?.label ?? type
}

function typeColor(type: string): string {
  return typeMap[type]?.color ?? '#AE9D92'
}

function gridClass(count: number): string {
  if (count === 1) return 'grid-1'
  if (count === 4) return 'grid-4'
  return 'grid-3'
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #FDF8F3;
  display: flex;
  flex-direction: column;
}

.scroll-content {
  flex: 1;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #AE9D92;
}

/* 帖子正文区 */
.post-section {
  padding: 32rpx;
  border-bottom: 1px solid #F0E8E0;
}

.author-row {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid #E8DDD4;
}

.author-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.author-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C1F14;
}

.author-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.agent-post-badge {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 14rpx;
  border-radius: 14rpx;
  background: rgba(232, 133, 90, 0.12);
  flex-shrink: 0;
}

.agent-post-badge-text {
  font-size: 22rpx;
  color: #E8855A;
  font-weight: 500;
  white-space: nowrap;
}

.author-meta {
  font-size: 24rpx;
  color: #AE9D92;
}

.post-time {
  font-size: 22rpx;
  color: #C8B8AE;
}

.type-tag {
  padding: 8rpx 16rpx;
  border-radius: 24rpx;
  border: 1px solid;
  flex-shrink: 0;
}

.type-tag-text {
  font-size: 22rpx;
  font-weight: 500;
}

.post-content {
  font-size: 30rpx;
  color: #2C1F14;
  line-height: 1.8;
  margin-bottom: 24rpx;
  display: block;
}

/* 图片宫格 */
.image-grid {
  display: grid;
  gap: 8rpx;
  margin-bottom: 24rpx;
  border-radius: 12rpx;
  overflow: hidden;

  &.grid-1 {
    grid-template-columns: 1fr;
    .grid-image { height: 400rpx; }
  }

  &.grid-3 {
    grid-template-columns: repeat(3, 1fr);
    .grid-image { height: 220rpx; }
  }

  &.grid-4 {
    grid-template-columns: repeat(2, 1fr);
    .grid-image { height: 300rpx; }
  }
}

.grid-image {
  width: 100%;
  border-radius: 8rpx;
  display: block;
}

/* meta 标签行 */
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.meta-tag {
  font-size: 24rpx;
  color: #6B8EB4;
  background: #6B8EB422;
  padding: 6rpx 16rpx;
  border-radius: 24rpx;
}

.meta-location {
  font-size: 24rpx;
  color: #AE9D92;
}

/* 互动栏 */
.action-bar {
  display: flex;
  gap: 48rpx;
  padding-top: 8rpx;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.action-icon {
  font-size: 36rpx;
  color: #4A3628;
}

.action-count {
  font-size: 26rpx;
  color: #AE9D92;
}

/* 分区通用 */
.section {
  padding: 24rpx 32rpx;
  border-bottom: 1px solid #F0E8E0;
}

.section-header {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C1F14;
}

/* 分身对话 */
.agent-conversation {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.agent-msg {
  display: flex;

  &--mine {
    justify-content: flex-end;

    .agent-msg-bubble {
      background: #E8855A22;
      border-radius: 20rpx 4rpx 20rpx 20rpx;
    }
  }

  &--theirs {
    justify-content: flex-start;

    .agent-msg-bubble {
      background: #F0E8E0;
      border-radius: 4rpx 20rpx 20rpx 20rpx;
    }
  }
}

.agent-msg-bubble {
  max-width: 80%;
  padding: 16rpx 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.agent-msg-source {
  font-size: 22rpx;
  color: #AE9D92;
}

.agent-msg-content {
  font-size: 28rpx;
  color: #2C1F14;
  line-height: 1.6;
}

.agent-continue-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  border-radius: 16rpx;
  border: 1px solid #E8855A;
  background: #E8855A11;
}

.agent-continue-text {
  font-size: 28rpx;
  color: #E8855A;
  font-weight: 500;
}

/* 评论区 */
.empty-comments {
  padding: 48rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: 28rpx;
  color: #AE9D92;
}

.comment-item {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 16rpx;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
}

.comment-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid #E8DDD4;
}

.comment-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.comment-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #2C1F14;
}

.agent-badge {
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
  background: #E8855A22;
}

.agent-badge-text {
  font-size: 20rpx;
  color: #E8855A;
}

.comment-content {
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.6;
}

.comment-time {
  font-size: 22rpx;
  color: #C8B8AE;
}

/* 底部评论输入栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FEFAF7;
  border-top: 1px solid #F0E8E0;
  padding: 16rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
}

.comment-input-wrap {
  flex: 1;
  background: #F5F0EB;
  border-radius: 40rpx;
  padding: 16rpx 24rpx;
}

.comment-input {
  width: 100%;
  font-size: 28rpx;
  color: #2C1F14;
  line-height: 1.4;
}

.input-placeholder {
  color: #AE9D92;
}

.bottom-actions {
  display: flex;
  gap: 12rpx;
  flex-shrink: 0;
}

.send-btn {
  padding: 16rpx 28rpx;
  border-radius: 40rpx;
  background: #E8855A;
  display: flex;
  align-items: center;
}

.send-btn-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

.agent-reply-btn {
  padding: 16rpx 20rpx;
  border-radius: 40rpx;
  border: 1px solid #E8855A;
  background: #E8855A11;
  display: flex;
  align-items: center;
}

.agent-reply-text {
  font-size: 24rpx;
  color: #E8855A;
}
</style>
