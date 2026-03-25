<template>
  <view class="page">
    <CustomNavBar title="我的成就" left-icon="back" />

    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view scroll-y class="scroll-area" :style="{ height: scrollHeight + 'px' }">
      <view class="content">

        <!-- ===== 顶部统计卡片 ===== -->
        <view class="card summary-card doodle-box-v2">
          <view class="summary-header">
            <view class="summary-title-row">
              <DoodleIcon name="trophy" color="#C8A86B" :size="40" />
              <text class="summary-title">已解锁</text>
            </view>
            <text class="summary-count"><text class="count-num">15</text> / 42</text>
          </view>
          <view class="progress-bar-bg">
            <view class="progress-bar-fill" :style="{ width: unlockPercent + '%' }"></view>
          </view>
          <text class="progress-pct">{{ unlockPercent }}% 已解锁</text>
        </view>

        <!-- ===== 分类成就 ===== -->
        <view
          v-for="cat in categories"
          :key="cat.name"
          class="card cat-card"
        >
          <!-- 分类标题 -->
          <view class="cat-title-row">
            <view class="cat-line"></view>
            <text class="cat-title">{{ cat.name }}</text>
            <view class="cat-line"></view>
          </view>

          <!-- 成就网格 -->
          <view class="ach-grid">
            <view
              v-for="ach in cat.achievements"
              :key="ach.id"
              class="ach-card press-feedback"
              :class="{
                'ach-unlocked': ach.unlocked,
                'ach-locked': !ach.unlocked && !ach.hidden,
                'ach-hidden': ach.hidden
              }"
              @click="handleAchClick(ach)"
            >
              <!-- 解锁徽章 -->
              <view v-if="ach.unlocked" class="ach-badge">
                <DoodleIcon name="check" color="#6BA87B" :size="24" :filtered="false" />
              </view>

              <!-- Icon -->
              <view class="ach-icon-wrap" :class="ach.unlocked ? 'ach-icon-unlocked' : 'ach-icon-locked'">
                <DoodleIcon
                  v-if="!ach.hidden"
                  :name="ach.iconName || 'star'"
                  :color="ach.unlocked ? ach.iconColor : '#AE9D92'"
                  :size="56"
                />
                <DoodleIcon v-else name="search" color="#AE9D92" :size="56" />
              </view>

              <!-- 名称 -->
              <text class="ach-name">{{ ach.hidden ? '???' : ach.name }}</text>

              <!-- 描述 / 条件 -->
              <text class="ach-desc">
                {{ ach.hidden ? '？？？' : (ach.unlocked ? ach.desc : (ach.condition ?? ach.desc)) }}
              </text>
            </view>
          </view>
        </view>

        <view class="bottom-spacer"></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'

// ===== 滚动高度 =====
const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 0
})

// ===== 统计 =====
const totalAch = 42
const unlockedAch = 15
const unlockPercent = computed(() => Math.round((unlockedAch / totalAch) * 100))

// ===== 成就数据类型 =====
interface Achievement {
  id: string
  emoji: string
  iconName: string
  iconColor: string
  name: string
  desc: string
  unlocked: boolean
  date?: string
  condition?: string
  hidden?: boolean
}

interface Category {
  name: string
  achievements: Achievement[]
}

