<template>
  <div class="backups-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <div class="header-left">
            <h2>配置备份</h2>
            <el-tag type="info">共 {{ backupList.length }} 个备份</el-tag>
          </div>
          <el-button type="primary" :icon="Plus" @click="showBackupDialog = true">创建备份</el-button>
        </div>
      </template>

      <el-table :data="backupList" v-loading="loading" stripe>
        <el-table-column type="index" width="50" />
        <el-table-column prop="name" label="备份名称" min-width="180" />
        <el-table-column prop="module_code" label="模块" width="150">
          <template #default="{ row }">
            {{ moduleMap[row.module_code] || row.module_code || '全系统' }}
          </template>
        </el-table-column>
        <el-table-column prop="file_size" label="大小" width="100">
          <template #default="{ row }">
            {{ formatSize(row.file_size) }}
          </template>
        </el-table-column>
        <el-table-column prop="is_cloud" label="存储位置" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_cloud ? 'success' : 'info'" size="small">
              {{ row.is_cloud ? '云端' : '本地' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="备份时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleRestore(row)">恢复</el-button>
            <el-button text type="success" size="small" @click="handleDownload(row)">下载</el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建备份对话框 -->
    <el-dialog v-model="showBackupDialog" title="创建备份" width="500px">
      <el-form :model="backupForm" label-width="100px">
        <el-form-item label="备份名称" required>
          <el-input v-model="backupForm.name" placeholder="如: 2026-07-21_系统配置备份" />
        </el-form-item>
        <el-form-item label="备份范围">
          <el-select v-model="backupForm.module_code" placeholder="选择模块（留空备份全部）" clearable style="width: 100%;">
            <el-option label="全系统" value="" />
            <el-option label="全数字会议系统" value="digital_conference" />
            <el-option label="电子桌牌系统" value="e_nameplate" />
            <el-option label="反馈抑制器" value="feedback_suppressor" />
            <el-option label="智能混音器" value="smart_mixer" />
            <el-option label="数字音频处理器" value="audio_processor" />
            <el-option label="智控数字专业功放" value="power_amplifier" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBackupDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateBackup" :loading="saveLoading">创建备份</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { backupApi } from '@/api'

const loading = ref(false)
const showBackupDialog = ref(false)
const saveLoading = ref(false)
const backupList = ref([])

const moduleMap = {
  digital_conference: '全数字会议系统',
  e_nameplate: '电子桌牌系统',
  feedback_suppressor: '反馈抑制器',
  smart_mixer: '智能混音器',
  audio_processor: '数字音频处理器',
  power_amplifier: '智控数字专业功放'
}

const backupForm = reactive({
  name: '',
  module_code: ''
})

const formatSize = (bytes) => {
  if (!bytes) return '-'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i]
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const loadBackups = async () => {
  loading.value = true
  try {
    const res = await backupApi.list()
    if (res.code === 200) {
      backupList.value = res.data
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleCreateBackup = async () => {
  if (!backupForm.name) {
    ElMessage.warning('请输入备份名称')
    return
  }
  saveLoading.value = true
  try {
    const configData = {
      backup_time: new Date().toISOString(),
      module: backupForm.module_code || 'all',
      version: '1.0.0',
      configs: {}
    }
    await backupApi.create({
      name: backupForm.name,
      module_code: backupForm.module_code || null,
      config_data: configData
    })
    ElMessage.success('备份创建成功')
    showBackupDialog.value = false
    loadBackups()
  } catch (error) {
    console.error(error)
  } finally {
    saveLoading.value = false
  }
}

const handleRestore = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要恢复备份 "${row.name}" 吗？`, '提示', { type: 'warning' })
    const res = await backupApi.restore(row.id)
    if (res.code === 200) {
      ElMessage.success('备份恢复成功')
    }
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

const handleDownload = (row) => {
  ElMessage.info(`下载功能开发中: ${row.name}`)
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除备份 "${row.name}" 吗？`, '提示', { type: 'warning' })
    await backupApi.delete(row.id)
    ElMessage.success('备份删除成功')
    loadBackups()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

onMounted(() => {
  loadBackups()
})
</script>

<style scoped>
.backups-page {
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
</style>
