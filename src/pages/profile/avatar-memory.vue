<template>
  <view class="page">
    <CustomNavBar title="我的分身" leftIcon="back" rightIcon="搜索" @rightClick="showSearch = true" />
    <view :style="{ height: navBarHeight + 'px' }" />

    <view v-if="showSearch" class="overlay overlay--top" @click.self="closeSearch">
      <view class="search-box">
        <input v-model="searchKeyword" class="search-input" placeholder="搜索记忆、偏好、边界..." focus />
        <text class="search-cancel" @click="closeSearch">取消</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <view class="hero">
        <view class="hero-main">
          <view class="bot"><DoodleIcon name="robot" :size="104" color="#FFF3D7" /></view>
          <view class="hero-text">
            <text class="overline">RIJI AVATAR</text>
            <text class="hero-title">{{ avatarStatus?.isActive ? '分身正在观察世界' : '分身正在休息' }}</text>
            <text class="hero-desc">{{ avatarFirstSentence }}</text>
          </view>
        </view>
        <view class="stats">
          <view class="stat"><text class="stat-num">{{ memoryDocCount }}</text><text class="stat-label">长期记忆</text></view>
          <view class="stat"><text class="stat-num">{{ factCount }}</text><text class="stat-label">结构侧写</text></view>
          <view class="stat"><text class="stat-num">{{ draftActions.length }}</text><text class="stat-label">待确认</text></view>
        </view>
        <view class="meter"><view class="meter-head"><text>了解度</text><text>{{ knowledgeLevel }}%</text></view><view class="meter-track"><view class="meter-fill" :style="{ width: knowledgeLevel + '%' }" /></view></view>
      </view>

      <view class="quick-grid">
        <view class="quick quick--dark" @click="onRegenerate"><text class="quick-title">{{ isRegenerating ? '生成中...' : '重建侧写' }}</text><text class="quick-desc">用最新记忆刷新画像</text></view>
        <view class="quick" @click="showAddPanel = true"><text class="quick-title">添加记忆</text><text class="quick-desc">写入偏好、需求、边界</text></view>
        <view class="quick" @click="onExportMemory"><text class="quick-title">导出备份</text><text class="quick-desc">保存长期记忆快照</text></view>
      </view>

      <view v-if="draftActions.length" class="card">
        <view class="section-row"><view><text class="overline overline--card">APPROVAL</text><text class="section-title">待确认的分身行动</text></view><text class="pill warm">{{ draftActions.length }} 条</text></view>
        <view v-for="action in draftActions" :key="action.id" class="draft"><text class="muted">广场评论草稿</text><text class="body-text">{{ action.outputText }}</text><view class="row-actions"><text class="btn ghost" @click="onRejectAction(action.id)">拒绝</text><text class="btn primary" @click="onApproveAction(action.id)">发布</text></view></view>
      </view>

      <view class="card">
        <view class="section-row"><view><text class="overline overline--card">PORTRAIT</text><text class="section-title">分身侧写</text></view><text class="soft-link" @click="onRegenerate">刷新</text></view>
        <text class="body-text">{{ avatarProfile?.summary || '还没有生成侧写。让日记、对话和素材先沉淀一些记忆，或者点击“重建侧写”。' }}</text>
        <view v-if="profileKeywords.length" class="chips"><text v-for="keyword in profileKeywords" :key="keyword" class="chip">{{ keyword }}</text></view>
        <text class="meta">基于 {{ avatarProfile?.diaryCount ?? 0 }} 篇日记、{{ avatarProfile?.chatCount ?? memoryDocCount }} 条对话/记忆线索生成</text>
      </view>

      <view class="card tabs-card"><view class="section-row compact"><view><text class="overline overline--card">MEMORY FACTS</text><text class="section-title">结构化记忆</text></view><text class="soft-link" @click="showAddPanel = true">新增</text></view><scroll-view scroll-x show-scrollbar="false" class="tabs-scroll"><view class="tabs"><view v-for="tab in memoryTabs" :key="tab.key" class="tab" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key"><text>{{ tab.label }}</text></view></view></scroll-view></view>

      <view v-if="showNeedSection && needFacts.length" class="block"><view class="section-row plain"><text class="section-title">当前需求</text><text class="pill">{{ needFacts.length }} 条</text></view><view v-for="item in needFacts" :key="item.id" class="need"><text class="body-text">{{ item.content }}</text><view class="fact-meta"><text>{{ percent(item.confidence) }}</text><text>{{ stabilityLabel(item.stability) }}</text></view><view class="row-actions"><text class="btn ghost" @click="startEdit(item)">编辑</text><text class="btn danger" @click="disableFact(item)">停用</text></view></view></view>
      <view class="block">
        <view v-if="groupedFacts.length === 0" class="empty"><text class="empty-title">还没有这类结构化记忆</text><text class="empty-desc">你可以手动添加，也可以从长期记忆文档里抽取事实。</text><text class="empty-btn" @click="showAddPanel = true">添加第一条</text></view>
        <view v-for="group in groupedFacts" :key="group.label"><text class="group-title">{{ group.label }}</text><view v-for="item in group.items" :key="item.id" class="fact-card" :class="{ pinned: item.isPinned }"><view v-if="editingId === item.id" class="edit-box"><view class="mini-tabs"><text v-for="tab in factTabs" :key="tab.key" class="mini-tab" :class="{ active: editingCategory === tab.key }" @click="editingCategory = tab.key">{{ tab.label }}</text></view><textarea v-model="editingContent" class="textarea" :auto-height="true" /><view class="row-actions"><text class="btn ghost" @click="cancelEdit">取消</text><text class="btn primary" @click="saveEdit(item)">保存</text></view></view><view v-else class="fact-row"><view class="fact-icon">{{ categoryIcon(item.category) }}</view><view class="fact-body"><view class="fact-head"><text class="fact-category">{{ categoryLabel(item.category) }}</text><text v-if="item.isPinned" class="pin">置顶</text></view><text class="fact-content">{{ item.content }}</text><view class="fact-meta"><text>{{ percent(item.confidence) }}</text><text>{{ stabilityLabel(item.stability) }}</text><text>{{ formatDate(item.updatedAt) }}</text></view></view><view class="fact-actions"><text @click="togglePinned(item)">{{ item.isPinned ? '取消' : '置顶' }}</text><text @click="startEdit(item)">编辑</text><text class="danger-text" @click="removeFact(item.id)">删除</text></view></view></view></view>
      </view>

      <view v-if="showAddPanel" class="overlay panel-overlay" @click.self="showAddPanel = false"><view class="panel"><view class="handle" /><text class="panel-title">添加结构化记忆</text><view class="mini-tabs"><text v-for="tab in factTabs" :key="tab.key" class="mini-tab" :class="{ active: newFactCategory === tab.key }" @click="newFactCategory = tab.key">{{ tab.label }}</text></view><textarea v-model="newFactContent" class="textarea panel-textarea" placeholder="例如：我喜欢低压力、慢慢熟悉的社交方式。" /><view class="check-row" @click="newFactPinned = !newFactPinned"><view class="checkbox" :class="{ checked: newFactPinned }"><text v-if="newFactPinned">✓</text></view><text>作为重要记忆置顶</text></view><view class="row-actions"><text class="btn ghost" @click="showAddPanel = false">取消</text><text class="btn primary" @click="confirmAddFact">写入记忆</text></view></view></view>

      <view class="card"><view class="section-row"><view><text class="overline overline--card">LONG MEMORY</text><text class="section-title">长期记忆底座</text></view><text class="pill warm">{{ memoryDocCount }} 条</text></view><text class="body-text">日记、对话、素材、广场互动会先沉淀为原文记忆，再抽取成上方的结构化侧写。</text><view v-if="latestMemoryDocs.length" class="docs"><view v-for="doc in latestMemoryDocs" :key="doc.id" class="doc"><text class="doc-source">{{ sourceTypeLabel(doc.sourceType) }}</text><text class="doc-title">{{ doc.title || doc.summary || '未命名记忆' }}</text></view></view><view class="row-actions"><text class="btn ghost" @click="onExportMemory">导出</text><text class="btn danger" @click="onDeleteAllMemory">清空记忆</text></view></view>

      <view class="card"><view class="section-row"><view><text class="overline overline--card">CONTROLS</text><text class="section-title">分身社交设置</text></view><switch :checked="avatarStatus?.isActive ?? false" color="#1F6F61" @change="handleAvatarActiveChange" /></view><view class="setting"><text class="setting-title">自动浏览频道</text><view class="setting-grid"><text v-for="item in channelOptions" :key="item.key" class="setting-chip" :class="{ active: isChannelEnabled(item.key) }" @click="toggleChannel(item.key)">{{ item.label }}</text></view></view><view class="setting"><text class="setting-title">允许的分身动作</text><view class="setting-grid"><text v-for="item in actionOptions" :key="item.key" class="setting-chip" :class="{ active: isActionEnabled(item.key) }" @click="toggleAction(item.key)">{{ item.label }}</text></view></view><view class="setting last"><text class="setting-title">匹配范围</text><view class="setting-row"><text>学校</text><view class="setting-right"><text>{{ avatarStatus?.matchRange?.school || '不限学校' }}</text><text class="soft-link" @click="onChangeSchool">切换</text></view></view><view class="setting-row"><text>距离</text><view class="setting-right"><text>{{ avatarStatus?.matchRange?.distanceKm ?? 3 }} km</text><text class="round-btn" @click="adjustDistance(-1)">−</text><text class="round-btn" @click="adjustDistance(1)">+</text></view></view></view></view>
      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CustomNavBar from '@/components/CustomNavBar.vue'
