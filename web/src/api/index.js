import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000
})

api.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => {
    const { code, message } = response.data
    if (code !== 200) {
      ElMessage.error(message || '请求失败')
      return Promise.reject(new Error(message))
    }
    return response.data
  },
  (error) => {
    const { response } = error
    if (response?.status === 401) {
      const userStore = useUserStore()
      userStore.logout()
      window.location.href = '/login'
    }
    ElMessage.error(response?.data?.message || '网络错误')
    return Promise.reject(error)
  }
)

export default api

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  profile: () => api.get('/auth/profile')
}

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats')
}

export const deviceApi = {
  list: (params) => api.get('/devices', { params }),
  create: (data) => api.post('/devices', data),
  update: (id, data) => api.put(`/devices/${id}`, data),
  delete: (id) => api.delete(`/devices/${id}`),
  scan: () => api.post('/devices/scan')
}

export const moduleApi = {
  list: () => api.get('/modules'),
  updateOrder: (id, sort_order) => api.put(`/modules/${id}/order`, { sort_order }),
  updateFavorite: (id, is_favorite) => api.put(`/modules/${id}/favorite`, { is_favorite })
}

export const meetingApi = {
  list: () => api.get('/meetings'),
  create: (data) => api.post('/meetings', data),
  update: (id, data) => api.put(`/meetings/${id}`, data),
  delete: (id) => api.delete(`/meetings/${id}`)
}

export const microphoneApi = {
  list: () => api.get('/microphones'),
  update: (id, data) => api.put(`/microphones/${id}`, data)
}

export const backupApi = {
  list: () => api.get('/backups'),
  create: (data) => api.post('/backups', data),
  restore: (id) => api.post(`/backups/${id}/restore`),
  delete: (id) => api.delete(`/backups/${id}`)
}

export const sceneApi = {
  list: () => api.get('/scenes')
}

export const logApi = {
  list: (params) => api.get('/logs', { params })
}

export const protocolApi = {
  types: () => api.get('/protocols/types'),
  list: () => api.get('/protocols'),
  create: (data) => api.post('/protocols', data),
  update: (id, data) => api.put(`/protocols/${id}`, data),
  delete: (id) => api.delete(`/protocols/${id}`),
  connect: (id) => api.post(`/protocols/${id}/connect`),
  disconnect: (id) => api.post(`/protocols/${id}/disconnect`),
  send: (id, data) => api.post(`/protocols/${id}/send`, data),
  sendCommand: (id, commandId) => api.post(`/protocols/${id}/send-command`, { commandId }),
  status: (id) => api.get(`/protocols/${id}/status`),
  logs: (id, params) => api.get(`/protocols/${id}/logs`, { params })
}

export const commandApi = {
  list: (params) => api.get('/commands', { params }),
  create: (data) => api.post('/commands', data),
  update: (id, data) => api.put(`/commands/${id}`, data),
  delete: (id) => api.delete(`/commands/${id}`)
}

export const systemApi = {
  info: () => api.get('/system/info')
}

// 部署管理 API
export const deployApi = {
  getConfig: () => api.get('/deploy/config'),
  updateConfig: (data) => api.put('/deploy/config', data),
  generate: () => api.post('/deploy/generate'),
  updateStatus: (data) => api.put('/deploy/status', data)
}

// 用户管理 API
export const userApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
}

// 角色管理 API
export const roleApi = {
  list: () => api.get('/roles'),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
  getPermissions: (id) => api.get(`/roles/${id}/permissions`),
  setPermissions: (id, permission_ids) => api.put(`/roles/${id}/permissions`, { permission_ids })
}

// 权限管理 API
export const permissionApi = {
  list: () => api.get('/permissions')
}

// 录播管理 API
export const recordingRoomApi = {
  list: (params) => api.get('/recording-rooms', { params }),
  create: (data) => api.post('/recording-rooms', data),
  update: (id, data) => api.put(`/recording-rooms/${id}`, data),
  delete: (id) => api.delete(`/recording-rooms/${id}`)
}

export const recordingTaskApi = {
  list: (params) => api.get('/recording-tasks', { params }),
  create: (data) => api.post('/recording-tasks', data),
  update: (id, data) => api.put(`/recording-tasks/${id}`, data),
  delete: (id) => api.delete(`/recording-tasks/${id}`),
  start: (id) => api.post(`/recording-tasks/${id}/start`),
  stop: (id) => api.post(`/recording-tasks/${id}/stop`),
  pause: (id) => api.post(`/recording-tasks/${id}/pause`)
}

export const liveChannelApi = {
  list: (params) => api.get('/live-channels', { params }),
  create: (data) => api.post('/live-channels', data),
  update: (id, data) => api.put(`/live-channels/${id}`, data),
  delete: (id) => api.delete(`/live-channels/${id}`),
  start: (id) => api.post(`/live-channels/${id}/start`),
  stop: (id) => api.post(`/live-channels/${id}/stop`)
}

export const pullStreamApi = {
  list: (params) => api.get('/pull-streams', { params }),
  create: (data) => api.post('/pull-streams', data),
  update: (id, data) => api.put(`/pull-streams/${id}`, data),
  delete: (id) => api.delete(`/pull-streams/${id}`),
  start: (id) => api.post(`/pull-streams/${id}/start`),
  stop: (id) => api.post(`/pull-streams/${id}/stop`)
}

export const pushStreamApi = {
  list: (params) => api.get('/push-streams', { params }),
  create: (data) => api.post('/push-streams', data),
  update: (id, data) => api.put(`/push-streams/${id}`, data),
  delete: (id) => api.delete(`/push-streams/${id}`),
  start: (id) => api.post(`/push-streams/${id}/start`),
  stop: (id) => api.post(`/push-streams/${id}/stop`)
}
