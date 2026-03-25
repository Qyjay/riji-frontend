<template>
  <view class="page page-root">

    <!-- ── 顶栏 ── -->
    <CustomNavBar title="消息" />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <!-- ── 滚动内容区 ── -->
    <scroll-view class="page-scroll" scroll-y :style="{ height: scrollHeight + 'px' }">

      <!-- AI 伙伴置顶 -->
      <view class="ai-chat-card press-feedback" @click="openAI">
        <view class="ai-left">
          <view class="ai-avatar doodle-box">
            <DoodleIcon name="robot" color="#FFFFFF" :size="48" :filtered="false" />
          </view>
          <view class="ai-info">
            <view class="ai-name-row">
              <text class="ai-name">AI 伙伴</text>
              <text class="ai-time">刚刚</text>
            </view>
            <text class="ai-preview">看到你昨天的雅思全对了...</text>
          </view>
        </view>
        <view class="unread-badge">
          <text class="unread-num">2</text>
        </view>
      </view>

      <!-- ── 搭子消息 ── -->
      <view class="section-sep">
        <view class="sep-line" />
        <text class="sep-label font-handwrite">搭子消息</text>
        <view class="sep-line" />
      </view>

      <view class="buddy-list">
        <view
          v-for="(buddy, idx) in buddyMessages"
          :key="buddy.id"
          class="buddy-item press-feedback stagger-item"
          :style="{ '--delay': (idx * 0.08) + 's' }"
          @click="openBuddy(buddy)"
        >
          <view class="buddy-avatar" :style="{ background: buddy.avatarBg }">
            <DoodleIcon :name="buddy.iconName" color="#FFFFFF" :size="44" :filtered="false" />
          </view>
          <view class="buddy-info">
            <view class="buddy-name-row">
              <text class="buddy-name">{{ buddy.name }}</text>
              <text class="buddy-time">{{ buddy.time }}</text>
            </view>
            <text class="buddy-preview">{{ buddy.lastMsg }}</text>
          </view>
          <view v-if="buddy.unread > 0" class="unread-badge">
            <text class="unread-num">{{ buddy.unread }}</text>
          </view>
        </view>
      </view>

      <!-- ── 系统通知 ── -->
      <view class="section-sep">
        <view class="sep-line" />
        <text class="sep-label font-handwrite">系统通知</text>
        <view class="sep-line" />
      </view>

      <view class="system-list">
        <view
          v-for="(notif, idx) in systemNotifications"
          :key="notif.id"
          class="system-item press-feedback stagger-item"
          :style="{ '--delay': (idx * 0.1) + 's' }"
          @click="handleSystemNotif(notif)"
        >
          <view class="system-icon-wrap doodle-box-v2" :style="{ background: notif.bgColor }">
            <DoodleIcon :name="notif.iconName" :color="notif.iconColor" :size="40" />
          </view>
          <view class="system-info">
            <view class="system-name-row">
              <text class="system-name">{{ notif.type }}</text>
              <text class="system-time">{{ notif.time }}</text>
            </view>
            <text class="system-content">{{ notif.content }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- ── TabBar ── -->
    <TabBar :current="3" />

  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import TabBar from '@/components/TabBar.vue'
import CustomNavBar from '@/components/CustomNavBar.vue'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 50
})

const buddyMessages = [
  {
    id: 1,
    iconName: 'bookopen',
    avatarBg: 'linear-gradient(135deg, #7BB8D4, #A8D4E8)',
    name: '学习搭子 · 小明',
    lastMsg: '明天一起去图书馆吗？',
    time: '3小时前',
    unread: 0,
  },
  {
    id: 2,
    iconName: 'run',
    avatarBg: 'linear-gradient(135deg, #F2B49B, #F7CDB5)',
    name: '运动搭子 · 小红',
    lastMsg: '晨跑 6:30，老地方见！',
    time: '昨天',
    unread: 1,
  },
  {
    id: 3,
    iconName: 'heart',
    avatarBg: 'linear-gradient(135deg, #5BAF85, #8ECFAD)',
    name: '美食搭子 · 小华',
    lastMsg: '发现了一家新开的奶茶店！',
    time: '2天前',
    unread: 0,
  },
]

