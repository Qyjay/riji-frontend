<template>
  <view class="page">
    <view class="paper-scene" aria-hidden="true">
      <view class="warm-orb warm-orb-primary"></view>
      <view class="warm-orb warm-orb-secondary"></view>
      <view class="paper-line paper-line-a"></view>
      <view class="paper-line paper-line-b"></view>
      <view class="memory-chip memory-chip-a">voice</view>
      <view class="memory-chip memory-chip-b">photo</view>
      <view class="memory-chip memory-chip-c">mood</view>
    </view>

    <view class="shell">
      <view class="hero">
        <view class="brand-kicker">
          <view class="kicker-dot"></view>
          <text>Private AI Diary</text>
        </view>
        <view class="brand-row">
          <view class="brand-seal">A</view>
          <view class="brand-copy">
            <view class="logo-text">Avalin</view>
            <view class="sub-title">多模态日记 孵化AI数字分身的轻社交 应用</view>
          </view>
        </view>
        <view class="hero-note">
          让照片、声音和心情成为长期记忆，在温柔的记录里养成更懂你的数字分身。
        </view>
      </view>

      <view class="card">
        <view class="card-heading">
          <view class="card-title">{{ mode === 'login' ? '欢迎回来' : '开始记录' }}</view>
          <view class="card-desc">{{ mode === 'login' ? '继续培养你的 AI 分身' : '创建一个只属于你的记忆空间' }}</view>
        </view>

        <!-- Tab 切换 -->
        <view class="tab-row">
          <view class="tab-thumb" :class="{ register: mode === 'register' }"></view>
          <view class="tab-item" :class="{ active: mode === 'login' }" @tap="mode = 'login'">登录</view>
          <view class="tab-item" :class="{ active: mode === 'register' }" @tap="mode = 'register'">注册</view>
        </view>

        <!-- 登录 -->
        <view v-if="mode === 'login'" class="form">
          <view class="field">
            <view class="field-label-wrap"><text class="field-label">用户名</text></view>
            <view class="field-input-wrap">
              <input class="field-input" v-model="loginForm.username" placeholder="请输入用户名" placeholder-class="placeholder" maxlength="20" :adjust-position="true" />
            </view>
          </view>
          <view class="field">
            <view class="field-label-wrap"><text class="field-label">密码</text></view>
            <view class="field-input-wrap">
              <input class="field-input" v-model="loginForm.password" placeholder="请输入密码" placeholder-class="placeholder" password maxlength="32" :adjust-position="true" />
            </view>
          </view>
          <button class="btn-primary" :disabled="submitting" @tap="handleLogin">
            {{ submitting ? '登录中...' : '进入 Avalin' }}
          </button>
        </view>

        <!-- 注册 -->
        <view v-if="mode === 'register'" class="form">
          <view class="field">
            <view class="field-label-wrap"><text class="field-label">用户名</text></view>
            <view class="field-input-wrap">
              <input class="field-input" v-model="registerForm.username" placeholder="4-20 个字符" placeholder-class="placeholder" maxlength="20" :adjust-position="true" />
            </view>
          </view>
          <view class="field">
            <view class="field-label-wrap"><text class="field-label">密码</text></view>
            <view class="field-input-wrap">
              <input class="field-input" v-model="registerForm.password" placeholder="6-32 个字符" placeholder-class="placeholder" password maxlength="32" :adjust-position="true" />
            </view>
          </view>
          <view class="field">
            <view class="field-label-wrap"><text class="field-label">昵称</text></view>
            <view class="field-input-wrap">
              <input class="field-input" v-model="registerForm.name" placeholder="选填" placeholder-class="placeholder" maxlength="20" :adjust-position="true" />
            </view>
          </view>
          <view class="field">
            <view class="field-label-wrap"><text class="field-label">学校</text></view>
            <view class="field-input-wrap">
              <input class="field-input" v-model="registerForm.school" placeholder="选填" placeholder-class="placeholder" maxlength="40" :adjust-position="true" />
            </view>
          </view>
          <button class="btn-primary" :disabled="submitting" @tap="handleRegister">
            {{ submitting ? '注册中...' : '创建 Avalin' }}
          </button>
        </view>
      </view>

      <view class="footer-note">每一次记录，都是数字分身理解你的新线索。</view>

      <!-- 错误提示（调试用） -->
      <view v-if="errorMsg" class="error-bar">{{ errorMsg }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { login, register, isLoggedIn } from '../../services/api/auth'

const mode = ref<'login' | 'register'>('login')
const submitting = ref(false)
const errorMsg = ref('')

const loginForm = ref({ username: '', password: '' })
const registerForm = ref({ username: '', password: '', name: '', school: '' })

onLoad(() => {
  if (isLoggedIn()) {
    uni.reLaunch({ url: '/pages/index/index' })
  }
})

function validateUsername(v: string): string | null {
  if (!v) return '用户名不能为空'
  if (v.length < 4) return '用户名至少 4 个字符'
  return null
}

function validatePassword(v: string): string | null {
  if (!v) return '密码不能为空'
  if (v.length < 6) return '密码至少 6 个字符'
  return null
}

async function handleLogin() {
  const ue = validateUsername(loginForm.value.username)
  if (ue) { uni.showToast({ title: ue, icon: 'none' }); return }
  const pe = validatePassword(loginForm.value.password)
  if (pe) { uni.showToast({ title: pe, icon: 'none' }); return }

  submitting.value = true
  errorMsg.value = ''
  try {
    console.log('[Login] 发起请求...')
    await login(loginForm.value.username, loginForm.value.password)
    console.log('[Login] 成功')
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 800)
  } catch (err: any) {
    console.error('[Login] 失败:', err)
    const msg = err?.message || '登录失败，请检查网络'
    errorMsg.value = msg
    uni.showToast({ title: msg, icon: 'none', duration: 3000 })
  } finally {
    submitting.value = false
  }
}

