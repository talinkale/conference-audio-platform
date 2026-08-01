const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static(uploadDir));

// 托管前端构建产物
const webDistDir = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(webDistDir)) {
  app.use(express.static(webDistDir));
  // SPA 路由回退：所有非 API / 非文件请求都返回 index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
      return next();
    }
    res.sendFile(path.join(webDistDir, 'index.html'));
  });
}

// 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ code: 401, message: '未提供访问令牌' });
  }

  const jwt = require('jsonwebtoken');
  const SECRET_KEY = 'conference_audio_platform_secret_key_2026';

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ code: 403, message: '令牌无效或已过期' });
    }
    req.user = user;
    next();
  });
};

// ========== 认证接口 ==========
// 获取用户权限的辅助函数
function getUserPermissions(user, callback) {
  // admin 角色拥有全部权限
  if (user.role === 'admin') {
    db.all('SELECT code FROM permissions', [], (err, perms) => {
      callback(perms ? perms.map(p => p.code) : []);
    });
    return;
  }
  // 其他角色通过 role_permissions 关联表查询
  db.all(
    `SELECT p.code FROM permissions p
     INNER JOIN role_permissions rp ON p.id = rp.permission_id
     INNER JOIN roles r ON rp.role_id = r.id
     WHERE r.name = ?`,
    [user.role],
    (err, perms) => {
      callback(perms ? perms.map(p => p.code) : []);
    }
  );
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const SECRET_KEY = 'conference_audio_platform_secret_key_2026';

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    // 获取用户权限
    getUserPermissions(user, (permissions) => {
      res.json({
        code: 200,
        message: '登录成功',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            displayName: user.display_name,
            permissions
          }
        }
      });
    });
  });
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  db.get('SELECT id, username, role, display_name FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }
    getUserPermissions(user, (permissions) => {
      res.json({ code: 200, data: { ...user, permissions } });
    });
  });
});

// ========== 仪表板接口 ==========
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const stats = {};

  db.get('SELECT COUNT(*) as count FROM devices', [], (err, row) => {
    stats.totalDevices = row ? row.count : 0;

    db.get("SELECT COUNT(*) as count FROM devices WHERE status = 'online'", [], (err, row) => {
      stats.onlineDevices = row ? row.count : 0;

      db.get('SELECT COUNT(*) as count FROM meetings', [], (err, row) => {
        stats.totalMeetings = row ? row.count : 0;

        db.get('SELECT COUNT(*) as count FROM modules', [], (err, row) => {
          stats.totalModules = row ? row.count : 0;

          res.json({ code: 200, data: stats });
        });
      });
    });
  });
});

// ========== 设备管理接口 ==========
app.get('/api/devices', authenticateToken, (req, res) => {
  const { type, status, search } = req.query;
  let sql = 'SELECT * FROM devices WHERE 1=1';
  const params = [];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR ip_address LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY updated_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, data: rows });
  });
});

app.post('/api/devices', authenticateToken, (req, res) => {
  const { name, type, ip_address, mac_address, group_name, location } = req.body;

  db.run(
    'INSERT INTO devices (name, type, ip_address, mac_address, group_name, location, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, type, ip_address, mac_address, group_name, location, 'online'],
    function(err) {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '设备添加成功', data: { id: this.lastID } });
    }
  );
});

app.put('/api/devices/:id', authenticateToken, (req, res) => {
  const { name, ip_address, group_name, location, status } = req.body;

  db.run(
    'UPDATE devices SET name = ?, ip_address = ?, group_name = ?, location = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, ip_address, group_name, location, status, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '设备更新成功' });
    }
  );
});

app.delete('/api/devices/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM devices WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, message: '设备删除成功' });
  });
});

// 扫描设备（模拟）
app.post('/api/devices/scan', authenticateToken, (req, res) => {
  // 模拟扫描过程，返回发现的设备
  const discoveredDevices = [
    { name: '会议主机-01', type: 'digital_conference', ip_address: '192.168.1.101', mac_address: '00:11:22:33:44:51' },
    { name: '桌牌控制器', type: 'e_nameplate', ip_address: '192.168.1.102', mac_address: '00:11:22:33:44:52' },
    { name: '反馈抑制器-A', type: 'feedback_suppressor', ip_address: '192.168.1.103', mac_address: '00:11:22:33:44:53' },
    { name: '智能混音器-M1', type: 'smart_mixer', ip_address: '192.168.1.104', mac_address: '00:11:22:33:44:54' },
    { name: '音频处理器-DSP1', type: 'audio_processor', ip_address: '192.168.1.105', mac_address: '00:11:22:33:44:55' },
    { name: '数字功放-P1', type: 'power_amplifier', ip_address: '192.168.1.106', mac_address: '00:11:22:33:44:56' }
  ];

  res.json({
    code: 200,
    message: '扫描完成',
    data: {
      found: discoveredDevices.length,
      devices: discoveredDevices
    }
  });
});