import DoodleIcon from '@/components/DoodleIcon.vue'
import { approveAgentAction, getAgentActions, getAvatarProfile, getAvatarStatus, regenerateProfile, rejectAgentAction, updateAvatarStatus } from '@/services/api/avatar'
import type { AgentAction, AvatarProfile, AvatarStatus } from '@/services/api/avatar'
import { createMemoryFact, deleteAllMemory, deleteMemoryFact, exportMemory, getMemoryDocuments, getMemoryFacts, updateMemoryFact } from '@/services/api/memory'
import type { MemoryDocument, MemoryFact } from '@/services/api/memory'

const navBarHeight = ref(64)
const showSearch = ref(false)
const searchKeyword = ref('')
const activeTab = ref('all')
const memoryFacts = ref<MemoryFact[]>([])
const memoryDocs = ref<MemoryDocument[]>([])
const draftActions = ref<AgentAction[]>([])
const memoryDocCount = ref(0)
const avatarProfile = ref<AvatarProfile | null>(null)
const avatarStatus = ref<AvatarStatus | null>(null)
const isRegenerating = ref(false)
const showAddPanel = ref(false)
const newFactCategory = ref('profile')
const newFactContent = ref('')
const newFactPinned = ref(false)
const editingId = ref<string | null>(null)
const editingContent = ref('')
const editingCategory = ref('profile')
const memoryTabs = [
  { key: 'all', label: '全部' },
  { key: 'profile', label: '画像' },
  { key: 'interest', label: '兴趣' },
  { key: 'preference', label: '偏好' },
  { key: 'habit', label: '习惯' },
  { key: 'need', label: '需求' },
  { key: 'relationship', label: '关系' },
  { key: 'boundary', label: '边界' },
]
const factTabs = memoryTabs.filter(item => item.key !== 'all')
const channelOptions = [{ key: 'buddy', label: '找搭子' }, { key: 'help', label: '求助' }, { key: 'dating', label: '恋爱' }, { key: 'share', label: '分享' }]
const actionOptions = [{ key: 'browse', label: '浏览广场' }, { key: 'match', label: '发现匹配' }, { key: 'comment', label: '生成评论草稿' }]

