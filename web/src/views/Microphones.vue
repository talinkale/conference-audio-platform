<template>
  <div class="microphones-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <div class="header-left">
            <h2>话筒管理</h2>
            <el-tag type="info">共 {{ micList.length }} 个话筒</el-tag>
          </div>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :lg="8" :xl="6" v-for="mic in micList" :key="mic.id">
          <el-card class="mic-card" :class="{ 'speaking': mic.status === 'speaking' }" shadow="hover">
            <div class="mic-header">
              <div class="mic-icon">
                <el-icon size="28" :color="mic.status === 'speaking' ? '#67C23A' : '#909399'"><Microphone /></el-icon>
              </div>
              <div class="mic-status">
                <el-tag :type="micStatusType(mic.status)" size="small">{{ micStatusText(mic.status) }}</el-tag>
                <el-tag v-if="mic.is_chairman" type="warning" size="small" class="ml-8">主席</el-tag>
              </div>
            </div>
            <h4 class="mic-name">{{ mic.name || `话筒 ${mic.seat_number || mic.id}` }}</h4>
            <div class="mic-device" v-if="mic.device_name">{{ mic.device_name }}</div>
            <div class="mic-volume">
              <span>音量</span>
              <el-slider v-model="mic.volume" :max="100" show-stops @change="(val) => handleVolumeChange(mic, val)" />
            </div>
            <div class="mic-actions">
              <el-button
                :type="mic.status === 'speaking' ? 'danger' : 'success'"
                size="small"
                @click="toggleSpeak(mic)"
              >
                {{ mic.status === 'speaking' ? '停止发言' : '申请发言' }}
              </el-button>
              <el-button text type="primary" size="small" @click="handleEdit(mic)">设置</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <!-- 编辑话筒对话框 -->
    <el-dialog v-model="showEditDialog" title="话筒设置" width="400px">
      <el-form :model="micForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="micForm.name" placeholder="话筒名称" />
        </el-form-item>
        <el-form-item label="座位号">
          <el-input v-model="micForm.seat_number" placeholder="座位号" />
        </el-form-item>
        <el-form-item label="主席话筒">
          <el-switch v-model="micForm.is_chairman" />
        </el-form-item>
        <el-form-item label="音量">
          <el-slider v-model="micForm.volume" :max="100" show-input />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saveLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Microphone } from '@element-plus/icons-vue'
import { microphoneApi } from '@/api'

const loading = ref(false)
const showEditDialog = ref(false)
const saveLoading = ref(false)
const micList = ref([])

const micForm = reactive({
  id: null,
  name: '',
  seat_number: '',
  is_chairman: false,
  volume: 50
})

const micStatusType = (status) => {
  const map = { idle: 'info', speaking: 'success', queued: 'warning', muted: 'danger' }
  return map[status] || 'info'
}

const micStatusText = (status) => {
  const map = { idle: '空闲', speaking: '发言中', queued: '排队中', muted: '静音' }
  return map[status] || status
}

const loadMicrophones = async () => {
  loading.value = true
  try {
    const res = await microphoneApi.list()
    if (res.code === 200) {
      micList.value = res.data
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const toggleSpeak = async (mic) => {
  const newStatus = mic.status === 'speaking' ? 'idle' : 'speaking'
  try {
    await microphoneApi.update(mic.id, { ...mic, status: newStatus })
    mic.status = newStatus
    ElMessage.success(newStatus === 'speaking' ? '话筒已开启' : '话筒已关闭')
  } catch (error) {
    console.error(error)
  }
}

const handleVolumeChange = async (mic, volume) => {
  try {
    await microphoneApi.update(mic.id, { ...mic, volume })
  } catch (error) {
    console.error(error)
  }
}

const handleEdit = (mic) => {
  Object.assign(micForm, mic)
  micForm.is_chairman = !!mic.is_chairman
  showEditDialog.value = true
}

const handleSave = async () => {
  saveLoading.value = true
  try {
    await microphoneApi.update(micForm.id, { ...micForm, is_chairman: micForm.is_chairman ? 1 : 0 })
    ElMessage.success('设置已保存')
    showEditDialog.value = false
    loadMicrophones()
  } catch (error) {
    console.error(error)
  } finally {
    saveLoading.value = false
  }
}

onMounted(() => {
  loadMicrophones()
})
</script>

<style scoped>
.microphones-page {
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

.mic-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.mic-card.speaking {
  border: 1px solid #67C23A;
  box-shadow: 0 0 12px rgba(103, 194, 58, 0.3);
}

.mic-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.mic-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mic-status {
  display: flex;
  align-items: center;
}

.ml-8 {
  margin-left: 8px;
}

.mic-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px;
}

.mic-device {
  font-size: 12px;
  color: #909399;
  margin-bottom: 12px;
}

.mic-volume {
  margin-bottom: 12px;
}

.mic-volume span {
  font-size: 12px;
  color: #606266;
}

.mic-actions {
  display: flex;
  gap: 8px;
}
</style>