// ========== 模块管理接口 ==========
app.get('/api/modules', authenticateToken, (req, res) => {
  db.all('SELECT * FROM modules ORDER BY sort_order ASC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, data: rows });
  });
});

app.put('/api/modules/:id/order', authenticateToken, (req, res) => {
  const { sort_order } = req.body;
  db.run('UPDATE modules SET sort_order = ? WHERE id = ?', [sort_order, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, message: '排序更新成功' });
  });
});

app.put('/api/modules/:id/favorite', authenticateToken, (req, res) => {
  const { is_favorite } = req.body;
  db.run('UPDATE modules SET is_favorite = ? WHERE id = ?', [is_favorite ? 1 : 0, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, message: '收藏状态更新成功' });
  });
});

// ========== 配置备份接口 ==========
app.get('/api/backups', authenticateToken, (req, res) => {
  db.all('SELECT * FROM backups ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, data: rows });
  });
});

app.post('/api/backups', authenticateToken, (req, res) => {
  const { name, module_code, config_data } = req.body;
  const filename = `backup_${Date.now()}.json`;
  const filePath = path.join(uploadDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(config_data, null, 2));
  const stats = fs.statSync(filePath);

  db.run(
    'INSERT INTO backups (name, module_code, file_path, file_size) VALUES (?, ?, ?, ?)',
    [name, module_code, filename, stats.size],
    function(err) {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '备份创建成功', data: { id: this.lastID } });
    }
  );
});

app.post('/api/backups/:id/restore', authenticateToken, (req, res) => {
  db.get('SELECT * FROM backups WHERE id = ?', [req.params.id], (err, backup) => {
    if (err || !backup) {
      return res.status(404).json({ code: 404, message: '备份不存在' });
    }

    const filePath = path.join(uploadDir, backup.file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ code: 404, message: '备份文件不存在' });
    }

    try {
      const configData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json({ code: 200, message: '备份恢复成功', data: configData });
    } catch (e) {
      res.status(500).json({ code: 500, message: '备份文件解析失败' });
    }
  });
});

app.delete('/api/backups/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM backups WHERE id = ?', [req.params.id], (err, backup) => {
    if (backup && backup.file_path) {
      const filePath = path.join(uploadDir, backup.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    db.run('DELETE FROM backups WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '备份删除成功' });
    });
  });
});

// ========== 会议管理接口 ==========
app.get('/api/meetings', authenticateToken, (req, res) => {
  db.all('SELECT * FROM meetings ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, data: rows });
  });
});

app.post('/api/meetings', authenticateToken, (req, res) => {
  const { title, agenda, start_time, end_time } = req.body;

  db.run(
    'INSERT INTO meetings (title, agenda, start_time, end_time) VALUES (?, ?, ?, ?)',
    [title, agenda, start_time, end_time],
    function(err) {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '会议创建成功', data: { id: this.lastID } });
    }
  );
});

app.put('/api/meetings/:id', authenticateToken, (req, res) => {
  const { title, agenda, start_time, end_time, status } = req.body;

  db.run(
    'UPDATE meetings SET title = ?, agenda = ?, start_time = ?, end_time = ?, status = ? WHERE id = ?',
    [title, agenda, start_time, end_time, status, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '会议更新成功' });
    }
  );
});

app.delete('/api/meetings/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM meetings WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, message: '会议删除成功' });
  });
});

// ========== 话筒管理接口 ==========
app.get('/api/microphones', authenticateToken, (req, res) => {
  db.all('SELECT m.*, d.name as device_name FROM microphones m LEFT JOIN devices d ON m.device_id = d.id', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, data: rows });
  });
});

app.put('/api/microphones/:id', authenticateToken, (req, res) => {
  const { name, status, volume, is_chairman } = req.body;

  db.run(
    'UPDATE microphones SET name = ?, status = ?, volume = ?, is_chairman = ? WHERE id = ?',
    [name, status, volume, is_chairman ? 1 : 0, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '话筒更新成功' });
    }
  );
});

// ========== 操作日志接口 ==========
app.get('/api/logs', authenticateToken, (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  db.all(
    'SELECT l.*, u.username FROM operation_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT ? OFFSET ?',
    [parseInt(limit), parseInt(offset)],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, data: rows });
    }
  );
});

app.post('/api/logs', authenticateToken, (req, res) => {
  const { action, target_type, target_id, details } = req.body;

  db.run(
    'INSERT INTO operation_logs (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, action, target_type, target_id, details],
    function(err) {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '日志记录成功' });
    }
  );
});

