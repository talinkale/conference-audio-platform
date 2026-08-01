<template>
  <div class="roles-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <div class="header-left">
            <h2>角色管理</h2>
            <el-tag type="info">共 {{ roleList.length }} 个角色</el-tag>
          </div>
          <div class="header-right">
            <el-button type="primary" :icon="Plus" @click="handleAdd">添加角色</el-button>
          </div>
        </div>
      </template>

      <el-table :data="roleList" v-loading="loading" stripe>
        <el-table-column type="index" width="50" />
        <el-table-column prop="name" label="角色名称" min-width="140">
          <template #default="{ row }">
            <div class="role-name">
              <el-icon size="18" :color="row.is_system ? '#F56C6C' : '#409EFF'"><Key /></el-icon>
              <span>{{ row.name }}</span>
              <el-tag v-if="row.is_system" type="danger" size="small">系统</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200">
          <template #default="{ row }">
            {{ row.description || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="权限数量" width="120">
          <template #default="{ row }">
            <el-tag :type="row.is_system ? 'danger' : 'success'" size="small">
              {{ row.permission_count ?? '—' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button text type="success" size="small" @click="handlePermissions(row)">权限分配</el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)" :disabled="row.is_system">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑角色对话框 -->
    <el-dialog v-model="showRoleDialog" :title="isEdit ? '编辑角色' : '添加角色'" width="500px">
      <el-form :model="roleForm" :rules="roleRules" ref="roleFormRef" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称（英文标识）" :disabled="isEdit && roleForm.is_system" />
        </el-form-item>
        <el-form-item label="角色描述" prop="description">
          <el-input v-model="roleForm.description" type="textarea" :rows="3" placeholder="请输入角色描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRoleDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitRole" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 权限分配对话框 -->
    <el-dialog v-model="showPermDialog" title="权限分配" width="600px" top="5vh">
      <div class="perm-dialog-header">
        <div>
          <span class="perm-role-label">角色：</span>
          <el-tag type="primary">{{ currentRole?.name }}</el-tag>
          <span class="perm-role-desc">{{ currentRole?.description }}</span>
        </div>
        <el-button text type="primary" @click="handleCheckAll">全选/反选</el-button>
      </div>
      <el-divider />
      <el-tree
        ref="permTreeRef"
        :data="permissionTreeData"
        show-checkbox
        node-key="id"
        :props="{ label: 'name', children: 'children' }"
        default-expand-all
        class="perm-tree"
      >
        <template #default="{ node, data }">
          <span class="perm-node">
            <span class="perm-node-name">{{ node.label }}</span>
            <span v-if="data.code" class="perm-node-code">{{ data.code }}</span>
            <span v-if="data.description" class="perm-node-desc">{{ data.description }}</span>
          </span>
        </template>
      </el-tree>
      <template #footer>
        <el-button @click="showPermDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitPermissions" :loading="submitting">保存权限</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Key } from '@element-plus/icons-vue'
import { roleApi, permissionApi } from '@/api'

const loading = ref(false)
const submitting = ref(false)
const showRoleDialog = ref(false)
const showPermDialog = ref(false)
const isEdit = ref(false)
const roleFormRef = ref(null)
const permTreeRef = ref(null)

const roleList = ref([])
const allPermissions = ref([])
const currentRole = ref(null)

const roleForm = reactive({
  id: null,
  name: '',
  description: '',
  is_system: 0
})

const roleRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }]
}

// 将权限列表按模块分组，构建树形结构
const permissionTreeData = computed(() => {
  const moduleMap = {}
  allPermissions.value.forEach(p => {
    if (!moduleMap[p.module]) {
      moduleMap[p.module] = {
        id: `module_${p.module}`,
        name: getModuleName(p.module),
        children: []
      }
    }
    moduleMap[p.module].children.push(p)
  })
  return Object.values(moduleMap)
})

const moduleNameMap = {
  dashboard: '仪表板',
  devices: '设备管理',
  protocols: '协议管理',
  commands: '指令模板',
  modules: '模块管理',
  meetings: '会议管理',
  microphones: '话筒管理',
  recording: '录播管理',
  backups: '配置备份',
  scenes: '场景管理',
  logs: '操作日志',
  settings: '系统设置',
  users: '用户管理',
  roles: '角色管理'
}

