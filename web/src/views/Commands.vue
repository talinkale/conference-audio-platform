<template>
  <div class="commands-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <div class="header-left">
            <h2>指令模板管理</h2>
            <el-tag type="info">共 {{ commandList.length }} 条指令</el-tag>
          </div>
          <el-button type="primary" :icon="Plus" @click="showAddDialog = true">新增指令</el-button>
        </div>
      </template>

      <el-row :gutter="16" style="margin-bottom: 16px;">
        <el-col :span="8">
          <el-select v-model="filterProtocol" placeholder="筛选协议类型" clearable style="width: 100%;" @change="loadCommands">
            <el-option v-for="t in protocolTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-select v-model="filterDevice" placeholder="筛选设备类型" clearable style="width: 100%;" @change="loadCommands">
            <el-option label="会议主机" value="conference_host" />
            <el-option label="话筒" value="microphone" />
            <el-option label="功放" value="amplifier" />
            <el-option label="音频处理器" value="audio_processor" />
            <el-option label="混音器" value="mixer" />
            <el-option label="反馈抑制器" value="feedback" />
            <el-option label="桌牌" value="nameplate" />
            <el-option label="通用" value="generic" />
          </el-select>
        </el-col>
      </el-row>

      <el-table :data="commandList" v-loading="loading" stripe>
        <el-table-column type="index" width="50" />
        <el-table-column prop="name" label="指令名称" min-width="140" />
        <el-table-column prop="protocol_type" label="协议" width="110">
          <template #default="{ row }">
            <el-tag size="small">{{ protocolLabel(row.protocol_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="device_type" label="设备类型" width="110">
          <template #default="{ row }">
            {{ deviceLabel(row.device_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="data_format" label="格式" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.data_format === 'hex' ? 'warning' : 'info'">{{ row.data_format === 'hex' ? 'HEX' : '文本' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="command_data" label="指令内容" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <code class="cmd-code">{{ row.command_data }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="150" show-overflow-tooltip />
        <el-table-column prop="timeout" label="超时(ms)" width="90" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button text type="success" size="small" @click="handleTest(row)">测试</el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑指令对话框 -->
    <el-dialog v-model="showAddDialog" :title="isEdit ? '编辑指令模板' : '新增指令模板'" width="600px">
      <el-form :model="commandForm" :rules="commandRules" ref="commandFormRef" label-width="100px">
        <el-form-item label="指令名称" prop="name">
          <el-input v-model="commandForm.name" placeholder="如: 会议主机开机" />
        </el-form-item>
        <el-form-item label="协议类型" prop="protocol_type">
          <el-select v-model="commandForm.protocol_type" placeholder="选择协议" style="width: 100%;">
            <el-option label="TCP" value="tcp" />
            <el-option label="UDP" value="udp" />
            <el-option label="MQTT" value="mqtt" />
            <el-option label="HTTP" value="http" />
            <el-option label="HTTPS" value="https" />
            <el-option label="Modbus TCP" value="modbus_tcp" />
            <el-option label="Modbus RTU" value="modbus_rtu" />
            <el-option label="RS-232" value="rs232" />
            <el-option label="RS-485" value="rs485" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="commandForm.device_type" placeholder="选择设备类型" style="width: 100%;" clearable>
            <el-option label="会议主机" value="conference_host" />
            <el-option label="话筒" value="microphone" />
            <el-option label="功放" value="amplifier" />
            <el-option label="音频处理器" value="audio_processor" />
            <el-option label="混音器" value="mixer" />
            <el-option label="反馈抑制器" value="feedback" />
            <el-option label="桌牌" value="nameplate" />
            <el-option label="通用" value="generic" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据格式">
          <el-radio-group v-model="commandForm.data_format">
            <el-radio-button label="hex">HEX</el-radio-button>
            <el-radio-button label="text">文本</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="指令内容" prop="command_data">
          <el-input
            v-model="commandForm.command_data"
            type="textarea"
            :rows="3"
            :placeholder="commandForm.data_format === 'hex' ? '十六进制，如: AA 55 01 02 03 00 05' : '文本指令内容'"
          />
        </el-form-item>
        <el-form-item label="预期响应">
          <el-input
            v-model="commandForm.response_data"
            type="textarea"
            :rows="2"
            placeholder="设备预期的响应数据（可选）"
          />
        </el-form-item>
        <el-form-item label="超时(ms)">
          <el-input-number v-model="commandForm.timeout" :min="100" :max="30000" :step="500" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="commandForm.description" type="textarea" :rows="2" placeholder="指令功能说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saveLoading">保存</el-button>
      </template>
    </el-dialog>

    <!-- 测试发送对话框 -->
    <el-dialog v-model="testDialogVisible" title="测试发送指令" width="500px">
      <el-form label-width="100px">
        <el-form-item label="指令">
          <el-tag size="large">{{ testCommand?.name }}</el-tag>
        </el-form-item>
        <el-form-item label="协议配置">
          <el-select v-model="testProtocolId" placeholder="选择要使用的协议配置" style="width: 100%;">
            <el-option
              v-for="p in protocolList"
              :key="p.id"
              :label="`${p.name} (${protocolLabel(p.protocol_type)})`"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="指令内容">
          <code class="cmd-code-block">{{ testCommand?.command_data }}</code>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="testDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="executeTest" :loading="testLoading" :disabled="!testProtocolId">执行发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { commandApi, protocolApi } from '@/api'

const loading = ref(false)
const showAddDialog = ref(false)
const testDialogVisible = ref(false)
const isEdit = ref(false)
const saveLoading = ref(false)
const testLoading = ref(false)
const commandFormRef = ref()
const commandList = ref([])
const protocolTypes = ref([])
const protocolList = ref([])
const filterProtocol = ref('')
const filterDevice = ref('')
const testCommand = ref(null)
const testProtocolId = ref(null)

const commandForm = reactive({
  id: null,
  name: '',
  description: '',
  protocol_type: 'tcp',
  device_type: 'generic',
  data_format: 'hex',
  command_data: '',
  response_data: '',
  timeout: 5000
})

const commandRules = {
  name: [{ required: true, message: '请输入指令名称', trigger: 'blur' }],
  protocol_type: [{ required: true, message: '请选择协议类型', trigger: 'change' }],
  command_data: [{ required: true, message: '请输入指令内容', trigger: 'blur' }]
}

const protocolLabel = (type) => {
  const map = {
    tcp: 'TCP', udp: 'UDP', mqtt: 'MQTT', http: 'HTTP', https: 'HTTPS',
    modbus_tcp: 'Modbus TCP', modbus_rtu: 'Modbus RTU', modbus_ascii: 'Modbus ASCII',
    rs232: 'RS-232', rs485: 'RS-485', profinet: 'Profinet'
  }
  return map[type] || type
}

const deviceLabel = (type) => {
  const map = {
    conference_host: '会议主机', microphone: '话筒', amplifier: '功放',
    audio_processor: '音频处理器', mixer: '混音器', feedback: '反馈抑制器',
    nameplate: '桌牌', generic: '通用'
  }
  return map[type] || type
}

const loadCommands = async () => {
  loading.value = true
  try {
    const params = {}
    if (filterProtocol.value) params.protocol_type = filterProtocol.value
    if (filterDevice.value) params.device_type = filterDevice.value
    const res = await commandApi.list(params)
    if (res.code === 200) commandList.value = res.data
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const loadProtocols = async () => {
  try {
    const [typesRes, listRes] = await Promise.all([protocolApi.types(), protocolApi.list()])
    if (typesRes.code === 200) protocolTypes.value = typesRes.data
    if (listRes.code === 200) protocolList.value = listRes.data
  } catch (error) {
    console.error(error)
  }
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(commandForm, row)
  showAddDialog.value = true
}

const handleSave = async () => {
  const valid = await commandFormRef.value?.validate().catch(() => false)
  if (!valid) return

  saveLoading.value = true
  try {
    if (isEdit.value) {
      await commandApi.update(commandForm.id, commandForm)
      ElMessage.success('指令模板更新成功')
    } else {
      await commandApi.create(commandForm)
      ElMessage.success('指令模板创建成功')
    }
    showAddDialog.value = false
    loadCommands()
  } catch (error) {
    console.error(error)
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除指令 "${row.name}" 吗？`, '提示', { type: 'warning' })
    await commandApi.delete(row.id)
    ElMessage.success('删除成功')
    loadCommands()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

const handleTest = (row) => {
  testCommand.value = row
  testProtocolId.value = null
  testDialogVisible.value = true
}

const executeTest = async () => {
  if (!testProtocolId.value || !testCommand.value) return
  testLoading.value = true
  try {
    await protocolApi.sendCommand(testProtocolId.value, testCommand.value.id)
    ElMessage.success('指令发送成功')
    testDialogVisible.value = false
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发送失败')
  } finally {
    testLoading.value = false
  }
}

onMounted(() => {
  loadCommands()
  loadProtocols()
})
</script>

<style scoped>
.commands-page {
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

.cmd-code {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  background: #f0f2f5;
  padding: 2px 6px;
  border-radius: 4px;
  color: #e6a23c;
}

.cmd-code-block {
  display: block;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  background: #f5f7fa;
  padding: 10px 12px;
  border-radius: 6px;
  color: #303133;
  word-break: break-all;
  border: 1px solid #e4e7ed;
}
</style>
