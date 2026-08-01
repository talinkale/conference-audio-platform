const path = require('path');
const fs = require('fs');

// 数据库类型选择：有 DATABASE_URL 环境变量时用 PostgreSQL，否则用 SQLite
const usePostgres = !!process.env.DATABASE_URL;

let db;

if (usePostgres) {
  // ===== PostgreSQL 模式（云端部署）=====
  console.log('[DB] 使用 PostgreSQL 数据库');
  db = require('./db-pg');
  // 立即初始化表结构（serverless 环境中 setTimeout 可能不执行）
  initTables();
} else {
  // ===== SQLite 模式（本地开发）=====
  try {
    const sqlite3 = require('sqlite3').verbose();
    const DATA_DIR = path.join(__dirname, 'data');
    const DB_PATH = path.join(DATA_DIR, 'conference.db');

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('数据库连接失败:', err.message);
      } else {
        console.log('已连接到 SQLite 数据库');
        initTables();
      }
    });
  } catch (e) {
    console.error('[DB] sqlite3 模块未安装。请设置 DATABASE_URL 环境变量以使用 PostgreSQL，或安装 sqlite3: npm install sqlite3');
    // 提供一个空操作数据库对象，防止应用崩溃
    db = {
      run: (sql, params, cb) => { if (typeof params === 'function') cb = params; cb && cb.call({}, new Error('数据库不可用')); },
      get: (sql, params, cb) => { if (typeof params === 'function') cb = params; cb && cb(new Error('数据库不可用'), null); },
      all: (sql, params, cb) => { if (typeof params === 'function') cb = params; cb && cb(new Error('数据库不可用'), []); },
      serialize: (fn) => { if (fn) fn(); },
      parallelize: (fn) => { if (fn) fn(); },
      prepare: () => ({ run: () => {}, finalize: () => {} }),
      close: () => {}
    };
  }
}

