import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { uniStorage } from './storage'
import type { UserProfile } from '@/services/api/user'

export const useUserStore = defineStore('user', () => {
  // State
  const token = ref<string>('')
  const profile = ref<UserProfile>({
    name: '',
    school: '',
    major: '',
    level: 1,
    diaryCount: 0,
    streakDays: 0,
    pomodoroCount: 0,
    avatar: '',
  })
  const isLoggedIn = computed(() => !!token.value)

  // Actions
  function setToken(t: string) {
    token.value = t
  }
  function setProfile(p: UserProfile) {
    profile.value = p
  }
  function updateProfile(partial: Partial<UserProfile>) {
    profile.value = { ...profile.value, ...partial }
  }
  function logout() {
    token.value = ''
    profile.value = { name: '', school: '', major: '', level: 1, diaryCount: 0, streakDays: 0, pomodoroCount: 0, avatar: '' }
  }

  return { token, profile, isLoggedIn, setToken, setProfile, updateProfile, logout }
}, {
  persist: {
    storage: uniStorage,
    paths: ['token', 'profile'],
  },
})
