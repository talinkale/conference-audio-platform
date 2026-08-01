/**
 * Vercel Serverless Function 入口
 * 将 Express 应用包装为 Vercel Serverless Function
 */
const serverless = require('serverless-http');
const app = require('../server/app');

// 导出 serverless handler
module.exports = serverless(app);
