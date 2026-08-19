#!/usr/bin/env node
/**
 * 搭子广场发帖通知：搭子名录、冷启动基线、去重、合并、文案与 Deep Link
 */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const cache = new Map()

function loadTsModule(filename) {
  const abs = path.resolve(filename)
  if (cache.has(abs)) return cache.get(abs)

  const source = fs.readFileSync(abs, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: abs,
  }).outputText

  const exports = {}
  cache.set(abs, exports)
  const factory = new Function('exports', 'require', 'module', compiled)
  factory(exports, (spec) => {
    if (spec.startsWith('.') || spec.startsWith('@/')) {
      let target = spec.startsWith('@/')
        ? path.join(root, 'src', spec.slice(2))
        : path.resolve(path.dirname(abs), spec)
      if (!target.endsWith('.ts') && !target.endsWith('.js')) {
        if (fs.existsSync(`${target}.ts`)) target = `${target}.ts`
        else if (fs.existsSync(`${target}.js`)) target = `${target}.js`
      }
      return loadTsModule(target)
    }
    return require(spec)
  }, { exports })
  return exports
}

const {
  BUDDY_POST_DIGEST_THRESHOLD,
  BUDDY_POST_FETCH_INTERVAL_MS,
  BUDDY_POST_FETCH_LIMIT,
  buildBuddyDirectory,
  buildBuddyPostNotifyCopy,
  buildBuddyPostsDigestCopy,
  isBuddyAuthor,
  isOwnPost,
  normalizeIdentityKey,
  selectBuddyPosts,
  shouldNotifyBuddyPost,
} = loadTsModule(path.join(root, 'src/utils/buddy-post-notify.ts'))

const { buildPlazaNotifyCopy, plazaPostNotifyLink } = loadTsModule(
  path.join(root, 'src/utils/action-notify.ts'),
)

let passed = 0
let failed = 0

function check(name, callback) {
  try {
    callback()
    passed += 1
    console.log(`PASS ${name}`)
  } catch (error) {
    failed += 1
    console.log(`FAIL ${name}`)
    console.log(`     ${error && error.message ? error.message : error}`)
  }
}

const ME = { userId: 'u-me', name: '我自己' }

const MATCHES = [
  { id: 'm1', nickname: '陈屿', school: '南开大学', status: 'accepted', matchType: 'buddy' },
  { id: 'm2', nickname: '林夏', school: '南开大学', status: 'accepted', matchType: 'long_term' },
  { id: 'm3', nickname: '待通过', school: '天津大学', status: 'pending', matchType: 'buddy' },
]

/** 后端部署后带 userId 的匹配列表 */
const ID_MATCHES = [
  { id: 'm1', userId: 'u-chen', nickname: '陈屿', school: '南开大学', status: 'accepted', matchType: 'buddy' },
  { id: 'm3', userId: 'u-wait', nickname: '待通过', school: '天津大学', status: 'pending', matchType: 'buddy' },
]

function post(overrides) {
  return {
    id: 'p1',
    authorId: 'u-chen',
    authorName: '陈屿',
    authorSchool: '南开大学',
    type: 'buddy',
    content: '今晚图书馆自习，有人一起吗？',
    ...overrides,
  }
}

function select(posts, options = {}) {
  return selectBuddyPosts({
    posts,
    directory: buildBuddyDirectory(options.matches || MATCHES),
    selfUserId: ME.userId,
    selfName: ME.name,
    seen: options.seen || new Set(),
    primed: options.primed === undefined ? true : options.primed,
  })
}

check('constants stay in a sane range', () => {
  assert.strictEqual(BUDDY_POST_DIGEST_THRESHOLD, 3)
  assert.ok(BUDDY_POST_FETCH_INTERVAL_MS >= 3500)
  assert.ok(BUDDY_POST_FETCH_INTERVAL_MS <= 15000)
  assert.ok(BUDDY_POST_FETCH_LIMIT >= 10)
})

check('directory only keeps accepted matches', () => {
  const directory = buildBuddyDirectory(MATCHES)
  assert.strictEqual(directory.schools.size, 2)
  assert.ok(isBuddyAuthor(directory, { authorName: '陈屿', authorSchool: '南开大学' }))
  assert.ok(isBuddyAuthor(directory, { authorName: '林夏', authorSchool: '南开大学' }))
  assert.ok(!isBuddyAuthor(directory, { authorName: '待通过', authorSchool: '天津大学' }))
})

