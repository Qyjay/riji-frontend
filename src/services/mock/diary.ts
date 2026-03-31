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

// Unsplash 图片（固定 ID，内容匹配）
const img = {
  // 学习 / 图书馆
  library: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop',
  study: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop',
  notebook: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&h=300&fit=crop',
  laptop: 'https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=400&h=300&fit=crop',
  // 美食
  hotpot: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
  ramen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
  bbq: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
  dessert: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
  coffee: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop',
  breakfast: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
  fruit: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&h=300&fit=crop',
  cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop',
  milk_tea: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=400&h=300&fit=crop',
  // 运动 / 户外
  running: 'https://images.unsplash.com/photo-1461896836934-bd45ba8a0a58?w=400&h=300&fit=crop',
  sunset: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=400&h=300&fit=crop',
  park: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400&h=300&fit=crop',
  bike: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop',
  sky: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=400&h=300&fit=crop',
  lake: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&h=300&fit=crop',
  // 社交 / 朋友
  friends: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop',
  party: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=300&fit=crop',
  selfie: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
  campus: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop',
  // 猫 / 宠物
  cat1: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop',
  cat2: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&h=300&fit=crop',
  cat3: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400&h=300&fit=crop',
  // 旅行
  train: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400&h=300&fit=crop',
  city: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop',
  street: 'https://images.unsplash.com/photo-1476093095171-d785889dc276?w=400&h=300&fit=crop',
  temple: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=300&fit=crop',
  mountain: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
  sea: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
  night: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop',
  flower: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400&h=300&fit=crop',
  rain: 'https://images.unsplash.com/photo-1428592953211-077101b2021b?w=400&h=300&fit=crop',
}