onMounted(async () => {
  const info = uni.getSystemInfoSync()
  navBarHeight.value = (info.statusBarHeight ?? 20) + 44
  await Promise.all([loadFacts(), loadStatus(), loadProfile(), loadActions(), loadMemoryDocuments()])
})

const factCount = computed(() => memoryFacts.value.length)
const knowledgeLevel = computed(() => Math.min(98, Math.max(12, Math.round(memoryDocCount.value * 4 + factCount.value * 7))))
const avatarFirstSentence = computed(() => {
  const summary = avatarProfile.value?.summary?.trim() || '我还在学习你的表达方式、偏好和边界。'
  const dot = summary.search(/[。！？!?]/)
  return dot >= 0 ? summary.slice(0, dot + 1) : summary.slice(0, 44)
})
const profileKeywords = computed(() => memoryFacts.value.filter(item => item.isPinned || ['interest', 'preference', 'habit'].includes(item.category)).slice(0, 6).map(item => item.object || item.content.slice(0, 8)))
const filteredFacts = computed(() => {
  const list = activeTab.value === 'all' ? memoryFacts.value : memoryFacts.value.filter(item => item.category === activeTab.value)
  const keyword = searchKeyword.value.trim().toLowerCase()
  return keyword ? list.filter(item => `${item.content} ${item.category} ${item.object}`.toLowerCase().includes(keyword)) : list
})
const showNeedSection = computed(() => activeTab.value === 'all' || activeTab.value === 'need')
const needFacts = computed(() => filteredFacts.value.filter(item => item.category === 'need'))
const nonNeedFacts = computed(() => filteredFacts.value.filter(item => !(showNeedSection.value && item.category === 'need')))
const latestMemoryDocs = computed(() => memoryDocs.value.slice(0, 3))

