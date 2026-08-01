<template>
  <div class="protocols-page">
    <el-row :gutter="20">
      <!-- 左侧：协议配置列表 -->
      <el-col :xs="24" :lg="16">
        <el-card shadow="hover">
          <template #header>
            <div class="page-header">
              <div class="header-left">
                <h2>协议管理</h2>
                <el-tag type="info">共 {{ protocolList.length }} 个协议配置</el-tag>
              </div>
              <el-button type="primary" :icon="Plus" @click="showAddDialog = true">添加协议</el-button>
            </div>
          </template>

          <el-table :data="protocolList" v-loading="loading" stripe row-key="id">
            <el-table-column type="expand" width="40">
              <template #default="{ row }">
                <div class="expand-content">
                  <div class="expand-header">
                    <span class="expand-title">该协议下的指令列表</span>
                    <el-button type="primary" size="small" :icon="Plus" @click="showAddCommandDialog(row)">新增指令</el-button>
                  </div>
                  <el-empty v-if="getProtocolCommands(row.protocol_type).length === 0" description="暂无指令，点击上方按钮添加" />
                  <el-row v-else :gutter="12">
                    <el-col :xs="24" :sm="12" :lg="8" v-for="cmd in getProtocolCommands(row.protocol_type)" :key="cmd.id">
                      <el-card class="cmd-mini-card" shadow="hover" :body-style="{ padding: '12px' }">
                        <div class="cmd-mini-header">
                          <span class="cmd-mini-name">{{ cmd.name }}</span>
                          <el-tag size="small" :type="cmd.data_format === 'hex' ? 'warning' : 'info'">{{ cmd.data_format === 'hex' ? 'HEX' : '文本' }}</el-tag>
                        </div>
                        <code class="cmd-mini-data">{{ cmd.command_data }}</code>
                        <div class="cmd-mini-actions">
                          <el-button type="success" size="small" :disabled="row.status !== 'connected'" @click="sendCommandDirect(row, cmd)">
                            <el-icon><Promotion /></el-icon> 发送
                          </el-button>
                          <el-button text type="primary" size="small" @click="editCommandDirect(cmd)">编辑</el-button>
                          <el-button text type="danger" size="small" @click="deleteCommandDirect(cmd)">删除</el-button>
                        </div>
                      </el-card>
                    </el-col>
                  </el-row>
                </div>
              </template>
            </el-table-column>
            <el-table-column type="index" width="50" />
            <el-table-column prop="name" label="名称" min-width="140" />
            <el-table-column prop="protocol_type" label="协议类型" width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="protocolTagType(row.protocol_type)">
                  {{ protocolLabel(row.protocol_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="host" label="主机/端口" width="160">
              <template #default="{ row }">
                {{ row.host }}:{{ row.port }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">
                  {{ statusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="is_enabled" label="启用" width="80">
              <template #default="{ row }">
                <el-switch v-model="row.is_enabled" :active-value="1" :inactive-value="0" @change="(v) => toggleEnable(row, v)" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.status !== 'connected'"
                  text type="success" size="small"
                  :icon="Link" @click="handleConnect(row)"
                  :loading="connectingId === row.id"
                >连接</el-button>
                <el-button
                  v-else
                  text type="danger" size="small"
                  :icon="CircleClose" @click="handleDisconnect(row)"
                >断开</el-button>
                <el-button text type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
                <el-button text type="info" size="small" @click="showSendDialog(row)">发送</el-button>
                <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 右侧：协议日志 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>通信日志</span>
              <el-button text type="primary" size="small" @click="loadLogs" :icon="Refresh">刷新</el-button>
            </div>
          </template>
          <el-select v-model="selectedProtocolId" placeholder="选择协议" clearable style="width: 100%; margin-bottom: 12px;" @change="loadLogs">
            <el-option v-for="p in protocolList" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
          <div class="log-list" v-loading="logLoading">
            <div v-for="log in logList" :key="log.id" class="log-item" :class="log.direction">
              <div class="log-direction">
                <el-tag :type="log.direction === 'send' ? 'primary' : 'success'" size="small">
                  {{ log.direction === 'send' ? '发送' : '接收' }}
                </el-tag>
                <span class="log-time">{{ formatTime(log.created_at) }}</span>
              </div>
              <div class="log-data">{{ log.data }}</div>
              <div v-if="log.hex_data" class="log-hex">HEX: {{ log.hex_data }}</div>
            </div>
            <el-empty v-if="logList.length === 0" description="暂无日志" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加/编辑协议对话框 -->
    <el-dialog v-model="showAddDialog" :title="isEdit ? '编辑协议配置' : '添加协议配置'" width="600px">
      <el-form :model="protocolForm" :rules="protocolRules" ref="protocolFormRef" label-width="110px">
        <el-form-item label="协议名称" prop="name">
          <el-input v-model="protocolForm.name" placeholder="如: 会议主机 TCP" />
        </el-form-item>
        <el-form-item label="协议类型" prop="protocol_type">
          <el-select v-model="protocolForm.protocol_type" placeholder="选择协议类型" style="width: 100%;" @change="onProtocolTypeChange">
            <el-option-group label="网络协议">
              <el-option label="TCP" value="tcp" />
              <el-option label="UDP" value="udp" />
              <el-option label="MQTT" value="mqtt" />
              <el-option label="HTTP" value="http" />
              <el-option label="HTTPS" value="https" />
            </el-option-group>
            <el-option-group label="工业协议">
              <el-option label="Modbus TCP" value="modbus_tcp" />
              <el-option label="Modbus RTU" value="modbus_rtu" />
              <el-option label="Modbus ASCII" value="modbus_ascii" />
              <el-option label="Profinet" value="profinet" />
            </el-option-group>
            <el-option-group label="串口协议">
              <el-option label="RS-232" value="rs232" />
              <el-option label="RS-485" value="rs485" />
            </el-option-group>
          </el-select>
        </el-form-item>

        <!-- 网络协议通用字段 -->
        <template v-if="isNetworkProtocol">
          <el-form-item label="主机地址" prop="host">
            <el-input v-model="protocolForm.host" placeholder="如: 192.168.1.100" />
          </el-form-item>
          <el-form-item label="端口" prop="port">
            <el-input-number v-model="protocolForm.port" :min="1" :max="65535" style="width: 100%;" />
          </el-form-item>
        </template>

        <!-- MQTT 特有字段 -->
        <template v-if="protocolForm.protocol_type === 'mqtt'">
          <el-form-item label="用户名">
            <el-input v-model="protocolForm.username" placeholder="MQTT 用户名（可选）" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="protocolForm.password" type="password" placeholder="MQTT 密码（可选）" />
          </el-form-item>
          <el-form-item label="订阅主题">
            <el-input v-model="protocolForm.topic" placeholder="如: conference/room1/#" />
          </el-form-item>
        </template>

        <!-- 串口/Modbus 特有字段 -->
        <template v-if="isSerialProtocol">
          <el-form-item label="串口号/地址">
            <el-input v-model="protocolForm.host" placeholder="如: COM1 或 /dev/ttyUSB0" />
          </el-form-item>
          <el-form-item label="波特率">
            <el-select v-model="protocolForm.baud_rate" style="width: 100%;">
              <el-option label="9600" :value="9600" />
              <el-option label="19200" :value="19200" />
              <el-option label="38400" :value="38400" />
              <el-option label="57600" :value="57600" />
              <el-option label="115200" :value="115200" />
            </el-select>
          </el-form-item>
          <el-form-item label="数据位">
            <el-select v-model="protocolForm.data_bits" style="width: 100%;">
              <el-option label="7" :value="7" />
              <el-option label="8" :value="8" />
            </el-select>
          </el-form-item>
          <el-form-item label="停止位">
            <el-select v-model="protocolForm.stop_bits" style="width: 100%;">
              <el-option label="1" :value="1" />
              <el-option label="2" :value="2" />
            </el-select>
          </el-form-item>
          <el-form-item label="校验">
            <el-select v-model="protocolForm.parity" style="width: 100%;">
              <el-option label="无" value="none" />
              <el-option label="偶校验" value="even" />
              <el-option label="奇校验" value="odd" />
            </el-select>
          </el-form-item>
          <el-form-item label="从站ID">
            <el-input-number v-model="protocolForm.slave_id" :min="1" :max="247" style="width: 100%;" />
          </el-form-item>
        </template>

        <el-form-item label="描述">
          <el-input v-model="protocolForm.description" type="textarea" :rows="2" placeholder="协议描述" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="protocolForm.is_enabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saveLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 协议内新增指令对话框 -->
    <el-dialog v-model="inlineCommandDialogVisible" title="新增指令" width="500px">
      <el-form :model="inlineCommandForm" label-width="90px">
        <el-form-item label="指令名称" required>
          <el-input v-model="inlineCommandForm.name" placeholder="如: 开机指令" />
        </el-form-item>
        <el-form-item label="数据格式">
          <el-radio-group v-model="inlineCommandForm.data_format">
            <el-radio-button label="hex">HEX</el-radio-button>
            <el-radio-button label="text">文本</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="指令内容" required>
          <el-input
            v-model="inlineCommandForm.command_data"
            type="textarea"
            :rows="3"
            :placeholder="inlineCommandForm.data_format === 'hex' ? '十六进制，如: AA 55 01 02 03 00 05' : '文本指令内容'"
          />
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="inlineCommandForm.device_type" placeholder="选择设备类型" style="width: 100%;" clearable>
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
        <el-form-item label="说明">
          <el-input v-model="inlineCommandForm.description" type="textarea" :rows="2" placeholder="指令功能说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inlineCommandDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveInlineCommand" :loading="inlineSaveLoading">保存</el-button>
      </template>
    </el-dialog>

    <!-- 发送数据对话框 -->
    <el-dialog v-model="sendDialogVisible" title="发送数据" width="560px">
      <el-form label-width="90px">
        <el-form-item label="当前协议">
          <el-tag size="large">{{ currentProtocol?.name }} ({{ protocolLabel(currentProtocol?.protocol_type) }})</el-tag>
        </el-form-item>

        <!-- 指令模板选择 -->
        <el-form-item label="指令模板">
          <el-select v-model="selectedCommandId" placeholder="选择预定义指令（可选）" clearable style="width: 100%;" @change="onCommandSelect">
            <el-option-group v-for="group in commandGroups" :key="group.label" :label="group.label">
              <el-option
                v-for="cmd in group.commands"
                :key="cmd.id"
                :label="`${cmd.name} (${cmd.command_data.substring(0, 20)}${cmd.command_data.length > 20 ? '...' : ''})`"
                :value="cmd.id"
              />
            </el-option-group>
          </el-select>
        </el-form-item>

        <el-divider v-if="selectedCommandId">已选择指令模板，点击下方发送即可</el-divider>

        <template v-if="!selectedCommandId">
          <el-form-item label="数据内容">
            <el-radio-group v-model="sendMode" style="margin-bottom: 8px;">
              <el-radio-button label="text">文本</el-radio-button>
              <el-radio-button label="hex">HEX</el-radio-button>
            </el-radio-group>
            <el-input
              v-model="sendData"
              type="textarea"
              :rows="4"
              :placeholder="sendMode === 'text' ? '输入要发送的文本内容' : '输入十六进制，如: 01 03 00 00 00 0A C5 CD'"
            />
          </el-form-item>
          <!-- Modbus 特有 -->
          <template v-if="isModbusProtocol(currentProtocol?.protocol_type)">
            <el-form-item label="功能码">
              <el-select v-model="modbusData.functionCode" style="width: 100%;">
                <el-option label="01 读线圈" :value="1" />
                <el-option label="03 读保持寄存器" :value="3" />
                <el-option label="04 读输入寄存器" :value="4" />
                <el-option label="05 写单线圈" :value="5" />
                <el-option label="06 写单寄存器" :value="6" />
              </el-select>
            </el-form-item>
            <el-form-item label="寄存器地址">
              <el-input-number v-model="modbusData.address" :min="0" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="数量/值">
              <el-input-number v-model="modbusData.quantity" :min="1" :max="125" style="width: 100%;" />
            </el-form-item>
          </template>
          <!-- MQTT 特有 -->
          <template v-if="currentProtocol?.protocol_type === 'mqtt'">
            <el-form-item label="主题">
              <el-input v-model="mqttTopic" placeholder="发布主题" />
            </el-form-item>
          </template>
        </template>

        <!-- 显示选中的指令内容 -->
        <el-form-item v-if="selectedCommandId && selectedCommand" label="指令内容">
          <code class="cmd-preview">{{ selectedCommand.command_data }}</code>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sendDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSend" :loading="sendLoading">
          {{ selectedCommandId ? '发送指令' : '发送' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Link, CircleClose, Refresh, Promotion } from '@element-plus/icons-vue'
import { protocolApi, commandApi } from '@/api'

const loading = ref(false)
const logLoading = ref(false)
const showAddDialog = ref(false)
const sendDialogVisible = ref(false)
const isEdit = ref(false)
const saveLoading = ref(false)
const sendLoading = ref(false)
const connectingId = ref(null)
const protocolFormRef = ref()
const protocolList = ref([])
const protocolTypes = ref([])
const logList = ref([])
const selectedProtocolId = ref(null)
const sendMode = ref('text')
const sendData = ref('')
const currentProtocol = ref(null)
const mqttTopic = ref('')
const selectedCommandId = ref(null)
const commandList = ref([])
const selectedCommand = ref(null)
const inlineCommandDialogVisible = ref(false)
const inlineSaveLoading = ref(false)
const inlineCommandProtocol = ref(null)
const inlineCommandForm = reactive({
  name: '',
  description: '',
  protocol_type: 'tcp',
  device_type: 'generic',
  data_format: 'hex',
  command_data: ''
})

const modbusData = reactive({
  functionCode: 3,
  address: 0,
  quantity: 1
})

const protocolForm = reactive({
  id: null,
  name: '',
  protocol_type: 'tcp',
  host: '',
  port: 502,
  username: '',
  password: '',
  topic: '',
  baud_rate: 9600,
  data_bits: 8,
  stop_bits: 1,
  parity: 'none',
  slave_id: 1,
  unit_id: 1,
  description: '',
  is_enabled: 1
})

const protocolRules = {
  name: [{ required: true, message: '请输入协议名称', trigger: 'blur' }],
  protocol_type: [{ required: true, message: '请选择协议类型', trigger: 'change' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }]
}

const isNetworkProtocol = computed(() => {
  const types = ['tcp', 'udp', 'mqtt', 'http', 'https', 'modbus_tcp', 'profinet']
  return types.includes(protocolForm.protocol_type)
})

const isSerialProtocol = computed(() => {
  const types = ['rs232', 'rs485', 'modbus_rtu', 'modbus_ascii']
  return types.includes(protocolForm.protocol_type)
})

const protocolLabel = (type) => {
  const map = {
    tcp: 'TCP', udp: 'UDP', mqtt: 'MQTT', http: 'HTTP', https: 'HTTPS',
    modbus_tcp: 'Modbus TCP', modbus_rtu: 'Modbus RTU', modbus_ascii: 'Modbus ASCII',
    rs232: 'RS-232', rs485: 'RS-485', profinet: 'Profinet'
  }
  return map[type] || type
}

const protocolTagType = (type) => {
  const map = {
    tcp: 'primary', udp: 'success', mqtt: 'warning', http: 'info', https: 'info',
    modbus_tcp: 'danger', modbus_rtu: 'danger', modbus_ascii: 'danger',
    rs232: '', rs485: '', profinet: 'warning'
  }
  return map[type] || ''
}

const statusType = (status) => {
  const map = { connected: 'success', disconnected: 'info', error: 'danger', pending: 'warning' }
  return map[status] || 'info'
}

const statusText = (status) => {
  const map = { connected: '已连接', disconnected: '未连接', error: '错误', pending: '连接中' }
  return map[status] || status
}

const isModbusProtocol = (type) => {
  return type && type.startsWith('modbus')
}

const formatTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('zh-CN')
}

const commandGroups = computed(() => {
  const groups = {}
  const deviceMap = {
    conference_host: '会议主机', microphone: '话筒', amplifier: '功放',
    audio_processor: '音频处理器', mixer: '混音器', feedback: '反馈抑制器',
    nameplate: '桌牌', generic: '通用', '': '通用'
  }
  commandList.value.forEach(cmd => {
    const label = deviceMap[cmd.device_type] || '通用'
    if (!groups[label]) groups[label] = []
    groups[label].push(cmd)
  })
  return Object.entries(groups).map(([label, commands]) => ({ label, commands }))
})

const onProtocolTypeChange = (type) => {
  const portMap = { tcp: 502, udp: 502, mqtt: 1883, http: 80, https: 443, modbus_tcp: 502, profinet: 102 }
  if (portMap[type] && !isEdit.value) {
    protocolForm.port = portMap[type]
  }
  if (type === 'rs232' || type === 'rs485') {
    protocolForm.host = 'COM1'
  }
}

const loadProtocols = async () => {
  loading.value = true
  try {
    const [listRes, typesRes] = await Promise.all([protocolApi.list(), protocolApi.types()])
    if (listRes.code === 200) protocolList.value = listRes.data
    if (typesRes.code === 200) protocolTypes.value = typesRes.data
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const loadLogs = async () => {
  if (!selectedProtocolId.value) {
    logList.value = []
    return
  }
  logLoading.value = true
  try {
    const res = await protocolApi.logs(selectedProtocolId.value, { limit: 50 })
    if (res.code === 200) logList.value = res.data
  } catch (error) {
    console.error(error)
  } finally {
    logLoading.value = false
  }
}

const handleConnect = async (row) => {
  connectingId.value = row.id
  try {
    const res = await protocolApi.connect(row.id)
    if (res.code === 200) {
      ElMessage.success('连接成功')
      row.status = 'connected'
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '连接失败')
    row.status = 'error'
  } finally {
    connectingId.value = null
  }
}

const handleDisconnect = async (row) => {
  try {
    await protocolApi.disconnect(row.id)
    ElMessage.success('已断开连接')
    row.status = 'disconnected'
  } catch (error) {
    console.error(error)
  }
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(protocolForm, row)
  protocolForm.is_enabled = row.is_enabled ? 1 : 0
  showAddDialog.value = true
}

const handleSave = async () => {
  const valid = await protocolFormRef.value?.validate().catch(() => false)
  if (!valid) return

  saveLoading.value = true
  try {
    if (isEdit.value) {
      await protocolApi.update(protocolForm.id, protocolForm)
      ElMessage.success('协议配置更新成功')
    } else {
      await protocolApi.create(protocolForm)
      ElMessage.success('协议配置创建成功')
    }
    showAddDialog.value = false
    loadProtocols()
  } catch (error) {
    console.error(error)
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除协议配置 "${row.name}" 吗？`, '提示', { type: 'warning' })
    await protocolApi.delete(row.id)
    ElMessage.success('协议配置删除成功')
    loadProtocols()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

const toggleEnable = async (row, value) => {
  try {
    await protocolApi.update(row.id, { ...row, is_enabled: value })
    ElMessage.success(value ? '已启用' : '已禁用')
  } catch (error) {
    console.error(error)
    row.is_enabled = value ? 0 : 1
  }
}

const loadCommands = async () => {
  try {
    const res = await commandApi.list({})
    if (res.code === 200) commandList.value = res.data
  } catch (error) {
    console.error(error)
  }
}

const onCommandSelect = (cmdId) => {
  if (!cmdId) {
    selectedCommand.value = null
    return
  }
  const cmd = commandList.value.find(c => c.id === cmdId)
  selectedCommand.value = cmd || null
}

const getProtocolCommands = (protocolType) => {
  return commandList.value.filter(cmd => cmd.protocol_type === protocolType)
}

const showAddCommandDialog = (row) => {
  inlineCommandProtocol.value = row
  inlineCommandForm.name = ''
  inlineCommandForm.command_data = ''
  inlineCommandForm.description = ''
  inlineCommandForm.protocol_type = row.protocol_type
  inlineCommandForm.device_type = 'generic'
  inlineCommandForm.data_format = 'hex'
  inlineCommandDialogVisible.value = true
}

const saveInlineCommand = async () => {
  if (!inlineCommandForm.name || !inlineCommandForm.command_data) {
    ElMessage.warning('请填写指令名称和内容')
    return
  }
  inlineSaveLoading.value = true
  try {
    await commandApi.create(inlineCommandForm)
    ElMessage.success('指令添加成功')
    inlineCommandDialogVisible.value = false
    loadCommands()
  } catch (error) {
    console.error(error)
  } finally {
    inlineSaveLoading.value = false
  }
}

const sendCommandDirect = async (protocol, cmd) => {
  if (protocol.status !== 'connected') {
    ElMessage.warning('请先连接该协议')
    return
  }
  try {
    await protocolApi.sendCommand(protocol.id, cmd.id)
    ElMessage.success(`"${cmd.name}" 发送成功`)
    if (selectedProtocolId.value === protocol.id) {
      setTimeout(loadLogs, 500)
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发送失败')
  }
}

const editCommandDirect = (cmd) => {
  // 跳转到指令模板页面编辑
  window.open(`#/commands`, '_self')
}

const deleteCommandDirect = async (cmd) => {
  try {
    await ElMessageBox.confirm(`确定要删除指令 "${cmd.name}" 吗？`, '提示', { type: 'warning' })
    await commandApi.delete(cmd.id)
    ElMessage.success('删除成功')
    loadCommands()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

const showSendDialog = (row) => {
  currentProtocol.value = row
  sendData.value = ''
  mqttTopic.value = row.topic || ''
  selectedCommandId.value = null
  selectedCommand.value = null
  sendDialogVisible.value = true
  loadCommands()
}

const handleSend = async () => {
  // 如果选择了指令模板，使用指令模板发送
  if (selectedCommandId.value && selectedCommand.value) {
    sendLoading.value = true
    try {
      await protocolApi.sendCommand(currentProtocol.value.id, selectedCommandId.value)
      ElMessage.success('指令发送成功')
      sendDialogVisible.value = false
      if (selectedProtocolId.value === currentProtocol.value.id) {
        setTimeout(loadLogs, 500)
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '发送失败')
    } finally {
      sendLoading.value = false
    }
    return
  }

  // 手动发送
  if (!sendData.value) {
    ElMessage.warning('请输入要发送的数据，或选择指令模板')
    return
  }
  sendLoading.value = true
  try {
    let payload
    if (isModbusProtocol(currentProtocol.value.protocol_type)) {
      payload = { ...modbusData }
    } else if (currentProtocol.value.protocol_type === 'mqtt') {
      payload = { topic: mqttTopic.value, payload: sendData.value }
    } else if (sendMode.value === 'hex') {
      const hexStr = sendData.value.replace(/\s/g, '')
      payload = Buffer.from(hexStr, 'hex').toString('base64')
    } else {
      payload = sendData.value
    }
    await protocolApi.send(currentProtocol.value.id, payload)
    ElMessage.success('发送成功')
    if (selectedProtocolId.value === currentProtocol.value.id) {
      setTimeout(loadLogs, 500)
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发送失败')
  } finally {
    sendLoading.value = false
  }
}

onMounted(() => {
  loadProtocols()
})
</script>

<style scoped>
.protocols-page {
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

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.log-list {
  max-height: 600px;
  overflow-y: auto;
}

.log-item {
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: #f5f7fa;
  font-size: 13px;
}

.log-item.send {
  border-left: 3px solid #409EFF;
}

.log-item.receive {
  border-left: 3px solid #67C23A;
}

.log-direction {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.log-time {
  color: #909399;
  font-size: 12px;
}

.log-data {
  color: #303133;
  word-break: break-all;
  font-family: 'Consolas', monospace;
}

.log-hex {
  color: #909399;
  font-size: 11px;
  margin-top: 2px;
  font-family: 'Consolas', monospace;
}

.cmd-preview {
  display: block;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  background: #f5f7fa;
  padding: 10px 12px;
  border-radius: 6px;
  color: #e6a23c;
  word-break: break-all;
  border: 1px solid #e4e7ed;
  width: 100%;
}

.expand-content {
  padding: 16px 20px;
  background: #fafbfc;
  border-radius: 8px;
  margin: 4px 0;
}

.expand-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.expand-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.cmd-mini-card {
  margin-bottom: 12px;
}

.cmd-mini-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.cmd-mini-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.cmd-mini-data {
  display: block;
  font-family: 'Consolas', monospace;
  font-size: 11px;
  color: #e6a23c;
  background: #f5f7fa;
  padding: 6px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
  word-break: break-all;
}

.cmd-mini-actions {
  display: flex;
  gap: 4px;
}
</style>
