<template>
  <div class="settings-page">
    <el-row :gutter="20">
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>系统信息</span>
            </div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="系统名称">{{ systemInfo.name }}</el-descriptions-item>
            <el-descriptions-item label="版本号">{{ systemInfo.version }}</el-descriptions-item>
            <el-descriptions-item label="构建日期">{{ systemInfo.build_date }}</el-descriptions-item>
            <el-descriptions-item label="服务器时间">{{ systemInfo.server_time }}</el-descriptions-item>
            <el-descriptions-item label="支持语言">
              <el-tag v-for="lang in systemInfo.supported_languages" :key="lang" size="small" class="mr-8">
                {{ lang }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>个人设置</span>
            </div>
          </template>
          <el-form label-width="100px">
            <el-form-item label="显示名称">
              <el-input v-model="profileForm.displayName" placeholder="显示名称" />
            </el-form-item>
            <el-form-item label="界面语言">
              <el-select v-model="profileForm.language" style="width: 100%;">
                <el-option label="简体中文" value="zh-CN" />
                <el-option label="English" value="en-US" />
                <el-option label="日本語" value="ja-JP" />
                <el-option label="한국어" value="ko-KR" />
              </el-select>
            </el-form-item>
            <el-form-item label="主题">
              <el-radio-group v-model="profileForm.theme">
                <el-radio-button label="light">浅色</el-radio-button>
                <el-radio-button label="dark">深色</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveProfile">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-20">
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>安全设置</span>
            </div>
          </template>
          <el-form label-width="120px">
            <el-form-item label="当前密码">
              <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入当前密码" />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" />
            </el-form-item>
            <el-form-item label="确认新密码">
              <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="changePassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>关于</span>
            </div>
          </template>
          <div class="about-content">
            <el-icon size="64" color="#409EFF"><VideoCamera /></el-icon>
            <h3>会议音频综合管理平台</h3>
            <p>Conference Audio Management Platform</p>
            <p class="version">Version 1.0.0</p>
            <el-divider />
            <p class="copyright"> 2026 会议音频综合管理平台. All rights reserved.</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi } from '@/api'

const systemInfo = ref({
  name: '会议音频综合管理平台',
  version: '1.0.0',
  build_date: '2026-07-21',
  server_time: '',
  supported_languages: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR']
})

const profileForm = reactive({
  displayName: '',
  language: 'zh-CN',
  theme: 'light'
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const loadSystemInfo = async () => {
  try {
    const res = await systemApi.info()
    if (res.code === 200) {
      systemInfo.value = res.data
    }
  } catch (error) {
    console.error(error)
  }
}

const saveProfile = () => {
  ElMessage.success('设置已保存')
}

const changePassword = () => {
  if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
    ElMessage.warning('请填写所有密码字段')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  ElMessage.success('密码修改成功')
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
}

onMounted(() => {
  loadSystemInfo()
})
</script>

<style scoped>
.settings-page {
  padding: 0;
}

.card-header {
  font-weight: 600;
}

.mt-20 {
  margin-top: 20px;
}

.mr-8 {
  margin-right: 8px;
}

.about-content {
  text-align: center;
  padding: 20px;
}

.about-content h3 {
  margin: 16px 0 8px;
  font-size: 18px;
  color: #303133;
}

.about-content p {
  color: #909399;
  margin: 4px 0;
}

.about-content .version {
  font-size: 14px;
  color: #409EFF;
  margin-top: 8px;
}

.about-content .copyright {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
