<template>
  <div class="devices-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <div class="header-left">
            <h2>设备管理</h2>
            <el-tag type="info">共 {{ deviceList.length }} 台设备</el-tag>
          </div>
          <div class="header-right">
            <el-input
              v-model="searchQuery"
              placeholder="搜索设备名称/IP"
              clearable
              style="width: 220px; margin-right: 12px;"
              :prefix-icon="Search"
            />
            <el-select v-model="filterType" placeholder="设备类型" clearable style="width: 150px; margin-right: 12px;">
              <el-option label="会议系统" value="digital_conference" />
              <el-option label="桌牌系统" value="e_nameplate" />
              <el-option label="反馈抑制器" value="feedback_suppressor" />
              <el-option label="混音器" value="smart_mixer" />
              <el-option label="音频处理器" value="audio_processor" />
              <el-option label="功放" value="power_amplifier" />
            </el-select>
            <el-button type="primary" :icon="Plus" @click="showAddDialog = true">添加设备</el-button>
            <el-button type="success" :icon="Search" @click="handleScan" :loading="scanning">扫描设备</el-button>
          </div>
        </div>
      </template>

      <el-table :data="filteredDevices" v-loading="loading" stripe>
        <el-table-column type="index" width="50" />
        <el-table-column prop="name" label="设备名称" min-width="150">
          <template #default="{ row }">
            <div class="device-name">
              <el-icon size="18" :color="row.status === 'online' ? '#67C23A' : '#F56C6C'"><Monitor /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="130">
          <template #default="{ row }">
            <el-tag size="small">{{ typeMap[row.type] || row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ip_address" label="IP地址" width="140" />
        <el-table-column prop="mac_address" label="MAC地址" width="160" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'online' ? 'success' : 'danger'" size="small">
              {{ row.status === 'online' ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="firmware_version" label="固件版本" width="120" />
        <el-table-column prop="group_name" label="分组" width="120" />
        <el-table-column prop="location" label="位置" width="120" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button text type="success" size="small" @click="handleUpgrade(row)">升级</el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑设备对话框 -->
    <el-dialog v-model="showAddDialog" :title="isEdit ? '编辑设备' : '添加设备'" width="500px">
      <el-form :model="deviceForm" :rules="deviceRules" ref="deviceFormRef" label-width="100px">
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="deviceForm.name" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="设备类型" prop="type">
          <el-select v-model="deviceForm.type" placeholder="选择设备类型" style="width: 100%;">
            <el-option label="全数字会议系统" value="digital_conference" />
            <el-option label="电子桌牌系统" value="e_nameplate" />
            <el-option label="反馈抑制器" value="feedback_suppressor" />
            <el-option label="智能混音器" value="smart_mixer" />
            <el-option label="数字音频处理器" value="audio_processor" />
            <el-option label="智控数字专业功放" value="power_amplifier" />
          </el-select>
        </el-form-item>
        <el-form-item label="IP地址" prop="ip_address">
          <el-input v-model="deviceForm.ip_address" placeholder="如: 192.168.1.100" />
        </el-form-item>
        <el-form-item label="MAC地址">
          <el-input v-model="deviceForm.mac_address" placeholder="如: 00:11:22:33:44:55" />
        </el-form-item>
        <el-form-item label="分组">
          <el-input v-model="deviceForm.group_name" placeholder="如: 会议室A" />
        </el-form-item>
        <el-form-item label="位置">
          <el-input v-model="deviceForm.location" placeholder="如: 3楼会议室" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saveLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 扫描结果对话框 -->
    <el-dialog v-model="showScanDialog" title="扫描结果" width="600px">
      <el-alert title="扫描完成" :description="`发现 ${scanResults.length} 台设备`" type="success" :closable="false" />
      <el-table :data="scanResults" class="mt-20" max-height="300">
        <el-table-column prop="name" label="设备名称" />
        <el-table-column prop="ip_address" label="IP地址" />
        <el-table-column prop="type" label="类型">
          <template #default="{ row }">
            {{ typeMap[row.type] || row.type }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="addScannedDevice(row)">添加</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { deviceApi } from '@/api'

const loading = ref(false)
const scanning = ref(false)
const showAddDialog = ref(false)
const showScanDialog = ref(false)
const isEdit = ref(false)
const saveLoading = ref(false)
const deviceFormRef = ref()
const searchQuery = ref('')
const filterType = ref('')
const deviceList = ref([])
const scanResults = ref([])

const typeMap = {
  digital_conference: '会议系统',
  e_nameplate: '桌牌系统',
  feedback_suppressor: '反馈抑制器',
  smart_mixer: '混音器',
  audio_processor: '音频处理器',
  power_amplifier: '功放'
}

const deviceForm = reactive({
  id: null,
  name: '',
  type: '',
  ip_address: '',
  mac_address: '',
  group_name: '',
  location: ''
})

const deviceRules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  ip_address: [{ required: true, message: '请输入IP地址', trigger: 'blur' }]
}

const filteredDevices = computed(() => {
  return deviceList.value.filter(device => {
    const matchSearch = !searchQuery.value ||
      device.name?.includes(searchQuery.value) ||
      device.ip_address?.includes(searchQuery.value)
    const matchType = !filterType.value || device.type === filterType.value
    return matchSearch && matchType
  })
})

const loadDevices = async () => {
  loading.value = true
  try {
    const res = await deviceApi.list()
    if (res.code === 200) {
      deviceList.value = res.data
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleScan = async () => {
  scanning.value = true
  try {
    const res = await deviceApi.scan()
    if (res.code === 200) {
      scanResults.value = res.data.devices
      showScanDialog.value = true
      ElMessage.success(`扫描完成，发现 ${res.data.found} 台设备`)
    }
  } catch (error) {
    console.error(error)
  } finally {
    scanning.value = false
  }
}

const addScannedDevice = async (device) => {
  try {
    const res = await deviceApi.create(device)
    if (res.code === 200) {
      ElMessage.success(`已添加设备: ${device.name}`)
      loadDevices()
    }
  } catch (error) {
    console.error(error)
  }
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(deviceForm, row)
  showAddDialog.value = true
}

const handleSave = async () => {
  const valid = await deviceFormRef.value?.validate().catch(() => false)
  if (!valid) return

  saveLoading.value = true
  try {
    if (isEdit.value) {
      await deviceApi.update(deviceForm.id, deviceForm)
      ElMessage.success('设备更新成功')
    } else {
      await deviceApi.create(deviceForm)
      ElMessage.success('设备添加成功')
    }
    showAddDialog.value = false
    loadDevices()
  } catch (error) {
    console.error(error)
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除设备 "${row.name}" 吗？`, '提示', { type: 'warning' })
    await deviceApi.delete(row.id)
    ElMessage.success('设备删除成功')
    loadDevices()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

const handleUpgrade = (row) => {
  ElMessage.info(`设备 ${row.name} 固件升级功能开发中`)
}

onMounted(() => {
  loadDevices()
})
</script>

<style scoped>
.devices-page {
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

.device-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mt-20 {
  margin-top: 20px;
}
</style>
