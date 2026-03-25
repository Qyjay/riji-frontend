import type { Diary, DiaryDerivative } from '../api/diary'

const now = Date.now()
const day = 86400000

function makeTrend(): Array<{ hour: number; label: string; score: number }> {
  const emotions = ['平静', '开心', '专注', '疲惫', '开心', '幸福', '平静']
  return [7, 9, 11, 13, 15, 17, 20, 22].map((hour, i) => ({
    hour,
    label: emotions[i % emotions.length],
    score: Math.round(50 + Math.random() * 45),
  }))
}

export const mockDiaries: Diary[] = [
  {
    id: '1',
    title: '算法题突破 & 食堂红烧肉',
    content: `今天是充实而满足的一天。\n\n上午在图书馆奋战了三个小时，终于把那道卡了我好几天的二分查找边界条件题目彻底搞清楚了。那一瞬间豁然开朗的感觉真的很爽，感觉自己的算法功底又扎实了一些。\n\n中午去食堂，发现今天有红烧肉！软糯入味，肥而不腻，配上白米饭简直绝了。美食总是能让人忘记一切烦恼。\n\n下午继续刷题，效率比上午还高，进入了心流状态。晚上回宿舍和室友聊了聊各自的实习规划，大家都在努力，互相加油！`,
    date: '2026-03-25',
    weather: '☀️ 晴',
    specialDate: '',
    emotionSummary: { dominant: '开心', trend: makeTrend() },
    materialIds: ['mat1', 'mat2'],
    style: '治愈系',
    editCount: 0,
    maxEdits: 3,
    status: 'published',
    createdAt: now - 3600000,
    updatedAt: now - 3600000,
    emotion: { emoji: '😊', label: '开心', score: 92 },
    images: ['https://picsum.photos/seed/diary1/400/300'],
    tags: ['学习', '美食'],
    location: '南开大学图书馆',
    hasComic: true,
    hasBGM: false,
  },
  {
    id: '2',
    title: '申请季焦虑与雅思备考',
    content: `申请季的压力真的好大…\n\n看着周围的同学陆续拿到offer，自己却还在等消息，心里五味杂陈。今天刷了一套TPO，听力正确率又下滑了，整个人很沮丧。\n\n晚上和妈妈视频，她说不管结果怎样都支持我，突然眼眶就红了。其实自己已经很努力了，只是有时候会被焦虑淹没。\n\n明天继续加油，一步一步来。`,
    date: '2026-03-24',
    weather: '🌧️ 阴',
    specialDate: '',
    emotionSummary: {
      dominant: '焦虑',
      trend: [
        { hour: 8, label: '焦虑', score: 30 },
        { hour: 10, label: '专注', score: 55 },
        { hour: 13, label: '沮丧', score: 25 },
        { hour: 16, label: '疲惫', score: 35 },
        { hour: 19, label: '温暖', score: 68 },
        { hour: 22, label: '平静', score: 50 },
      ],
    },
    materialIds: [],
    style: '日记式',
    editCount: 1,
    maxEdits: 3,
    status: 'published',
    createdAt: now - day,
    updatedAt: now - day + 3600000,
    emotion: { emoji: '😢', label: '焦虑', score: 28 },
    images: [],
    tags: ['学习', '心情'],
    location: '宿舍',
    hasComic: false,
    hasBGM: true,
  },
  {
    id: '3',
    title: '与室友天大火锅之行',
    content: `今天和室友去天大旁边新开的火锅店，超级爽！\n\n涮锅底是番茄牛骨混合的，点了毛肚、鸭血、肥牛，每一样都好吃到飞起。饭桌上聊了好多，聊未来、聊梦想、聊各自喜欢的人，笑声不断。\n\n饭后在校园里漫步，夜晚的天大比白天更有韵味，两个学校离得这么近，却各有各的气质。\n\n这样的日子，值得被好好记住。`,
    date: '2026-03-23',
    weather: '☀️ 晴',
    specialDate: '和小红认识满一年',
    emotionSummary: { dominant: '幸福', trend: makeTrend() },
    materialIds: ['mat4'],
    style: '故事型',
    editCount: 0,
    maxEdits: 3,
    status: 'published',
    createdAt: now - 2 * day,
    updatedAt: now - 2 * day,
    emotion: { emoji: '🥰', label: '幸福', score: 88 },
    images: ['https://picsum.photos/seed/diary3/400/300', 'https://picsum.photos/seed/diary3b/400/300'],
    tags: ['社交', '美食'],
    location: '天津大学旁火锅店',
    hasComic: true,
    hasBGM: true,
  },
  {
    id: '4',
    title: '一次酣畅淋漓的5公里晨跑',
    content: `今天咬牙设了六点的闹钟，真的起来了！\n\n操场上空气清新，跑起来虽然喘但感觉整个人都活了。五公里跑完，出了一身汗，站在操场中间抬头看天，蓝天白云，有种莫名的感动。\n\n运动真的很神奇，昨天的那些焦虑一扫而空。回宿舍冲了个澡，吃了碗热腾腾的皮蛋瘦肉粥，美好的一天就这样开始了。`,
    date: '2026-03-22',
    weather: '🌤️ 多云',
    specialDate: '',
    emotionSummary: { dominant: '畅快', trend: makeTrend() },
    materialIds: [],
    style: '活力型',
    editCount: 0,
    maxEdits: 3,
    status: 'published',
    createdAt: now - 3 * day,
    updatedAt: now - 3 * day,
    emotion: { emoji: '😂', label: '畅快', score: 85 },
    images: ['https://picsum.photos/seed/diary4/400/300'],
    tags: ['运动'],
    location: '操场',
    hasComic: false,
    hasBGM: false,
  },
  {
    id: '5',
    title: '追剧《繁花》的慵懒一天',
    content: `今天彻彻底底放松了一天。\n\n什么都没干，就在宿舍追完了《繁花》最后几集。王家卫的光影美学太绝了，每一帧都像一幅画。宝总和汪小姐的故事让人又心疼又惋惜，哭得稀里哗啦。\n\n有时候这样的"废物"时光也很必要，给自己一个充电的机会，明天会更有能量去面对一切。`,
    date: '2026-03-21',
    weather: '☁️ 阴',
    specialDate: '',
    emotionSummary: {
      dominant: '慵懒',
      trend: [
        { hour: 10, label: '慵懒', score: 55 },
        { hour: 13, label: '沉浸', score: 72 },
        { hour: 15, label: '感动', score: 80 },
        { hour: 18, label: '平静', score: 60 },
        { hour: 21, label: '感动', score: 75 },
        { hour: 23, label: '平静', score: 58 },
      ],
    },
    materialIds: [],
    style: '日记式',
    editCount: 2,
    maxEdits: 3,
    status: 'published',
    createdAt: now - 4 * day,
    updatedAt: now - 4 * day + 7200000,
    emotion: { emoji: '😴', label: '慵懒', score: 55 },
    images: [],
    tags: ['心情', '娱乐'],
    location: '宿舍',
    hasComic: false,
    hasBGM: true,
  },
]