interface FactGroup { label: string; items: MemoryFact[] }
const groupedFacts = computed<FactGroup[]>(() => {
  const pinned = nonNeedFacts.value.filter(item => item.isPinned)
  const regular = nonNeedFacts.value.filter(item => !item.isPinned)
  const groups: FactGroup[] = []
  if (pinned.length) groups.push({ label: '置顶记忆', items: pinned })
  if (regular.length) groups.push({ label: activeTab.value === 'all' ? '全部侧写' : categoryLabel(activeTab.value), items: regular })
  return groups
})

function closeSearch() { showSearch.value = false; searchKeyword.value = '' }
async function loadFacts() { try { memoryFacts.value = (await getMemoryFacts({ activeOnly: true })).items } catch { memoryFacts.value = [] } }
async function loadMemoryDocuments() { try { const res = await getMemoryDocuments({ limit: 100, offset: 0 }); memoryDocs.value = res.items; memoryDocCount.value = res.items.length } catch { memoryDocs.value = []; memoryDocCount.value = 0 } }
async function loadActions() { try { draftActions.value = await getAgentActions('draft') } catch { draftActions.value = [] } }
async function loadProfile() { avatarProfile.value = await getAvatarProfile() }
async function loadStatus() { avatarStatus.value = await getAvatarStatus() }