async function handleRegister() {
  const ue = validateUsername(registerForm.value.username)
  if (ue) { uni.showToast({ title: ue, icon: 'none' }); return }
  const pe = validatePassword(registerForm.value.password)
  if (pe) { uni.showToast({ title: pe, icon: 'none' }); return }

  submitting.value = true
  errorMsg.value = ''
  try {
    console.log('[Register] 发起请求...')
    await register({
      username: registerForm.value.username,
      password: registerForm.value.password,
      name: registerForm.value.name || undefined,
      school: registerForm.value.school || undefined,
    })
    console.log('[Register] 成功')
    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 800)
  } catch (err: any) {
    console.error('[Register] 失败:', err)
    const msg = err?.message || '注册失败，请检查网络'
    errorMsg.value = msg
    uni.showToast({ title: msg, icon: 'none', duration: 3000 })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 18% 8%, rgba(221, 162, 107, 0.24), transparent 32%),
    linear-gradient(160deg, #FFF9F1 0%, #F6EBDD 52%, #EFE1D0 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 72rpx 40rpx 56rpx;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  color: #2E2118;
  font-family: 'ZcoolKuaiLe', 'ZCOOL KuaiLe', 'STXingkai', 'KaiTi', 'PingFang SC', sans-serif;
}

.paper-scene {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  transform: translateZ(0);
}

.paper-scene::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(132, 91, 56, 0.045) 2rpx, transparent 2rpx),
    linear-gradient(90deg, rgba(132, 91, 56, 0.035) 2rpx, transparent 2rpx);
  background-size: 100% 56rpx, 56rpx 100%;
  opacity: 0.62;
  animation: paper-grid-drift 18s ease-in-out infinite alternate;
}

.paper-scene::after {
  content: '';
  position: absolute;
  left: -80rpx;
  top: 0;
  bottom: 0;
  width: 210rpx;
  background: linear-gradient(90deg, rgba(174, 108, 63, 0.12), rgba(174, 108, 63, 0));
  animation: paper-wash-shift 14s ease-in-out infinite alternate;
}

.warm-orb {
  position: absolute;
  border-radius: 999rpx;
  filter: blur(8rpx);
  opacity: 0.72;
}

