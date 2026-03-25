<template>
  <view class="page-container">
    <CustomNavBar
      :title="viewMode === 'toc' ? '我的自传小说' : currentChapter?.title ?? ''"
      :leftIcon="viewMode === 'reader' ? 'back' : 'none'"
      @leftClick="viewMode = 'toc'"
    />

    <view class="nav-placeholder" :style="{ height: navBarHeight + 'px' }" />

    <scroll-view scroll-y class="scroll-area" :style="{ height: scrollHeight + 'px' }">
      <!-- ========== 目录视图 ========== -->
      <view v-if="viewMode === 'toc'" class="toc-view">

        <!-- 封面卡片 -->
        <view class="cover-card">
          <DoodleIcon name="bookopen" :size="88" color="rgba(255,255,255,0.85)" class="cover-emoji" />
          <text class="cover-title">《Kylin的大学日记》</text>
          <text class="cover-subtitle">基于 127 篇日记自动生成</text>
          <view class="cover-divider" />
          <text class="cover-stats">已生成 4 章 · 共 5,600 字</text>
        </view>

        <!-- 章节目录标题 -->
        <view class="section-title-row">
          <text class="section-title">── 章节目录 ──</text>
        </view>

        <!-- 章节列表 -->
        <view class="chapters-list">
          <view
            v-for="(chapter, index) in chapters"
            :key="chapter.id"
            class="chapter-card"
            :class="{ 'chapter-locked': !chapter.unlocked }"
            @click="openChapter(chapter)"
          >
            <view v-if="chapter.unlocked" class="chapter-inner">
              <view class="chapter-left-bar" />
              <view class="chapter-content">
                <view class="chapter-header-row">
                  <view class="chapter-title-group">
                    <text class="chapter-num">第{{ chapter.id }}章</text>
                    <text class="chapter-title-text">{{ chapter.title }}</text>
                    <text v-if="index === chapters.filter(c => c.unlocked).length - 1" class="chapter-latest">最新</text>
                  </view>
                  <text class="chapter-wordcount">{{ chapter.wordCount.toLocaleString() }}字</text>
                </view>
                <text class="chapter-date">{{ chapter.dateRange }}</text>
                <text class="chapter-preview">「{{ chapter.preview }}」</text>
              </view>
            </view>

            <view v-else class="chapter-locked-inner">
              <DoodleIcon name="lock" :size="48" color="#AE9D92" class="lock-icon" />
              <view class="chapter-lock-content">
                <text class="chapter-lock-title">第{{ chapter.id }}章 · {{ chapter.title }}</text>
                <text class="chapter-lock-hint">继续写日记解锁更多章节...</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 生成下一章按钮 -->
        <view class="generate-btn-wrap">
          <view class="generate-btn" @click="onGenerate">
            <text class="generate-btn-text">生成下一章</text>
          </view>
        </view>

        <view class="bottom-safe" />
      </view>

      <!-- ========== 阅读视图 ========== -->
      <view v-else-if="viewMode === 'reader' && currentChapter" class="reader-view">
        <view class="reader-header">
          <text class="reader-chapter-num">第{{ currentChapter.id }}章</text>
          <text class="reader-title">{{ currentChapter.title }}</text>
          <text class="reader-date">{{ currentChapter.dateRange }}</text>
        </view>

        <view class="reader-body">
          <text
            v-for="(para, i) in currentChapter.paragraphs"
            :key="i"
            class="reader-para"
          >{{ para }}</text>
        </view>

        <!-- 底部安全距离（给固定导航留空） -->
        <view style="height: 160rpx;" />
      </view>
    </scroll-view>

    <!-- 阅读视图底部固定导航 -->
    <view v-if="viewMode === 'reader'" class="reader-nav-bar">
      <view
        class="reader-nav-btn"
        :class="{ 'reader-nav-btn-disabled': currentChapterId <= 1 }"
        @click="prevChapter"
      >
        <text class="reader-nav-btn-text">上一章</text>
      </view>
      <view class="reader-nav-btn reader-nav-btn-center" @click="viewMode = 'toc'">
        <text class="reader-nav-btn-text reader-nav-btn-text-primary">目录</text>
      </view>
      <view
        class="reader-nav-btn"
        :class="{ 'reader-nav-btn-disabled': currentChapterId >= unlockedChapters.length }"
        @click="nextChapter"
      >
        <text class="reader-nav-btn-text">下一章</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'