async function confirmAddFact() {
  const content = newFactContent.value.trim()
  if (!content) { uni.showToast({ title: '请输入记忆内容', icon: 'none' }); return }
  try {
    const fact = await createMemoryFact({ category: newFactCategory.value, content, object: content.slice(0, 80), confidence: 1, stability: 'stable', isPinned: newFactPinned.value })
    memoryFacts.value.unshift(fact)
    newFactContent.value = ''
    newFactPinned.value = false
    showAddPanel.value = false
    uni.showToast({ title: '已写入记忆', icon: 'success' })
  } catch (e: any) { uni.showToast({ title: e?.message || '添加失败', icon: 'none' }) }
}
function startEdit(item: MemoryFact) { editingId.value = item.id; editingContent.value = item.content; editingCategory.value = item.category }
function cancelEdit() { editingId.value = null; editingContent.value = '' }
async function saveEdit(item: MemoryFact) {
  const content = editingContent.value.trim()
  if (!content) { uni.showToast({ title: '记忆不能为空', icon: 'none' }); return }
  replaceFact(await updateMemoryFact(item.id, { category: editingCategory.value, content, object: content.slice(0, 80) }))
  cancelEdit()
}
async function togglePinned(item: MemoryFact) { replaceFact(await updateMemoryFact(item.id, { isPinned: !item.isPinned })) }
async function disableFact(item: MemoryFact) { const updated = await updateMemoryFact(item.id, { isActive: false }); memoryFacts.value = memoryFacts.value.filter(fact => fact.id !== updated.id) }
function removeFact(id: string) { uni.showModal({ title: '删除结构化记忆', content: '删除后这条侧写不会再参与分身画像和匹配。确定继续吗？', confirmColor: '#B55248', success: async (res) => { if (!res.confirm) return; await deleteMemoryFact(id); memoryFacts.value = memoryFacts.value.filter(item => item.id !== id) } }) }
function replaceFact(next: MemoryFact) { const index = memoryFacts.value.findIndex(item => item.id === next.id); if (index >= 0) memoryFacts.value[index] = next }
async function onRegenerate() {
  if (isRegenerating.value) return
  isRegenerating.value = true
  try { avatarProfile.value = await regenerateProfile(); uni.showToast({ title: '侧写已更新', icon: 'success' }) }
  catch (e: any) { uni.showToast({ title: e?.message || '生成失败', icon: 'none' }) }
  finally { isRegenerating.value = false }
}
async function onApproveAction(actionId: string) { try { await approveAgentAction(actionId); draftActions.value = draftActions.value.filter(item => item.id !== actionId); await loadMemoryDocuments(); uni.showToast({ title: '已发布', icon: 'success' }) } catch (e: any) { uni.showToast({ title: e?.message || '发布失败', icon: 'none' }) } }
async function onRejectAction(actionId: string) { try { await rejectAgentAction(actionId) } finally { draftActions.value = draftActions.value.filter(item => item.id !== actionId) } }
async function onExportMemory() { try { const payload = await exportMemory(); console.log('memory export', payload); uni.showToast({ title: `已导出 ${payload.documents.length} 条`, icon: 'success' }) } catch (e: any) { uni.showToast({ title: e?.message || '导出失败', icon: 'none' }) } }
function onDeleteAllMemory() { uni.showModal({ title: '清空全部记忆', content: '这会删除长期记忆、结构化侧写、分身名片、草稿行动和旧分身记忆。确定继续吗？', confirmColor: '#B55248', success: async (res) => { if (!res.confirm) return; await deleteAllMemory(); memoryFacts.value = []; memoryDocs.value = []; draftActions.value = []; memoryDocCount.value = 0; avatarProfile.value = { summary: '', diaryCount: 0, chatCount: 0, generatedAt: 0 }; uni.showToast({ title: '已清空', icon: 'success' }) } }) }
function handleAvatarActiveChange(event: any) { return updateStatusField('isActive', Boolean(event?.detail?.value)) }
async function updateStatusField(field: keyof AvatarStatus, value: any) { if (!avatarStatus.value) return; avatarStatus.value = { ...avatarStatus.value, [field]: value }; await updateAvatarStatus({ [field]: value }) }
function isChannelEnabled(key: string) { return avatarStatus.value?.enabledChannels?.includes(key) ?? false }
async function toggleChannel(key: string) { if (!avatarStatus.value) return; const channels = [...(avatarStatus.value.enabledChannels ?? [])]; const index = channels.indexOf(key); if (index >= 0) channels.splice(index, 1); else channels.push(key); avatarStatus.value = { ...avatarStatus.value, enabledChannels: channels }; await updateAvatarStatus({ enabledChannels: channels }) }
function isActionEnabled(key: string) { return avatarStatus.value?.enabledActions?.includes(key) ?? false }
async function toggleAction(key: string) { if (!avatarStatus.value) return; const actions = [...(avatarStatus.value.enabledActions ?? [])]; const index = actions.indexOf(key); if (index >= 0) actions.splice(index, 1); else actions.push(key); avatarStatus.value = { ...avatarStatus.value, enabledActions: actions }; await updateAvatarStatus({ enabledActions: actions }) }
function onChangeSchool() { uni.showModal({ title: '切换学校', editable: true, placeholderText: '输入学校名称，留空表示不限', success: async (res) => { if (!res.confirm || !avatarStatus.value) return; const matchRange = { ...avatarStatus.value.matchRange, school: res.content || '' }; avatarStatus.value = { ...avatarStatus.value, matchRange }; await updateAvatarStatus({ matchRange }) } }) }
async function adjustDistance(delta: number) { if (!avatarStatus.value) return; const current = avatarStatus.value.matchRange?.distanceKm ?? 3; const next = Math.max(1, Math.min(50, current + delta)); const matchRange = { ...avatarStatus.value.matchRange, distanceKm: next }; avatarStatus.value = { ...avatarStatus.value, matchRange }; await updateAvatarStatus({ matchRange }) }
function categoryIcon(category: string) { return ({ profile: '像', interest: '趣', preference: '偏', habit: '习', need: '需', relationship: '联', boundary: '界', experience: '历' } as Record<string, string>)[category] ?? '记' }
function categoryLabel(category: string) { return factTabs.find(item => item.key === category)?.label ?? category }
function stabilityLabel(stability: string) { return ({ stable: '稳定记忆', recent: '近期线索', temporary: '临时状态' } as Record<string, string>)[stability] ?? (stability || '未标注') }
function sourceTypeLabel(sourceType: string) { return ({ diary: '日记', chat_session: '对话', material: '素材', plaza_post: '广场', plaza_post_index: '公开索引', plaza_comment: '评论', social_message: '私聊' } as Record<string, string>)[sourceType] ?? sourceType }
function percent(value: number) { return `${Math.round((value || 0) * 100)}%` }
function formatDate(ts: number) { if (!ts) return '未知'; const date = new Date(ts); return `${date.getMonth() + 1}/${date.getDate()}` }
</script>