// ========== 固件升级接口 ==========
app.post('/api/firmware/upgrade', authenticateToken, (req, res) => {
  const { device_id, firmware_url } = req.body;

  // 模拟固件升级过程
  res.json({
    code: 200,
    message: '固件升级任务已创建',
    data: {
      task_id: `upgrade_${Date.now()}`,
      status: 'pending',
      progress: 0
    }
  });
});

app.get('/api/firmware/upgrade/:taskId/status', authenticateToken, (req, res) => {
  // 模拟查询升级状态
  res.json({
    code: 200,
    data: {
      task_id: req.params.taskId,
      status: 'completed',
      progress: 100,
      message: '升级成功'
    }
  });
});

// ========== 场景管理接口 ==========
app.get('/api/scenes', authenticateToken, (req, res) => {
  const scenes = [
    { id: 1, name: '标准会议', description: '适用于一般会议场景', devices_count: 6 },
    { id: 2, name: '大型报告', description: '适用于报告厅场景', devices_count: 8 },
    { id: 3, name: '视频会议', description: '适用于远程视频会议', devices_count: 6 },
    { id: 4, name: '培训教学', description: '适用于培训教室场景', devices_count: 5 }
  ];
  res.json({ code: 200, data: scenes });
});

// ========== 协议管理接口 ==========
const ProtocolManager = require('./protocols/manager');

// 获取支持的协议类型
app.get('/api/protocols/types', authenticateToken, (req, res) => {
  res.json({ code: 200, data: ProtocolManager.getProtocolTypes() });
});

// 获取协议配置列表
app.get('/api/protocols', authenticateToken, (req, res) => {
  db.all('SELECT * FROM protocol_configs ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, data: rows });
  });
});

// 创建协议配置
app.post('/api/protocols', authenticateToken, (req, res) => {
  const {
    name, protocol_type, host, port, username, password, topic,
    baud_rate, data_bits, stop_bits, parity, slave_id, unit_id,
    config_json, description
  } = req.body;

  db.run(
    `INSERT INTO protocol_configs (
      name, protocol_type, host, port, username, password, topic,
      baud_rate, data_bits, stop_bits, parity, slave_id, unit_id,
      config_json, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, protocol_type, host, port, username, password, topic,
     baud_rate, data_bits, stop_bits, parity, slave_id, unit_id,
     config_json ? JSON.stringify(config_json) : null, description],
    function(err) {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '协议配置创建成功', data: { id: this.lastID } });
    }
  );
});

// 更新协议配置
app.put('/api/protocols/:id', authenticateToken, (req, res) => {
  const {
    name, host, port, username, password, topic,
    baud_rate, data_bits, stop_bits, parity, slave_id, unit_id,
    config_json, description, is_enabled
  } = req.body;

  db.run(
    `UPDATE protocol_configs SET
      name = ?, host = ?, port = ?, username = ?, password = ?, topic = ?,
      baud_rate = ?, data_bits = ?, stop_bits = ?, parity = ?, slave_id = ?, unit_id = ?,
      config_json = ?, description = ?, is_enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [name, host, port, username, password, topic,
     baud_rate, data_bits, stop_bits, parity, slave_id, unit_id,
     config_json ? JSON.stringify(config_json) : null, description, is_enabled ? 1 : 0, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '协议配置更新成功' });
    }
  );
});

// 删除协议配置
app.delete('/api/protocols/:id', authenticateToken, (req, res) => {
  ProtocolManager.disconnect(req.params.id);
  db.run('DELETE FROM protocol_configs WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, message: '协议配置删除成功' });
  });
});

