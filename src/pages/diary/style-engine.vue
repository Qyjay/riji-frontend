<template>
  <view class="page">

    <CustomNavBar title="文风引擎" left-icon="back" />

    <!-- NavBar 占位 -->
    <view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

    <scroll-view class="page-scroll" scroll-y :style="{ height: scrollHeight + 'px' }">

      <!-- 今日碎片 -->
      <SectionTitle title="今日碎片 (5条)" />
      <view class="card fragments-card">
        <view v-for="frag in fragments" :key="frag.time" class="fragment-item">
          <text class="fragment-time">{{ frag.time }}</text>
          <DoodleIcon :name="frag.iconName" :size="36" :color="frag.iconColor" class="fragment-icon" />
          <text class="fragment-desc">{{ frag.desc }}</text>
        </view>
      </view>

      <!-- 选择文风 -->
      <SectionTitle title="选择文风" />
      <view class="style-grid">
        <view
          v-for="style in styles"
          :key="style.name"
          class="style-item"
          :class="{ 'style-item--selected': selectedStyle?.name === style.name }"
          @click="selectStyle(style)"
        >
          <DoodleIcon
            :name="style.iconName"
            :size="56"
            :color="selectedStyle?.name === style.name ? style.iconColor : '#AE9D92'"
            class="style-emoji"
          />
          <text class="style-name">{{ style.name }}</text>
          <text class="style-desc">{{ style.desc }}</text>
        </view>
      </view>

      <!-- 生成按钮 -->
      <view
        class="generate-btn"
        :class="{ 'generate-btn--active': selectedStyle !== null }"
        @click="generateDiary"
      >
        <text v-if="isGenerating">生成中...</text>
        <text v-else>生成今日日记</text>
      </view>

      <!-- 生成预览 -->
      <template v-if="previewText">
        <SectionTitle title="生成预览" />
        <view class="preview-card">
          <view class="preview-header">
            <DoodleIcon
              v-if="selectedStyle"
              :name="selectedStyle.iconName"
              :size="48"
              :color="selectedStyle.iconColor"
              class="preview-style-emoji"
            />
            <text class="preview-style-name">{{ selectedStyle?.name }}版</text>
          </view>
          <text class="preview-text">{{ previewText }}</text>
          <view class="preview-actions">
            <view class="preview-btn preview-btn--edit" @click="editPreview">
              <text>编辑</text>
            </view>
            <view class="preview-btn preview-btn--refresh" @click="regenerate">
              <text>换一版</text>
            </view>
            <view class="preview-btn preview-btn--save" @click="saveDiary">
              <text>保存</text>
            </view>
          </view>
        </view>
      </template>

      <view class="bottom-spacer" />
    </scroll-view>

  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'

const navPlaceholderHeight = ref(64)
const scrollHeight = ref(600)
onMounted(() => {
  const info = uni.getSystemInfoSync()
  navPlaceholderHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navPlaceholderHeight.value - 0
})

const SectionTitle = {
  props: { title: String },
  template: `<view class="section-title-wrap"><text class="section-title">{{ title }}</text></view>`,
}

interface StyleOption {
  iconName: string
  iconColor: string
  name: string
  desc: string
  sample: string
}

const styles: StyleOption[] = [
  { iconName: 'sparkle', iconColor: '#E8A4B8', name: '文艺治愈', desc: '诗意温暖', sample: '三月的风裹着食堂的饭香，酸菜鱼的鲜辣在舌尖跳跃。这是属于南开的日子——图书馆的灯光温柔，操场上的晚风清凉。红黑树的递归调用失败了很多次，但那些在纸上画满节点和边的夜晚，终究会在某一天开花结果。今天的夕阳像一封没寄出的信，收件人是未来的自己。' },
  { iconName: 'heart',   iconColor: '#E8855A', name: '搞笑吐槽', desc: '毒舌欢乐', sample: '今日份破防记录：红黑树。我真的栓Q了，这个世界上为什么会有一种数据结构叫"红黑树"啊？？？它是红色的吗？它是一棵树吗？它跟黑色有什么关系？？？我看它跟我的脑子有关系——都是空白。还有那个食堂的酸菜鱼，三食堂阿姨手一抖，半条鱼没了，就给我留了个鱼头，我谢谢您嘞' },
  { iconName: 'target',  iconColor: '#4A3628', name: '武侠江湖', desc: '侠客风范', sample: '南开山庄，癸卯年春。江湖人称"算法侠"的凌云，在这图书馆中苦修已三月有余。今日，他终于在红黑树前迈出了那关键的一步。递归的刀法，一招一式，皆是心血。 BST旋转，如凌波微步，左旋右旋，找准平衡之道。江湖路远，少年的剑，还很长。' },
  { iconName: 'book',    iconColor: '#6B8EC4', name: '新闻联播', desc: '正经搞笑', sample: '据本台记者报道，3月23日，南开大学图书馆发生一起重大"学术事件"。一名软件工程专业学生，在历经三小时的算法题轰炸后，成功将红黑树的核心思想刻入脑海。CNN对此表示高度关注，称其为"人类认知的又一次突破"。专家指出，该名学生今日已摄入足量咖啡因，暂时脱离了学习危险区。' },
  { iconName: 'trophy',  iconColor: '#E8C44E', name: '古风辞赋', desc: '文言古韵', sample: '癸卯年暮春，余于南开学堂，坐于窗畔。晨起读书，午后勤写，暮则漫步于操场。食堂酸菜鱼之味，至今犹在舌尖。是日也，天朗气清，惠风和畅。书卷多情似故人，晨昏忧乐每相亲。此间岁月，静好如此，愿铭之于心，不敢忘却。' },
  { iconName: 'search',  iconColor: '#5BBF8E', name: '科幻纪元', desc: '未来世界', sample: '星历2026.3.23，基地食堂，能量补充完毕。三食堂的酸菜鱼蛋白棒为今天的训练提供了稳定的碳水供给。下午在图书馆数据节点进行了BST旋转训练，红黑树的平衡因子终于稳定在正常范围内。今天的运动模块也完成了——操场跑步3公里，关节润滑度良好。明日任务预告：继续调参。祝好，基地。' },
  { iconName: 'palette', iconColor: '#AE9D92', name: '电影旁白', desc: '镜头语言', sample: '那年春天，他坐在南开图书馆靠窗的位置，阳光斜斜地打在《算法导论》的某一页上。他不知道自己的人生会在这一刻发生什么改变。也许只是多调通了一道二分查找，也许只是记住了红黑树的几个性质。但他知道，从这个春天开始，一切都不一样了。他抬起头，望向窗外的操场——那里有人在跑步，有人在笑，有人在追逐什么。而他，也要开始追逐了。' },
  { iconName: 'bookopen',iconColor: '#D4645C', name: '轻小说',   desc: '二次元', sample: '「今天的番茄牛腩，绝对是SSR级别的！」她一边吃一边说，完全忘记了还有算法题没做完的事实。南开大学的食堂，永远是拯救饥饿灵魂的补给站。不过话说回来，红黑树这种东西，真的是策划用来折磨程序员的吧？？？我对着电脑屏幕陷入了沉思，而旁边的室友已经睡着了。算了，明天再说吧。今天的我，也在努力地活着呢。' },
]

