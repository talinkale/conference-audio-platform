<template>
  <div class="meetings-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <div class="header-left">
            <h2>会议管理</h2>
            <el-tag type="info">共 {{ meetingList.length }} 场会议</el-tag>
          </div>
          <el-button type="primary" :icon="Plus" @click="showAddDialog = true">创建会议</el-button>
        </div>
      </template>

      <el-table :data="meetingList" v-loading="loading" stripe>
        <el-table-column type="index" width="50" />
        <el-table-column prop="title" label="会议名称" min-width="180" />
        <el-table-column prop="agenda" label="议程" min-width="200" show-overflow-tooltip />
        <el-table-column prop="start_time" label="开始时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="end_time" label="结束时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="attendees_count" label="参会人数" width="100" />
        <el-table-column prop="signed_count" label="签到人数" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button text type="success" size="small" @click="handleSignIn(row)">签到</el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑会议对话框 -->
    <el-dialog v-model="showAddDialog" :title="isEdit ? '编辑会议' : '创建会议'" width="600px">
      <el-form :model="meetingForm" :rules="meetingRules" ref="meetingFormRef" label-width="100px">
        <el-form-item label="会议名称" prop="title">
          <el-input v-model="meetingForm.title" placeholder="请输入会议名称" />
        </el-form-item>
        <el-form-item label="会议议程">
          <el-input v-model="meetingForm.agenda" type="textarea" :rows="3" placeholder="请输入会议议程" />
        </el-form-item>
        <el-form-item label="开始时间" prop="start_time">
          <el-date-picker
            v-model="meetingForm.start_time"
            type="datetime"
            placeholder="选择开始时间"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="end_time">
          <el-date-picker
            v-model="meetingForm.end_time"
            type="datetime"
            placeholder="选择结束时间"
            style="width: 100%;"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saveLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { meetingApi } from '@/api'

const loading = ref(false)
const showAddDialog = ref(false)
const isEdit = ref(false)
const saveLoading = ref(false)
const meetingFormRef = ref()
const meetingList = ref([])

const meetingForm = reactive({
  id: null,
  title: '',
  agenda: '',
  start_time: '',
  end_time: ''
})

const meetingRules = {
  title: [{ required: true, message: '请输入会议名称', trigger: 'blur' }],
  start_time: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  end_time: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
}

const statusType = (status) => {
  const map = { pending: 'info', ongoing: 'success', completed: 'info', cancelled: 'danger' }
  return map[status] || 'info'
}

const statusText = (status) => {
  const map = { pending: '未开始', ongoing: '进行中', completed: '已结束', cancelled: '已取消' }
  return map[status] || status
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const loadMeetings = async () => {
  loading.value = true
  try {
    const res = await meetingApi.list()
    if (res.code === 200) {
      meetingList.value = res.data
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(meetingForm, row)
  showAddDialog.value = true
}

const handleSave = async () => {
  const valid = await meetingFormRef.value?.validate().catch(() => false)
  if (!valid) return

  saveLoading.value = true
  try {
    const formData = {
      ...meetingForm,
      start_time: meetingForm.start_time ? new Date(meetingForm.start_time).toISOString() : null,
      end_time: meetingForm.end_time ? new Date(meetingForm.end_time).toISOString() : null
    }
    if (isEdit.value) {
      await meetingApi.update(meetingForm.id, formData)
      ElMessage.success('会议更新成功')
    } else {
      await meetingApi.create(formData)
      ElMessage.success('会议创建成功')
    }
    showAddDialog.value = false
    loadMeetings()
  } catch (error) {
    console.error(error)
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除会议 "${row.title}" 吗？`, '提示', { type: 'warning' })
    await meetingApi.delete(row.id)
    ElMessage.success('会议删除成功')
    loadMeetings()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

const handleSignIn = (row) => {
  ElMessage.info(`会议 "${row.title}" 签到功能开发中`)
}

onMounted(() => {
  loadMeetings()
})
</script>

<style scoped>
.meetings-page {
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