.warm-orb-primary {
  width: 360rpx;
  height: 360rpx;
  right: -120rpx;
  top: 96rpx;
  background: rgba(218, 142, 82, 0.26);
  animation: orb-float-primary 9s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.warm-orb-secondary {
  width: 280rpx;
  height: 280rpx;
  left: -92rpx;
  bottom: 140rpx;
  background: rgba(185, 130, 69, 0.16);
  animation: orb-float-secondary 11s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.paper-line {
  position: absolute;
  height: 2rpx;
  background: rgba(132, 91, 56, 0.14);
  transform-origin: left center;
}

.paper-line-a {
  width: 300rpx;
  left: 78rpx;
  top: 206rpx;
  transform: rotate(-7deg);
  animation: line-sway-a 7s ease-in-out infinite;
}

.paper-line-b {
  width: 230rpx;
  right: 42rpx;
  bottom: 226rpx;
  transform: rotate(8deg);
  animation: line-sway-b 8s ease-in-out infinite;
}

.memory-chip {
  position: absolute;
  min-width: 90rpx;
  height: 46rpx;
  padding: 0 20rpx;
  border: 1px solid rgba(147, 99, 62, 0.18);
  border-radius: 999rpx;
  background: rgba(255, 249, 241, 0.68);
  color: rgba(103, 70, 47, 0.52);
  font-size: 22rpx;
  line-height: 46rpx;
  text-align: center;
  letter-spacing: 1rpx;
  box-shadow: 0 12rpx 34rpx rgba(129, 83, 49, 0.08);
}

.memory-chip-a {
  right: 56rpx;
  top: 322rpx;
  transform: rotate(6deg);
  animation: chip-drift-a 8.5s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

.memory-chip-b {
  left: 42rpx;
  top: 448rpx;
  transform: rotate(-9deg);
  animation: chip-drift-b 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

.memory-chip-c {
  right: 86rpx;
  bottom: 112rpx;
  transform: rotate(-5deg);
  animation: chip-drift-c 9.5s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

.shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 680rpx;
}

.hero {
  margin-bottom: 42rpx;
}

.brand-kicker {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  height: 44rpx;
  padding: 0 18rpx;
  border: 1px solid rgba(129, 83, 49, 0.18);
  border-radius: 999rpx;
  background: rgba(255, 250, 244, 0.58);
  color: #8A6245;
  font-size: 22rpx;
  letter-spacing: 1.6rpx;
}

.kicker-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #B98245;
  box-shadow: 0 0 0 8rpx rgba(185, 130, 69, 0.12);
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 30rpx;
}

.brand-seal {
  width: 104rpx;
  height: 104rpx;
  border: 1px solid rgba(108, 70, 44, 0.2);
  border-radius: 30rpx;
  background:
    linear-gradient(145deg, rgba(255, 251, 246, 0.96), rgba(245, 226, 205, 0.92));
  color: #8F562F;
  font-size: 56rpx;
  font-weight: 700;
  line-height: 104rpx;
  text-align: center;
  box-shadow:
    inset 0 2rpx 0 rgba(255, 255, 255, 0.72),
    0 18rpx 42rpx rgba(120, 72, 40, 0.13);
}

.brand-copy {
  flex: 1;
  min-width: 0;
}

.logo-text {
  font-size: 76rpx;
  font-weight: 800;
  color: #4A2F1E;
  letter-spacing: 1rpx;
  line-height: 1;
  text-shadow: 0 8rpx 24rpx rgba(120, 72, 40, 0.08);
}

.sub-title {
  margin-top: 18rpx;
  font-size: 25rpx;
  color: #8D705E;
  line-height: 1.55;
  letter-spacing: 0.8rpx;
}

.hero-note {
  margin-top: 30rpx;
  max-width: 560rpx;
  color: #6E5748;
  font-size: 27rpx;
  line-height: 1.72;
}

.card {
  width: 100%;
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.97), rgba(250, 240, 228, 0.97));
  border: 1px solid rgba(121, 78, 48, 0.16);
  border-radius: 36rpx;
  box-shadow:
    0 28rpx 80rpx rgba(104, 65, 37, 0.15),
    inset 0 2rpx 0 rgba(255, 255, 255, 0.78);
  padding: 38rpx 36rpx 42rpx;
  box-sizing: border-box;
}

.card-heading {
  margin-bottom: 30rpx;
}

.card-title {
  color: #3A281D;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.2;
}

.card-desc {
  margin-top: 10rpx;
  color: #8A715F;
  font-size: 25rpx;
  line-height: 1.45;
}

.tab-row {
  position: relative;
  display: flex;
  height: 76rpx;
  margin-bottom: 34rpx;
  padding: 6rpx;
  border: 1px solid rgba(127, 83, 52, 0.12);
  border-radius: 999rpx;
  background: rgba(238, 220, 199, 0.54);
  box-sizing: border-box;
}

.tab-thumb {
  position: absolute;
  top: 6rpx;
  left: 6rpx;
  width: calc(50% - 6rpx);
  height: 62rpx;
  border-radius: 999rpx;
  background: #FFF9F1;
  box-shadow: 0 10rpx 24rpx rgba(101, 63, 35, 0.12);
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.tab-thumb.register {
  transform: translateX(100%);
}

.tab-item {
  position: relative;
  z-index: 1;
  flex: 1;
  text-align: center;
  line-height: 62rpx;
  font-size: 29rpx;
  color: #927665;
  transition: color 180ms ease-out;

  &.active {
    color: #5A3722;
    font-weight: 600;
  }
}

.form {
  display: flex;
  flex-direction: column;
}

.field {
  margin-bottom: 28rpx;
}

.field-label-wrap {
  margin-bottom: 12rpx;
}

.field-label {
  font-size: 26rpx;
  color: #6A4B38;
  font-weight: 600;
}

.field-input-wrap {
  border: 1px solid rgba(124, 81, 50, 0.14);
  border-radius: 24rpx;
  background: rgba(255, 250, 244, 0.72);
  padding: 0 22rpx;
  transition: border-color 180ms ease-out, background-color 180ms ease-out;
}

.field-input-wrap:focus-within {
  border-color: rgba(185, 130, 69, 0.58);
  background: rgba(255, 252, 248, 0.96);
}

.field-input {
  height: 86rpx;
  font-size: 30rpx;
  color: #2E2118;
  background: transparent;
  width: 100%;
  padding: 0;
  font-family: inherit;
}

.placeholder {
  color: #C5AD9D;
}

.btn-primary {
  margin-top: 18rpx;
  height: 94rpx;
  background:
    linear-gradient(135deg, #B98245 0%, #9E653A 100%);
  border-radius: 999rpx;
  color: #FFF9F1;
  font-size: 31rpx;
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 2rpx;
  box-shadow: 0 16rpx 34rpx rgba(129, 83, 49, 0.26);
  transition: transform 160ms ease-out, opacity 160ms ease-out;

  &:active {
    opacity: 0.92;
    transform: translateY(2rpx) scale(0.992);
  }

  &[disabled] {
    background: #D6B18B;
    box-shadow: none;
  }
}

.footer-note {
  margin-top: 28rpx;
  color: rgba(88, 60, 42, 0.68);
  font-size: 24rpx;
  line-height: 1.5;
  text-align: center;
}

.error-bar {
  margin-top: 22rpx;
  padding: 18rpx 24rpx;
  background: #FFF0EA;
  border: 1px solid rgba(192, 92, 48, 0.18);
  border-radius: 18rpx;
  color: #A34F2B;
  font-size: 24rpx;
  width: 100%;
  text-align: center;
  box-sizing: border-box;
}

@keyframes paper-grid-drift {
  0% {
    transform: translate3d(0, 0, 0);
    opacity: 0.52;
  }

  50% {
    transform: translate3d(0, -8rpx, 0);
    opacity: 0.66;
  }

  100% {
    transform: translate3d(-10rpx, 10rpx, 0);
    opacity: 0.58;
  }
}

@keyframes paper-wash-shift {
  0% {
    transform: translate3d(0, 0, 0) scaleY(1);
    opacity: 0.44;
  }

  100% {
    transform: translate3d(18rpx, 0, 0) scaleY(1.04);
    opacity: 0.72;
  }
}

@keyframes orb-float-primary {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.54;
  }

  35% {
    transform: translate3d(-18rpx, -20rpx, 0) scale(1.04);
    opacity: 0.76;
  }

  70% {
    transform: translate3d(-28rpx, 12rpx, 0) scale(0.97);
    opacity: 0.62;
  }

  100% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.54;
  }
}

@keyframes orb-float-secondary {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.38;
  }

  40% {
    transform: translate3d(22rpx, -18rpx, 0) scale(1.05);
    opacity: 0.54;
  }

  80% {
    transform: translate3d(12rpx, 10rpx, 0) scale(0.96);
    opacity: 0.44;
  }

  100% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.38;
  }
}