const fragments = [
  { time: '12:30', iconName: 'camera', iconColor: '#6B8EC4', desc: '二食堂酸菜鱼 (2张)' },
  { time: '14:25', iconName: 'pen',    iconColor: '#E8855A', desc: '"红黑树太难了"' },
  { time: '16:00', iconName: 'camera', iconColor: '#6B8EC4', desc: '图书馆自习 (1张)' },
  { time: '18:00', iconName: 'run',    iconColor: '#5BBF8E', desc: '操场跑步 (3张)' },
  { time: '20:30', iconName: 'music',  iconColor: '#AE9D92', desc: '"今天效率不错"' },
]

const selectedStyle = ref<StyleOption | null>(null)
const isGenerating = ref(false)
const previewText = ref('')
const previewVariant = ref(0)

function selectStyle(style: StyleOption) {
  selectedStyle.value = style
  previewText.value = ''
}

function generateDiary() {
  if (!selectedStyle.value) {
    uni.showToast({ title: '请先选择文风', icon: 'none' })
    return
  }
  if (isGenerating.value) return

  isGenerating.value = true
  previewText.value = ''

  setTimeout(() => {
    const idx = previewVariant.value % styles.length
    previewText.value = selectedStyle.value!.sample
    isGenerating.value = false
    previewVariant.value++
  }, 2000)
}

function regenerate() {
  previewVariant.value++
  generateDiary()
}

function editPreview() {
  uni.navigateTo({ url: '/pages/write/index' })
}

function saveDiary() {
  uni.showToast({ title: '日记已保存！🎉', icon: 'none' })
  setTimeout(() => {
    uni.navigateBack()
  }, 800)
}
</script>

<style lang="scss" scoped>
.page {
  background: #FDF8F3;
}

.nav-placeholder {
}

.page-scroll {
  padding: 0 24rpx;
}

.section-title-wrap {
  padding: 20rpx 0 12rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C1F14;
}

/* ── 碎片 ── */
.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
  margin-bottom: 16rpx;
}

.fragments-card {
  padding: 0;
}

.fragment-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #F5F0EB;
  &:last-child { border-bottom: none; }
}

.fragment-time {
  font-size: 24rpx;
  color: #AE9D92;
  width: 80rpx;
  flex-shrink: 0;
}

.fragment-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.fragment-desc {
  font-size: 28rpx;
  color: #4A3628;
  flex: 1;
}

/* ── 文风网格 ── */
.style-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.style-item {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  cursor: pointer;
  border: 2rpx solid transparent;
  transition: all 0.15s;
  &:active { transform: scale(0.96); }
}

.style-item--selected {
  border-color: #E8855A;
  background: #FDF0E8;
}

.style-emoji { display: flex; align-items: center; justify-content: center; }
.style-name { font-size: 28rpx; font-weight: 600; color: #2C1F14; }
.style-desc { font-size: 22rpx; color: #AE9D92; }

/* ── 生成按钮 ── */
.generate-btn {
  background: #D4C4B8;
  border-radius: 48rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  cursor: pointer;
  transition: background 0.15s;
  &:active { opacity: 0.85; }
  text { font-size: 32rpx; font-weight: 600; color: #FFFFFF; }
}

.generate-btn--active {
  background: #E8855A;
}

/* ── 预览 ── */
.preview-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 16rpx;
}

.preview-style-emoji { display: flex; align-items: center; }
.preview-style-name { font-size: 30rpx; font-weight: 600; color: #2C1F14; }

.preview-text {
  font-size: 28rpx;
  color: #4A3628;
  line-height: 1.8;
  display: block;
  margin-bottom: 20rpx;
}

.preview-actions {
  display: flex;
  gap: 12rpx;
}

.preview-btn {
  flex: 1;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:active { opacity: 0.8; }
  text { font-size: 26rpx; font-weight: 500; }
}

.preview-btn--edit { background: #F5F0EB; text { color: #4A3628; } }
.preview-btn--refresh { background: #FDF0E8; text { color: #E8855A; } }
.preview-btn--save { background: #5BBF8E; text { color: #FFFFFF; } }

.bottom-spacer { height: 40rpx; }
</style>
