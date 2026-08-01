<template>
  <div class="users-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <div class="header-left">
            <h2>用户管理</h2>
            <el-tag type="info">共 {{ userList.length }} 个用户</el-tag>
          </div>
          <div class="header-right">
            <el-input
              v-model="searchQuery"
              placeholder="搜索用户名/姓名"
              clearable
              style="width: 220px; margin-right: 12px;"
              :prefix-icon="Search"
            />
            <el-button type="primary" :icon="Plus" @click="handleAdd">添加用户</el-button>
          </div>
        </div>
      </template>

      <el-table :data="filteredUsers" v-loading="loading" stripe>
        <el-table-column type="index" width="50" />
        <el-table-column prop="username" label="用户名" min-width="140">
          <template #default="{ row }">
            <div class="user-name">
              <el-icon size="18" color="#409EFF"><UserFilled /></el-icon>
              <span>{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="display_name" label="姓名" width="140">
          <template #default="{ row }">
            {{ row.display_name || '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="160">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" size="small">
              {{ getRoleName(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)" :disabled="row.id === userStore.userInfo?.id">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog v-model="showAddDialog" :title="isEdit ? '编辑用户' : '添加用户'" width="500px">
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="姓名" prop="display_name">
          <el-input v-model="userForm.display_name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="选择角色" style="width: 100%;">
            <el-option
              v-for="r in roleList"
              :key="r.id"
              :label="`${r.name}（${r.description || ''}）`"
              :value="r.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isEdit" label="新密码" prop="password">
          <el-input v-model="userForm.password" type="password" placeholder="留空则不修改密码" show-password />
        </el-form-item>
        <el-form-item v-else label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, UserFilled } from '@element-plus/icons-vue'
import { userApi, roleApi } from '@/api'
import { useUserStore } from '@/store'

const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const searchQuery = ref('')
const showAddDialog = ref(false)
const isEdit = ref(false)
const userFormRef = ref(null)

const userList = ref([])
const roleList = ref([])

const userForm = reactive({
  id: null,
  username: '',
  display_name: '',
  role: 'viewer',
  password: ''
})

const userRules = computed(() => ({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: isEdit.value
    ? []
    : [{ required: true, message: '请输入密码', trigger: 'blur' }]
}))

const filteredUsers = computed(() => {
  if (!searchQuery.value) return userList.value
  const q = searchQuery.value.toLowerCase()
  return userList.value.filter(
    u => u.username.toLowerCase().includes(q) || (u.display_name || '').toLowerCase().includes(q)
  )
})

const roleMap = {
  admin: { name: '系统管理员', tag: 'danger' },
  operator: { name: '操作员', tag: 'warning' },
  viewer: { name: '观察者', tag: 'info' }
}

function getRoleName(role) {
  return roleMap[role]?.name || role || '未知'
}

function getRoleTagType(role) {
  return roleMap[role]?.tag || 'info'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

async function fetchData() {
  loading.value = true
  try {
    const [userRes, roleRes] = await Promise.all([
      userApi.list(),
      roleApi.list()
    ])
    userList.value = userRes.data || []
    roleList.value = roleRes.data || []
  } catch (e) {
    console.error('加载数据失败', e)
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  isEdit.value = false
  Object.assign(userForm, {
    id: null,
    username: '',
    display_name: '',
    role: 'viewer',
    password: ''
  })
  showAddDialog.value = true
}

function handleEdit(row) {
  isEdit.value = true
  Object.assign(userForm, {
    id: row.id,
    username: row.username,
    display_name: row.display_name || '',
    role: row.role,
    password: ''
  })
  showAddDialog.value = true
}

async function handleSubmit() {
  if (!userFormRef.value) return
  try {
    await userFormRef.value.validate()
    submitting.value = true

    const payload = {
      username: userForm.username,
      display_name: userForm.display_name,
      role: userForm.role
    }

    if (isEdit.value) {
      if (userForm.password) payload.password = userForm.password
      await userApi.update(userForm.id, payload)
      ElMessage.success('用户更新成功')
    } else {
      payload.password = userForm.password
      await userApi.create(payload)
      ElMessage.success('用户创建成功')
    }

    showAddDialog.value = false
    fetchData()
  } catch (e) {
    if (e.message) ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除用户「${row.username}」吗？`, '提示', { type: 'warning' })
    await userApi.delete(row.id)
    ElMessage.success('用户删除成功')
    fetchData()
  } catch (e) {
    if (e !== 'cancel' && e.message) ElMessage.error(e.message)
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.header-right {
  display: flex;
  align-items: center;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