const mockDerivatives: DiaryDerivative[] = [
  {
    id: 'deriv1',
    diaryId: '1',
    type: 'comic',
    content: '',
    mediaUrl: 'https://picsum.photos/seed/comic1/600/800',
    shareScope: 'private',
    createdAt: now - 1800000,
  },
  {
    id: 'deriv2',
    diaryId: '3',
    type: 'novel',
    content: '那天的火锅店里，烟雾缭绕，笑声阵阵。他们不知道，这顿饭将成为他们大学时代最难忘的记忆之一……',
    mediaUrl: '',
    shareScope: 'friends',
    createdAt: now - 2 * day + 3600000,
  },
  {
    id: 'deriv3',
    diaryId: '1',
    type: 'share_card',
    content: '今天破题了！算法不再是敌人 ✨',
    mediaUrl: 'https://picsum.photos/seed/card1/600/400',
    shareScope: 'public',
    createdAt: now - 3600000,
  },
]

export function generateDiary(date: string, weather?: string): Diary {
  return {
    id: `gen_${Date.now()}`,
    title: `${date} 的日记`,
    content: `这是由 AI 根据你今天的素材生成的日记。\n\n今天的天气${weather ?? '晴好'}，阳光透过窗户洒在书桌上，整个人都懒洋洋的。学习、生活、点点滴滴，都是值得被记录的瞬间。\n\n愿每一个平凡的日子，都能在文字里变得闪光。`,
    date,
    weather: weather ?? '☀️ 晴',
    specialDate: '',
    emotionSummary: {
      dominant: '平静',
      trend: makeTrend(),
    },
    materialIds: [],
    style: '治愈系',
    editCount: 0,
    maxEdits: 3,
    status: 'draft',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    emotion: { emoji: '😊', label: '平静', score: 60 },
    images: [],
    tags: [],
    location: '',
    hasComic: false,
    hasBGM: false,
  }
}