const systemNotifications = [
  {
    id: 1,
    iconName: 'trophy',
    iconColor: '#C8A86B',
    bgColor: '#FFF8EE',
    type: '成就解锁 · 今天',
    content: '"连续7天写日记" 成就已解锁！',
    time: '今天',
    path: '/pages/growth/achievements',
  },
  {
    id: 2,
    iconName: 'chart',
    iconColor: '#6BA87B',
    bgColor: '#F0FFF5',
    type: '成长提醒 · 昨天',
    content: '本周成长值 +125，排名上升 3 位',
    time: '昨天',
    path: '/pages/growth/index',
  },
]

function openAI() {
  uni.navigateTo({ url: '/pages/chat/index' })
}

function openBuddy(buddy: any) {
  uni.showToast({ title: '搭子聊天开发中', icon: 'none' })
}

function handleSystemNotif(notif: any) {
  if (notif.path) {
    uni.navigateTo({ url: notif.path })
  }
}

</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {
}

.page-scroll {
  -webkit-overflow-scrolling: touch;
  padding-bottom: 120rpx;
}

/* 用 CSS var 覆盖 stagger delay */
.stagger-item {
  animation-delay: var(--delay, 0s) !important;
}

/* ── AI 伙伴置顶卡 ── */
.ai-chat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24rpx 32rpx;
  padding: 28rpx 32rpx;
  background: #FFFFFF;
  border-radius: 32rpx 40rpx 28rpx 36rpx;
  border-left: 6rpx solid #E8855A;
  box-shadow: 2px 3px 0 rgba(232, 133, 90, 0.08), 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.ai-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex: 1;
  min-width: 0;
}

.ai-avatar {
  width: 92rpx;
  height: 92rpx;
  background: linear-gradient(135deg, #E8855A, #F0A882) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 2px 2px 0 rgba(232, 133, 90, 0.25);
}

.ai-info {
  flex: 1;
  min-width: 0;
}

.ai-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.ai-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C1F14;
}

.ai-time {
  font-size: 22rpx;
  color: #AE9D92;
  flex-shrink: 0;
}

.ai-preview {
  font-size: 26rpx;
  color: #857268;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.unread-badge {
  flex-shrink: 0;
  background: #E8855A;
  border-radius: 19998rpx;
  min-width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10rpx;
}

.unread-num { font-size: 22rpx; color: #FFFFFF; font-weight: 700; }

/* ── 分隔 ── */
.section-sep {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 32rpx 20rpx;
}

.sep-line {
  flex: 1;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, #D4C4B8, transparent);
}

.sep-label { font-size: 24rpx; color: #857268; white-space: nowrap; }

.font-handwrite {
  font-family: 'ZcoolKuaiLe', 'ZCOOL KuaiLe', 'STXingkai', 'KaiTi', 'PingFang SC', sans-serif !important;
}

/* ── 搭子消息列表 ── */
.buddy-list {
  margin: 0 32rpx;
  background: #FFFFFF;
  border-radius: 32rpx 40rpx 28rpx 36rpx;
  overflow: hidden;
  box-shadow: 2px 3px 0 rgba(232, 133, 90, 0.06), 0 1px 6px rgba(44, 31, 20, 0.05);
}

.buddy-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 32rpx;
  border-bottom: 1px solid rgba(44, 31, 20, 0.05);
  cursor: pointer;
  &:last-child { border-bottom: none; }
}

.buddy-avatar {
  width: 92rpx;
  height: 92rpx;
  border-radius: 28rpx 36rpx 24rpx 32rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 1px 2px 0 rgba(0, 0, 0, 0.08);
}

.buddy-info { flex: 1; min-width: 0; }

.buddy-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.buddy-name { font-size: 30rpx; font-weight: 600; color: #2C1F14; }
.buddy-time { font-size: 22rpx; color: #AE9D92; }

.buddy-preview {
  font-size: 26rpx;
  color: #AE9D92;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* ── 系统通知 ── */
.system-list {
  margin: 0 32rpx;
  background: #F5F0EB;
  border-radius: 32rpx 40rpx 28rpx 36rpx;
  overflow: hidden;
  box-shadow: 1px 2px 0 rgba(44, 31, 20, 0.04);
}

.system-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 32rpx;
  border-bottom: 1px solid rgba(44, 31, 20, 0.05);
  cursor: pointer;
  &:last-child { border-bottom: none; }
}

.system-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(232, 133, 90, 0.15);
}

.system-info { flex: 1; min-width: 0; }

.system-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.system-name { font-size: 26rpx; color: #4A3628; font-weight: 600; }
.system-time { font-size: 22rpx; color: #AE9D92; }

.system-content {
  font-size: 26rpx;
  color: #857268;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.bottom-spacer { height: 40rpx; }
</style>
