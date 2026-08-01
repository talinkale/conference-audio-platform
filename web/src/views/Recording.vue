<template>
  <div class="recording-page">
    <el-tabs v-model="activeTab" type="border-card" @tab-change="handleTabChange">
      <!-- ==================== 录播室管理 ==================== -->
      <el-tab-pane label="录播室管理" name="rooms">
        <div class="tab-header">
          <el-input v-model="roomSearch" placeholder="搜索录播室名称/位置" clearable style="width: 250px" @clear="loadRooms" @keyup.enter="loadRooms">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <div>
            <el-button type="primary" :icon="Plus" @click="showRoomDialog()">添加录播室</el-button>
            <el-button :icon="Refresh" @click="loadRooms">刷新</el-button>
          </div>
        </div>
        <el-table :data="roomList" v-loading="roomLoading" stripe>
          <el-table-column type="index" width="50" />
          <el-table-column prop="name" label="录播室名称" min-width="140" />
          <el-table-column prop="location" label="位置" width="140" />
          <el-table-column prop="ip_address" label="IP地址" width="140" />
          <el-table-column prop="stream_url" label="流地址" min-width="200" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="roomStatusType(row.status)" size="small">{{ roomStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="showRoomDialog(row)">编辑</el-button>
              <el-button text type="danger" size="small" @click="deleteRoom(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ==================== 录制管理 ==================== -->
      <el-tab-pane label="录制管理" name="recording">
        <div class="tab-header">
          <el-select v-model="taskFilter.room_id" placeholder="筛选录播室" clearable style="width: 180px" @change="loadTasks">
            <el-option v-for="r in roomList" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
          <div>
            <el-button type="primary" :icon="Plus" @click="showTaskDialog()">新建录制任务</el-button>
            <el-button :icon="Refresh" @click="loadTasks">刷新</el-button>
          </div>
        </div>
        <el-table :data="taskList" v-loading="taskLoading" stripe>
          <el-table-column type="index" width="50" />
          <el-table-column prop="name" label="任务名称" min-width="140" />
          <el-table-column prop="room_name" label="录播室" width="130" />
          <el-table-column prop="stream_url" label="源流地址" min-width="200" show-overflow-tooltip />
          <el-table-column prop="format" label="格式" width="80" />
          <el-table-column prop="resolution" label="分辨率" width="90" />
          <el-table-column prop="bitrate" label="码率(kbps)" width="100" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="taskStatusType(row.status)" size="small">{{ taskStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="时长" width="90">
            <template #default="{ row }">{{ formatDuration(row.duration) }}</template>
          </el-table-column>
          <el-table-column prop="file_size" label="文件大小" width="100">
            <template #default="{ row }">{{ formatFileSize(row.file_size) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status !== 'recording'" text type="success" size="small" :icon="VideoPlay" @click="startTask(row)">开始</el-button>
              <el-button v-if="row.status === 'recording'" text type="warning" size="small" :icon="VideoPause" @click="pauseTask(row)">暂停</el-button>
              <el-button v-if="row.status === 'recording' || row.status === 'paused'" text type="danger" size="small" :icon="CircleClose" @click="stopTask(row)">停止</el-button>
              <el-button text type="primary" size="small" @click="showTaskDialog(row)">编辑</el-button>
              <el-button text type="danger" size="small" @click="deleteTask(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ==================== 直播管理 ==================== -->
      <el-tab-pane label="直播管理" name="live">
        <div class="tab-header">
          <el-select v-model="liveFilter.room_id" placeholder="筛选录播室" clearable style="width: 180px" @change="loadChannels">
            <el-option v-for="r in roomList" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
          <div>
            <el-button type="primary" :icon="Plus" @click="showLiveDialog()">新建直播频道</el-button>
            <el-button :icon="Refresh" @click="loadChannels">刷新</el-button>
          </div>
        </div>
        <el-row :gutter="16">
          <el-col v-for="ch in channelList" :key="ch.id" :xs="24" :sm="12" :lg="8" style="margin-bottom: 16px">
            <el-card shadow="hover" class="live-card">
              <div class="live-card-header">
                <span class="live-card-title">{{ ch.name }}</span>
                <el-tag :type="liveStatusType(ch.status)" size="small">{{ liveStatusText(ch.status) }}</el-tag>
              </div>
              <div class="live-card-body">
                <div class="live-info-row"><span class="label">录播室：</span>{{ ch.room_name || '未绑定' }}</div>
                <div class="live-info-row"><span class="label">协议：</span>{{ ch.protocol?.toUpperCase() }}</div>
                <div class="live-info-row"><span class="label">分辨率：</span>{{ ch.resolution }}</div>
                <div class="live-info-row"><span class="label">推流地址：</span><span class="url-text">{{ ch.push_url }}</span></div>
                <div class="live-info-row"><span class="label">拉流地址：</span><span class="url-text">{{ ch.pull_url }}</span></div>
                <div class="live-info-row"><span class="label">流密钥：</span>{{ ch.stream_key }}</div>
                <div class="live-info-row"><span class="label">观看人数：</span>{{ ch.current_viewers }}</div>
              </div>
              <div class="live-card-footer">
                <el-button v-if="ch.status !== 'live'" type="success" size="small" :icon="VideoPlay" @click="startLive(ch)">开始直播</el-button>
                <el-button v-else type="danger" size="small" :icon="CircleClose" @click="stopLive(ch)">停止直播</el-button>
                <el-button text type="primary" size="small" @click="showLiveDialog(ch)">编辑</el-button>
                <el-button text type="danger" size="small" @click="deleteLive(ch)">删除</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
        <el-empty v-if="channelList.length === 0 && !liveLoading" description="暂无直播频道" />
      </el-tab-pane>

      <!-- ==================== 拉流管理 ==================== -->
      <el-tab-pane label="拉流管理" name="pull">
        <div class="tab-header">
          <el-select v-model="pullFilter.room_id" placeholder="筛选录播室" clearable style="width: 180px" @change="loadPulls">
            <el-option v-for="r in roomList" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
          <div>
            <el-button type="primary" :icon="Plus" @click="showPullDialog()">添加拉流</el-button>
            <el-button :icon="Refresh" @click="loadPulls">刷新</el-button>
          </div>
        </div>
        <el-table :data="pullList" v-loading="pullLoading" stripe>
          <el-table-column type="index" width="50" />
          <el-table-column prop="name" label="名称" min-width="140" />
          <el-table-column prop="room_name" label="录播室" width="130" />
          <el-table-column prop="source_url" label="源流地址" min-width="250" show-overflow-tooltip />
          <el-table-column prop="protocol" label="协议" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.protocol === 'rtsp' ? 'warning' : 'info'">{{ row.protocol?.toUpperCase() }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="auto_reconnect" label="自动重连" width="90">
            <template #default="{ row }">
              <el-tag :type="row.auto_reconnect ? 'success' : 'info'" size="small">{{ row.auto_reconnect ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'pulling' ? 'success' : 'info'" size="small">{{ row.status === 'pulling' ? '拉流中' : '已停止' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="260" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status !== 'pulling'" text type="success" size="small" :icon="VideoPlay" @click="startPull(row)">开始拉流</el-button>
              <el-button v-else text type="danger" size="small" :icon="CircleClose" @click="stopPull(row)">停止拉流</el-button>
              <el-button text type="primary" size="small" @click="showPullDialog(row)">编辑</el-button>
              <el-button text type="danger" size="small" @click="deletePull(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ==================== 推流管理 ==================== -->
      <el-tab-pane label="推流管理" name="push">
        <div class="tab-header">
          <el-select v-model="pushFilter.room_id" placeholder="筛选录播室" clearable style="width: 180px" @change="loadPushes">
            <el-option v-for="r in roomList" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
          <div>
            <el-button type="primary" :icon="Plus" @click="showPushDialog()">添加推流</el-button>
            <el-button :icon="Refresh" @click="loadPushes">刷新</el-button>
          </div>
        </div>
        <el-table :data="pushList" v-loading="pushLoading" stripe>
          <el-table-column type="index" width="50" />
          <el-table-column prop="name" label="名称" min-width="140" />
          <el-table-column prop="room_name" label="录播室" width="130" />
          <el-table-column prop="target_url" label="目标推流地址" min-width="250" show-overflow-tooltip />
          <el-table-column prop="protocol" label="协议" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.protocol === 'rtmp' ? 'warning' : row.protocol === 'srt' ? 'success' : 'info'">{{ row.protocol?.toUpperCase() }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="auto_reconnect" label="自动重连" width="90">
            <template #default="{ row }">
              <el-tag :type="row.auto_reconnect ? 'success' : 'info'" size="small">{{ row.auto_reconnect ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'pushing' ? 'success' : 'info'" size="small">{{ row.status === 'pushing' ? '推流中' : '已停止' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="260" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status !== 'pushing'" text type="success" size="small" :icon="VideoPlay" @click="startPush(row)">开始推流</el-button>
              <el-button v-else text type="danger" size="small" :icon="CircleClose" @click="stopPush(row)">停止推流</el-button>
              <el-button text type="primary" size="small" @click="showPushDialog(row)">编辑</el-button>
              <el-button text type="danger" size="small" @click="deletePush(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- ==================== 录播室对话框 ==================== -->
    <el-dialog v-model="roomDialog.visible" :title="roomDialog.isEdit ? '编辑录播室' : '添加录播室'" width="560px">
      <el-form :model="roomDialog.form" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="roomDialog.form.name" placeholder="如：一号录播室" />
        </el-form-item>
        <el-form-item label="位置">
          <el-input v-model="roomDialog.form.location" placeholder="如：A栋3楼" />
        </el-form-item>
        <el-form-item label="IP地址">
          <el-input v-model="roomDialog.form.ip_address" placeholder="如：192.168.1.100" />
        </el-form-item>
        <el-form-item label="流地址">
          <el-input v-model="roomDialog.form.stream_url" placeholder="如：rtsp://192.168.1.100/stream1" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="roomDialog.form.status" style="width: 100%">
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
            <el-option label="维护中" value="maintenance" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="roomDialog.form.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roomDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveRoom">保存</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 录制任务对话框 ==================== -->
    <el-dialog v-model="taskDialog.visible" :title="taskDialog.isEdit ? '编辑录制任务' : '新建录制任务'" width="560px">
      <el-form :model="taskDialog.form" label-width="100px">
        <el-form-item label="任务名称" required>
          <el-input v-model="taskDialog.form.name" placeholder="如：周一例会录制" />
        </el-form-item>
        <el-form-item label="录播室">
          <el-select v-model="taskDialog.form.room_id" placeholder="选择录播室" style="width: 100%">
            <el-option v-for="r in roomList" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="源流地址">
          <el-input v-model="taskDialog.form.stream_url" placeholder="如：rtsp://192.168.1.100/stream1" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="格式">
              <el-select v-model="taskDialog.form.format" style="width: 100%">
                <el-option label="MP4" value="mp4" />
                <el-option label="FLV" value="flv" />
                <el-option label="MKV" value="mkv" />
                <el-option label="TS" value="ts" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分辨率">
              <el-select v-model="taskDialog.form.resolution" style="width: 100%">
                <el-option label="4K (3840x2160)" value="4k" />
                <el-option label="1080P (1920x1080)" value="1080p" />
                <el-option label="720P (1280x720)" value="720p" />
                <el-option label="480P (854x480)" value="480p" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="码率(kbps)">
              <el-input-number v-model="taskDialog.form.bitrate" :min="500" :max="20000" :step="500" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="帧率(fps)">
              <el-input-number v-model="taskDialog.form.fps" :min="15" :max="60" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="taskDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveTask">保存</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 直播频道对话框 ==================== -->
    <el-dialog v-model="liveDialog.visible" :title="liveDialog.isEdit ? '编辑直播频道' : '新建直播频道'" width="600px">
      <el-form :model="liveDialog.form" label-width="100px">
        <el-form-item label="频道名称" required>
          <el-input v-model="liveDialog.form.name" placeholder="如：一号厅直播" />
        </el-form-item>
        <el-form-item label="录播室">
          <el-select v-model="liveDialog.form.room_id" placeholder="选择录播室" style="width: 100%">
            <el-option v-for="r in roomList" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="协议">
              <el-select v-model="liveDialog.form.protocol" style="width: 100%">
                <el-option label="RTMP" value="rtmp" />
                <el-option label="SRT" value="srt" />
                <el-option label="RTSP" value="rtsp" />
                <el-option label="HLS" value="hls" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分辨率">
              <el-select v-model="liveDialog.form.resolution" style="width: 100%">
                <el-option label="1080P" value="1080p" />
                <el-option label="720P" value="720p" />
                <el-option label="4K" value="4k" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="推流地址">
          <el-input v-model="liveDialog.form.push_url" placeholder="如：rtmp://live.example.com/live/stream1" />
        </el-form-item>
        <el-form-item label="拉流地址">
          <el-input v-model="liveDialog.form.pull_url" placeholder="如：http://live.example.com/live/stream1.m3u8" />
        </el-form-item>
        <el-form-item label="流密钥">
          <el-input v-model="liveDialog.form.stream_key" placeholder="留空自动生成" />
        </el-form-item>
        <el-form-item label="码率(kbps)">
          <el-input-number v-model="liveDialog.form.bitrate" :min="500" :max="20000" :step="500" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="liveDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveLive">保存</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 拉流配置对话框 ==================== -->
    <el-dialog v-model="pullDialog.visible" :title="pullDialog.isEdit ? '编辑拉流配置' : '添加拉流配置'" width="560px">
      <el-form :model="pullDialog.form" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="pullDialog.form.name" placeholder="如：摄像头1拉流" />
        </el-form-item>
        <el-form-item label="录播室">
          <el-select v-model="pullDialog.form.room_id" placeholder="选择录播室" style="width: 100%">
            <el-option v-for="r in roomList" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="源流地址" required>
          <el-input v-model="pullDialog.form.source_url" placeholder="如：rtsp://192.168.1.100:554/stream1" />
        </el-form-item>
        <el-form-item label="协议">
          <el-select v-model="pullDialog.form.protocol" style="width: 100%">
            <el-option label="RTSP" value="rtsp" />
            <el-option label="RTMP" value="rtmp" />
            <el-option label="HLS (HTTP-FLV)" value="hls" />
            <el-option label="HTTP-FLV" value="http-flv" />
            <el-option label="SRT" value="srt" />
          </el-select>
        </el-form-item>
        <el-form-item label="自动重连">
          <el-switch v-model="pullDialog.form.auto_reconnect" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pullDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="savePull">保存</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 推流配置对话框 ==================== -->
    <el-dialog v-model="pushDialog.visible" :title="pushDialog.isEdit ? '编辑推流配置' : '添加推流配置'" width="560px">
      <el-form :model="pushDialog.form" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="pushDialog.form.name" placeholder="如：推流到B站" />
        </el-form-item>
        <el-form-item label="录播室">
          <el-select v-model="pushDialog.form.room_id" placeholder="选择录播室" style="width: 100%">
            <el-option v-for="r in roomList" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标地址" required>
          <el-input v-model="pushDialog.form.target_url" placeholder="如：rtmp://push.example.com/live/stream_key" />
        </el-form-item>
        <el-form-item label="协议">
          <el-select v-model="pushDialog.form.protocol" style="width: 100%">
            <el-option label="RTMP" value="rtmp" />
            <el-option label="SRT" value="srt" />
            <el-option label="RTSP" value="rtsp" />
            <el-option label="HLS" value="hls" />
          </el-select>
        </el-form-item>
        <el-form-item label="自动重连">
          <el-switch v-model="pushDialog.form.auto_reconnect" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pushDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="savePush">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Refresh, Search, VideoPlay, VideoPause, CircleClose
} from '@element-plus/icons-vue'
import {
  recordingRoomApi, recordingTaskApi, liveChannelApi,
  pullStreamApi, pushStreamApi
} from '@/api'

const activeTab = ref('rooms')

// ==================== 录播室 ====================
const roomList = ref([])
const roomLoading = ref(false)
const roomSearch = ref('')
const roomDialog = reactive({
  visible: false,
  isEdit: false,
  form: {}
})

const roomStatusType = (s) => ({ online: 'success', offline: 'info', maintenance: 'warning' }[s] || 'info')
const roomStatusText = (s) => ({ online: '在线', offline: '离线', maintenance: '维护中' }[s] || s)

const loadRooms = async () => {
  roomLoading.value = true
  try {
    const res = await recordingRoomApi.list({ search: roomSearch.value })
    roomList.value = res.data || []
  } finally {
    roomLoading.value = false
  }
}

const showRoomDialog = (row) => {
  roomDialog.isEdit = !!row
  roomDialog.form = row ? { ...row } : { name: '', location: '', ip_address: '', stream_url: '', status: 'offline', description: '' }
  roomDialog.visible = true
}

const saveRoom = async () => {
  if (!roomDialog.form.name) { ElMessage.warning('请输入录播室名称'); return }
  try {
    if (roomDialog.isEdit) {
      await recordingRoomApi.update(roomDialog.form.id, roomDialog.form)
    } else {
      await recordingRoomApi.create(roomDialog.form)
    }
    ElMessage.success('保存成功')
    roomDialog.visible = false
    loadRooms()
  } catch {}
}

const deleteRoom = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除录播室「${row.name}」吗？`, '提示', { type: 'warning' })
    await recordingRoomApi.delete(row.id)
    ElMessage.success('删除成功')
    loadRooms()
  } catch {}
}

// ==================== 录制任务 ====================
const taskList = ref([])
const taskLoading = ref(false)
const taskFilter = reactive({ room_id: null })
const taskDialog = reactive({
  visible: false,
  isEdit: false,
  form: {}
})

const taskStatusType = (s) => ({ idle: 'info', recording: 'success', paused: 'warning', stopped: 'danger' }[s] || 'info')
const taskStatusText = (s) => ({ idle: '待录制', recording: '录制中', paused: '已暂停', stopped: '已停止' }[s] || s)

const formatDuration = (sec) => {
  if (!sec) return '--'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0 ? `${h}h${m}m${s}s` : `${m}m${s}s`
}

const formatFileSize = (bytes) => {
  if (!bytes) return '--'
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB'
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + 'MB'
  return (bytes / 1073741824).toFixed(2) + 'GB'
}

const loadTasks = async () => {
  taskLoading.value = true
  try {
    const res = await recordingTaskApi.list(taskFilter)
    taskList.value = res.data || []
  } finally {
    taskLoading.value = false
  }
}

const showTaskDialog = (row) => {
  taskDialog.isEdit = !!row
  taskDialog.form = row ? { ...row } : { name: '', room_id: null, stream_url: '', format: 'mp4', resolution: '1080p', bitrate: 4000, fps: 30 }
  taskDialog.visible = true
}

const saveTask = async () => {
  if (!taskDialog.form.name) { ElMessage.warning('请输入任务名称'); return }
  try {
    if (taskDialog.isEdit) {
      await recordingTaskApi.update(taskDialog.form.id, taskDialog.form)
    } else {
      await recordingTaskApi.create(taskDialog.form)
    }
    ElMessage.success('保存成功')
    taskDialog.visible = false
    loadTasks()
  } catch {}
}

const deleteTask = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除录制任务「${row.name}」吗？`, '提示', { type: 'warning' })
    await recordingTaskApi.delete(row.id)
    ElMessage.success('删除成功')
    loadTasks()
  } catch {}
}

const startTask = async (row) => {
  await recordingTaskApi.start(row.id)
  ElMessage.success('录制已开始')
  loadTasks()
}

const pauseTask = async (row) => {
  await recordingTaskApi.pause(row.id)
  ElMessage.success('录制已暂停')
  loadTasks()
}

const stopTask = async (row) => {
  await recordingTaskApi.stop(row.id)
  ElMessage.success('录制已停止')
  loadTasks()
}

// ==================== 直播频道 ====================
const channelList = ref([])
const liveLoading = ref(false)
const liveFilter = reactive({ room_id: null })
const liveDialog = reactive({
  visible: false,
  isEdit: false,
  form: {}
})

const liveStatusType = (s) => ({ offline: 'info', live: 'success', ended: 'danger' }[s] || 'info')
const liveStatusText = (s) => ({ offline: '未开始', live: '直播中', ended: '已结束' }[s] || s)

const loadChannels = async () => {
  liveLoading.value = true
  try {
    const res = await liveChannelApi.list(liveFilter)
    channelList.value = res.data || []
  } finally {
    liveLoading.value = false
  }
}

const showLiveDialog = (row) => {
  liveDialog.isEdit = !!row
  liveDialog.form = row ? { ...row } : { name: '', room_id: null, protocol: 'rtmp', resolution: '1080p', push_url: '', pull_url: '', stream_key: '', bitrate: 4000 }
  liveDialog.visible = true
}

const saveLive = async () => {
  if (!liveDialog.form.name) { ElMessage.warning('请输入频道名称'); return }
  try {
    if (liveDialog.isEdit) {
      await liveChannelApi.update(liveDialog.form.id, liveDialog.form)
    } else {
      await liveChannelApi.create(liveDialog.form)
    }
    ElMessage.success('保存成功')
    liveDialog.visible = false
    loadChannels()
  } catch {}
}

const deleteLive = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除直播频道「${row.name}」吗？`, '提示', { type: 'warning' })
    await liveChannelApi.delete(row.id)
    ElMessage.success('删除成功')
    loadChannels()
  } catch {}
}

const startLive = async (row) => {
  await liveChannelApi.start(row.id)
  ElMessage.success('直播已开始')
  loadChannels()
}

const stopLive = async (row) => {
  await liveChannelApi.stop(row.id)
  ElMessage.success('直播已结束')
  loadChannels()
}

// ==================== 拉流 ====================
const pullList = ref([])
const pullLoading = ref(false)
const pullFilter = reactive({ room_id: null })
const pullDialog = reactive({
  visible: false,
  isEdit: false,
  form: {}
})

const loadPulls = async () => {
  pullLoading.value = true
  try {
    const res = await pullStreamApi.list(pullFilter)
    pullList.value = res.data || []
  } finally {
    pullLoading.value = false
  }
}

const showPullDialog = (row) => {
  pullDialog.isEdit = !!row
  pullDialog.form = row ? { ...row, auto_reconnect: !!row.auto_reconnect } : { name: '', room_id: null, source_url: '', protocol: 'rtsp', auto_reconnect: true }
  pullDialog.visible = true
}

const savePull = async () => {
  if (!pullDialog.form.name) { ElMessage.warning('请输入名称'); return }
  if (!pullDialog.form.source_url) { ElMessage.warning('请输入源流地址'); return }
  try {
    if (pullDialog.isEdit) {
      await pullStreamApi.update(pullDialog.form.id, pullDialog.form)
    } else {
      await pullStreamApi.create(pullDialog.form)
    }
    ElMessage.success('保存成功')
    pullDialog.visible = false
    loadPulls()
  } catch {}
}

const deletePull = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除拉流配置「${row.name}」吗？`, '提示', { type: 'warning' })
    await pullStreamApi.delete(row.id)
    ElMessage.success('删除成功')
    loadPulls()
  } catch {}
}

const startPull = async (row) => {
  await pullStreamApi.start(row.id)
  ElMessage.success('拉流已开始')
  loadPulls()
}

const stopPull = async (row) => {
  await pullStreamApi.stop(row.id)
  ElMessage.success('拉流已停止')
  loadPulls()
}

// ==================== 推流 ====================
const pushList = ref([])
const pushLoading = ref(false)
const pushFilter = reactive({ room_id: null })
const pushDialog = reactive({
  visible: false,
  isEdit: false,
  form: {}
})

const loadPushes = async () => {
  pushLoading.value = true
  try {
    const res = await pushStreamApi.list(pushFilter)
    pushList.value = res.data || []
  } finally {
    pushLoading.value = false
  }
}

const showPushDialog = (row) => {
  pushDialog.isEdit = !!row
  pushDialog.form = row ? { ...row, auto_reconnect: !!row.auto_reconnect } : { name: '', room_id: null, target_url: '', protocol: 'rtmp', auto_reconnect: true }
  pushDialog.visible = true
}

const savePush = async () => {
  if (!pushDialog.form.name) { ElMessage.warning('请输入名称'); return }
  if (!pushDialog.form.target_url) { ElMessage.warning('请输入目标地址'); return }
  try {
    if (pushDialog.isEdit) {
      await pushStreamApi.update(pushDialog.form.id, pushDialog.form)
    } else {
      await pushStreamApi.create(pushDialog.form)
    }
    ElMessage.success('保存成功')
    pushDialog.visible = false
    loadPushes()
  } catch {}
}

const deletePush = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除推流配置「${row.name}」吗？`, '提示', { type: 'warning' })
    await pushStreamApi.delete(row.id)
    ElMessage.success('删除成功')
    loadPushes()
  } catch {}
}

const startPush = async (row) => {
  await pushStreamApi.start(row.id)
  ElMessage.success('推流已开始')
  loadPushes()
}

const stopPush = async (row) => {
  await pushStreamApi.stop(row.id)
  ElMessage.success('推流已停止')
  loadPushes()
}

// ==================== Tab 切换 ====================
const handleTabChange = (tab) => {
  switch (tab) {
    case 'rooms': loadRooms(); break
    case 'recording': loadTasks(); break
    case 'live': loadChannels(); break
    case 'pull': loadPulls(); break
    case 'push': loadPushes(); break
  }
}

onMounted(() => {
  loadRooms()
})
</script>

<style scoped>
.recording-page {
  min-height: 100%;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.live-card {
  height: 100%;
  transition: transform 0.2s;
}

.live-card:hover {
  transform: translateY(-2px);
}

.live-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.live-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.live-card-body {
  font-size: 13px;
  color: #606266;
  line-height: 2;
}

.live-info-row {
  display: flex;
  align-items: flex-start;
}

.live-info-row .label {
  color: #909399;
  white-space: nowrap;
  min-width: 75px;
}

.url-text {
  word-break: break-all;
  color: #409EFF;
}

.live-card-footer {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 8px;
}
</style>