export function getDiaries(page = 1, pageSize = 10) {
  const start = (page - 1) * pageSize
  const list = mockDiaries.slice(start, start + pageSize)
  return { list, total: mockDiaries.length }
}

export function getDiaryDetail(id: string): Diary {
  return mockDiaries.find(d => d.id === id) ?? mockDiaries[0]
}

export function updateDiary(id: string, content: string): Diary {
  const diary = mockDiaries.find(d => d.id === id) ?? mockDiaries[0]
  if (diary.editCount >= diary.maxEdits) {
    throw new Error('已达到最大编辑次数')
  }
  diary.content = content
  diary.editCount += 1
  diary.updatedAt = Date.now()
  return diary
}

export function getEmotionTrend(_id: string): { dominant: string; trend: Array<{ hour: number; label: string; score: number }> } {
  const diary = mockDiaries.find(d => d.id === _id) ?? mockDiaries[0]
  return diary.emotionSummary
}

export function extractInfo(_id: string): { anniversaries: any[]; relations: any[]; preferences: any[] } {
  return {
    anniversaries: [
      { title: '和室友认识满一年', date: '03-23', relatedPerson: '室友小王' },
    ],
    relations: [
      { name: '小红', relation: '朋友', mentions: 3 },
      { name: '妈妈', relation: '家人', mentions: 2 },
    ],
    preferences: [
      { category: '美食', item: '红烧肉', sentiment: 'positive' },
      { category: '学习', item: '算法题', sentiment: 'positive' },
    ],
  }
}

export function generateDerivative(diaryId: string, type: 'comic' | 'novel' | 'share_card'): DiaryDerivative {
  const typeContentMap = {
    comic: { content: '', mediaUrl: `https://picsum.photos/seed/comic${diaryId}/600/800` },
    novel: {
      content: '清晨的阳光还没完全铺开，他已经坐在图书馆的角落开始了新一天的奋斗。那道困扰他许久的算法题，就像人生中的某个困境，终究在坚持下被破解……',
      mediaUrl: '',
    },
    share_card: {
      content: '今天又是充实的一天，生活值得被记录 ✨',
      mediaUrl: `https://picsum.photos/seed/card${diaryId}/600/400`,
    },
  }

  const deriv: DiaryDerivative = {
    id: `deriv_${Date.now()}`,
    diaryId,
    type,
    ...typeContentMap[type],
    shareScope: 'private',
    createdAt: Date.now(),
  }
  mockDerivatives.push(deriv)
  return deriv
}

export function getDerivatives(diaryId?: string): DiaryDerivative[] {
  if (diaryId) return mockDerivatives.filter(d => d.diaryId === diaryId)
  return mockDerivatives
}

export function setDerivativeShare(id: string, scope: string): void {
  const deriv = mockDerivatives.find(d => d.id === id)
  if (deriv) {
    deriv.shareScope = scope as DiaryDerivative['shareScope']
  }
}

export function getTodaySummary(date: string): {
  date: string
  material_count: number
  materials: Array<{ id: string; type: string; content: string; createdAt: number; emotion?: { label: string; emoji: string; score: number } }>
  has_diary: boolean
  diary_id: string | null
  diary_status: string | null
} {
  // Check if there's a diary for today
  const todayDiary = mockDiaries.find(d => d.date === date)
  return {
    date,
    material_count: 3,
    materials: [
      { id: 'mat1', type: 'text', content: '今天在食堂吃到了超好吃的红烧肉，幸福感爆棚！', createdAt: Date.now() - 3600000 * 4, emotion: { label: '开心', emoji: '😊', score: 0.88 } },
      { id: 'mat2', type: 'image', content: '图书馆阅览室的窗外，夕阳染红了天空', createdAt: Date.now() - 3600000 * 2, emotion: { label: '平静', emoji: '😌', score: 0.72 } },
      { id: 'mat3', type: 'voice', content: '今天终于把那道算法题做出来了', createdAt: Date.now() - 3600000, emotion: { label: '激动', emoji: '🎉', score: 0.91 } },
    ],
    has_diary: !!todayDiary,
    diary_id: todayDiary?.id ?? null,
    diary_status: todayDiary?.status ?? null,
  }
}
