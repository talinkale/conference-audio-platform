import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.role === 'admin')
  const permissions = computed(() => userInfo.value?.permissions || [])

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function setUserInfo(info) {
    userInfo.value = info
    localStorage.setItem('userInfo', JSON.stringify(info))
  }

  function hasPermission(code) {
    if (userInfo.value?.role === 'admin') return true
    return permissions.value.includes(code)
  }

  function logout() {
    token.value = ''
    userInfo.value = {}
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return { token, userInfo, isLoggedIn, isAdmin, permissions, hasPermission, setToken, setUserInfo, logout }
})

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const language = ref(localStorage.getItem('language') || 'zh-CN')

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setLanguage(lang) {
    language.value = lang
    localStorage.setItem('language', lang)
  }

  return { sidebarCollapsed, language, toggleSidebar, setLanguage }
})
