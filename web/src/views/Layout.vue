<template>
  <el-container class="layout-container">
    <el-aside :width="appStore.sidebarCollapsed ? '64px' : '220px'" class="sidebar">
      <div class="logo">
        <el-icon size="28" color="#fff"><VideoCamera /></el-icon>
        <span v-show="!appStore.sidebarCollapsed">综合管理平台</span>
      </div>
      <el-menu
        :default-active="route.path"
        :collapse="appStore.sidebarCollapsed"
        :collapse-transition="false"
        router
        background-color="#1a1a2e"
        text-color="#b0b3c5"
        active-text-color="#409EFF"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="toggle-btn" @click="appStore.toggleSidebar">
            <Fold v-if="!appStore.sidebarCollapsed" />
            <Expand v-else />
          </el-icon>
          <breadcrumb />
        </div>
        <div class="header-right">
          <el-dropdown @command="handleLanguage">
            <span class="header-item">
              <el-icon><Globe /></el-icon>
              {{ currentLanguage }}
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="zh-CN">中文</el-dropdown-item>
                <el-dropdown-item command="en-US">English</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown @command="handleCommand">
            <span class="header-item">
              <el-icon><User /></el-icon>
              {{ userStore.userInfo?.displayName || userStore.userInfo?.username }}
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="settings">系统设置</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore, useAppStore } from '@/store'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

const currentLanguage = computed(() => {
  const map = { 'zh-CN': '中文', 'en-US': 'EN' }
  return map[appStore.language] || '中文'
})

const allMenuItems = [
  { path: '/dashboard', title: '仪表板', icon: 'Odometer', permission: 'dashboard' },
  { path: '/devices', title: '设备管理', icon: 'Monitor', permission: 'devices' },
  { path: '/protocols', title: '协议管理', icon: 'Connection', permission: 'protocols' },
  { path: '/commands', title: '指令模板', icon: 'Document', permission: 'commands' },
  { path: '/modules', title: '模块管理', icon: 'Grid', permission: 'modules' },
  { path: '/meetings', title: '会议管理', icon: 'VideoCamera', permission: 'meetings' },
  { path: '/microphones', title: '话筒管理', icon: 'Microphone', permission: 'microphones' },
  { path: '/recording', title: '录播管理', icon: 'VideoCameraFilled', permission: 'recording' },
  { path: '/backups', title: '配置备份', icon: 'DocumentCopy', permission: 'backups' },
  { path: '/scenes', title: '场景管理', icon: 'Film', permission: 'scenes' },
  { path: '/logs', title: '操作日志', icon: 'List', permission: 'logs' },
  { path: '/users', title: '用户管理', icon: 'UserFilled', permission: 'users' },
  { path: '/roles', title: '角色管理', icon: 'Key', permission: 'roles' },
  { path: '/deploy', title: '部署管理', icon: 'Cloudy', permission: 'deploy' },
  { path: '/settings', title: '系统设置', icon: 'Setting', permission: 'settings' }
]

const menuItems = computed(() => {
  return allMenuItems.filter(item => userStore.hasPermission(item.permission))
})

const handleLanguage = (command) => {
  appStore.setLanguage(command)
  ElMessage.success(`语言已切换为 ${command === 'zh-CN' ? '中文' : 'English'}`)
}

const handleCommand = async (command) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
      userStore.logout()
      router.push('/login')
      ElMessage.success('已退出登录')
    } catch {
      // cancelled
    }
  } else if (command === 'profile') {
    router.push('/settings')
  } else if (command === 'settings') {
    router.push('/settings')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #1a1a2e;
  transition: width 0.3s;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toggle-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
}

.toggle-btn:hover {
  color: #409EFF;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #606266;
  font-size: 14px;
}

.header-item:hover {
  color: #409EFF;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

:deep(.el-menu) {
  border-right: none;
}
</style>