// ===== 成就数据 =====
const categories: Category[] = [
  {
    name: '日记达人',
    achievements: [
      { id: 'diary_1',   emoji: '📝', iconName: 'book',    iconColor: '#E8855A', name: '第一篇',  desc: '写下第一篇日记',  unlocked: true,  date: '3月1日'  },
      { id: 'diary_7d',  emoji: '📝', iconName: 'fire',    iconColor: '#E8855A', name: '连续7天',  desc: '连续7天写日记',   unlocked: true,  date: '3月7日'  },
      { id: 'diary_50',  emoji: '📝', iconName: 'book',    iconColor: '#E8855A', name: '半百',     desc: '累计50篇日记',   unlocked: true,  date: '3月10日' },
      { id: 'diary_100', emoji: '📝', iconName: 'book',    iconColor: '#E8855A', name: '百篇',     desc: '累计100篇',     unlocked: true,  date: '3月18日' },
      { id: 'diary_200', emoji: '📝', iconName: 'novel',   iconColor: '#9B72C8', name: '作家',     desc: '累计200篇',     unlocked: false, condition: '再写73篇'   },
      { id: 'diary_365', emoji: '📝', iconName: 'calendar',iconColor: '#C8A86B', name: '年鉴',     desc: '连续365天',     unlocked: false, condition: '坚持一年'   },
    ],
  },
  {
    name: '学习之星',
    achievements: [
      { id: 'pomo_10',   emoji: '🍅', iconName: 'tomato',   iconColor: '#E8855A', name: '10个番茄', desc: '完成10个番茄钟', unlocked: true  },
      { id: 'pomo_50',   emoji: '🍅', iconName: 'tomato',   iconColor: '#E8855A', name: '50个番茄', desc: '完成50个番茄钟', unlocked: true  },
      { id: 'pomo_100',  emoji: '🍅', iconName: 'tomato',   iconColor: '#C8A86B', name: '100个番茄', desc: '完成100个番茄钟', unlocked: false, condition: '再完成50个' },
      { id: 'todo_10',   emoji: '📋', iconName: 'list',     iconColor: '#6BA87B', name: '完成10个', desc: '完成10个待办事项', unlocked: true  },
      { id: 'todo_50',   emoji: '📋', iconName: 'list',     iconColor: '#C8A86B', name: '完成50个', desc: '完成50个待办事项', unlocked: false, condition: '再完成35个' },
      { id: 'study_7d',  emoji: '📚', iconName: 'bookopen', iconColor: '#6BA87B', name: '学霸周',   desc: '连续7天学习',   unlocked: true  },
    ],
  },
  {
    name: '社交蝴蝶',
    achievements: [
      { id: 'friend_1',  emoji: '👥', iconName: 'handshake', iconColor: '#6B8EB4', name: '第一个搭子', desc: '添加第一个学习搭子', unlocked: true  },
      { id: 'friend_5',  emoji: '👥', iconName: 'handshake', iconColor: '#6B8EB4', name: '5个搭子',   desc: '拥有5个搭子',   unlocked: false, condition: '再找4个'   },
      { id: 'friend_10', emoji: '👥', iconName: 'handshake', iconColor: '#C8A86B', name: '10个搭子',  desc: '拥有10个搭子',  unlocked: false, condition: '再找9个'   },
      { id: 'msg_50',    emoji: '💬', iconName: 'chat',      iconColor: '#6B8EB4', name: '话痨',      desc: '发送50条消息',  unlocked: true  },
      { id: 'share_5',   emoji: '📤', iconName: 'share',     iconColor: '#D4728A', name: '分享达人',  desc: '分享5次日记',   unlocked: false, condition: '再分享3次' },
      { id: 'match_3',   emoji: '🤝', iconName: 'heart',     iconColor: '#D4728A', name: '最佳拍档',  desc: '与搭子互动30天', unlocked: false, condition: '再互动20天' },
    ],
  },
  {
    name: '创意达人',
    achievements: [
      { id: 'comic_1',   emoji: '🎬', iconName: 'grid',    iconColor: '#5CA06E', name: '第一幅漫画',   desc: '生成第一幅漫画',     unlocked: true  },
      { id: 'share_1',   emoji: '📤', iconName: 'share',   iconColor: '#D4728A', name: '第一张分享卡', desc: '生成第一张分享卡',   unlocked: true  },
      { id: 'style_5',   emoji: '✍️', iconName: 'wand',    iconColor: '#9B72C8', name: '5种文风',      desc: '使用5种不同文风',    unlocked: false, condition: '再解锁3种'   },
      { id: 'bgm_1',     emoji: '🎵', iconName: 'music',   iconColor: '#9B72C8', name: '第一首BGM',    desc: '为日记配上第一首BGM', unlocked: false, condition: '使用BGM功能' },
      { id: 'tts_1',     emoji: '🎙️', iconName: 'voice',   iconColor: '#9B72C8', name: '有声日记',     desc: '录制第一条语音日记', unlocked: false, condition: '使用语音功能' },
      { id: 'novel_1',   emoji: '📖', iconName: 'novel',   iconColor: '#9B72C8', name: '第一章自传',   desc: '生成第一章自传',     unlocked: true  },
    ],
  },
  {
    name: '情绪探索',
    achievements: [
      { id: 'emo_all',      emoji: '🎭', iconName: 'palette',  iconColor: '#D4728A', name: '全情绪',   desc: '使用过所有8种情绪',  unlocked: true  },
      { id: 'emo_happy_7',  emoji: '😊', iconName: 'heart',    iconColor: '#D4728A', name: '快乐周',   desc: '连续7天好心情',     unlocked: true  },
      { id: 'emo_recover',  emoji: '💪', iconName: 'target',   iconColor: '#6BA87B', name: '走出低谷', desc: '记录一次情绪回升',  unlocked: true  },
      { id: 'emo_zen',      emoji: '🧘', iconName: 'moon',     iconColor: '#9B72C8', name: '情绪平衡', desc: '连续30天情绪稳定',  unlocked: false, condition: '再坚持23天'  },
      { id: 'emo_insight',  emoji: '🔮', iconName: 'crystal',  iconColor: '#D4728A', name: '情绪洞察', desc: '查看情绪洞察报告',  unlocked: false, condition: '解锁洞察功能' },
      { id: 'emo_map',      emoji: '🗺️', iconName: 'calendar', iconColor: '#6B8EB4', name: '情绪地图', desc: '查看情绪地图',      unlocked: false, condition: '记录30天'    },
    ],
  },
  {
    name: '运势大师',
    achievements: [
      { id: 'fortune_1',     emoji: '🔮', iconName: 'crystal', iconColor: '#D4728A', name: '初次占卜', desc: '第一次AI运势',   unlocked: true  },
      { id: 'fortune_30',    emoji: '🔮', iconName: 'crystal', iconColor: '#9B72C8', name: '月度占卜', desc: '累计30次运势',  unlocked: false, condition: '再查28次'    },
      { id: 'fortune_5star', emoji: '⭐', iconName: 'star',    iconColor: '#C8A86B', name: '满星运势', desc: '获得5次五星运势', unlocked: false, condition: '获取五星运势' },
    ],
  },
  {
    name: '隐藏成就',
    achievements: [
      { id: 'hidden_1', emoji: '❓', iconName: 'lock', iconColor: '#AE9D92', name: '???', desc: '？？？', unlocked: false, hidden: true },
      { id: 'hidden_2', emoji: '❓', iconName: 'lock', iconColor: '#AE9D92', name: '???', desc: '？？？', unlocked: false, hidden: true },
      { id: 'hidden_3', emoji: '❓', iconName: 'lock', iconColor: '#AE9D92', name: '???', desc: '？？？', unlocked: false, hidden: true },
    ],
  },
]