check('same nickname at a different school is not treated as a buddy', () => {
  const directory = buildBuddyDirectory(MATCHES)
  assert.ok(!isBuddyAuthor(directory, { authorName: '陈屿', authorSchool: '清华大学' }))
  // 任一侧学校为空时只按昵称判定，不因为缺字段漏通知
  assert.ok(isBuddyAuthor(directory, { authorName: '陈屿', authorSchool: '' }))
  const loose = buildBuddyDirectory([{ nickname: '陈屿', school: '', status: 'accepted' }])
  assert.ok(isBuddyAuthor(loose, { authorName: '陈屿', authorSchool: '清华大学' }))
})

check('userId matches the post author exactly', () => {
  const directory = buildBuddyDirectory(ID_MATCHES)
  assert.strictEqual(directory.userIds.size, 1)
  assert.strictEqual(directory.schools.size, 0)
  assert.ok(isBuddyAuthor(directory, { authorId: 'u-chen', authorName: '陈屿', authorSchool: '南开大学' }))
  // 对方改了昵称或学校也照样命中
  assert.ok(isBuddyAuthor(directory, { authorId: 'u-chen', authorName: '陈同学', authorSchool: '清华大学' }))
  // pending 的搭子申请不进名录
  assert.ok(!isBuddyAuthor(directory, { authorId: 'u-wait', authorName: '待通过', authorSchool: '天津大学' }))
  const diff = select([post({ id: 'p1', authorId: 'u-chen' })], { matches: ID_MATCHES })
  assert.deepStrictEqual(diff.newPosts.map((item) => item.id), ['p1'])
})

check('same nickname and school but a different userId never notifies', () => {
  const directory = buildBuddyDirectory(ID_MATCHES)
  assert.ok(!isBuddyAuthor(directory, { authorId: 'u-other', authorName: '陈屿', authorSchool: '南开大学' }))
  const impostor = post({ id: 'p7', authorId: 'u-other' })
  const diff = select([impostor], { matches: ID_MATCHES })
  assert.deepStrictEqual(diff.newPosts, [])
  assert.ok(diff.nextSeen.has('p7'))
})

check('a match without userId still falls back to nickname and school', () => {
  const legacy = [{ id: 'm1', nickname: '陈屿', school: '南开大学', status: 'accepted' }]
  const directory = buildBuddyDirectory(legacy)
  assert.strictEqual(directory.userIds.size, 0)
  assert.strictEqual(directory.schools.size, 1)
  // 后端还没部署时 authorId 是什么都只按昵称 + 学校判定
  assert.ok(isBuddyAuthor(directory, { authorId: 'u-chen', authorName: '陈屿', authorSchool: '南开大学' }))
  assert.ok(isBuddyAuthor(directory, { authorId: 'u-other', authorName: '陈屿', authorSchool: '南开大学' }))
  assert.ok(!isBuddyAuthor(directory, { authorId: 'u-chen', authorName: '路人甲', authorSchool: '南开大学' }))
  const diff = select([post({ id: 'p1' })], { matches: legacy })
  assert.deepStrictEqual(diff.newPosts.map((item) => item.id), ['p1'])
})

check('records with and without userId each take their own path', () => {
  const mixed = [
    { id: 'm1', userId: 'u-chen', nickname: '陈屿', school: '南开大学', status: 'accepted' },
    { id: 'm2', nickname: '林夏', school: '南开大学', status: 'accepted' },
  ]
  const directory = buildBuddyDirectory(mixed)
  assert.strictEqual(directory.userIds.size, 1)
  assert.strictEqual(directory.schools.size, 1)
  assert.ok(isBuddyAuthor(directory, { authorId: 'u-chen', authorName: '陈屿', authorSchool: '南开大学' }))
  assert.ok(!isBuddyAuthor(directory, { authorId: 'u-other', authorName: '陈屿', authorSchool: '南开大学' }))
  assert.ok(isBuddyAuthor(directory, { authorId: 'u-lin', authorName: '林夏', authorSchool: '南开大学' }))
  assert.ok(!isBuddyAuthor(directory, { authorId: 'u-lin2', authorName: '林夏', authorSchool: '清华大学' }))

  const diff = select([
    post({ id: 'p1', authorId: 'u-chen', authorName: '陈屿' }),
    post({ id: 'p2', authorId: 'u-other', authorName: '陈屿' }),
    post({ id: 'p3', authorId: 'u-lin', authorName: '林夏' }),
  ], { matches: mixed })
  assert.deepStrictEqual(diff.newPosts.map((item) => item.id), ['p1', 'p3'])
})

check('identity keys ignore case, spaces and URL encoding', () => {
  assert.strictEqual(normalizeIdentityKey('%E9%99%88%E5%B1%BF'), '陈屿')
  assert.strictEqual(normalizeIdentityKey('  Chen Yu '), 'chenyu')
  assert.strictEqual(normalizeIdentityKey(''), '')
  assert.strictEqual(normalizeIdentityKey(null), '')
  const directory = buildBuddyDirectory([{ nickname: 'Chen Yu', school: '', status: 'accepted' }])
  assert.ok(isBuddyAuthor(directory, { authorName: 'chenyu', authorSchool: '' }))
})

