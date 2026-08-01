<template>
  <div class="modules-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <h2>模块管理</h2>
          <el-button type="primary" :icon="Refresh" @click="loadModules">刷新</el-button>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :lg="8" v-for="module in moduleList" :key="module.id">
          <el-card class="module-card" shadow="hover" :body-style="{ padding: '20px' }">
            <div class="module-header">
              <div class="module-icon" :style="{ backgroundColor: getModuleColor(module.code) }">
                <el-icon size="32" color="#fff"><component :is="getModuleIcon(module.code)" /></el-icon>
              </div>
              <div class="module-actions">
                <el-button
                  text
                  :type="module.is_favorite ? 'warning' : 'default'"
                  :icon="module.is_favorite ? StarFilled : Star"
                  circle
                  @click="toggleFavorite(module)"
                />
              </div>
            </div>
            <h3 class="module-name">{{ module.name }}</h3>
            <p class="module-desc">{{ module.description }}</p>
            <div class="module-meta">
              <el-tag size="small" :type="module.status === 'installed' ? 'success' : 'info'">
                {{ module.status === 'installed' ? '已安装' : '未安装' }}
              </el-tag>
              <span class="version">v{{ module.version }}</span>
            </div>
            <div class="module-footer">
              <el-button type="primary" size="small" @click="openModule(module)">
                <el-icon><VideoPlay /></el-icon>
                打开模块
              </el-button>
              <el-button text type="info" size="small" @click="showDetail(module)">
                详情
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Star, StarFilled, VideoPlay, VideoCamera, Monitor, Microphone, Headset, Cpu, Bell } from '@element-plus/icons-vue'
import { moduleApi } from '@/api'

const moduleList = ref([])

const getModuleIcon = (code) => {
  const map = {
    digital_conference: 'VideoCamera',
    e_nameplate: 'Monitor',
    feedback_suppressor: 'Headset',
    smart_mixer: 'Microphone',
    audio_processor: 'Cpu',
    power_amplifier: 'Bell'
  }
  return map[code] || 'Monitor'
}

const getModuleColor = (code) => {
  const map = {
    digital_conference: '#409EFF',
    e_nameplate: '#67C23A',
    feedback_suppressor: '#E6A23C',
    smart_mixer: '#F56C6C',
    audio_processor: '#909399',
    power_amplifier: '#9254DE'
  }
  return map[code] || '#409EFF'
}

const loadModules = async () => {
  try {
    const res = await moduleApi.list()
    if (res.code === 200) {
      moduleList.value = res.data
    }
  } catch (error) {
    console.error(error)
  }
}

const toggleFavorite = async (module) => {
  try {
    await moduleApi.updateFavorite(module.id, !module.is_favorite)
    module.is_favorite = module.is_favorite ? 0 : 1
    ElMessage.success(module.is_favorite ? '已收藏' : '已取消收藏')
  } catch (error) {
    console.error(error)
  }
}

const openModule = (module) => {
  ElMessage.success(`正在打开 ${module.name}...`)
}

const showDetail = (module) => {
  ElMessage.info(`${module.name} - ${module.description}`)
}

onMounted(() => {
  loadModules()
})
</script>

<style scoped>
.modules-page {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
}

.module-card {
  margin-bottom: 20px;
  transition: transform 0.2s;
}

.module-card:hover {
  transform: translateY(-4px);
}

.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.module-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.module-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px;
}

.module-desc {
  font-size: 13px;
  color: #909399;
  margin: 0 0 12px;
  line-height: 1.5;
  min-height: 40px;
}

.module-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.version {
  font-size: 12px;
  color: #909399;
}

.module-footer {
  display: flex;
  gap: 8px;
}
</style>