// 连接协议
app.post('/api/protocols/:id/connect', authenticateToken, async (req, res) => {
  try {
    db.get('SELECT * FROM protocol_configs WHERE id = ?', [req.params.id], async (err, config) => {
      if (err || !config) {
        return res.status(404).json({ code: 404, message: '协议配置不存在' });
      }
      await ProtocolManager.connect(config);
      res.json({ code: 200, message: '连接成功', data: { status: 'connected' } });
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 断开协议连接
app.post('/api/protocols/:id/disconnect', authenticateToken, async (req, res) => {
  try {
    await ProtocolManager.disconnect(req.params.id);
    res.json({ code: 200, message: '已断开连接', data: { status: 'disconnected' } });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 发送数据
app.post('/api/protocols/:id/send', authenticateToken, async (req, res) => {
  try {
    const result = await ProtocolManager.send(req.params.id, req.body);
    res.json({ code: 200, message: '发送成功', data: result });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// 获取协议连接状态
app.get('/api/protocols/:id/status', authenticateToken, (req, res) => {
  const status = ProtocolManager.getConnectionStatus(req.params.id);
  res.json({ code: 200, data: { status } });
});

// 获取协议通信日志
app.get('/api/protocols/:id/logs', authenticateToken, (req, res) => {
  const { limit = 50 } = req.query;
  db.all(
    'SELECT * FROM protocol_logs WHERE protocol_config_id = ? ORDER BY created_at DESC LIMIT ?',
    [req.params.id, parseInt(limit)],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, data: rows });
    }
  );
});

// ========== 指令模板接口 ==========
app.get('/api/commands', authenticateToken, (req, res) => {
  const { protocol_type, device_type } = req.query;
  let sql = 'SELECT * FROM command_templates WHERE 1=1';
  const params = [];

  if (protocol_type) {
    sql += ' AND protocol_type = ?';
    params.push(protocol_type);
  }
  if (device_type) {
    sql += ' AND device_type = ?';
    params.push(device_type);
  }
  sql += ' AND is_enabled = 1 ORDER BY sort_order ASC, created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, data: rows });
  });
});

app.post('/api/commands', authenticateToken, (req, res) => {
  const {
    name, description, protocol_type, device_type,
    data_format, command_data, response_data, timeout
  } = req.body;

  db.run(
    `INSERT INTO command_templates (name, description, protocol_type, device_type, data_format, command_data, response_data, timeout)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, description, protocol_type, device_type, data_format || 'hex', command_data, response_data, timeout || 5000],
    function(err) {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '指令模板创建成功', data: { id: this.lastID } });
    }
  );
});

app.put('/api/commands/:id', authenticateToken, (req, res) => {
  const {
    name, description, protocol_type, device_type,
    data_format, command_data, response_data, timeout, is_enabled
  } = req.body;

  db.run(
    `UPDATE command_templates SET
      name = ?, description = ?, protocol_type = ?, device_type = ?,
      data_format = ?, command_data = ?, response_data = ?, timeout = ?, is_enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [name, description, protocol_type, device_type, data_format, command_data, response_data, timeout, is_enabled ? 1 : 0, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '指令模板更新成功' });
    }
  );
});

app.delete('/api/commands/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM command_templates WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, message: '指令模板删除成功' });
  });
});

// 使用指令模板发送数据
app.post('/api/protocols/:id/send-command', authenticateToken, async (req, res) => {
  try {
    db.get('SELECT * FROM command_templates WHERE id = ?', [req.body.commandId], async (err, cmd) => {
      if (err || !cmd) {
        return res.status(404).json({ code: 404, message: '指令模板不存在' });
      }

      let payload;
      if (cmd.data_format === 'hex') {
        const hexStr = cmd.command_data.replace(/\s/g, '');
        payload = Buffer.from(hexStr, 'hex').toString('base64');
      } else {
        payload = cmd.command_data;
      }

      const result = await ProtocolManager.send(req.params.id, payload);
      res.json({ code: 200, message: '指令发送成功', data: result });
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ========== 录播管理接口 ==========

// ---- 录播室管理 ----
app.get('/api/recording-rooms', authenticateToken, (req, res) => {
  const { status, search } = req.query;
  let sql = 'SELECT * FROM recording_rooms WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) { sql += ' AND (name LIKE ? OR location LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY created_at DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, data: rows });
  });
});

app.post('/api/recording-rooms', authenticateToken, (req, res) => {
  const { name, location, ip_address, stream_url, config_json, description } = req.body;
  db.run(
    'INSERT INTO recording_rooms (name, location, ip_address, stream_url, config_json, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, location, ip_address, stream_url, config_json ? JSON.stringify(config_json) : null, description, 'offline'],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '录播室创建成功', data: { id: this.lastID } });
    }
  );
});

app.put('/api/recording-rooms/:id', authenticateToken, (req, res) => {
  const { name, location, ip_address, stream_url, config_json, description, status } = req.body;
  db.run(
    `UPDATE recording_rooms SET name=?, location=?, ip_address=?, stream_url=?, config_json=?, description=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [name, location, ip_address, stream_url, config_json ? JSON.stringify(config_json) : null, description, status, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '录播室更新成功' });
    }
  );
});

app.delete('/api/recording-rooms/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM recording_rooms WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '录播室删除成功' });
  });
});

// ---- 录制任务管理 ----
app.get('/api/recording-tasks', authenticateToken, (req, res) => {
  const { room_id, status, search } = req.query;
  let sql = 'SELECT t.*, r.name as room_name FROM recording_tasks t LEFT JOIN recording_rooms r ON t.room_id = r.id WHERE 1=1';
  const params = [];
  if (room_id) { sql += ' AND t.room_id = ?'; params.push(room_id); }
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (search) { sql += ' AND t.name LIKE ?'; params.push(`%${search}%`); }
  sql += ' ORDER BY t.created_at DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, data: rows });
  });
});

app.post('/api/recording-tasks', authenticateToken, (req, res) => {
  const { room_id, name, stream_url, format, resolution, bitrate, fps } = req.body;
  db.run(
    'INSERT INTO recording_tasks (room_id, name, stream_url, format, resolution, bitrate, fps, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [room_id, name, stream_url, format || 'mp4', resolution || '1080p', bitrate || 4000, fps || 30, 'idle'],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '录制任务创建成功', data: { id: this.lastID } });
    }
  );
});

app.put('/api/recording-tasks/:id', authenticateToken, (req, res) => {
  const { name, stream_url, format, resolution, bitrate, fps } = req.body;
  db.run(
    `UPDATE recording_tasks SET name=?, stream_url=?, format=?, resolution=?, bitrate=?, fps=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [name, stream_url, format, resolution, bitrate, fps, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '录制任务更新成功' });
    }
  );
});