check('an author with no name never matches', () => {
  const directory = buildBuddyDirectory([{ nickname: '', school: '', status: 'accepted' }])
  assert.strictEqual(directory.schools.size, 0)
  assert.ok(!isBuddyAuthor(buildBuddyDirectory(MATCHES), { authorName: '', authorSchool: '南开大学' }))
})

check('cold start only records a baseline and notifies nothing', () => {
  const posts = [post({ id: 'p1' }), post({ id: 'p2' }), post({ id: 'p3' })]
  const diff = select(posts, { primed: false })
  assert.deepStrictEqual(diff.newPosts, [])
  assert.strictEqual(diff.nextPrimed, true)
  assert.strictEqual(diff.nextSeen.size, 3)
})

check('incremental posts notify after the baseline', () => {
  const first = select([post({ id: 'p1' })], { primed: false })
  const second = select([post({ id: 'p2' }), post({ id: 'p1' })], {
    seen: first.nextSeen,
    primed: first.nextPrimed,
  })
  assert.deepStrictEqual(second.newPosts.map((item) => item.id), ['p2'])
})

check('my own post never notifies', () => {
  const mine = post({ id: 'p9', authorId: ME.userId, authorName: '我自己' })
  assert.strictEqual(isOwnPost(mine, ME), true)
  assert.deepStrictEqual(select([mine]).newPosts, [])
})

check('own post is still excluded when the id is missing', () => {
  const mine = post({ id: 'p9', authorId: '', authorName: '我自己' })
  assert.strictEqual(isOwnPost(mine, ME), true)
  // 同名搭子的帖子仍然要通知，靠 authorId 区分
  const buddy = post({ id: 'p10', authorId: 'u-chen', authorName: '陈屿' })
  assert.strictEqual(isOwnPost(buddy, ME), false)
})

check('a stranger post does not notify', () => {
  const stranger = post({ id: 'p5', authorId: 'u-x', authorName: '路人甲', authorSchool: '南开大学' })
  assert.deepStrictEqual(select([stranger]).newPosts, [])
})

check('a stranger post is still baselined so it never fires later', () => {
  const stranger = post({ id: 'p5', authorId: 'u-x', authorName: '路人甲' })
  const diff = select([stranger])
  assert.deepStrictEqual(diff.newPosts, [])
  assert.ok(diff.nextSeen.has('p5'))
})

check('accepting a new buddy does not replay their history', () => {
  const older = [
    post({ id: 'h1', authorId: 'u-new', authorName: '新搭子', authorSchool: '南开大学' }),
    post({ id: 'h2', authorId: 'u-new', authorName: '新搭子', authorSchool: '南开大学' }),
  ]
  // 通过申请之前：对方还不是搭子，但帖子已经进基线
  const before = select(older, { primed: false })
  assert.deepStrictEqual(before.newPosts, [])

  const accepted = MATCHES.concat([
    { id: 'm4', nickname: '新搭子', school: '南开大学', status: 'accepted', matchType: 'buddy' },
  ])
  const after = select(older, {
    matches: accepted,
    seen: before.nextSeen,
    primed: before.nextPrimed,
  })
  assert.deepStrictEqual(after.newPosts, [])

  // 成为搭子之后的新帖照常通知
  const fresh = select(older.concat([
    post({ id: 'h3', authorId: 'u-new', authorName: '新搭子', authorSchool: '南开大学' }),
  ]), { matches: accepted, seen: after.nextSeen, primed: true })
  assert.deepStrictEqual(fresh.newPosts.map((item) => item.id), ['h3'])
})

check('a notified post id is never notified twice', () => {
  const first = select([post({ id: 'p1' })])
  assert.deepStrictEqual(first.newPosts.map((item) => item.id), ['p1'])
  const second = select([post({ id: 'p1' })], { seen: first.nextSeen, primed: true })
  assert.deepStrictEqual(second.newPosts, [])
})

check('a post whose notification failed is retried next tick', () => {
  const first = select([post({ id: 'p1' })])
  const retrySeen = new Set(first.nextSeen)
  retrySeen.delete('p1')
  const second = select([post({ id: 'p1' })], { seen: retrySeen, primed: true })
  assert.deepStrictEqual(second.newPosts.map((item) => item.id), ['p1'])
})

check('seen set stays capped without dropping the newest ids', () => {
  const posts = Array.from({ length: 260 }, (_, i) => post({ id: `p${i}` }))
  const diff = selectBuddyPosts({
    posts,
    directory: buildBuddyDirectory(MATCHES),
    selfUserId: ME.userId,
    selfName: ME.name,
    seen: new Set(),
    primed: false,
    maxSeen: 200,
  })
  assert.strictEqual(diff.nextSeen.size, 200)
  assert.ok(diff.nextSeen.has('p259'))
})

