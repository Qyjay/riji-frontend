<template>
  <view class="page">
    <!-- 顶部 Logo -->
    <view class="hero">
      <view class="logo-text">日迹</view>
      <view class="sub-title">记录每一天的小确幸</view>
    </view>

    <!-- 表单卡片 -->
    <view class="card">
      <!-- Tab 切换 -->
      <view class="tab-row">
        <view class="tab-item" :class="{ active: mode === 'login' }" @tap="mode = 'login'">登录</view>
        <view class="tab-item" :class="{ active: mode === 'register' }" @tap="mode = 'register'">注册</view>
      </view>

      <!-- 登录 -->
      <view v-if="mode === 'login'" class="form">
        <view class="field">
          <text class="field-label">用户名</text>
          <input class="field-input" v-model="loginForm.username" placeholder="请输入用户名" placeholder-class="placeholder" maxlength="20" />
        </view>
        <view class="field">
          <text class="field-label">密码</text>
          <input class="field-input" v-model="loginForm.password" placeholder="请输入密码" placeholder-class="placeholder" password maxlength="32" />
        </view>
        <button class="btn-primary" :disabled="submitting" @tap="handleLogin">
          {{ submitting ? '登录中...' : '登录' }}
        </button>
      </view>

      <!-- 注册 -->
      <view v-if="mode === 'register'" class="form">
        <view class="field">
          <text class="field-label">用户名</text>
          <input class="field-input" v-model="registerForm.username" placeholder="4-20 个字符" placeholder-class="placeholder" maxlength="20" />
        </view>
        <view class="field">
          <text class="field-label">密码</text>
          <input class="field-input" v-model="registerForm.password" placeholder="6-32 个字符" placeholder-class="placeholder" password maxlength="32" />
        </view>
        <view class="field">
          <text class="field-label">昵称</text>
          <input class="field-input" v-model="registerForm.name" placeholder="选填" placeholder-class="placeholder" maxlength="20" />
        </view>
        <view class="field">
          <text class="field-label">学校</text>
          <input class="field-input" v-model="registerForm.school" placeholder="选填" placeholder-class="placeholder" maxlength="40" />
        </view>
        <button class="btn-primary" :disabled="submitting" @tap="handleRegister">
          {{ submitting ? '注册中...' : '注册' }}
        </button>
      </view>
    </view>

    <!-- 错误提示（调试用） -->
    <view v-if="errorMsg" class="error-bar">{{ errorMsg }}</view>
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
  background-color: #FDF8F3;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 180rpx 48rpx 80rpx;
}

.hero {
  text-align: center;
  margin-bottom: 80rpx;
}

.logo-text {
  font-size: 88rpx;
  font-weight: 700;
  color: #E8855A;
  letter-spacing: 12rpx;
}

.sub-title {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #AE9D92;
  letter-spacing: 2rpx;
}

.card {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(232, 133, 90, 0.10);
  padding: 48rpx 44rpx 56rpx;
}

.tab-row {
  display: flex;
  margin-bottom: 56rpx;
  border-bottom: 2rpx solid #F5EDE4;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding-bottom: 24rpx;
  font-size: 32rpx;
  color: #AE9D92;
  position: relative;

  &.active {
    color: #E8855A;
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      bottom: -2rpx;
      left: 25%;
      right: 25%;
      height: 4rpx;
      background: #E8855A;
      border-radius: 2rpx;
    }
  }
}

.form {
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.field-label {
  font-size: 26rpx;
  color: #8A7668;
  font-weight: 500;
}

.field-input {
  padding: 20rpx 0;
  font-size: 32rpx;
  color: #2C1F14;
  border-bottom: 1px solid #EAE0D6;
  background: transparent;
}

.placeholder {
  color: #D4C4B8;
}

.btn-primary {
  margin-top: 24rpx;
  height: 96rpx;
  background: #E8855A;
  border-radius: 48rpx;
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 4rpx;
  box-shadow: 0 8rpx 24rpx rgba(232, 133, 90, 0.30);

  &:active {
    opacity: 0.85;
  }

  &[disabled] {
    background: #F2B49B;
    box-shadow: none;
  }
}

.error-bar {
  margin-top: 32rpx;
  padding: 16rpx 24rpx;
  background: #FEF0F0;
  border-radius: 16rpx;
  color: #C05C30;
  font-size: 24rpx;
  width: 100%;
  text-align: center;
}
</style>