app.delete('/api/recording-tasks/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM recording_tasks WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '录制任务删除成功' });
  });
});

// 开始录制
app.post('/api/recording-tasks/:id/start', authenticateToken, (req, res) => {
  db.run(
    `UPDATE recording_tasks SET status='recording', started_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [req.params.id],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '录制已开始', data: { status: 'recording' } });
    }
  );
});

// 停止录制
app.post('/api/recording-tasks/:id/stop', authenticateToken, (req, res) => {
  db.run(
    `UPDATE recording_tasks SET status='stopped', stopped_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP, duration=(SELECT CAST((julianday('now') - julianday(started_at)) * 86400 AS INTEGER) FROM recording_tasks WHERE id=?), file_size=? WHERE id=?`,
    [req.params.id, Math.floor(Math.random() * 500000000) + 10000000, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '录制已停止', data: { status: 'stopped' } });
    }
  );
});

// 暂停录制
app.post('/api/recording-tasks/:id/pause', authenticateToken, (req, res) => {
  db.run('UPDATE recording_tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['paused', req.params.id], function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '录制已暂停' });
  });
});

// ---- 直播频道管理 ----
app.get('/api/live-channels', authenticateToken, (req, res) => {
  const { room_id, status, search } = req.query;
  let sql = 'SELECT c.*, r.name as room_name FROM live_channels c LEFT JOIN recording_rooms r ON c.room_id = r.id WHERE 1=1';
  const params = [];
  if (room_id) { sql += ' AND c.room_id = ?'; params.push(room_id); }
  if (status) { sql += ' AND c.status = ?'; params.push(status); }
  if (search) { sql += ' AND c.name LIKE ?'; params.push(`%${search}%`); }
  sql += ' ORDER BY c.created_at DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, data: rows });
  });
});

app.post('/api/live-channels', authenticateToken, (req, res) => {
  const { room_id, name, stream_key, push_url, pull_url, protocol, resolution, bitrate } = req.body;
  db.run(
    'INSERT INTO live_channels (room_id, name, stream_key, push_url, pull_url, protocol, resolution, bitrate, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [room_id, name, stream_key || `live_${Date.now()}`, push_url, pull_url, protocol || 'rtmp', resolution || '1080p', bitrate || 4000, 'offline'],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '直播频道创建成功', data: { id: this.lastID } });
    }
  );
});

app.put('/api/live-channels/:id', authenticateToken, (req, res) => {
  const { name, stream_key, push_url, pull_url, protocol, resolution, bitrate } = req.body;
  db.run(
    `UPDATE live_channels SET name=?, stream_key=?, push_url=?, pull_url=?, protocol=?, resolution=?, bitrate=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [name, stream_key, push_url, pull_url, protocol, resolution, bitrate, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '直播频道更新成功' });
    }
  );
});

app.delete('/api/live-channels/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM live_channels WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '直播频道删除成功' });
  });
});

// 开始直播
app.post('/api/live-channels/:id/start', authenticateToken, (req, res) => {
  db.run(
    `UPDATE live_channels SET status='live', started_at=CURRENT_TIMESTAMP, current_viewers=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [Math.floor(Math.random() * 50) + 1, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '直播已开始', data: { status: 'live' } });
    }
  );
});

// 停止直播
app.post('/api/live-channels/:id/stop', authenticateToken, (req, res) => {
  db.run(
    `UPDATE live_channels SET status='ended', current_viewers=0, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [req.params.id],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '直播已结束', data: { status: 'ended' } });
    }
  );
});

// ---- 拉流管理 ----
app.get('/api/pull-streams', authenticateToken, (req, res) => {
  const { room_id, status } = req.query;
  let sql = 'SELECT p.*, r.name as room_name FROM pull_streams p LEFT JOIN recording_rooms r ON p.room_id = r.id WHERE 1=1';
  const params = [];
  if (room_id) { sql += ' AND p.room_id = ?'; params.push(room_id); }
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  sql += ' ORDER BY p.created_at DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, data: rows });
  });
});