<style lang="scss" scoped>
$ink:#271A12;$brown:#5E4030;$muted:#9A7863;$paper:#FFF9EF;$green:#1F6F61;$soft:#DDEEE5;$clay:#D97852;$danger:#B55248;$line:rgba(92,61,42,.13);$shadow:0 18rpx 48rpx rgba(73,45,25,.10);
.page{min-height:100vh;background:radial-gradient(circle at 10% 4%,rgba(241,187,104,.32),transparent 30%),radial-gradient(circle at 94% 14%,rgba(31,111,97,.20),transparent 28%),linear-gradient(180deg,#FFF2DC 0%,#F7EFE5 48%,#FDF8F1 100%);color:$ink}.scroll{height:100vh;box-sizing:border-box}.card,.hero,.quick,.fact-card,.need,.draft,.doc{border:1px solid rgba(255,255,255,.72);box-shadow:$shadow}.card{margin:22rpx 28rpx;padding:30rpx;border-radius:32rpx;background:rgba(255,253,247,.92)}.hero{margin:24rpx 28rpx 20rpx;padding:34rpx;border-radius:40rpx;background:linear-gradient(135deg,rgba(28,87,77,.97),rgba(37,114,96,.88) 45%,rgba(202,109,75,.94));overflow:hidden}.hero-main{display:flex;gap:26rpx;align-items:center}.bot{width:140rpx;height:140rpx;border-radius:42rpx;background:rgba(255,249,239,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0}.hero-text{flex:1}.overline{display:block;font-size:20rpx;letter-spacing:2rpx;color:rgba(255,249,239,.68);font-weight:800;margin-bottom:8rpx}.overline--card{color:$muted}.hero-title{display:block;font-size:38rpx;color:$paper;font-weight:900;line-height:1.25;margin-bottom:12rpx}.hero-desc{display:block;font-size:25rpx;line-height:1.55;color:rgba(255,249,239,.82)}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14rpx;margin-top:30rpx}.stat{padding:20rpx 12rpx;border-radius:24rpx;background:rgba(255,249,239,.16);text-align:center}.stat-num{display:block;font-size:36rpx;color:$paper;font-weight:900}.stat-label{display:block;margin-top:4rpx;font-size:21rpx;color:rgba(255,249,239,.72)}.meter{margin-top:26rpx}.meter-head{display:flex;justify-content:space-between;margin-bottom:12rpx;font-size:23rpx;color:rgba(255,249,239,.82)}.meter-track{height:14rpx;border-radius:999rpx;background:rgba(255,249,239,.18);overflow:hidden}.meter-fill{height:100%;border-radius:999rpx;background:linear-gradient(90deg,#F9E1A8,#fff)}.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16rpx;margin:0 28rpx 20rpx}.quick{min-height:116rpx;padding:22rpx 18rpx;border-radius:28rpx;background:rgba(255,253,247,.86)}.quick--dark{background:$green}.quick--dark .quick-title,.quick--dark .quick-desc{color:$paper}.quick-title{display:block;font-size:27rpx;color:$ink;font-weight:900;margin-bottom:8rpx}.quick-desc{display:block;font-size:21rpx;color:$muted;line-height:1.35}.section-row{display:flex;justify-content:space-between;align-items:center;gap:20rpx;margin-bottom:22rpx}.compact{margin-bottom:16rpx}.plain{margin:0 28rpx 16rpx}.section-title{display:block;font-size:32rpx;color:$ink;font-weight:900}.soft-link,.pill,.chip,.doc-source{padding:8rpx 18rpx;border-radius:999rpx;font-size:23rpx;font-weight:800;background:rgba(31,111,97,.10);color:$green}.warm{background:rgba(217,120,82,.12);color:$clay}.body-text,.fact-content{display:block;font-size:28rpx;color:$brown;line-height:1.7}.meta,.muted{display:block;color:$muted;font-size:23rpx;margin-top:16rpx}.chips,.fact-meta,.tabs,.mini-tabs,.setting-grid{display:flex;flex-wrap:wrap;gap:12rpx}.chips{margin-top:20rpx}.tabs-scroll{white-space:nowrap}.tabs{min-width:max-content;flex-wrap:nowrap}.tab,.mini-tab,.setting-chip{padding:14rpx 24rpx;border-radius:999rpx;background:rgba(92,61,42,.08);color:$brown;font-size:25rpx;font-weight:800}.tab.active,.mini-tab.active,.setting-chip.active{background:$ink;color:$paper}.block{margin:0 28rpx}.need,.fact-card,.draft,.doc{padding:24rpx;margin-bottom:16rpx;border-radius:28rpx;background:rgba(255,253,247,.88);border-color:$line}.need,.fact-card.pinned{background:linear-gradient(135deg,rgba(255,248,224,.94),rgba(255,253,247,.92))}.row-actions{display:flex;gap:16rpx;margin-top:22rpx}.btn{flex:1;padding:18rpx 0;border-radius:999rpx;text-align:center;font-size:25rpx;font-weight:900}.primary{background:$green;color:$paper}.ghost{background:rgba(92,61,42,.08);color:$muted}.danger{background:rgba(181,82,72,.12);color:$danger}.group-title{display:block;margin:20rpx 4rpx 12rpx;font-size:24rpx;color:$muted;font-weight:900}.fact-row{display:flex;align-items:flex-start;gap:18rpx}.fact-icon{width:54rpx;height:54rpx;border-radius:18rpx;flex-shrink:0;background:$soft;color:$green;font-size:25rpx;font-weight:900;display:flex;align-items:center;justify-content:center}.fact-body{flex:1;min-width:0}.fact-head{display:flex;align-items:center;gap:10rpx;margin-bottom:8rpx}.fact-category{color:$green;font-size:24rpx;font-weight:900}.pin{padding:4rpx 12rpx;border-radius:999rpx;background:rgba(241,187,104,.20);color:#A76C17;font-size:20rpx;font-weight:900}.fact-meta{margin-top:12rpx;color:$muted;font-size:22rpx}.fact-actions{display:flex;flex-direction:column;gap:10rpx;flex-shrink:0}.fact-actions text{padding:8rpx 14rpx;border-radius:999rpx;background:rgba(31,111,97,.08);color:$green;font-size:22rpx;font-weight:900;text-align:center}.fact-actions .danger-text{color:$danger;background:rgba(181,82,72,.10)}.edit-box{display:flex;flex-direction:column;gap:18rpx}.textarea{width:100%;min-height:150rpx;box-sizing:border-box;padding:22rpx;border-radius:24rpx;background:rgba(247,239,229,.74);color:$brown;font-size:28rpx;line-height:1.6}.empty{margin:18rpx 0;padding:44rpx 30rpx;border-radius:32rpx;background:rgba(255,253,247,.68);border:1px dashed rgba(92,61,42,.18);text-align:center}.empty-title{display:block;color:$ink;font-size:29rpx;font-weight:900;margin-bottom:8rpx}.empty-desc{display:block;color:$muted;font-size:24rpx;line-height:1.5;margin-bottom:22rpx}.empty-btn{display:inline-flex;padding:14rpx 28rpx;border-radius:999rpx;background:$green;color:$paper;font-size:25rpx;font-weight:900}.overlay{position:fixed;inset:0;z-index:300;background:rgba(39,26,18,.34)}.overlay--top{z-index:220;display:flex;align-items:flex-start}.search-box{width:100%;padding:32rpx;display:flex;gap:18rpx;background:rgba(255,249,239,.96)}.search-input{flex:1;height:76rpx;border-radius:999rpx;padding:0 30rpx;background:#F0E4D5;color:$brown;font-size:27rpx}.search-cancel{align-self:center;color:$green;font-size:27rpx;font-weight:900}.panel-overlay{display:flex;align-items:flex-end}.panel{width:100%;padding:26rpx 36rpx 58rpx;border-radius:42rpx 42rpx 0 0;background:$paper;box-sizing:border-box}.handle{width:88rpx;height:10rpx;border-radius:999rpx;background:rgba(92,61,42,.18);margin:0 auto 28rpx}.panel-title{display:block;color:$ink;font-size:34rpx;font-weight:900;text-align:center;margin-bottom:26rpx}.panel-textarea{margin-top:22rpx}.check-row{display:flex;align-items:center;gap:14rpx;margin:20rpx 0 8rpx;color:$brown;font-size:25rpx}.checkbox{width:34rpx;height:34rpx;border-radius:10rpx;border:1px solid rgba(92,61,42,.28);display:flex;align-items:center;justify-content:center;color:$paper;font-weight:900}.checkbox.checked{background:$green;border-color:$green}.docs{display:flex;flex-direction:column;gap:12rpx;margin-top:22rpx}.doc{display:flex;align-items:center;gap:14rpx;box-shadow:none}.doc-title{flex:1;color:$brown;font-size:25rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.setting{padding:22rpx 0;border-top:1px solid $line}.setting.last{padding-bottom:0}.setting-title{display:block;margin-bottom:16rpx;color:$muted;font-size:25rpx;font-weight:900}.setting-row{display:flex;justify-content:space-between;align-items:center;padding:16rpx 0;color:$brown;font-size:27rpx}.setting-right{display:flex;align-items:center;gap:14rpx;color:$muted;font-size:25rpx}.round-btn{width:48rpx;height:48rpx;border-radius:50%;background:$green;color:$paper;display:flex;align-items:center;justify-content:center;font-size:32rpx;font-weight:900}.bottom-space{height:80rpx}
</style>
