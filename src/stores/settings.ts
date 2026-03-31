import { defineStore } from 'pinia'
import { ref } from 'vue'
import { uniStorage } from './storage'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<'light' | 'dark'>('light')
  const notifications = ref(true)
  const diaryReminder = ref(true)
  const reminderTime = ref('21:00')
  const pomodoroReminder = ref(true)
  const buddyNotify = ref(true)
  const diaryEncrypt = ref(false)
  const appLock = ref(false)
  const diaryPrivacy = ref<'private' | 'friends' | 'public'>('private')
  const fontSize = ref<'small' | 'medium' | 'large'>('medium')
  const language = ref('zh-CN')
  const diaryFont = ref<'handwrite' | 'chenyu' | 'nailao' | 'songti' | 'kaiti' | 'default'>('handwrite')

  function updateSetting(key: string, value: unknown) {
    const map: Record<string, { value: unknown }> = {
      theme, notifications, diaryReminder, reminderTime,
      pomodoroReminder, buddyNotify, diaryEncrypt, appLock,
      diaryPrivacy, fontSize, language, diaryFont,
    }
    if (map[key]) map[key].value = value
  }

  function resetAll() {
    theme.value = 'light'
    notifications.value = true
    diaryReminder.value = true
    reminderTime.value = '21:00'
    pomodoroReminder.value = true
    buddyNotify.value = true
    diaryEncrypt.value = false
    appLock.value = false
    diaryPrivacy.value = 'private'
    fontSize.value = 'medium'
    language.value = 'zh-CN'
    diaryFont.value = 'handwrite'
  }

  return {
    theme, notifications, diaryReminder, reminderTime,
    pomodoroReminder, buddyNotify, diaryEncrypt, appLock,
    diaryPrivacy, fontSize, language, diaryFont,
    updateSetting, resetAll,
  }
}, {
  persist: {
    storage: uniStorage,
  },
})