@keyframes line-sway-a {
  0% {
    transform: rotate(-7deg) translate3d(0, 0, 0);
    opacity: 0.16;
  }

  50% {
    transform: rotate(-5deg) translate3d(6rpx, -4rpx, 0);
    opacity: 0.24;
  }

  100% {
    transform: rotate(-8deg) translate3d(-4rpx, 3rpx, 0);
    opacity: 0.16;
  }
}

@keyframes line-sway-b {
  0% {
    transform: rotate(8deg) translate3d(0, 0, 0);
    opacity: 0.14;
  }

  50% {
    transform: rotate(10deg) translate3d(-5rpx, -3rpx, 0);
    opacity: 0.22;
  }

  100% {
    transform: rotate(7deg) translate3d(4rpx, 5rpx, 0);
    opacity: 0.14;
  }
}

@keyframes chip-drift-a {
  0% {
    transform: rotate(6deg) translate3d(0, 0, 0);
  }

  50% {
    transform: rotate(8deg) translate3d(-10rpx, -12rpx, 0);
  }

  100% {
    transform: rotate(4deg) translate3d(4rpx, 6rpx, 0);
  }
}

@keyframes chip-drift-b {
  0% {
    transform: rotate(-9deg) translate3d(0, 0, 0);
  }

  50% {
    transform: rotate(-6deg) translate3d(12rpx, -10rpx, 0);
  }

  100% {
    transform: rotate(-10deg) translate3d(-2rpx, 8rpx, 0);
  }
}

@keyframes chip-drift-c {
  0% {
    transform: rotate(-5deg) translate3d(0, 0, 0);
  }

  50% {
    transform: rotate(-2deg) translate3d(-8rpx, -14rpx, 0);
  }

  100% {
    transform: rotate(-6deg) translate3d(6rpx, 4rpx, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .paper-scene::before,
  .paper-scene::after,
  .warm-orb,
  .paper-line,
  .memory-chip {
    animation: none;
  }
}

@media (max-height: 1400rpx) {
  .page {
    justify-content: flex-start;
    padding-top: 44rpx;
  }

  .hero {
    margin-bottom: 28rpx;
  }

  .hero-note {
    display: none;
  }
}
</style>