check('two posts stay separate, three or more merge into a digest', () => {
  const two = select([post({ id: 'p1' }), post({ id: 'p2' })])
  assert.strictEqual(two.newPosts.length, 2)
  assert.ok(two.newPosts.length < BUDDY_POST_DIGEST_THRESHOLD)

  const three = select([post({ id: 'p1' }), post({ id: 'p2' }), post({ id: 'p3' })])
  assert.strictEqual(three.newPosts.length, 3)
  assert.ok(three.newPosts.length >= BUDDY_POST_DIGEST_THRESHOLD)
})

check('single copy is Chinese, names the author and truncates', () => {
  const copy = buildBuddyPostNotifyCopy(post({
    content: '今晚图书馆自习，有人一起吗？带上水杯和笔记本，我们从七点坐到闭馆，中途可以出去买点吃的',
  }))
  assert.strictEqual(copy.title, '搭子发了新帖')
  assert.ok(copy.content.startsWith('陈屿·找搭子：'))
  assert.ok(copy.content.includes('今晚图书馆自习'))
  assert.ok(copy.content.includes('…'))
  assert.ok(!copy.content.includes('undefined'))
})

check('encoded post content is decoded in the copy', () => {
  const copy = buildBuddyPostNotifyCopy(post({ content: '%E5%8D%97%E5%BC%80%E5%A4%A7%E5%AD%A6' }))
  assert.ok(copy.content.includes('南开大学'))
  assert.ok(!copy.content.includes('%E5'))
})

check('blank content still yields a Chinese sentence', () => {
  const copy = buildBuddyPostNotifyCopy(post({ content: '   ', type: 'help' }))
  assert.strictEqual(copy.content, '陈屿 在广场发了一条求助帖子')
  const noName = buildBuddyPostNotifyCopy(post({ authorName: '', content: '' }))
  assert.ok(noName.content.startsWith('搭子 '))
})

check('digest copy counts the posts and quotes the newest', () => {
  const copy = buildBuddyPostsDigestCopy([
    post({ id: 'p1', content: '今晚图书馆自习' }),
    post({ id: 'p2', authorName: '林夏', content: '周末骑行' }),
    post({ id: 'p3', content: '找人一起吃饭' }),
  ])
  assert.strictEqual(copy.title, '搭子有新动态')
  assert.ok(copy.content.startsWith('你的搭子发布了 3 条新帖'))
  assert.ok(copy.content.includes('最新一条来自 陈屿：今晚图书馆自习'))
})

check('digest copy survives blank content', () => {
  const copy = buildBuddyPostsDigestCopy([post({ content: '' }), post({ content: '' }), post({ content: '' })])
  assert.strictEqual(copy.content, '你的搭子发布了 3 条新帖')
})

check('buddy copy is distinguishable from my own publish confirmation', () => {
  const mine = buildPlazaNotifyCopy({ type: 'buddy', content: '今晚图书馆自习' })
  const theirs = buildBuddyPostNotifyCopy(post({ content: '今晚图书馆自习' }))
  assert.strictEqual(mine.title, '帖子已发布')
  assert.notStrictEqual(mine.title, theirs.title)
})

check('deep link points at the post, falling back to the plaza', () => {
  const link = plazaPostNotifyLink(post().id)
  assert.strictEqual(link, 'avalin://plaza/post/p1')
  assert.strictEqual(plazaPostNotifyLink(''), 'avalin://plaza')
  assert.strictEqual(plazaPostNotifyLink(undefined), 'avalin://plaza')
})

check('background always notifies', () => {
  assert.strictEqual(shouldNotifyBuddyPost({
    appForeground: false,
    activeRoute: 'pages/discover/index',
  }), true)
})

check('foreground plaza list and post detail stay quiet', () => {
  assert.strictEqual(shouldNotifyBuddyPost({
    appForeground: true,
    activeRoute: 'pages/discover/index',
  }), false)
  assert.strictEqual(shouldNotifyBuddyPost({
    appForeground: true,
    activeRoute: '/pages/plaza/detail',
  }), false)
})

check('foreground elsewhere or unknown route notifies', () => {
  assert.strictEqual(shouldNotifyBuddyPost({
    appForeground: true,
    activeRoute: 'pages/index/index',
  }), true)
  assert.strictEqual(shouldNotifyBuddyPost({ appForeground: true, activeRoute: '' }), true)
  assert.strictEqual(shouldNotifyBuddyPost({ appForeground: true }), true)
})

console.log('')
console.log(`${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
