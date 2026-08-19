<template>
  <view class="page">
    <CustomNavBar title="活动房间" left-icon="back" />
    <view :style="{ height: navHeight + 'px' }" />

    <scroll-view
      class="scroll"
      scroll-y
      :scroll-into-view="scrollTarget"
      :style="{ height: scrollHeight + 'px' }"
    >
      <view v-if="loading" class="content">
        <Skeleton :width="'72%'" :height="44" :margin-bottom="20" />
        <Skeleton :width="'100%'" :height="150" :radius="20" />
      </view>

      <view v-else-if="room" class="content">
        <view class="room-head">
          <view class="status-line">
            <view class="status-dot" :class="{ completed: room.status === 'completed' }" />
            <text>{{ room.status === 'completed' ? '活动已完成' : '双方已确认参加' }}</text>
          </view>
          <text class="room-title">{{ room.title }}</text>
          <text class="room-note">现在由真人交流。分身不会替任何人确认时间、地点或承诺。</text>
        </view>

        <view class="activity-facts">
          <view class="fact-row">
            <view class="fact-icon"><DoodleIcon name="calendar" :size="31" color="#5D7F99" /></view>
            <view class="fact-main">
              <text class="fact-label">时间</text>
              <text class="fact-value">{{ timeText }}</text>
            </view>
          </view>
          <view class="fact-row">
            <view class="fact-icon"><DoodleIcon name="pin" :size="31" color="#5D7F99" /></view>
            <view class="fact-main">
              <text class="fact-label">地点</text>
              <text class="fact-value">{{ room.location.label || '由双方真人确认具体地点' }}</text>
            </view>
          </view>
          <view class="fact-row">
            <view class="fact-icon"><DoodleIcon name="target" :size="31" color="#5D7F99" /></view>
            <view class="fact-main">
              <text class="fact-label">预算</text>
              <text class="fact-value">{{ budgetText }}</text>
            </view>
          </view>
          <view v-if="room.linkedPostId" class="post-link" @click="openPost">
            <text>查看原招募帖</text>
            <text>›</text>
          </view>
        </view>

        <view class="participants-heading">
          <text class="section-title">参与者</text>
          <text class="participant-count">{{ room.participants.length }} 人</text>
        </view>
        <view class="participants">
          <view v-for="participant in room.participants" :key="participant.id" class="participant">
            <view class="participant-avatar">
              <image v-if="participant.avatar" :src="participant.avatar" mode="aspectFill" />
              <text v-else>{{ participant.name.slice(0, 1) }}</text>
            </view>
            <view class="participant-copy">
              <view class="participant-name-line">
                <text class="participant-name">{{ participant.name }}</text>
                <text v-if="participant.isOrganizer" class="organizer">发起人</text>
              </view>
              <text class="participant-school">{{ participant.school || '学校未公开' }}</text>
            </view>
          </view>
        </view>

        <view class="chat-heading">
          <text class="section-title">真人沟通</text>
          <text class="chat-note">具体安排请由双方确认</text>
        </view>

        <view v-if="!messages.length" class="chat-empty">
          <text class="chat-empty-title">还没有真人消息</text>
          <text class="chat-empty-desc">可以先确认具体时间、碰面位置和迟到时如何联系。</text>
        </view>

        <view class="messages">
          <view
            v-for="message in messages"
            :id="`message-${message.id}`"
            :key="message.id"
            class="message"
            :class="{ mine: message.fromUid === currentUserId }"
          >
            <text class="message-sender">{{ senderName(message.fromUid) }}</text>
            <view class="message-bubble">
              <text>{{ message.content }}</text>
            </view>
          </view>
        </view>

        <view v-if="room.status !== 'completed'" class="complete-action" @click="completeRoom">
          <DoodleIcon name="check" :size="30" color="#4E7C5E" />
          <view class="complete-copy">
            <text class="complete-title">活动结束后确认完成</text>
            <text class="complete-desc">确认后，这项任务会停止继续推荐</text>
          </view>
          <text class="complete-arrow">›</text>
        </view>

        <view class="safety-note">
          <DoodleIcon name="lock" :size="28" color="#5C8069" />
          <text>第一次线下见面建议选择公共场所。实时位置只能由本人主动分享。</text>
        </view>
        <view id="message-bottom" class="bottom-space" />
      </view>
    </scroll-view>

    <view v-if="room && room.status !== 'completed'" class="composer">
      <input
        v-model="messageText"
        class="message-input"
        placeholder="由真人发送消息..."
        placeholder-class="input-placeholder"
        confirm-type="send"
        @confirm="sendCurrentMessage"
      />
      <view class="send-action" :class="{ disabled: sending || !messageText.trim() }" @click="sendCurrentMessage">
        <DoodleIcon name="send" :size="30" color="#FFF9F5" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import Skeleton from '@/components/Skeleton.vue'