app.post('/api/pull-streams', authenticateToken, (req, res) => {
  const { room_id, name, source_url, protocol, auto_reconnect, config_json } = req.body;
  db.run(
    'INSERT INTO pull_streams (room_id, name, source_url, protocol, auto_reconnect, config_json, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [room_id, name, source_url, protocol || 'rtsp', auto_reconnect !== undefined ? (auto_reconnect ? 1 : 0) : 1, config_json ? JSON.stringify(config_json) : null, 'stopped'],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '拉流配置创建成功', data: { id: this.lastID } });
    }
  );
});

app.put('/api/pull-streams/:id', authenticateToken, (req, res) => {
  const { name, source_url, protocol, auto_reconnect, config_json } = req.body;
  db.run(
    `UPDATE pull_streams SET name=?, source_url=?, protocol=?, auto_reconnect=?, config_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [name, source_url, protocol, auto_reconnect ? 1 : 0, config_json ? JSON.stringify(config_json) : null, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '拉流配置更新成功' });
    }
  );
});

app.delete('/api/pull-streams/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM pull_streams WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '拉流配置删除成功' });
  });
});

// 开始拉流
app.post('/api/pull-streams/:id/start', authenticateToken, (req, res) => {
  db.run('UPDATE pull_streams SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['pulling', req.params.id], function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '拉流已开始', data: { status: 'pulling' } });
  });
});

// 停止拉流
app.post('/api/pull-streams/:id/stop', authenticateToken, (req, res) => {
  db.run('UPDATE pull_streams SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['stopped', req.params.id], function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '拉流已停止', data: { status: 'stopped' } });
  });
});

// ---- 推流管理 ----
app.get('/api/push-streams', authenticateToken, (req, res) => {
  const { room_id, status } = req.query;
  let sql = 'SELECT p.*, r.name as room_name FROM push_streams p LEFT JOIN recording_rooms r ON p.room_id = r.id WHERE 1=1';
  const params = [];
  if (room_id) { sql += ' AND p.room_id = ?'; params.push(room_id); }
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  sql += ' ORDER BY p.created_at DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, data: rows });
  });
});

app.post('/api/push-streams', authenticateToken, (req, res) => {
  const { room_id, name, target_url, protocol, auto_reconnect, config_json } = req.body;
  db.run(
    'INSERT INTO push_streams (room_id, name, target_url, protocol, auto_reconnect, config_json, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [room_id, name, target_url, protocol || 'rtmp', auto_reconnect !== undefined ? (auto_reconnect ? 1 : 0) : 1, config_json ? JSON.stringify(config_json) : null, 'stopped'],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '推流配置创建成功', data: { id: this.lastID } });
    }
  );
});

app.put('/api/push-streams/:id', authenticateToken, (req, res) => {
  const { name, target_url, protocol, auto_reconnect, config_json } = req.body;
  db.run(
    `UPDATE push_streams SET name=?, target_url=?, protocol=?, auto_reconnect=?, config_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [name, target_url, protocol, auto_reconnect ? 1 : 0, config_json ? JSON.stringify(config_json) : null, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, message: '推流配置更新成功' });
    }
  );
});

app.delete('/api/push-streams/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM push_streams WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '推流配置删除成功' });
  });
});

// 开始推流
app.post('/api/push-streams/:id/start', authenticateToken, (req, res) => {
  db.run('UPDATE push_streams SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['pushing', req.params.id], function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '推流已开始', data: { status: 'pushing' } });
  });
});

// 停止推流
app.post('/api/push-streams/:id/stop', authenticateToken, (req, res) => {
  db.run('UPDATE push_streams SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['stopped', req.params.id], function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '推流已停止', data: { status: 'stopped' } });
  });
});

// ========== 用户管理接口 ==========
app.get('/api/users', authenticateToken, (req, res) => {
  db.all('SELECT id, username, role, display_name, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, data: rows });
  });
});

app.post('/api/users', authenticateToken, (req, res) => {
  const { username, password, role, display_name } = req.body;
  if (!username || !password) return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run(
    'INSERT INTO users (username, password, role, display_name) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, role || 'viewer', display_name || ''],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ code: 400, message: '用户名已存在' });
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '用户创建成功', data: { id: this.lastID } });
    }
  );
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
  const { username, role, display_name, password } = req.body;
  const bcrypt = require('bcryptjs');
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(
      'UPDATE users SET username=?, role=?, display_name=?, password=? WHERE id=?',
      [username, role, display_name, hashedPassword, req.params.id],
      function(err) {
        if (err) return res.status(500).json({ code: 500, message: err.message });
        res.json({ code: 200, message: '用户更新成功' });
      }
    );
  } else {
    db.run(
      'UPDATE users SET username=?, role=?, display_name=? WHERE id=?',
      [username, role, display_name, req.params.id],
      function(err) {
        if (err) return res.status(500).json({ code: 500, message: err.message });
        res.json({ code: 200, message: '用户更新成功' });
      }
    );
  }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ code: 400, message: '不能删除当前登录用户' });
  }
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '用户删除成功' });
  });
});