export const mockDiaries: Diary[] = [
  // ── 1张图：算法突破 ──
  {
    id: '1',
    title: '算法题突破 & 食堂红烧肉',
    content: `今天是充实而满足的一天。\n\n上午在图书馆奋战了三个小时，终于把那道卡了我好几天的二分查找边界条件题目彻底搞清楚了。那一瞬间豁然开朗的感觉真的很爽，感觉自己的算法功底又扎实了一些。\n\n中午去食堂，发现今天有红烧肉！软糯入味，肥而不腻，配上白米饭简直绝了。美食总是能让人忘记一切烦恼。\n\n下午继续刷题，效率比上午还高，进入了心流状态。晚上回宿舍和室友聊了聊各自的实习规划，大家都在努力，互相加油！`,
    date: '2026-03-31',
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
    images: [img.library],
    tags: ['学习', '美食'],
    location: '南开大学图书馆',
    hasComic: false,
    hasBGM: false,
  },

  // ── 0张图：雅思焦虑 ──
  {
    id: '2',
    title: '申请季焦虑与雅思备考',
    content: `申请季的压力真的好大…\n\n看着周围的同学陆续拿到offer，自己却还在等消息，心里五味杂陈。今天刷了一套TPO，听力正确率又下滑了，整个人很沮丧。\n\n晚上和妈妈视频，她说不管结果怎样都支持我，突然眼眶就红了。其实自己已经很努力了，只是有时候会被焦虑淹没。\n\n明天继续加油，一步一步来。`,
    date: '2026-03-30',
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
    hasBGM: false,
  },

  // ── 2张图：火锅之行 ──
  {
    id: '3',
    title: '与室友天大火锅之行',
    content: `今天和室友去天大旁边新开的火锅店，超级爽！\n\n涮锅底是番茄牛骨混合的，点了毛肚、鸭血、肥牛，每一样都好吃到飞起。饭桌上聊了好多，聊未来、聊梦想、聊各自喜欢的人，笑声不断。\n\n饭后在校园里漫步，夜晚的天大比白天更有韵味，两个学校离得这么近，却各有各的气质。\n\n这样的日子，值得被好好记住。`,
    date: '2026-03-29',
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
    images: [img.hotpot, img.friends],
    tags: ['社交', '美食'],
    location: '天津大学旁火锅店',
    hasComic: false,
    hasBGM: false,
  },

  // ── 3张图：校园猫咪日 ──
  {
    id: '4',
    title: '遇见三只校园流浪猫',
    content: `今天在去图书馆的路上偶遇了三只流浪猫，每只都有自己的性格。\n\n第一只是橘猫，圆滚滚的，完全不怕人，直接走过来蹭我的腿。第二只是狸花猫，高冷得很，在花丛里假装看不见我。第三只黑猫最有个性，趴在长椅上晒太阳，翻了个肚皮就是不让摸。\n\n拍了好多照片，真的好治愈。决定以后每天带点猫粮出门。`,
    date: '2026-03-28',
    weather: '🌤️ 多云',
    specialDate: '',
    emotionSummary: { dominant: '治愈', trend: makeTrend() },
    materialIds: [],
    style: '治愈系',
    editCount: 0,
    maxEdits: 3,
    status: 'published',
    createdAt: now - 3 * day,
    updatedAt: now - 3 * day,
    emotion: { emoji: '🥰', label: '治愈', score: 90 },
    images: [img.cat1, img.cat2, img.cat3],
    tags: ['校园', '猫咪'],
    location: '南开大学',
    hasComic: false,
    hasBGM: false,
  },

  // ── 4张图：周末骑行 ──
  {
    id: '5',
    title: '海河边骑行20公里',
    content: `终于等到一个好天气的周末！和室友一起骑共享单车沿海河骑行。\n\n从学校出发，沿着河边的骑行道一路向东。河水在阳光下波光粼粼，两岸的柳树抽出了新芽，春天真的来了。\n\n中途在一个小咖啡馆停下来休息，点了杯冰美式，吹着河风，感觉时间都慢了下来。\n\n骑到终点的时候腿已经酸了，但心情好到飞起。回来的路上买了两杯奶茶犒劳自己，今天的里程数：20.3公里！`,
    date: '2026-03-27',
    weather: '☀️ 晴 22°C',
    specialDate: '',
    emotionSummary: { dominant: '开心', trend: makeTrend() },
    materialIds: [],
    style: '活力型',
    editCount: 0,
    maxEdits: 3,
    status: 'published',
    createdAt: now - 4 * day,
    updatedAt: now - 4 * day,
    emotion: { emoji: '🤩', label: '兴奋', score: 93 },
    images: [img.bike, img.lake, img.coffee, img.sunset],
    tags: ['运动', '骑行', '周末'],
    location: '天津海河',
    hasComic: false,
    hasBGM: false,
  },

  // ── 5张图：社团活动日 ──
  {
    id: '6',
    title: '摄影社春日外拍活动',
    content: `摄影社组织了一次春日外拍，去了水上公园。\n\n带了社团的佳能R6，第一次用这么好的机器拍照，出片质量直接起飞。拍了湖面倒影、樱花特写、同学们的candid，每一张都想发朋友圈。\n\n社长教了好多构图技巧——三分法、引导线、框架构图，感觉打开了新世界的大门。以后拍照不能只会怼脸拍了。\n\n活动结束后大家一起去吃了烧烤，聊了好多关于摄影的事情，认识了几个很有意思的学长学姐。\n\n今天拍了200多张照片，回去慢慢修图。`,
    date: '2026-03-26',
    weather: '☀️ 晴 20°C',
    specialDate: '',
    emotionSummary: { dominant: '兴奋', trend: makeTrend() },
    materialIds: [],
    style: '活力型',
    editCount: 0,
    maxEdits: 3,
    status: 'published',
    createdAt: now - 5 * day,
    updatedAt: now - 5 * day,
    emotion: { emoji: '📸', label: '兴奋', score: 95 },
    images: [img.park, img.flower, img.lake, img.friends, img.bbq],
    tags: ['摄影', '社团', '春天'],
    location: '水上公园',
    hasComic: false,
    hasBGM: false,
  },

  // ── 6张图：美食探店马拉松 ──
  {
    id: '7',
    title: '一天吃了六家店的美食探店',
    content: `和好朋友约了一次美食探店马拉松，从早吃到晚！\n\n早上先去了一家网红早餐店，豆浆油条配小笼包，经典但就是好吃。上午溜达到南开区的一家手冲咖啡馆，老板亲手冲的埃塞俄比亚水洗豆，花香味很明显。\n\n中午杀到一家隐藏在胡同里的重庆小面馆，老板是重庆人，麻辣鲜香完全正宗。下午茶去了一家日式甜品店，抹茶千层蛋糕颜值和味道都在线。\n\n晚饭选了一家新开的泰国菜，冬阴功汤酸辣过瘾。最后用一杯黑糖珍珠奶茶收尾，完美的一天！\n\n代价是晚上称体重发现涨了两斤……但值了。`,
    date: '2026-03-25',
    weather: '🌤️ 多云',
    specialDate: '',
    emotionSummary: { dominant: '满足', trend: makeTrend() },
    materialIds: [],
    style: '治愈系',
    editCount: 0,
    maxEdits: 3,
    status: 'published',
    createdAt: now - 6 * day,
    updatedAt: now - 6 * day,
    emotion: { emoji: '😋', label: '满足', score: 88 },
    images: [img.breakfast, img.coffee, img.ramen, img.cake, img.dessert, img.milk_tea],
    tags: ['美食', '探店', '朋友'],
    location: '天津各地',
    hasComic: false,
    hasBGM: false,
  },

  // ── 8张图：毕业旅行 ──
  {
    id: '8',
    title: '京都两日游记（上）',
    content: `终于实现了心心念念的京都之旅！\n\n第一天到达就被古城的氛围震撼了。坐公交去了伏见稻荷大社，千本鸟居真的太壮观了，每一步都像走进了动漫里的场景。\n\n午饭在锦市场吃了海鲜串和抹茶冰淇淋。市场里到处都是新鲜的食材和小吃，眼花缭乱。\n\n下午去了清水寺，站在舞台上俯瞰整个京都市区，红叶和城市交织在一起，美得不真实。\n\n傍晚在花见小路散步，偶遇了一位艺妓，像从画里走出来一样。\n\n晚上入住了一家传统町屋旅馆，榻榻米上铺着白色被褥，窗外是小小的日式庭院，安静得能听到水滴声。\n\n一天下来走了两万多步，累但开心。`,
    date: '2026-03-24',
    weather: '⛅ 多云转晴',
    specialDate: '',
    emotionSummary: { dominant: '幸福', trend: makeTrend() },
    materialIds: [],
    style: '故事型',
    editCount: 0,
    maxEdits: 3,
    status: 'published',
    createdAt: now - 7 * day,
    updatedAt: now - 7 * day,
    emotion: { emoji: '🤩', label: '幸福', score: 97 },
    images: [img.temple, img.street, img.city, img.dessert, img.flower, img.mountain, img.night, img.rain],
    tags: ['旅行', '京都', '美食', '摄影'],
    location: '日本京都',
    hasComic: false,
    hasBGM: false,
  },

  // ── 9张图：开学第一周 ──
  {
    id: '9',
    title: '开学第一周的九个瞬间',
    content: `新学期开始了！用九张照片记录开学第一周的点滴。\n\n周一搬完宿舍，窗台上摆好了新买的多肉。周二第一节高数课，教室里满满当当的，大家都很认真。周三社团招新，我们摄影社的摊位被围得水泄不通。\n\n周四下了一场春雨，整个校园都笼罩在薄雾里，拍了几张特别有意境的照片。周五和同学去了新开的自习室，环境超好，效率翻倍。\n\n周末出去放风，骑车绕了一圈校园，发现角落里的玉兰花开了。晚上和室友在操场上仰望星空，聊了很久关于未来的事。\n\n新学期，新开始，希望一切都好。`,
    date: '2026-03-23',
    weather: '🌤️ 多云',
    specialDate: '',
    emotionSummary: { dominant: '期待', trend: makeTrend() },
    materialIds: [],
    style: '治愈系',
    editCount: 0,
    maxEdits: 3,
    status: 'published',
    createdAt: now - 8 * day,
    updatedAt: now - 8 * day,
    emotion: { emoji: '✨', label: '期待', score: 86 },
    images: [img.campus, img.study, img.party, img.rain, img.laptop, img.bike, img.flower, img.sky, img.sunset],
    tags: ['校园', '开学', '生活'],
    location: '南开大学',
    hasComic: false,
    hasBGM: false,
  },

  // ── 12张图（>9张）：校园美食全记录 ──
  {
    id: '10',
    title: '南开食堂美食大赏（本月合集）',
    content: `整理了一下这个月在食堂拍的美食照片，发现居然有十几张！\n\n一食堂的红烧肉永远是我的最爱，外焦里嫩，酱汁浓郁。二食堂新出的麻辣烫也很不错，可以自选配菜。三食堂的水煮鱼是隐藏菜单，知道的人不多但味道一绝。\n\n除了正餐，食堂旁边的奶茶店、水果摊、烤红薯摊也都是我的常客。每天最幸福的时刻大概就是端着满满一盘饭菜找到靠窗的座位，一边吃一边看窗外来来往往的人。\n\n大学四年，这些味道会成为最深刻的记忆之一吧。`,
    date: '2026-03-22',
    weather: '☀️ 晴',
    specialDate: '',
    emotionSummary: { dominant: '满足', trend: makeTrend() },
    materialIds: [],
    style: '治愈系',
    editCount: 0,
    maxEdits: 3,
    status: 'published',
    createdAt: now - 9 * day,
    updatedAt: now - 9 * day,
    emotion: { emoji: '😋', label: '满足', score: 85 },
    images: [
      img.bbq, img.ramen, img.cake, img.breakfast,
      img.coffee, img.dessert, img.milk_tea, img.fruit,
      img.hotpot, img.coffee, img.cake, img.breakfast,
    ],
    tags: ['美食', '食堂', '合集'],
    location: '南开大学食堂',
    hasComic: false,
    hasBGM: false,
  },

  // ── 7张图：晨跑 + 一天 ──
  {
    id: '11',
    title: '五公里晨跑开启完美一天',
    content: `今天咬牙设了六点的闹钟，真的起来了！\n\n操场上空气清新，跑起来虽然喘但感觉整个人都活了。五公里跑完，出了一身汗，站在操场中间抬头看天，蓝天白云，有种莫名的感动。\n\n跑完回宿舍冲了个澡，吃了碗热腾腾的皮蛋瘦肉粥。上午去图书馆自习，效率出奇地高。午饭后在校园里散步消食，发现湖边的柳树绿了。\n\n下午和社团同学一起排练节目，大家配合越来越默契。晚上在操场看了一场绝美的落日，金黄色的光洒在跑道上，忍不住又拍了好多照片。`,
    date: '2026-03-21',
    weather: '☀️ 晴 18°C',
    specialDate: '',
    emotionSummary: { dominant: '活力', trend: makeTrend() },
    materialIds: [],
    style: '活力型',
    editCount: 0,
    maxEdits: 3,
    status: 'published',
    createdAt: now - 10 * day,
    updatedAt: now - 10 * day,
    emotion: { emoji: '💪', label: '活力', score: 91 },
    images: [img.running, img.sky, img.breakfast, img.library, img.park, img.friends, img.sunset],
    tags: ['运动', '晨跑', '校园'],
    location: '南开大学操场',
    hasComic: false,
    hasBGM: false,
  },

  // ── 0张图：追剧 ──
  {
    id: '12',
    title: '追剧《繁花》的慵懒一天',
    content: `今天彻彻底底放松了一天。\n\n什么都没干，就在宿舍追完了《繁花》最后几集。王家卫的光影美学太绝了，每一帧都像一幅画。宝总和汪小姐的故事让人又心疼又惋惜，哭得稀里哗啦。\n\n有时候这样的"废物"时光也很必要，给自己一个充电的机会，明天会更有能量去面对一切。`,
    date: '2026-03-20',
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
    createdAt: now - 11 * day,
    updatedAt: now - 11 * day + 7200000,
    emotion: { emoji: '😴', label: '慵懒', score: 55 },
    images: [],
    tags: ['心情', '娱乐'],
    location: '宿舍',
    hasComic: false,
    hasBGM: false,
  },
]

const mockDerivatives: DiaryDerivative[] = [
  {
    id: 'deriv1',
    diaryId: '1',
    type: 'share_card',
    content: '今天破题了！算法不再是敌人 ✨',
    mediaUrl: 'https://picsum.photos/seed/card1/600/400',
    shareScope: 'public',
    createdAt: now - 3600000,
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
]

export function generateDiary(date: string, weather?: string): Diary {
  return {
    id: `gen_${Date.now()}`,
    title: `${date} 的日记`,
    content: `这是由 AI 根据你今天的素材生成的日记。\n\n今天的天气${weather ?? '晴好'}，阳光透过窗户洒在书桌上，整个人都懒洋洋的。学习、生活、点点滴滴，都是值得被记录的瞬间。\n\n愿每一个平凡的日子，都能在文字里变得闪光。`,
    date,
    weather: weather ?? '☀️ 晴',
    specialDate: '',
    emotionSummary: { dominant: '平静', trend: makeTrend() },
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