// ─── 导航栏高度（预估，实际按需获取） ───
const navBarHeight = ref(88)
const scrollHeight = ref(600)

onMounted(() => {
  const info = uni.getSystemInfoSync()
  navBarHeight.value = (info.statusBarHeight ?? 20) + 44
  scrollHeight.value = info.windowHeight - navBarHeight.value - 0
})

// ─── 视图模式 ───
const viewMode = ref<'toc' | 'reader'>('toc')
const currentChapterId = ref(1)

// ─── 章节数据 ───
interface Chapter {
  id: number
  title: string
  dateRange: string
  wordCount: number
  preview: string
  content: string
  unlocked: boolean
  paragraphs: string[]
}

const rawChapters = [
  {
    id: 1,
    title: '初来乍到',
    dateRange: '3月1日-3月7日',
    wordCount: 2100,
    preview: '站在南开的校门口，风卷着早春的凉意...',
    unlocked: true,
    content: `站在南开的校门口，风卷着早春的凉意扑面而来。路灯下的影子被拉得很长，像是在丈量我和这座城市之间的距离。

报到那天，天还没亮就从家出发了。坐了六个小时的高铁，窗外的景色从南方的青翠渐渐变成了北方的苍茫。到站的时候，学长在出口举着"软件工程新生"的牌子，笑得很灿烂。

宿舍在某栋楼的六层，没有电梯。拎着行李箱爬上去的时候，觉得大学生活的第一课就是锻炼体力。室友们陆续到了——一个来自广东，说话带着可爱的口音；一个是本地人，对天津了如指掌；还有一个和我一样来自南方，我们面面相觑，都在适应这个新环境。

第一周的感觉，就像是被投入了一个全新的世界。课表上的名字——数据结构、计算机组成原理、线性代数——每一个都让人既兴奋又紧张。图书馆成了我最常去的地方，坐在靠窗的位置，看着窗外的银杏叶随风摇曳，觉得一切都是新的。`,
  },
  {
    id: 2,
    title: '雅思之路',
    dateRange: '3月8日-3月14日',
    wordCount: 1800,
    preview: '复习资料堆得像小山...',
    unlocked: true,
    content: `桌上的雅思真题集已经翻到卷了边，荧光笔的颜色从黄到绿到粉，像一道彩虹铺在书页上。

每天早上七点，闹钟响的时候总想再赖十分钟。但想到距离考试的倒计时一天天减少，还是会咬着牙爬起来。食堂的豆浆和包子成了标配早餐，吃完就直奔图书馆。

听力是最让人头疼的部分。戴上耳机，播放Section 3的学术讨论，那些英式口音的长句子像绕口令一样在耳边打转。做完一套题，对答案的时候心情像过山车——前两篇全对的喜悦，被第三篇的错误率击得粉碎。

但也有好消息。阅读终于突破了。那天做完Cambridge 17的阅读真题，第三篇居然全对！差点在图书馆叫出来。赶紧把好消息分享给了学习搭子小明，他回了一个大大的"666"。

晚上回到宿舍，妈妈打了视频电话问复习得怎么样。我说"挺好的"，然后转头继续背单词。有些压力，只能自己扛着。`,
  },
  {
    id: 3,
    title: '代码与理想',
    dateRange: '3月15日-3月21日',
    wordCount: 1500,
    preview: '二分查找的边界条件...',
    unlocked: true,
    content: `屏幕上的代码密密麻麻，光标在第47行闪烁着，像在催促我给出答案。

数据结构课进入了最"劝退"的章节——红黑树。老师在黑板上画着旋转操作的示意图，台下的同学们表情各异：有认真记笔记的，有面露迷茫的，也有已经开始玩手机的。我属于第二种。

但我不想放弃。回到宿舍，打开VS Code，一行一行地手写红黑树的插入和删除操作。写到凌晨两点，终于让所有测试用例都通过了。那一刻的成就感，比任何游戏通关都强烈。

实习的面试通知也来了。MiniMax的HR发了一封邮件，约下周三上午十点视频面试。虽然嘴上说着"没什么准备的"，但当天晚上还是把简历又改了三遍，把项目经历从头到尾理了一遍。

这一周最开心的事，是和室友去天大吃火锅。四个人围着一个鸳鸯锅，涮着毛肚和虾滑，聊着毕业后想去哪里工作、想过什么样的生活。火锅的热气模糊了彼此的脸，但每个人眼里的期待都看得很清楚。`,
  },
  {
    id: 4,
    title: '友谊的味道',
    dateRange: '3月22日-今天',
    wordCount: 1200,
    preview: '火锅的热气模糊了...',
    unlocked: true,
    content: `发现了一家超级好吃的日料！老板是日本人，店面不大但很温馨。

和社团的朋友们约了唱K。好久没这么大声唱过了，虽然跑调跑得厉害，但笑声填满了整个包厢。那个下午，忘记了雅思、忘记了申请季的焦虑，只是单纯地快乐着。

操场上的跑道在晨光中泛着微微的光泽。6:30的闹钟响起，迷迷糊糊中穿上跑鞋出了门。五公里跑完，大汗淋漓地站在操场中央，看着太阳慢慢升起，觉得世界都安静了。

大学生活就是这样吧。有时候累得想放弃一切，有时候又觉得每一天都值得被记住。幸好有日记，把这些碎片都留了下来。等到毕业的那天再回头看，应该会笑着感叹——那些日子，真的很好。`,
  },
  {
    id: 5,
    title: '未来的序章',
    dateRange: '待解锁',
    wordCount: 0,
    preview: '',
    unlocked: false,
    content: '',
  },
]