// ========== 角色管理接口 ==========
app.get('/api/roles', authenticateToken, (req, res) => {
  db.all('SELECT * FROM roles ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, data: rows });
  });
});

app.post('/api/roles', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ code: 400, message: '角色名称不能为空' });
  db.run(
    'INSERT INTO roles (name, description) VALUES (?, ?)',
    [name, description || ''],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ code: 400, message: '角色名称已存在' });
        return res.status(500).json({ code: 500, message: err.message });
      }
      res.json({ code: 200, message: '角色创建成功', data: { id: this.lastID } });
    }
  );
});

app.put('/api/roles/:id', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  db.run('UPDATE roles SET name=?, description=? WHERE id=?', [name, description, req.params.id], function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '角色更新成功' });
  });
});

app.delete('/api/roles/:id', authenticateToken, (req, res) => {
  db.get('SELECT is_system FROM roles WHERE id = ?', [req.params.id], (err, role) => {
    if (err || !role) return res.status(404).json({ code: 404, message: '角色不存在' });
    if (role.is_system) return res.status(400).json({ code: 400, message: '系统角色不可删除' });
    db.run('DELETE FROM roles WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      db.run('DELETE FROM role_permissions WHERE role_id = ?', [req.params.id]);
      res.json({ code: 200, message: '角色删除成功' });
    });
  });
});