import {
  completeActivityRoom,
  getActivityRoom,
  getMessages,
  sendMessage,
} from '@/services/api/social'
import type { ActivityRoom, Message } from '@/services/api/social'

const navHeight = ref(64)
const scrollHeight = ref(600)
const matchId = ref('')
const room = ref<ActivityRoom | null>(null)
const messages = ref<Message[]>([])
const loading = ref(true)
const messageText = ref('')
const sending = ref(false)
const scrollTarget = ref('')
const cachedUser = uni.getStorageSync('currentUser') || {}
const currentUserId = String(cachedUser.id || '')

const timeText = computed(() => {
  if (!room.value?.timeWindow?.startAt) return room.value?.timeWindow?.label || '时间待双方确认'
  const date = new Date(room.value.timeWindow.startAt)
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${minute}`
})

const budgetText = computed(() => {
  const budget = room.value?.budget || {}
  if (budget.type === 'free') return '免费'
  if (budget.type === 'range') return `人均 ${budget.min || 0} 到 ${budget.max || 0} 元`
  if (budget.type === 'host') return '由发起人安排'
  return '默认 AA，支付由双方线下确认'
})

onLoad((options: any) => {
  matchId.value = options?.matchId || ''
})

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navHeight.value = Math.max(info.statusBarHeight ?? 0, info.uniPlatform === 'web' ? 36 : 20) + 44
  scrollHeight.value = info.windowHeight - navHeight.value - 72
  await loadRoom()
})

async function loadRoom() {
  try {
    const [roomData, messageData] = await Promise.all([
      getActivityRoom(matchId.value),
      getMessages(matchId.value),
    ])
    room.value = roomData
    messages.value = messageData
  } catch (error: any) {
    uni.showToast({ title: error?.message || '活动房间加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function senderName(userId: string) {
  if (userId === currentUserId) return '我'
  return room.value?.participants.find(item => item.id === userId)?.name || '对方'
}

function scrollToBottom() {
  scrollTarget.value = ''
  setTimeout(() => {
    scrollTarget.value = 'message-bottom'
  }, 50)
}

async function sendCurrentMessage() {
  const text = messageText.value.trim()
  if (!text || sending.value) return
  sending.value = true
  try {
    const message = await sendMessage(matchId.value, text)
    messages.value.push(message)
    messageText.value = ''
    scrollToBottom()
  } catch (error: any) {
    uni.showToast({ title: error?.message || '消息发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}

function completeRoom() {
  uni.showModal({
    title: '确认活动已完成？',
    content: '确认后会停止这项任务的后续推荐，聊天记录仍会保留。',
    confirmText: '确认完成',
    cancelText: '还没结束',
    confirmColor: '#4F7E60',
    success: async (result) => {
      if (!result.confirm) return
      try {
        room.value = await completeActivityRoom(matchId.value)
      } catch (error: any) {
        uni.showToast({ title: error?.message || '状态更新失败', icon: 'none' })
      }
    },
  })
}

function openPost() {
  if (!room.value?.linkedPostId) return
  uni.navigateTo({
    url: `/pages/plaza/detail?id=${encodeURIComponent(room.value.linkedPostId)}`,
  })
}
</script>

<style lang="scss" scoped>
.page { min-height: 100%; background: #FDF8F3; }
.scroll { -webkit-overflow-scrolling: touch; }
.content { padding: 24rpx 32rpx 0; }
.room-head { padding: 22rpx 0 30rpx; }
.status-line { display: flex; align-items: center; gap: 9rpx; color: #53725E; font-size: 22rpx; margin-bottom: 12rpx; }
.status-dot { width: 13rpx; height: 13rpx; border-radius: 50%; background: #5A9A72; }
.status-dot.completed { background: #A5958B; }
.room-title { display: block; color: #2E211A; font-size: 43rpx; line-height: 1.25; font-weight: 750; }
.room-note { display: block; color: #756158; font-size: 23rpx; line-height: 1.55; margin-top: 12rpx; }
.activity-facts { padding: 22rpx; border-radius: 24rpx; background: #EDF4F8; border: 1rpx solid #D4E1EA; }
.fact-row { display: flex; align-items: center; gap: 14rpx; min-height: 76rpx; border-bottom: 1rpx solid #D7E3EA; }
.fact-row:last-of-type { border-bottom: 0; }
.fact-icon { width: 54rpx; display: flex; align-items: center; justify-content: center; }
.fact-main { flex: 1; display: flex; flex-direction: column; gap: 3rpx; }
.fact-label { color: #7890A1; font-size: 19rpx; }
.fact-value { color: #435B6D; font-size: 24rpx; font-weight: 600; }
.post-link { min-height: 68rpx; margin-top: 12rpx; padding-top: 10rpx; border-top: 1rpx solid #D7E3EA; display: flex; align-items: center; justify-content: space-between; color: #557A98; font-size: 23rpx; }
.participants-heading, .chat-heading { display: flex; align-items: baseline; justify-content: space-between; margin: 44rpx 0 14rpx; }
.section-title { color: #382A22; font-size: 31rpx; font-weight: 700; }
.participant-count, .chat-note { color: #927E72; font-size: 20rpx; }
.participant { min-height: 104rpx; display: flex; align-items: center; gap: 15rpx; border-bottom: 1rpx solid #E5D9CF; }
.participant-avatar { width: 70rpx; height: 70rpx; border-radius: 50%; background: #EFDDD2; overflow: hidden; color: #A45736; font-size: 28rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.participant-avatar image { width: 100%; height: 100%; }
.participant-copy { flex: 1; }
.participant-name-line { display: flex; align-items: center; gap: 10rpx; }
.participant-name { color: #44332A; font-size: 26rpx; font-weight: 650; }
.organizer { padding: 5rpx 9rpx; border-radius: 11rpx; background: #F2E4DA; color: #A15D3F; font-size: 18rpx; }
.participant-school { display: block; color: #89756A; font-size: 20rpx; margin-top: 4rpx; }
.chat-empty { padding: 28rpx 22rpx; border-radius: 20rpx; background: #F5ECE5; }
.chat-empty-title { display: block; color: #49372E; font-size: 25rpx; font-weight: 650; }
.chat-empty-desc { display: block; color: #7D695E; font-size: 21rpx; line-height: 1.5; margin-top: 5rpx; }
.messages { display: flex; flex-direction: column; gap: 20rpx; margin-top: 22rpx; }
.message { max-width: 84%; align-self: flex-start; display: flex; flex-direction: column; align-items: flex-start; }
.message.mine { align-self: flex-end; align-items: flex-end; }
.message-sender { color: #8A776B; font-size: 19rpx; margin-bottom: 6rpx; }
.message-bubble { padding: 17rpx 20rpx; border-radius: 20rpx; border-bottom-left-radius: 7rpx; background: #FFFDFC; border: 1rpx solid #E1D4CA; color: #49372E; font-size: 25rpx; line-height: 1.5; }
.message.mine .message-bubble { background: #E8855A; border-color: #E8855A; border-bottom-left-radius: 20rpx; border-bottom-right-radius: 7rpx; color: #FFF9F5; }
.complete-action { display: flex; align-items: center; gap: 13rpx; min-height: 96rpx; margin-top: 40rpx; padding: 16rpx 18rpx; border-radius: 20rpx; background: #EAF4EE; }
.complete-copy { flex: 1; }
.complete-title { display: block; color: #3E664C; font-size: 24rpx; font-weight: 650; }
.complete-desc { display: block; color: #66806E; font-size: 20rpx; margin-top: 4rpx; }
.complete-arrow { color: #6E8877; font-size: 32rpx; }
.safety-note { display: flex; align-items: flex-start; gap: 11rpx; margin-top: 24rpx; padding: 18rpx; border-radius: 19rpx; background: #EDF5F0; color: #597163; font-size: 21rpx; line-height: 1.5; }
.bottom-space { height: 120rpx; }
.composer { position: fixed; left: 0; right: 0; bottom: 0; min-height: 112rpx; padding: 14rpx 24rpx calc(14rpx + env(safe-area-inset-bottom)); background: #FFFDFC; border-top: 1rpx solid #E3D7CD; display: flex; align-items: center; gap: 12rpx; z-index: 100; }
.message-input { flex: 1; height: 78rpx; padding: 0 22rpx; border-radius: 22rpx; background: #F4ECE6; color: #44332A; font-size: 25rpx; }
.input-placeholder { color: #A39186; }
.send-action { width: 78rpx; height: 78rpx; border-radius: 22rpx; background: #D96F42; display: flex; align-items: center; justify-content: center; }
.send-action.disabled { opacity: 0.45; }
</style>