const chapters = ref<Chapter[]>(
  rawChapters.map(c => ({
    ...c,
    paragraphs: c.content.split('\n\n').filter(p => p.trim()),
  }))
)

const unlockedChapters = computed(() => chapters.value.filter(c => c.unlocked))

const currentChapter = computed(() =>
  chapters.value.find(c => c.id === currentChapterId.value)
)

// ─── 操作 ───
function openChapter(chapter: Chapter) {
  if (!chapter.unlocked) return
  currentChapterId.value = chapter.id
  viewMode.value = 'reader'
}

function prevChapter() {
  const idx = unlockedChapters.value.findIndex(c => c.id === currentChapterId.value)
  if (idx > 0) {
    currentChapterId.value = unlockedChapters.value[idx - 1].id
  }
}

function nextChapter() {
  const idx = unlockedChapters.value.findIndex(c => c.id === currentChapterId.value)
  if (idx < unlockedChapters.value.length - 1) {
    currentChapterId.value = unlockedChapters.value[idx + 1].id
  }
}

function onGenerate() {
  uni.showToast({ title: '生成中...', icon: 'loading', duration: 1500 })
}
</script>

<style scoped>
/* ── 整体 ── */
.page-container {
  background-color: #FDF8F3;
}

.nav-placeholder {
}

.scroll-area {
}

/* ── 目录视图 ── */
.toc-view {
  padding: 24rpx 32rpx 0;
}

/* 封面卡片 */
.cover-card {
  background: linear-gradient(135deg, #2C1F14 0%, #5C3D2E 100%);
  border-radius: 24rpx;
  padding: 56rpx 40rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(44, 31, 20, 0.25);
}

.cover-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.cover-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 12rpx;
  letter-spacing: 2rpx;
}