// ===== 点击成就 =====
function handleAchClick(ach: Achievement) {
  if (!ach.unlocked || ach.hidden) return
  uni.showModal({
    title: ach.name,
    content: `${ach.desc}\n🗓️ 解锁于 ${ach.date ?? ''}`,
    confirmText: '知道了',
    showCancel: false,
  })
}
</script>

<style lang="scss" scoped>
/* ===== 页面 ===== */
.page {
  background: #FDF8F3;
}

.nav-placeholder {
}

.scroll-area {
}

.content {
  padding: 16rpx 32rpx 0;
}

/* ===== 卡片通用 ===== */
.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 32rpx;
  margin-bottom: 24rpx;
}

/* ===== 顶部统计 ===== */
.summary-card {
  padding: 36rpx;
  border: 3rpx solid rgba(232, 133, 90, 0.15) !important;
  box-shadow: 2px 3px 0 rgba(232, 133, 90, 0.08) !important;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.summary-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.summary-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2C1F14;
}

.summary-count {
  font-size: 26rpx;
  color: #AE9D92;
}

.count-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #E8855A;
}

.progress-bar-bg {
  width: 100%;
  height: 16rpx;
  background: #F0EAE4;
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #E8855A 0%, #F0A878 100%);
  border-radius: 8rpx;
  transition: width 0.6s ease;
}

.progress-pct {
  font-size: 22rpx;
  color: #AE9D92;
}

/* ===== 分类标题 ===== */
.cat-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.cat-line {
  flex: 1;
  height: 1rpx;
  background: #E8E0D8;
}

.cat-title {
  font-size: 26rpx;
  color: #4A3628;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ===== 成就网格 ===== */
.ach-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

/* ===== 成就卡片 ===== */
.ach-card {
  width: calc((100% - 32rpx) / 3);
  min-height: 200rpx;
  background: #FFFFFF;
  border-radius: 14rpx 18rpx 12rpx 16rpx;
  border: 1rpx solid #F0EAE4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16rpx 8rpx;
  position: relative;
  box-sizing: border-box;
  transition: transform 0.15s ease;
}

/* 已解锁 */
.ach-unlocked {
  background: #FFFFFF;
  border-color: rgba(232, 133, 90, 0.2);
  box-shadow: 1px 2px 0 rgba(232, 133, 90, 0.08);
}

/* 未解锁 */
.ach-locked {
  opacity: 0.45;
  background: #FAFAFA;
}

/* 隐藏成就 */
.ach-hidden {
  opacity: 0.45;
  background: #F5F5F5;
  border-color: #E0E0E0;
}

/* 解锁徽章 */
.ach-badge {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: rgba(107, 168, 123, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Icon 容器 */
.ach-icon-wrap {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx 16rpx 10rpx 14rpx;
  margin-bottom: 10rpx;
}

.ach-icon-unlocked {
  background: rgba(232, 133, 90, 0.08);
}

.ach-icon-locked {
  background: #F0EAE4;
}

/* 成就名 */
.ach-name {
  font-size: 22rpx;
  font-weight: 600;
  color: #2C1F14;
  text-align: center;
  margin-bottom: 6rpx;
  line-height: 1.3;
}

.ach-locked .ach-name,
.ach-hidden .ach-name {
  color: #AE9D92;
}

/* 描述/条件 */
.ach-desc {
  font-size: 18rpx;
  color: #AE9D92;
  text-align: center;
  line-height: 1.4;
  padding: 0 4rpx;
}

/* ===== 底部留白 ===== */
.bottom-spacer {
  height: 48rpx;
}
</style>