function getModuleName(code) {
  return moduleNameMap[code] || code
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
    const [roleRes, permRes] = await Promise.all([
      roleApi.list(),
      permissionApi.list()
    ])
    roleList.value = (roleRes.data || []).map(r => ({ ...r, permission_count: 0 }))
    allPermissions.value = permRes.data || []

    // 为每个角色获取权限数量
    for (const role of roleList.value) {
      try {
        const permsRes = await roleApi.getPermissions(role.id)
        role.permission_count = (permsRes.data || []).length
      } catch {
        // ignore
      }
    }
  } catch (e) {
    console.error('加载数据失败', e)
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  isEdit.value = false
  Object.assign(roleForm, {
    id: null,
    name: '',
    description: '',
    is_system: 0
  })
  showRoleDialog.value = true
}

function handleEdit(row) {
  isEdit.value = true
  Object.assign(roleForm, {
    id: row.id,
    name: row.name,
    description: row.description || '',
    is_system: row.is_system
  })
  showRoleDialog.value = true
}

async function handleSubmitRole() {
  if (!roleFormRef.value) return
  try {
    await roleFormRef.value.validate()
    submitting.value = true

    const payload = {
      name: roleForm.name,
      description: roleForm.description
    }

    if (isEdit.value) {
      await roleApi.update(roleForm.id, payload)
      ElMessage.success('角色更新成功')
    } else {
      await roleApi.create(payload)
      ElMessage.success('角色创建成功')
    }

    showRoleDialog.value = false
    fetchData()
  } catch (e) {
    if (e.message) ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除角色「${row.name}」吗？`, '提示', { type: 'warning' })
    await roleApi.delete(row.id)
    ElMessage.success('角色删除成功')
    fetchData()
  } catch (e) {
    if (e !== 'cancel' && e.message) ElMessage.error(e.message)
  }
}

async function handlePermissions(row) {
  currentRole.value = row
  showPermDialog.value = true

  // 获取该角色当前的权限
  try {
    const res = await roleApi.getPermissions(row.id)
    const checkedIds = (res.data || []).map(p => p.id)

    // 等待树渲染后设置选中
    setTimeout(() => {
      if (permTreeRef.value) {
        permTreeRef.value.setCheckedKeys(checkedIds)
      }
    }, 100)
  } catch (e) {
    console.error('获取权限失败', e)
  }
}

function handleCheckAll() {
  if (!permTreeRef.value) return
  const allIds = allPermissions.value.map(p => p.id)
  const checkedKeys = permTreeRef.value.getCheckedKeys()
  const allChecked = allIds.every(id => checkedKeys.includes(id))

  if (allChecked) {
    permTreeRef.value.setCheckedKeys([])
  } else {
    permTreeRef.value.setCheckedKeys(allIds)
  }
}

async function handleSubmitPermissions() {
  if (!permTreeRef.value || !currentRole.value) return
  submitting.value = true
  try {
    const checkedKeys = permTreeRef.value.getCheckedKeys()
    const halfCheckedKeys = permTreeRef.value.getHalfCheckedKeys()

    // 只取叶子节点（实际权限），过滤掉 module_ 前缀的虚拟节点
    const permissionIds = checkedKeys.filter(k => !String(k).startsWith('module_'))

    await roleApi.setPermissions(currentRole.value.id, permissionIds)
    ElMessage.success('权限分配成功')
    showPermDialog.value = false
    fetchData()
  } catch (e) {
    if (e.message) ElMessage.error(e.message)
  } finally {
    submitting.value = false
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

.role-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.perm-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.perm-role-label {
  font-weight: 600;
  margin-right: 4px;
}

.perm-role-desc {
  margin-left: 12px;
  color: #909399;
  font-size: 13px;
}

.perm-tree {
  max-height: 400px;
  overflow-y: auto;
}

.perm-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.perm-node-name {
  font-weight: 500;
}

.perm-node-code {
  font-size: 12px;
  color: #909399;
  background: #f4f4f5;
  padding: 1px 6px;
  border-radius: 3px;
}

.perm-node-desc {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
