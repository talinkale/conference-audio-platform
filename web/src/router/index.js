import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/store'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '仪表板', icon: 'Odometer', permission: 'dashboard' } },
      { path: 'devices', name: 'Devices', component: () => import('@/views/Devices.vue'), meta: { title: '设备管理', icon: 'Monitor', permission: 'devices' } },
      { path: 'protocols', name: 'Protocols', component: () => import('@/views/Protocols.vue'), meta: { title: '协议管理', icon: 'Connection', permission: 'protocols' } },
      { path: 'commands', name: 'Commands', component: () => import('@/views/Commands.vue'), meta: { title: '指令模板', icon: 'Document', permission: 'commands' } },
      { path: 'modules', name: 'Modules', component: () => import('@/views/Modules.vue'), meta: { title: '模块管理', icon: 'Grid', permission: 'modules' } },
      { path: 'meetings', name: 'Meetings', component: () => import('@/views/Meetings.vue'), meta: { title: '会议管理', icon: 'VideoCamera', permission: 'meetings' } },
      { path: 'microphones', name: 'Microphones', component: () => import('@/views/Microphones.vue'), meta: { title: '话筒管理', icon: 'Microphone', permission: 'microphones' } },
      { path: 'recording', name: 'Recording', component: () => import('@/views/Recording.vue'), meta: { title: '录播管理', icon: 'VideoCameraFilled', permission: 'recording' } },
      { path: 'backups', name: 'Backups', component: () => import('@/views/Backups.vue'), meta: { title: '配置备份', icon: 'DocumentCopy', permission: 'backups' } },
      { path: 'scenes', name: 'Scenes', component: () => import('@/views/Scenes.vue'), meta: { title: '场景管理', icon: 'Film', permission: 'scenes' } },
      { path: 'logs', name: 'Logs', component: () => import('@/views/Logs.vue'), meta: { title: '操作日志', icon: 'List', permission: 'logs' } },
      { path: 'settings', name: 'Settings', component: () => import('@/views/Settings.vue'), meta: { title: '系统设置', icon: 'Setting', permission: 'settings' } },
      { path: 'users', name: 'Users', component: () => import('@/views/Users.vue'), meta: { title: '用户管理', icon: 'UserFilled', permission: 'users' } },
      { path: 'roles', name: 'Roles', component: () => import('@/views/Roles.vue'), meta: { title: '角色管理', icon: 'Key', permission: 'roles' } },
      { path: 'deploy', name: 'Deploy', component: () => import('@/views/Deploy.vue'), meta: { title: '部署管理', icon: 'Cloudy', permission: 'deploy' } }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (!to.meta.public && !userStore.token) {
    next('/login')
  } else if (to.meta.permission && !userStore.hasPermission(to.meta.permission)) {
    // 无权限访问，重定向到仪表板
    next('/dashboard')
  } else {
    next()
  }
})

export default router
