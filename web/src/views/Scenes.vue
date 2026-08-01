<template>
  <div class="scenes-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <div class="header-left">
            <h2>场景管理</h2>
            <el-tag type="info">共 {{ sceneList.length }} 个预设场景</el-tag>
          </div>
          <el-button type="primary" :icon="Plus">创建场景</el-button>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :lg="6" v-for="scene in sceneList" :key="scene.id">
          <el-card class="scene-card" shadow="hover" :body-style="{ padding: '0' }">
            <div class="scene-cover">
              <el-icon size="48" color="#fff"><Film /></el-icon>
              <div class="scene-overlay">
                <el-button type="primary" size="small" @click="applyScene(scene)">
                  <el-icon><VideoPlay /></el-icon>
                  应用场景
                </el-button>
              </div>
            </div>
            <div class="scene-info">
              <h4 class="scene-name">{{ scene.name }}</h4>
              <p class="scene-desc">{{ scene.description }}</p>
              <div class="scene-meta">
                <el-tag size="small" type="info">{{ scene.devices_count }} 台设备</el-tag>
              </div>
            </div>
            <div class="scene-actions">
              <el-button text type="primary" size="small" :icon="Edit">编辑</el-button>
              <el-button text type="success" size="small" :icon="Download">导出</el-button>
              <el-button text type="danger" size="small" :icon="Delete">删除</el-button>
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
import { Plus, Film, VideoPlay, Edit, Download, Delete } from '@element-plus/icons-vue'
import { sceneApi } from '@/api'

const sceneList = ref([])

const loadScenes = async () => {
  try {
    const res = await sceneApi.list()
    if (res.code === 200) {
      sceneList.value = res.data
    }
  } catch (error) {
    console.error(error)
  }
}

const applyScene = (scene) => {
  ElMessage.success(`场景 "${scene.name}" 已应用`)
}

onMounted(() => {
  loadScenes()
})
</script>

<style scoped>
.scenes-page {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
}

.scene-card {
  margin-bottom: 20px;
  transition: transform 0.2s;
}

.scene-card:hover {
  transform: translateY(-4px);
}

.scene-cover {
  height: 140px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.scene-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.scene-card:hover .scene-overlay {
  opacity: 1;
}

.scene-info {
  padding: 16px;
}

.scene-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px;
}

.scene-desc {
  font-size: 13px;
  color: #909399;
  margin: 0 0 12px;
  line-height: 1.5;
}

.scene-meta {
  margin-bottom: 12px;
}

.scene-actions {
  padding: 0 16px 16px;
  display: flex;
  gap: 8px;
}
</style>
