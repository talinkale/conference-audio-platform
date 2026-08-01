/**
 * PostgreSQL 数据库适配层
 * 模拟 sqlite3 的 API 接口，使现有代码无需修改即可在 PostgreSQL 上运行
 */
const { Pool } = require('pg');

// 创建连接池
let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    pool.on('error', (err) => {
      console.error('PostgreSQL 连接池错误:', err.message);
    });
  }
  return pool;
}

/**
 * 将 SQLite 的 ? 占位符转换为 PostgreSQL 的 $1, $2, ... 格式
 */
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * 将 SQLite 特有的 SQL 语法转换为 PostgreSQL 语法
 */
function convertSql(sql) {
  let pgSql = sql;
  
  // AUTOINCREMENT → SERIAL (在 CREATE TABLE 中)
  pgSql = pgSql.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
  
  // julianday 转换（SQLite 特有函数）
  // julianday('now') → EXTRACT(EPOCH FROM now()) / 86400 + 2440587.5
  // (julianday('now') - julianday(col)) * 86400 → EXTRACT(EPOCH FROM (now() - col))
  pgSql = pgSql.replace(/\(julianday\('now'\)\s*-\s*julianday\((\w+)\)\)\s*\*\s*86400/gi, 'EXTRACT(EPOCH FROM (now() - $1))');
  pgSql = pgSql.replace(/julianday\('now'\)/gi, "(EXTRACT(EPOCH FROM now()) / 86400 + 2440587.5)");
  pgSql = pgSql.replace(/julianday\((\w+)\)/gi, "(EXTRACT(EPOCH FROM $1) / 86400 + 2440587.5)");
  
  // INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
  pgSql = pgSql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
  // 需要在末尾添加 ON CONFLICT DO NOTHING（仅对 INSERT OR IGNORE 的情况）
  const wasInsertOrIgnore = /INSERT\s+OR\s+IGNORE/i.test(sql);
  
  // 转换占位符
  pgSql = convertPlaceholders(pgSql);
  
  // 如果是 INSERT 语句且没有 RETURNING，添加 RETURNING id（用于获取 lastID）
  const isInsert = /^INSERT\s+INTO/i.test(pgSql.trim());
  const hasReturning = /RETURNING/i.test(pgSql);
  const hasConflict = /ON\s+CONFLICT/i.test(pgSql);
  
  if (isInsert && !hasReturning) {
    if (wasInsertOrIgnore && !hasConflict) {
      // INSERT OR IGNORE 的情况：添加 ON CONFLICT DO NOTHING
      pgSql = pgSql.replace(/\s*;\s*$/, '') + ' ON CONFLICT DO NOTHING';
    }
    // 添加 RETURNING id 以获取插入的 ID
    pgSql = pgSql.replace(/\s*;\s*$/, '') + ' RETURNING id';
    // 如果有 ON CONFLICT DO NOTHING，RETURNING 可能为空，这是正常的
  }
  
  return pgSql;
}

/**
 * 模拟 sqlite3 的 Database 对象
 */
const db = {
  /**
   * 执行 SQL（不返回数据，类似 db.run）
   * callback 的 this 包含 lastID 和 changes
   */
  run(sql, params, callback) {
    // 处理可选的 params 参数
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    const pgSql = convertSql(sql);
    getPool().query(pgSql, params || [])
      .then(result => {
        const lastID = result.rows[0]?.id || null;
        const changes = result.rowCount || 0;
        if (callback) {
          callback.call({ lastID, changes }, null);
        }
      })
      .catch(err => {
        console.error('SQL Error:', err.message, '\nSQL:', pgSql);
        if (callback) {
          callback.call({}, err);
        }
      });
  },

  /**
   * 查询单行数据
   */
  get(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    const pgSql = convertSql(sql);
    getPool().query(pgSql, params || [])
      .then(result => {
        if (callback) {
          callback(null, result.rows[0] || null);
        }
      })
      .catch(err => {
        console.error('SQL Error:', err.message, '\nSQL:', pgSql);
        if (callback) {
          callback(err, null);
        }
      });
  },

  /**
   * 查询多行数据
   */
  all(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    const pgSql = convertSql(sql);
    getPool().query(pgSql, params || [])
      .then(result => {
        if (callback) {
          callback(null, result.rows);
        }
      })
      .catch(err => {
        console.error('SQL Error:', err.message, '\nSQL:', pgSql);
        if (callback) {
          callback(err, null);
        }
      });
  },

  /**
   * 预处理语句
   */
  prepare(sql) {
    const pgSql = convertSql(sql);
    return {
      run(params) {
        return getPool().query(pgSql, params || [])
          .catch(err => {
            console.error('Prepare SQL Error:', err.message, '\nSQL:', pgSql);
          });
      },
      finalize() {
        // PostgreSQL 不需要显式释放预处理语句
      }
    };
  },

  /**
   * 序列化执行（PostgreSQL 不需要，直接执行）
   */
  serialize(fn) {
    if (fn) fn();
  },

  /**
   * 并行执行
   */
  parallelize(fn) {
    if (fn) fn();
  },

  /**
   * 关闭连接
   */
  close() {
    if (pool) {
      pool.end();
      pool = null;
    }
  }
};

module.exports = db;