.cover-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 32rpx;
}

.cover-divider {
  width: 80rpx;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.25);
  margin-bottom: 24rpx;
}

.cover-stats {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 1rpx;
}

/* 章节目录标题 */
.section-title-row {
  display: flex;
  justify-content: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 26rpx;
  color: #AE9D92;
  letter-spacing: 4rpx;
}

/* 章节列表 */
.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.chapter-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.chapter-inner {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  padding: 28rpx 28rpx 28rpx 0;
}

.chapter-left-bar {
  width: 6rpx;
  background: #E8855A;
  border-radius: 0 4rpx 4rpx 0;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.chapter-content {
  flex: 1;
}

.chapter-header-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8rpx;
}

.chapter-title-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.chapter-num {
  font-size: 22rpx;
  color: #AE9D92;
}

.chapter-title-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C1F14;
}

.chapter-latest {
  font-size: 20rpx;
  color: #E8855A;
  background: rgba(232, 133, 90, 0.12);
  padding: 2rpx 10rpx;
  border-radius: 20rpx;
}

.chapter-wordcount {
  font-size: 22rpx;
  color: #AE9D92;
  flex-shrink: 0;
}

.chapter-date {
  font-size: 22rpx;
  color: #AE9D92;
  margin-bottom: 12rpx;
}

.chapter-preview {
  font-size: 24rpx;
  color: #4A3628;
  font-style: italic;
  line-height: 1.6;
}

/* 未解锁章节 */
.chapter-locked {
  opacity: 0.65;
}

.chapter-locked-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 28rpx;
  gap: 20rpx;
}

.lock-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.chapter-lock-content {
  flex: 1;
}

.chapter-lock-title {
  font-size: 28rpx;
  color: #AE9D92;
  font-weight: 500;
  display: block;
  margin-bottom: 6rpx;
}

.chapter-lock-hint {
  font-size: 22rpx;
  color: #AE9D92;
}

/* 生成按钮 */
.generate-btn-wrap {
  margin: 40rpx 0 32rpx;
}

.generate-btn {
  background: linear-gradient(135deg, #E8855A 0%, #D4645C 100%);
  border-radius: 48rpx;
  padding: 28rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(232, 133, 90, 0.35);
}

.generate-btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}

.bottom-safe {
  height: 60rpx;
}

/* ── 阅读视图 ── */
.reader-view {
  padding: 32rpx 40rpx 0;
}

.reader-header {
  margin-bottom: 40rpx;
}

.reader-chapter-num {
  display: block;
  font-size: 22rpx;
  color: #E8855A;
  margin-bottom: 12rpx;
  letter-spacing: 2rpx;
}

.reader-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #2C1F14;
  margin-bottom: 14rpx;
  line-height: 1.3;
}

.reader-date {
  display: block;
  font-size: 24rpx;
  color: #AE9D92;
}

.reader-body {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.reader-para {
  font-size: 30rpx;
  color: #2C1F14;
  line-height: 1.8;
  text-align: justify;
  letter-spacing: 0.5rpx;
}

/* 底部固定导航 */
.reader-nav-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-top: 1px solid rgba(174, 157, 146, 0.2);
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 20rpx 40rpx calc(20rpx + env(safe-area-inset-bottom));
  gap: 20rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.reader-nav-btn {
  flex: 1;
  background: #FDF8F3;
  border-radius: 16rpx;
  padding: 20rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(174, 157, 146, 0.25);
}

.reader-nav-btn-center {
  background: rgba(232, 133, 90, 0.1);
  border-color: rgba(232, 133, 90, 0.3);
}

.reader-nav-btn-disabled {
  opacity: 0.38;
}

.reader-nav-btn-text {
  font-size: 26rpx;
  color: #4A3628;
  font-weight: 500;
}

.reader-nav-btn-text-primary {
  color: #E8855A;
  font-weight: 600;
}
</style>
