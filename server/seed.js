/**
 * 云端部署种子数据脚本
 * 在数据库为空时自动填充模拟数据
 */
const db = require('./database');
const bcrypt = require('bcryptjs');

// 在 PostgreSQL 模式下延迟执行，等待表结构创建完成
const delay = process.env.DATABASE_URL ? 3000 : 0;

function seedIfEmpty() {
  db.get('SELECT COUNT(*) as count FROM devices', [], (err, row) => {
    if (err) {
      // 表可能还未创建，3秒后重试一次
      console.log('[Seed] 表未就绪，3秒后重试...');
      return setTimeout(seedIfEmpty, 3000);
    }
    if (row && row.count === 0) {
      console.log('[Seed] 数据库为空，开始填充种子数据...');
      seedDevices();
      seedMeetings();
      seedMicrophones();
      seedLogs();
      seedProtocols();
      seedCommands();
      seedRecordingRooms();
      seedUsers();
      console.log('[Seed] 种子数据填充完成');
    } else {
      console.log('[Seed] 数据库已有数据，跳过种子填充');
    }
  });
}

function seedDevices() {
  const devices = [
    ['会议主机-01', 'digital_conference', '192.168.1.101', '00:11:22:33:44:51', 'online', 'A区会议室', '1.0.0'],
    ['会议主机-02', 'digital_conference', '192.168.1.102', '00:11:22:33:44:52', 'online', 'B区会议室', '1.0.0'],
    ['桌牌控制器-A', 'e_nameplate', '192.168.1.103', '00:11:22:33:44:53', 'online', 'A区会议室', '2.1.0'],
    ['桌牌控制器-B', 'e_nameplate', '192.168.1.104', '00:11:22:33:44:54', 'offline', 'B区会议室', '2.1.0'],
    ['反馈抑制器-A1', 'feedback_suppressor', '192.168.1.105', '00:11:22:33:44:55', 'online', '主会场', '1.2.0'],
    ['反馈抑制器-A2', 'feedback_suppressor', '192.168.1.106', '00:11:22:33:44:56', 'online', '分会场', '1.2.0'],
    ['智能混音器-M1', 'smart_mixer', '192.168.1.107', '00:11:22:33:44:57', 'online', '主会场', '3.0.0'],
    ['智能混音器-M2', 'smart_mixer', '192.168.1.108', '00:11:22:33:44:58', 'online', '分会场', '3.0.0'],
    ['音频处理器-DSP1', 'audio_processor', '192.168.1.109', '00:11:22:33:44:59', 'online', '主会场', '2.5.0'],
    ['音频处理器-DSP2', 'audio_processor', '192.168.1.110', '00:11:22:33:44:5A', 'online', '分会场', '2.5.0'],
    ['数字功放-P1', 'power_amplifier', '192.168.1.111', '00:11:22:33:44:5B', 'online', '主会场', '1.1.0'],
    ['数字功放-P2', 'power_amplifier', '192.168.1.112', '00:11:22:33:44:5C', 'online', '分会场', '1.1.0'],
    ['会议主机-03', 'digital_conference', '192.168.1.113', '00:11:22:33:44:5D', 'offline', 'C区会议室', '1.0.0'],
    ['桌牌控制器-C', 'e_nameplate', '192.168.1.114', '00:11:22:33:44:5E', 'offline', 'C区会议室', '2.1.0'],
    ['反馈抑制器-B1', 'feedback_suppressor', '192.168.1.115', '00:11:22:33:44:5F', 'online', 'C区会议室', '1.2.0'],
    ['智能混音器-M3', 'smart_mixer', '192.168.1.116', '00:11:22:33:44:60', 'online', 'C区会议室', '3.0.0'],
    ['音频处理器-DSP3', 'audio_processor', '192.168.1.117', '00:11:22:33:44:61', 'online', 'C区会议室', '2.5.0'],
    ['数字功放-P3', 'power_amplifier', '192.168.1.118', '00:11:22:33:44:62', 'online', 'C区会议室', '1.1.0'],
    ['会议主机-04', 'digital_conference', '192.168.1.119', '00:11:22:33:44:63', 'online', '多功能厅', '1.0.0'],
    ['反馈抑制器-C1', 'feedback_suppressor', '192.168.1.120', '00:11:22:33:44:64', 'online', '多功能厅', '1.2.0'],
    ['智能混音器-M4', 'smart_mixer', '192.168.1.121', '00:11:22:33:44:65', 'online', '多功能厅', '3.0.0'],
    ['音频处理器-DSP4', 'audio_processor', '192.168.1.122', '00:11:22:33:44:66', 'online', '多功能厅', '2.5.0'],
    ['数字功放-P4', 'power_amplifier', '192.168.1.123', '00:11:22:33:44:67', 'offline', '多功能厅', '1.1.0'],
    ['桌牌控制器-D', 'e_nameplate', '192.168.1.124', '00:11:22:33:44:68', 'online', '多功能厅', '2.1.0'],
    ['会议主机-05', 'digital_conference', '192.168.1.125', '00:11:22:33:44:69', 'online', '培训室', '1.0.0'],
    ['反馈抑制器-D1', 'feedback_suppressor', '192.168.1.126', '00:11:22:33:44:6A', 'online', '培训室', '1.2.0'],
    ['智能混音器-M5', 'smart_mixer', '192.168.1.127', '00:11:22:33:44:6B', 'online', '培训室', '3.0.0'],
    ['音频处理器-DSP5', 'audio_processor', '192.168.1.128', '00:11:22:33:44:6C', 'offline', '培训室', '2.5.0'],
    ['数字功放-P5', 'power_amplifier', '192.168.1.129', '00:11:22:33:44:6D', 'online', '培训室', '1.1.0'],
    ['桌牌控制器-E', 'e_nameplate', '192.168.1.130', '00:11:22:33:44:6E', 'online', '培训室', '2.1.0']
  ];
  const stmt = db.prepare(`INSERT INTO devices (name, type, ip_address, mac_address, status, location, firmware_version, group_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  devices.forEach(d => stmt.run([...d, d[5]]));
  stmt.finalize();
  console.log(`[Seed] 设备数据: ${devices.length} 条`);
}

function seedMeetings() {
  const meetings = [
    ['2026年第一季度工作总结会议', '各部门汇报第一季度工作成果', '2026-01-15 09:00', '2026-01-15 12:00', 'completed', 45, 42],
    ['产品发布评审会', '新产品发布前最终评审', '2026-02-20 14:00', '2026-02-20 16:00', 'completed', 20, 20],
    ['年度战略规划会议', '制定2026年度战略规划', '2026-03-10 09:00', '2026-03-10 17:00', 'completed', 30, 28],
    ['技术架构评审会', '新系统架构方案评审', '2026-04-05 10:00', '2026-04-05 12:00', 'completed', 15, 15],
    ['客户需求分析会', '分析大客户需求及应对方案', '2026-05-12 14:00', '2026-05-12 16:00', 'completed', 12, 12],
    ['团队建设活动筹备会', '筹备年中团建活动', '2026-06-01 15:00', '2026-06-01 16:00', 'completed', 8, 8],
    ['2026年中工作总结会议', '上半年工作总结与下半年规划', '2026-07-15 09:00', '2026-07-15 12:00', 'in_progress', 50, 45],
    ['新产品技术研讨会', '新产品技术方案讨论', '2026-08-05 10:00', '2026-08-05 15:00', 'pending', 25, 0],
    ['市场推广策略会议', '制定下半年市场推广策略', '2026-08-10 14:00', '2026-08-10 16:00', 'pending', 18, 0],
    ['供应链优化讨论会', '供应链优化方案讨论', '2026-08-20 09:00', '2026-08-20 11:00', 'pending', 10, 0],
    ['质量管理体系评审', 'ISO质量管理体系年度评审', '2026-09-01 10:00', '2026-09-01 16:00', 'pending', 20, 0],
    ['员工培训计划会议', '制定下半年员工培训计划', '2026-09-10 14:00', '2026-09-10 16:00', 'pending', 15, 0],
    ['财务预算评审会', '2027年度财务预算评审', '2026-10-15 09:00', '2026-10-15 12:00', 'pending', 12, 0],
    ['年度技术大会', '年度技术分享与展望', '2026-11-20 09:00', '2026-11-20 17:00', 'pending', 100, 0],
    ['年终总结表彰大会', '年度总结与优秀员工表彰', '2026-12-28 14:00', '2026-12-28 17:00', 'pending', 200, 0]
  ];
  const stmt = db.prepare(`INSERT INTO meetings (title, agenda, start_time, end_time, status, attendees_count, signed_count) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  meetings.forEach(m => stmt.run(m));
  stmt.finalize();
  console.log(`[Seed] 会议数据: ${meetings.length} 条`);
}

function seedMicrophones() {
  const mics = [];
  const statuses = ['idle', 'speaking', 'muted', 'offline'];
  for (let i = 1; i <= 50; i++) {
    const deviceId = ((i - 1) % 5) + 1;
    const name = `话筒-${String(i).padStart(3, '0')}`;
    const seat = `A${String(i).padStart(2, '0')}`;
    const status = i <= 5 ? 'speaking' : (i <= 15 ? 'idle' : (i <= 40 ? 'muted' : 'offline'));
    const isChairman = i <= 3 ? 1 : 0;
    const volume = 40 + Math.floor(Math.random() * 40);
    mics.push([deviceId, name, seat, status, isChairman, volume]);
  }
  const stmt = db.prepare(`INSERT INTO microphones (device_id, name, seat_number, status, is_chairman, volume) VALUES (?, ?, ?, ?, ?, ?)`);
  mics.forEach(m => stmt.run(m));
  stmt.finalize();
  console.log(`[Seed] 话筒数据: ${mics.length} 条`);
}

function seedLogs() {
  const actions = ['登录系统', '添加设备', '修改设备配置', '删除设备', '创建会议', '更新会议状态', '扫描设备', '导出数据', '备份配置', '恢复配置', '修改话筒状态', '发送协议指令', '连接协议', '断开协议', '创建录播任务', '停止录制', '启动直播', '停止直播', '添加用户', '修改权限'];
  const users = ['admin', 'operator01', 'tech01', 'operator02', 'viewer01'];
  const ips = ['192.168.1.10', '192.168.1.20', '192.168.1.30', '192.168.2.10', '192.168.2.20'];
  const stmt = db.prepare(`INSERT INTO operation_logs (user_id, action, target_type, target_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)`);
  for (let i = 0; i < 80; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const ip = ips[Math.floor(Math.random() * ips.length)];
    const targetType = ['device', 'meeting', 'microphone', 'protocol', 'user', 'system'][Math.floor(Math.random() * 6)];
    const targetId = Math.floor(Math.random() * 30) + 1;
    const details = `${action} - 操作对象ID: ${targetId}`;
    const userId = Math.floor(Math.random() * 5) + 1;
    stmt.run([userId, action, targetType, targetId, details, ip]);
  }
  stmt.finalize();
  console.log(`[Seed] 操作日志: 80 条`);
}

function seedProtocols() {
  const protocols = [
    ['TCP-设备控制', 'TCP', '192.168.1.101', 8080, '', '', '', null, null, null, null, null, null, 'connected', 1, '会议主机TCP控制通道'],
    ['UDP-音频数据', 'UDP', '192.168.1.102', 5004, '', '', '', null, null, null, null, null, null, 'connected', 1, '音频流UDP传输'],
    ['MQTT-状态上报', 'MQTT', 'broker.local', 1883, 'admin', 'mqtt123', 'devices/status', null, null, null, null, null, null, 'connected', 1, '设备状态MQTT上报'],
    ['MQTT-指令下发', 'MQTT', 'broker.local', 1883, 'admin', 'mqtt123', 'devices/cmd', null, null, null, null, null, null, 'connected', 1, '指令MQTT下发通道'],
    ['HTTP-API接口', 'HTTP', '192.168.1.103', 80, '', '', '', null, null, null, null, null, null, 'connected', 1, 'HTTP REST API'],
    ['HTTPS-安全接口', 'HTTPS', '192.168.1.104', 443, '', '', '', null, null, null, null, null, null, 'disconnected', 1, 'HTTPS安全API'],
    ['Modbus-功放控制', 'Modbus', '192.168.1.111', 502, '', '', '', null, null, null, null, 1, 1, 'connected', 1, '数字功放Modbus控制'],
    ['Modbus-混音器', 'Modbus', '192.168.1.107', 502, '', '', '', null, null, null, null, 2, 1, 'connected', 1, '智能混音器Modbus'],
    ['RS232-反馈抑制', 'RS232', '/dev/ttyS0', null, '', '', '', 9600, 8, 1, 'none', 1, null, 'connected', 1, '反馈抑制器RS232'],
    ['RS485-桌牌控制', 'RS485', '/dev/ttyS1', null, '', '', '', 9600, 8, 1, 'even', 1, null, 'connected', 1, '电子桌牌RS485总线'],
    ['RS485-会议主机', 'RS485', '/dev/ttyS2', null, '', '', '', 115200, 8, 1, 'none', 1, null, 'connected', 1, '会议主机RS485'],
    ['Profinet-PLC', 'Profinet', '192.168.1.200', null, '', '', '', null, null, null, null, null, null, 'disconnected', 1, 'PLC Profinet通信'],
    ['TCP-视频矩阵', 'TCP', '192.168.1.150', 5000, '', '', '', null, null, null, null, null, null, 'connected', 1, '视频矩阵TCP控制'],
    ['UDP-设备发现', 'UDP', '0.0.0.0', 3702, '', '', '', null, null, null, null, null, null, 'connected', 1, 'WS-Discovery设备发现'],
    ['HTTP-云平台对接', 'HTTP', 'cloud.api.com', 80, 'apikey', '', '', null, null, null, null, null, null, 'connected', 1, '云平台API对接'],
    ['MQTT-智能家居', 'MQTT', 'home.local', 1883, 'user', 'pass', 'home/+/control', null, null, null, null, null, null, 'disconnected', 1, '智能家居MQTT控制'],
    ['Modbus-电表', 'Modbus', '192.168.1.201', 502, '', '', '', null, null, null, null, 3, 1, 'connected', 1, '智能电表Modbus读取'],
    ['RS232-投影仪', 'RS232', '/dev/ttyS3', null, '', '', '', 9600, 8, 1, 'none', 1, null, 'disconnected', 0, '投影仪RS232控制'],
    ['TCP-门禁系统', 'TCP', '192.168.1.160', 6000, '', '', '', null, null, null, null, null, null, 'connected', 1, '门禁系统TCP'],
    ['UDP-环境监测', 'UDP', '192.168.1.170', 8888, '', '', '', null, null, null, null, null, null, 'connected', 1, '环境传感器UDP上报']
  ];
  const stmt = db.prepare(`INSERT INTO protocol_configs (name, protocol_type, host, port, username, password, topic, baud_rate, data_bits, stop_bits, parity, slave_id, unit_id, config_json, status, is_enabled, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  protocols.forEach(p => stmt.run([...p, null]));
  stmt.finalize();
  console.log(`[Seed] 协议配置: ${protocols.length} 条`);
}

function seedCommands() {
  const commands = [
    ['开机指令', '设备开机', 'TCP', 'digital_conference', 'hex', 'AA BB 01 01 01', 'AA BB 01 01 02', 5000],
    ['关机指令', '设备关机', 'TCP', 'digital_conference', 'hex', 'AA BB 01 01 00', 'AA BB 01 01 03', 5000],
    ['音量调节', '设置输出音量', 'TCP', 'audio_processor', 'hex', 'AA BB 02 05 32', 'AA BB 02 05 00', 3000],
    ['静音控制', '静音/取消静音', 'TCP', 'audio_processor', 'hex', 'AA BB 02 06 01', 'AA BB 02 06 00', 3000],
    ['通道切换', '输入通道切换', 'TCP', 'smart_mixer', 'hex', 'AA BB 03 01 02', 'AA BB 03 01 00', 3000],
    ['读取温度', '读取设备温度', 'Modbus', 'power_amplifier', 'hex', '01 04 00 01 00 01 60 0A', '', 5000],
    ['读取电压', '读取工作电压', 'Modbus', 'power_amplifier', 'hex', '01 04 00 02 00 01 D1 CA', '', 5000],
    ['功率设置', '设置输出功率', 'RS232', 'power_amplifier', 'ascii', 'SET POWER 50', 'OK', 3000],
    ['桌牌内容更新', '更新桌牌显示内容', 'RS485', 'e_nameplate', 'json', '{"cmd":"update","text":"张三"}', '{"code":0}', 5000],
    ['场景切换', '切换预设场景', 'TCP', 'feedback_suppressor', 'hex', 'AA BB 04 01 03', 'AA BB 04 01 00', 3000]
  ];
  const stmt = db.prepare(`INSERT INTO command_templates (name, description, protocol_type, device_type, data_format, command_data, response_data, timeout) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  commands.forEach(c => stmt.run(c));
  stmt.finalize();
  console.log(`[Seed] 指令模板: ${commands.length} 条`);
}

function seedRecordingRooms() {
  const rooms = [
    ['主会场录播室', 'A区主会场', 'rtsp://192.168.1.201/stream1', 'online', '主会场音视频录制与直播'],
    ['分会场录播室', 'B区分会场', 'rtsp://192.168.1.202/stream1', 'online', '分会场音视频录制'],
    ['多功能厅录播室', '多功能厅', 'rtsp://192.168.1.203/stream1', 'offline', '多功能厅活动录制'],
    ['培训室录播室', '培训室', 'rtsp://192.168.1.204/stream1', 'online', '培训课程录制'],
    ['会议室C录播室', 'C区会议室', 'rtsp://192.168.1.205/stream1', 'offline', 'C区会议室录制']
  ];
  const stmt = db.prepare(`INSERT INTO recording_rooms (name, location, ip_address, stream_url, status, description) VALUES (?, ?, ?, ?, ?, ?)`);
  rooms.forEach(r => stmt.run(r));
  stmt.finalize();
  console.log(`[Seed] 录播室: ${rooms.length} 条`);

  // 录制任务
  const tasks = [
    [1, '主会场周录制', 'rtsp://192.168.1.201/stream1', 'recording', 0, 3600, 'mp4', '1080p', 4000, 30],
    [2, '分会场日录制', 'rtsp://192.168.1.202/stream1', 'completed', 1073741824, 7200, 'mp4', '1080p', 4000, 30],
    [4, '培训课程录制', 'rtsp://192.168.1.204/stream1', 'recording', 536870912, 1800, 'mp4', '720p', 2500, 30],
    [1, '主会场备份录制', 'rtsp://192.168.1.201/stream1', 'idle', 0, 0, 'mp4', '1080p', 4000, 30],
    [2, '分会场备份录制', 'rtsp://192.168.1.202/stream1', 'paused', 268435456, 3600, 'mp4', '720p', 2500, 30]
  ];
  const taskStmt = db.prepare(`INSERT INTO recording_tasks (room_id, name, stream_url, status, file_size, duration, format, resolution, bitrate, fps) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  tasks.forEach(t => taskStmt.run(t));
  taskStmt.finalize();
  console.log(`[Seed] 录制任务: ${tasks.length} 条`);

  // 直播频道
  const channels = [
    [1, '主会场直播', 'live-key-001', 'rtmp://push.example.com/live', 'https://play.example.com/live/001', 'live', 150, 120, 'rtmp', '1080p', 4000],
    [2, '分会场直播', 'live-key-002', 'rtmp://push.example.com/live', 'https://play.example.com/live/002', 'offline', 80, 0, 'rtmp', '720p', 2500],
    [4, '培训直播', 'live-key-003', 'rtmp://push.example.com/live', 'https://play.example.com/live/003', 'live', 50, 35, 'rtmp', '1080p', 4000]
  ];
  const chStmt = db.prepare(`INSERT INTO live_channels (room_id, name, stream_key, push_url, pull_url, status, max_viewers, current_viewers, protocol, resolution, bitrate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  channels.forEach(c => chStmt.run(c));
  chStmt.finalize();
  console.log(`[Seed] 直播频道: ${channels.length} 条`);

  // 拉流配置
  const pulls = [
    [1, '主会场摄像头1', 'rtsp://192.168.1.201/stream1', 'rtsp', 'running', 1],
    [1, '主会场摄像头2', 'rtsp://192.168.1.201/stream2', 'rtsp', 'running', 1],
    [2, '分会场摄像头', 'rtsp://192.168.1.202/stream1', 'rtsp', 'running', 1],
    [4, '培训室摄像头', 'rtsp://192.168.1.204/stream1', 'rtsp', 'stopped', 1],
    [3, '多功能厅摄像头', 'rtsp://192.168.1.203/stream1', 'rtsp', 'stopped', 0]
  ];
  const pullStmt = db.prepare(`INSERT INTO pull_streams (room_id, name, source_url, protocol, status, auto_reconnect) VALUES (?, ?, ?, ?, ?, ?)`);
  pulls.forEach(p => pullStmt.run(p));
  pullStmt.finalize();
  console.log(`[Seed] 拉流配置: ${pulls.length} 条`);

  // 推流配置
  const pushes = [
    [1, '推流到CDN', 'rtmp://cdn.example.com/live/key001', 'rtmp', 'running', 1],
    [1, '推流到B站', 'rtmp://live-push.bilivideo.com/live-bvc/?streamname=live_001', 'rtmp', 'stopped', 1],
    [2, '推流到CDN', 'rtmp://cdn.example.com/live/key002', 'rtmp', 'running', 1],
    [4, '推流到YouTube', 'rtmp://a.rtmp.youtube.com/live2/xxxx', 'rtmp', 'stopped', 1]
  ];
  const pushStmt = db.prepare(`INSERT INTO push_streams (room_id, name, target_url, protocol, status, auto_reconnect) VALUES (?, ?, ?, ?, ?, ?)`);
  pushes.forEach(p => pushStmt.run(p));
  pushStmt.finalize();
  console.log(`[Seed] 推流配置: ${pushes.length} 条`);
}

function seedUsers() {
  const users = [
    ['operator01', 'Operator@2026', 'operator', '操作员01'],
    ['operator02', 'Operator@2026', 'operator', '操作员02'],
    ['tech01', 'Tech@2026', 'operator', '技术员01'],
    ['tech02', 'Tech@2026', 'operator', '技术员02'],
    ['viewer01', 'Viewer@2026', 'viewer', '观察员01'],
    ['viewer02', 'Viewer@2026', 'viewer', '观察员02'],
    ['manager01', 'Manager@2026', 'operator', '管理员01'],
    ['guest01', 'Guest@2026', 'viewer', '访客01'],
    ['guest02', 'Guest@2026', 'viewer', '访客02']
  ];
  const stmt = db.prepare(`INSERT OR IGNORE INTO users (username, password, role, display_name) VALUES (?, ?, ?, ?)`);
  users.forEach(u => {
    const hashed = bcrypt.hashSync(u[1], 10);
    stmt.run([u[0], hashed, u[2], u[3]]);
  });
  stmt.finalize();
  console.log(`[Seed] 用户数据: ${users.length} 条`);
}

// 延迟3秒后执行种子填充，确保表结构已创建
setTimeout(seedIfEmpty, 3000);

module.exports = { seedIfEmpty };