function initTables() {
  db.serialize(() => {
    // 用户表
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'operator',
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 设备表
    db.run(`CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      ip_address TEXT,
      mac_address TEXT,
      status TEXT DEFAULT 'offline',
      firmware_version TEXT,
      hardware_version TEXT,
      group_name TEXT,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 模块表
    db.run(`CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      version TEXT,
      icon TEXT,
      status TEXT DEFAULT 'installed',
      sort_order INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      download_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 配置备份表
    db.run(`CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      module_code TEXT,
      file_path TEXT,
      file_size INTEGER,
      is_cloud INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 会议表
    db.run(`CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      agenda TEXT,
      start_time DATETIME,
      end_time DATETIME,
      status TEXT DEFAULT 'pending',
      attendees_count INTEGER DEFAULT 0,
      signed_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 话筒表
    db.run(`CREATE TABLE IF NOT EXISTS microphones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER,
      name TEXT,
      seat_number TEXT,
      status TEXT DEFAULT 'idle',
      is_chairman INTEGER DEFAULT 0,
      volume INTEGER DEFAULT 50,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 操作日志表
    db.run(`CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 协议配置表
    db.run(`CREATE TABLE IF NOT EXISTS protocol_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      protocol_type TEXT NOT NULL,
      host TEXT,
      port INTEGER,
      username TEXT,
      password TEXT,
      topic TEXT,
      baud_rate INTEGER,
      data_bits INTEGER,
      stop_bits INTEGER,
      parity TEXT,
      slave_id INTEGER,
      unit_id INTEGER,
      config_json TEXT,
      status TEXT DEFAULT 'disconnected',
      is_enabled INTEGER DEFAULT 1,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 协议通信日志表
    db.run(`CREATE TABLE IF NOT EXISTS protocol_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocol_config_id INTEGER,
      direction TEXT NOT NULL,
      data TEXT,
      hex_data TEXT,
      message_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 指令模板表
    db.run(`CREATE TABLE IF NOT EXISTS command_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      protocol_type TEXT NOT NULL,
      device_type TEXT,
      data_format TEXT DEFAULT 'hex',
      command_data TEXT NOT NULL,
      response_data TEXT,
      timeout INTEGER DEFAULT 5000,
      is_enabled INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 录播室表
    db.run(`CREATE TABLE IF NOT EXISTS recording_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      ip_address TEXT,
      status TEXT DEFAULT 'offline',
      stream_url TEXT,
      config_json TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 录制任务表
    db.run(`CREATE TABLE IF NOT EXISTS recording_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      name TEXT NOT NULL,
      stream_url TEXT,
      status TEXT DEFAULT 'idle',
      file_path TEXT,
      file_size INTEGER DEFAULT 0,
      duration INTEGER DEFAULT 0,
      format TEXT DEFAULT 'mp4',
      resolution TEXT DEFAULT '1080p',
      bitrate INTEGER DEFAULT 4000,
      fps INTEGER DEFAULT 30,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      stopped_at DATETIME
    )`);

    // 直播频道表
    db.run(`CREATE TABLE IF NOT EXISTS live_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      name TEXT NOT NULL,
      stream_key TEXT,
      push_url TEXT,
      pull_url TEXT,
      status TEXT DEFAULT 'offline',
      max_viewers INTEGER DEFAULT 0,
      current_viewers INTEGER DEFAULT 0,
      protocol TEXT DEFAULT 'rtmp',
      resolution TEXT DEFAULT '1080p',
      bitrate INTEGER DEFAULT 4000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME
    )`);

    // 拉流配置表
    db.run(`CREATE TABLE IF NOT EXISTS pull_streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      protocol TEXT DEFAULT 'rtsp',
      status TEXT DEFAULT 'stopped',
      auto_reconnect INTEGER DEFAULT 1,
      config_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 推流配置表
    db.run(`CREATE TABLE IF NOT EXISTS push_streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      name TEXT NOT NULL,
      target_url TEXT NOT NULL,
      protocol TEXT DEFAULT 'rtmp',
      status TEXT DEFAULT 'stopped',
      auto_reconnect INTEGER DEFAULT 1,
      config_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 初始化默认用户
    const bcrypt = require('bcryptjs');
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, role, display_name) VALUES (?, ?, ?, ?)`,
      ['admin', defaultPassword, 'admin', '系统管理员']);

    // 角色表
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      is_system INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 权限表
    db.run(`CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      module TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 角色权限关联表
    db.run(`CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      PRIMARY KEY (role_id, permission_id)
    )`);

    // 部署配置表
    db.run(`CREATE TABLE IF NOT EXISTS deploy_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subdomain TEXT NOT NULL DEFAULT 'platform',
      domain TEXT NOT NULL DEFAULT 'talinkale.com',
      port INTEGER DEFAULT 80,
      ssl_enabled INTEGER DEFAULT 0,
      ssl_cert_path TEXT,
      ssl_key_path TEXT,
      status TEXT DEFAULT 'pending',
      server_ip TEXT,
      deploy_type TEXT DEFAULT 'docker',
      config_json TEXT,
      last_deployed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 初始化默认部署配置
    db.run(`INSERT OR IGNORE INTO deploy_configs (id, subdomain, domain, status) VALUES (1, 'platform', 'talinkale.com', 'pending')`);

    // 初始化默认角色
    db.run(`INSERT OR IGNORE INTO roles (name, description, is_system) VALUES ('admin', '系统管理员，拥有全部权限', 1)`);
    db.run(`INSERT OR IGNORE INTO roles (name, description, is_system) VALUES ('operator', '操作员，可管理设备和会议', 0)`);
    db.run(`INSERT OR IGNORE INTO roles (name, description, is_system) VALUES ('viewer', '观察者，仅可查看', 0)`);

    // 初始化默认权限（对应各功能模块）
    const defaultPermissions = [
      ['dashboard', '仪表板', 'dashboard', '查看系统仪表板'],
      ['devices', '设备管理', 'devices', '设备增删改查、扫描、固件升级'],
      ['protocols', '协议管理', 'protocols', '协议配置与连接管理'],
      ['commands', '指令模板', 'commands', '指令模板管理'],
      ['modules', '模块管理', 'modules', '功能模块排序与收藏'],
      ['meetings', '会议管理', 'meetings', '会议创建与管理'],
      ['microphones', '话筒管理', 'microphones', '话筒状态与控制'],
      ['recording', '录播管理', 'recording', '录播室、录制、直播、拉流推流管理'],
      ['backups', '配置备份', 'backups', '系统配置备份与恢复'],
      ['scenes', '场景管理', 'scenes', '场景预设与应用'],
      ['logs', '操作日志', 'logs', '操作日志查询'],
      ['settings', '系统设置', 'settings', '系统参数设置'],
      ['users', '用户管理', 'users', '用户账号管理'],
      ['roles', '角色管理', 'roles', '角色与权限分配'],
      ['deploy', '部署管理', 'deploy', '云平台部署与域名配置']
    ];
    const permStmt = db.prepare(`INSERT OR IGNORE INTO permissions (code, name, module, description) VALUES (?, ?, ?, ?)`);
    defaultPermissions.forEach(p => permStmt.run(p));
    permStmt.finalize();

    // 为 admin 角色分配全部权限
    db.all('SELECT id FROM permissions', [], (err, perms) => {
      if (perms && perms.length > 0) {
        db.get("SELECT id FROM roles WHERE name = 'admin'", [], (err, adminRole) => {
          if (adminRole) {
            const rpStmt = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
            perms.forEach(p => rpStmt.run([adminRole.id, p.id]));
            rpStmt.finalize();
          }
        });
      }
    });

    // 初始化默认模块
    const defaultModules = [
      ['全数字会议系统', 'digital_conference', '会议签到、表决、话筒管理', '1.0.0', '1'],
      ['电子桌牌系统', 'e_nameplate', '桌牌内容编辑、显示控制', '1.0.0', '2'],
      ['反馈抑制器', 'feedback_suppressor', 'AFC参数、场景切换', '1.0.0', '3'],
      ['智能混音器', 'smart_mixer', '混音参数、场景管理', '1.0.0', '4'],
      ['数字音频处理器', 'audio_processor', 'EQ、分频、矩阵配置', '1.0.0', '5'],
      ['智控数字专业功放', 'power_amplifier', '功率监控、通道开关', '1.0.0', '6']
    ];

    const stmt = db.prepare(`INSERT OR IGNORE INTO modules (name, code, description, version, sort_order) VALUES (?, ?, ?, ?, ?)`);
    defaultModules.forEach(m => stmt.run(m));
    stmt.finalize();

    console.log('数据库表初始化完成');
  });
}

module.exports = db;
