<template>
  <div class="deploy-page">
    <!-- 部署状态概览 -->
    <el-row :gutter="16" class="status-row">
      <el-col :span="6">
        <el-card shadow="hover" class="status-card">
          <div class="status-item">
            <el-icon size="32" :color="statusColor"><Cloudy /></el-icon>
            <div class="status-info">
              <div class="status-label">部署状态</div>
              <div class="status-value" :style="{ color: statusColor }">{{ statusText }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="status-card">
          <div class="status-item">
            <el-icon size="32" color="#409EFF"><Link /></el-icon>
            <div class="status-info">
              <div class="status-label">访问域名</div>
              <div class="status-value">{{ fullDomain || '未配置' }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="status-card">
          <div class="status-item">
            <el-icon size="32" color="#67C23A"><Monitor /></el-icon>
            <div class="status-info">
              <div class="status-label">部署方式</div>
              <div class="status-value">{{ deployTypeText }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="status-card">
          <div class="status-item">
            <el-icon size="32" color="#E6A23C"><Timer /></el-icon>
            <div class="status-info">
              <div class="status-label">最近部署</div>
              <div class="status-value">{{ deployConfig.last_deployed_at ? formatDate(deployConfig.last_deployed_at) : '未部署' }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 域名配置 -->
    <el-card shadow="hover" class="config-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Setting /></el-icon> 域名配置</span>
          <el-tag v-if="configSaved" type="success" size="small">已保存</el-tag>
        </div>
      </template>
      <el-form :model="deployConfig" label-width="120px" class="config-form">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="二级域名">
              <el-input v-model="deployConfig.subdomain" placeholder="如 platform、meeting、audio">
                <template #prepend>
                  <span>https://</span>
                </template>
                <template #append>
                  <span>.{{ deployConfig.domain }}</span>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="主域名">
              <el-input v-model="deployConfig.domain" placeholder="如 talinkale.com" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="服务器IP">
              <el-input v-model="deployConfig.server_ip" placeholder="如 47.100.xx.xx" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部署方式">
              <el-select v-model="deployConfig.deploy_type" style="width: 100%;">
                <el-option label="Docker 部署（推荐）" value="docker" />
                <el-option label="手动部署" value="manual" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="服务端口">
              <el-input-number v-model="deployConfig.port" :min="80" :max="65535" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="HTTPS/SSL">
              <el-switch v-model="sslEnabled" active-text="启用" inactive-text="关闭" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" @click="handleSaveConfig" :loading="saving">保存配置</el-button>
          <el-button type="success" @click="handleGenerate" :loading="generating">生成部署指令</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 预览访问地址 -->
    <el-card shadow="hover" class="preview-card" v-if="deployConfig.subdomain">
      <template #header>
        <span><el-icon><View /></el-icon> 访问地址预览</span>
      </template>
      <div class="url-preview">
        <div class="url-item">
          <el-tag type="success" size="small">HTTP</el-tag>
          <span class="url-text">http://{{ deployConfig.subdomain }}.{{ deployConfig.domain }}</span>
        </div>
        <div class="url-item" v-if="sslEnabled">
          <el-tag type="success" size="small">HTTPS</el-tag>
          <span class="url-text">https://{{ deployConfig.subdomain }}.{{ deployConfig.domain }}</span>
        </div>
      </div>
    </el-card>

    <!-- 部署指令 -->
    <el-card shadow="hover" class="commands-card" v-if="deployResult">
      <template #header>
        <div class="card-header">
          <span><el-icon><Platform /></el-icon> 部署指令</span>
          <el-button text type="primary" @click="handleCopyAll">复制全部</el-button>
        </div>
      </template>

      <!-- DNS 配置提示 -->
      <el-alert
        title="DNS 解析配置"
        type="warning"
        :closable="false"
        show-icon
        class="dns-alert"
      >
        <template #default>
          请在域名服务商处添加 A 记录：
          <el-tag size="small" type="warning" class="dns-tag">{{ deployResult.dns_record.host }}</el-tag>
          →
          <el-tag size="small" type="info" class="dns-tag">{{ deployResult.dns_record.value }}</el-tag>
          （TTL: {{ deployResult.dns_record.ttl }}s）
        </template>
      </el-alert>

      <!-- 指令列表 -->
      <div class="command-list">
        <div v-for="(cmd, key) in deployResult.commands" :key="key" class="command-item">
          <div class="command-header">
            <el-tag size="small" :type="getCmdTagType(key)">{{ getCmdLabel(key) }}</el-tag>
            <el-button text size="small" @click="handleCopy(cmd)">
              <el-icon><CopyDocument /></el-icon> 复制
            </el-button>
          </div>
          <pre class="command-code"><code>{{ cmd }}</code></pre>
        </div>
      </div>

      <!-- docker-compose 环境变量 -->
      <el-divider content-position="left">docker-compose 环境变量</el-divider>
      <pre class="command-code env-code"><code>{{ deployResult.docker_compose_env }}</code></pre>
    </el-card>

    <!-- 部署步骤说明 -->
    <el-card shadow="hover" class="steps-card">
      <template #header>
        <span><el-icon><Document /></el-icon> 部署步骤</span>
      </template>
      <el-steps direction="vertical" :active="activeStep" process-status="process">
        <el-step title="编辑域名配置" description="设置二级域名和主域名，保存配置" />
        <el-step title="生成部署指令" description="点击「生成部署指令」获取部署命令" />
        <el-step title="配置 DNS 解析" description="在域名服务商处添加 A 记录，将子域名指向服务器 IP" />
        <el-step title="上传项目到服务器" description="将整个项目目录上传到云服务器" />
        <el-step title="执行部署指令" description="在服务器上执行部署脚本，启动 Docker 容器" />
        <el-step title="验证访问" description="通过域名访问平台，确认服务正常运行" />
      </el-steps>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Cloudy, Link, Monitor, Timer, Setting, View, Platform,
  CopyDocument, Document
} from '@element-plus/icons-vue'
import { deployApi } from '@/api'

const loading = ref(false)
const saving = ref(false)
const generating = ref(false)
const configSaved = ref(false)
const sslEnabled = ref(false)
const activeStep = ref(0)

const deployConfig = reactive({
  subdomain: 'platform',
  domain: 'talinkale.com',
  port: 80,
  ssl_enabled: 0,
  server_ip: '',
  deploy_type: 'docker',
  status: 'pending',
  last_deployed_at: null
})

const deployResult = ref(null)

const fullDomain = computed(() => {
  if (!deployConfig.subdomain) return ''
  return `${deployConfig.subdomain}.${deployConfig.domain}`
})

const statusMap = {
  pending: { text: '待部署', color: '#909399' },
  deploying: { text: '部署中', color: '#E6A23C' },
  running: { text: '运行中', color: '#67C23A' },
  stopped: { text: '已停止', color: '#F56C6C' },
  failed: { text: '部署失败', color: '#F56C6C' }
}

const statusText = computed(() => statusMap[deployConfig.status]?.text || '未知')
const statusColor = computed(() => statusMap[deployConfig.status]?.color || '#909399')
const deployTypeText = computed(() => deployConfig.deploy_type === 'docker' ? 'Docker' : '手动部署')

const cmdLabels = {
  build: '构建镜像',
  up: '启动服务',
  down: '停止服务',
  logs: '查看日志',
  status: '查看状态',
  nginx_test: 'Nginx 检测',
  ssl_certbot: 'SSL 证书',
  full_deploy: '完整部署'
}

const cmdTagTypes = {
  build: 'info',
  up: 'success',
  down: 'danger',
  logs: 'info',
  status: 'info',
  nginx_test: 'warning',
  ssl_certbot: 'warning',
  full_deploy: 'success'
}

function getCmdLabel(key) {
  return cmdLabels[key] || key
}

function getCmdTagType(key) {
  return cmdTagTypes[key] || 'info'
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

async function fetchConfig() {
  loading.value = true
  try {
    const res = await deployApi.getConfig()
    Object.assign(deployConfig, res.data)
    sslEnabled.value = !!res.data.ssl_enabled
    if (res.data.status === 'running') activeStep.value = 6
    else if (res.data.status === 'deploying') activeStep.value = 5
    else if (res.data.subdomain) activeStep.value = 1
  } catch (e) {
    console.error('获取配置失败', e)
  } finally {
    loading.value = false
  }
}

async function handleSaveConfig() {
  saving.value = true
  try {
    await deployApi.updateConfig({
      subdomain: deployConfig.subdomain,
      domain: deployConfig.domain,
      port: deployConfig.port,
      ssl_enabled: sslEnabled.value,
      server_ip: deployConfig.server_ip,
      deploy_type: deployConfig.deploy_type
    })
    ElMessage.success('配置保存成功')
    configSaved.value = true
    activeStep.value = Math.max(activeStep.value, 1)
  } catch (e) {
    if (e.message) ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

async function handleGenerate() {
  generating.value = true
  try {
    // 先保存配置
    await deployApi.updateConfig({
      subdomain: deployConfig.subdomain,
      domain: deployConfig.domain,
      port: deployConfig.port,
      ssl_enabled: sslEnabled.value,
      server_ip: deployConfig.server_ip,
      deploy_type: deployConfig.deploy_type
    })

    const res = await deployApi.generate()
    deployResult.value = res.data
    ElMessage.success('部署指令已生成')
    activeStep.value = Math.max(activeStep.value, 2)
  } catch (e) {
    if (e.message) ElMessage.error(e.message)
  } finally {
    generating.value = false
  }
}

async function handleCopy(text) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.warning('复制失败，请手动选择复制')
  }
}

async function handleCopyAll() {
  if (!deployResult.value) return
  const allCommands = Object.entries(deployResult.value.commands)
    .map(([key, cmd]) => `# ${getCmdLabel(key)}\n${cmd}`)
    .join('\n\n')
  await handleCopy(allCommands)
}

onMounted(() => {
  fetchConfig()
})
</script>

<style scoped>
.deploy-page {
  max-width: 1200px;
}

.status-row {
  margin-bottom: 16px;
}

.status-card {
  height: 90px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
}

.status-info {
  flex: 1;
}

.status-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.status-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  word-break: break-all;
}

.config-card,
.preview-card,
.commands-card,
.steps-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header .el-icon {
  vertical-align: middle;
  margin-right: 4px;
}

.config-form {
  margin-top: 10px;
}

.url-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.url-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.url-text {
  font-size: 16px;
  font-weight: 500;
  color: #409EFF;
  font-family: 'Courier New', monospace;
}

.dns-alert {
  margin-bottom: 16px;
}

.dns-tag {
  margin: 0 4px;
}

.command-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.command-item {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.command-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.command-code {
  margin: 0;
  padding: 12px 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Courier New', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.env-code {
  background: #f0f2f5;
  color: #303133;
}
</style>
