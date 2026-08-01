<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :lg="6" v-for="stat in stats" :key="stat.title">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" :style="{ backgroundColor: stat.color }">
              <el-icon size="28" color="#fff"><component :is="stat.icon" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-title">{{ stat.title }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-20">
      <el-col :xs="24" :lg="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>设备在线状态</span>
              <el-tag type="success">实时</el-tag>
            </div>
          </template>
          <div ref="deviceChart" style="height: 300px;"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>设备类型分布</span>
            </div>
          </template>
          <div ref="typeChart" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-20">
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>最近会议</span>
              <el-button text type="primary" @click="$router.push('/meetings')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentMeetings" style="width: 100%">
            <el-table-column prop="title" label="会议名称" />
            <el-table-column prop="start_time" label="开始时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.start_time) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>系统公告</span>
            </div>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="(notice, index) in notices"
              :key="index"
              :type="notice.type"
              :timestamp="notice.time"
            >
              {{ notice.content }}
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import { dashboardApi, meetingApi } from '@/api'

const stats = ref([
  { title: '设备总数', value: 0, icon: 'Monitor', color: '#409EFF' },
  { title: '在线设备', value: 0, icon: 'Check', color: '#67C23A' },
  { title: '会议总数', value: 0, icon: 'VideoCamera', color: '#E6A23C' },
  { title: '模块数量', value: 0, icon: 'Grid', color: '#F56C6C' }
])

const recentMeetings = ref([])
const deviceChart = ref(null)
const typeChart = ref(null)

const notices = [
  { type: 'primary', time: '2026-07-21', content: '系统版本 v1.0.0 正式发布' },
  { type: 'success', time: '2026-07-20', content: '新增设备扫描功能，支持自动发现局域网设备' },
  { type: 'warning', time: '2026-07-18', content: '请定期备份系统配置，防止数据丢失' },
  { type: 'info', time: '2026-07-15', content: '全数字会议系统模块已更新至 v1.2.0' }
]

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

const loadStats = async () => {
  try {
    const res = await dashboardApi.stats()
    if (res.code === 200) {
      const data = res.data
      stats.value[0].value = data.totalDevices
      stats.value[1].value = data.onlineDevices
      stats.value[2].value = data.totalMeetings
      stats.value[3].value = data.totalModules
    }
  } catch (error) {
    console.error(error)
  }
}

const loadMeetings = async () => {
  try {
    const res = await meetingApi.list()
    if (res.code === 200) {
      recentMeetings.value = res.data.slice(0, 5)
    }
  } catch (error) {
    console.error(error)
  }
}

const initCharts = () => {
  if (deviceChart.value) {
    const chart = echarts.init(deviceChart.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
      yAxis: { type: 'value' },
      series: [
        { name: '在线', type: 'bar', data: [12, 15, 18, 14, 20, 16, 19], itemStyle: { color: '#67C23A' } },
        { name: '离线', type: 'bar', data: [2, 1, 3, 2, 1, 4, 2], itemStyle: { color: '#F56C6C' } }
      ]
    })
  }

  if (typeChart.value) {
    const chart = echarts.init(typeChart.value)
    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 1, name: '会议系统', itemStyle: { color: '#409EFF' } },
          { value: 1, name: '桌牌系统', itemStyle: { color: '#67C23A' } },
          { value: 1, name: '反馈抑制器', itemStyle: { color: '#E6A23C' } },
          { value: 1, name: '混音器', itemStyle: { color: '#F56C6C' } },
          { value: 1, name: '音频处理器', itemStyle: { color: '#909399' } },
          { value: 1, name: '功放', itemStyle: { color: '#9254DE' } }
        ]
      }]
    })
  }
}

onMounted(() => {
  loadStats()
  loadMeetings()
  initCharts()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stat-card {
  margin-bottom: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.stat-title {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}

.mt-20 {
  margin-top: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