// 获取角色权限列表
app.get('/api/roles/:id/permissions', authenticateToken, (req, res) => {
  db.all(
    `SELECT p.* FROM permissions p
     INNER JOIN role_permissions rp ON p.id = rp.permission_id
     WHERE rp.role_id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      res.json({ code: 200, data: rows });
    }
  );
});

// 分配角色权限
app.put('/api/roles/:id/permissions', authenticateToken, (req, res) => {
  const { permission_ids } = req.body;
  db.serialize(() => {
    db.run('DELETE FROM role_permissions WHERE role_id = ?', [req.params.id]);
    if (permission_ids && permission_ids.length > 0) {
      const stmt = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
      permission_ids.forEach(pid => stmt.run([req.params.id, pid]));
      stmt.finalize();
    }
    res.json({ code: 200, message: '权限分配成功' });
  });
});

// ========== 权限管理接口 ==========
app.get('/api/permissions', authenticateToken, (req, res) => {
  db.all('SELECT * FROM permissions ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, data: rows });
  });
});

// ========== 系统信息接口 ==========
app.get('/api/system/info', authenticateToken, (req, res) => {
  res.json({
    code: 200,
    data: {
      name: '会议音视频综合管理平台',
      version: '1.0.0',
      build_date: '2026-07-21',
      server_time: new Date().toISOString(),
      supported_languages: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR']
    }
  });
});

// ========== 部署配置接口 ==========
// 获取部署配置
app.get('/api/deploy/config', authenticateToken, (req, res) => {
  db.get('SELECT * FROM deploy_configs WHERE id = 1', [], (err, row) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    if (!row) {
      return res.json({ code: 200, data: { subdomain: 'platform', domain: 'talinkale.com', port: 80, status: 'pending' } });
    }
    res.json({ code: 200, data: row });
  });
});

// 更新部署配置（二级域名编辑）
app.put('/api/deploy/config', authenticateToken, (req, res) => {
  const { subdomain, domain, port, ssl_enabled, ssl_cert_path, ssl_key_path, server_ip, deploy_type } = req.body;

  // 验证二级域名格式
  if (subdomain) {
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      return res.status(400).json({ code: 400, message: '二级域名格式无效，仅支持小写字母、数字和连字符' });
    }
  }

  db.run(
    `UPDATE deploy_configs SET
      subdomain = COALESCE(?, subdomain),
      domain = COALESCE(?, domain),
      port = COALESCE(?, port),
      ssl_enabled = COALESCE(?, ssl_enabled),
      ssl_cert_path = COALESCE(?, ssl_cert_path),
      ssl_key_path = COALESCE(?, ssl_key_path),
      server_ip = COALESCE(?, server_ip),
      deploy_type = COALESCE(?, deploy_type),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1`,
    [subdomain, domain, port, ssl_enabled !== undefined ? (ssl_enabled ? 1 : 0) : null, ssl_cert_path, ssl_key_path, server_ip, deploy_type],
    function(err) {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      // 返回更新后的配置
      db.get('SELECT * FROM deploy_configs WHERE id = 1', [], (err, row) => {
        const fullDomain = `${row.subdomain}.${row.domain}`;
        res.json({
          code: 200,
          message: '部署配置已更新',
          data: { ...row, full_domain: fullDomain }
        });
      });
    }
  );
});

// 生成部署指令
app.post('/api/deploy/generate', authenticateToken, (req, res) => {
  db.get('SELECT * FROM deploy_configs WHERE id = 1', [], (err, config) => {
    if (err || !config) {
      return res.status(404).json({ code: 404, message: '部署配置不存在' });
    }

    const fullDomain = `${config.subdomain}.${config.domain}`;
    const isWindows = process.platform === 'win32';
    const scriptExt = isWindows ? 'ps1' : 'sh';

    const commands = {
      build: `docker-compose build`,
      up: isWindows
        ? `powershell -ExecutionPolicy Bypass -File deploy/deploy.${scriptExt} -Subdomain ${config.subdomain} -Domain ${config.domain} -Action up`
        : `./deploy/deploy.${scriptExt} ${config.subdomain} ${config.domain} up`,
      down: isWindows
        ? `powershell -ExecutionPolicy Bypass -File deploy/deploy.${scriptExt} -Action down`
        : `./deploy/deploy.${scriptExt} ${config.subdomain} ${config.domain} down`,
      logs: `docker-compose logs -f`,
      status: `docker-compose ps`,
      nginx_test: `docker exec conference-platform nginx -t`,
      ssl_certbot: `docker exec conference-platform certbot --nginx -d ${fullDomain} --non-interactive --agree-tos -m admin@${config.domain}`,
      full_deploy: isWindows
        ? `# 1. 构建并部署\npowershell -ExecutionPolicy Bypass -File deploy/deploy.${scriptExt} -Subdomain ${config.subdomain} -Domain ${config.domain} -Action all\n\n# 2. DNS 解析配置\n# 请在域名服务商处添加 A 记录：\n#   ${config.subdomain}.${config.domain} -> <服务器IP>`
        : `# 1. 构建并部署\nchmod +x deploy/deploy.sh\n./deploy/deploy.sh ${config.subdomain} ${config.domain} all\n\n# 2. DNS 解析配置\n# 请在域名服务商处添加 A 记录：\n#   ${config.subdomain}.${config.domain} -> <服务器IP>`
    };

    // 更新部署状态
    db.run(
      `UPDATE deploy_configs SET status = 'deploying', updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
      [],
      function() {
        res.json({
          code: 200,
          message: '部署指令已生成',
          data: {
            config: { ...config, full_domain: fullDomain },
            commands,
            dns_record: {
              type: 'A',
              host: config.subdomain,
              value: config.server_ip || '<服务器IP>',
              ttl: 600
            },
            docker_compose_env: `SUBDOMAIN=${config.subdomain}\nDOMAIN=${config.domain}\nPORT=${config.port || 80}`
          }
        });
      }
    );
  });
});

// 更新部署状态
app.put('/api/deploy/status', authenticateToken, (req, res) => {
  const { status, server_ip } = req.body;
  const validStatus = ['pending', 'deploying', 'running', 'stopped', 'failed'];
  if (status && !validStatus.includes(status)) {
    return res.status(400).json({ code: 400, message: '无效的部署状态' });
  }

  const updates = [];
  const params = [];
  if (status) { updates.push('status = ?'); params.push(status); }
  if (server_ip) { updates.push('server_ip = ?'); params.push(server_ip); }
  if (status === 'running') { updates.push('last_deployed_at = CURRENT_TIMESTAMP'); }
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(1);

  db.run(`UPDATE deploy_configs SET ${updates.join(', ')} WHERE id = 1`, params, function(err) {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: '部署状态已更新' });
  });
});

// 健康检查（含隧道URL）
app.get('/api/health', (req, res) => {
  let tunnelUrl = null;
  const urlFile = path.join(__dirname, 'data', 'tunnel-url.txt');
  if (fs.existsSync(urlFile)) {
    tunnelUrl = fs.readFileSync(urlFile, 'utf8').trim();
  }
  res.json({ code: 200, status: 'ok', timestamp: new Date().toISOString(), tunnel_url: tunnelUrl });
});

// 获取当前公网访问地址（无需认证）
app.get('/api/tunnel-url', (req, res) => {
  let tunnelUrl = null;
  const urlFile = path.join(__dirname, 'data', 'tunnel-url.txt');
  if (fs.existsSync(urlFile)) {
    tunnelUrl = fs.readFileSync(urlFile, 'utf8').trim();
  }
  res.json({ code: 200, url: tunnelUrl, platform: 'Cloudflare Tunnel', warning_page: false });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

// 云端部署：自动种子数据
require('./seed');

// 启动 HTTP 服务
// - Vercel Serverless 环境不启动（由 serverless-http 处理）
// - 本地和 Render 等传统部署环境都启动
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`会议音频综合管理平台服务端已启动`);
    console.log(`监听端口: ${PORT}`);
    console.log(`API地址: http://localhost:${PORT}/api`);
    console.log(`数据库: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
  });
}

module.exports = app;
