const mongoose = require('mongoose');
require('dotenv').config();

// 构建 MongoDB 连接字符串
// 方式1: 直接使用 MONGODB_URI（推荐）
// 方式2: 使用单独的配置项构建连接字符串
let MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // 如果没有提供完整的 URI，则使用单独的配置项构建
  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || '27017';
  const database = process.env.MONGODB_DATABASE || 'thinkspace';
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  
  if (username && password) {
    // 带认证的连接字符串
    MONGODB_URI = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}?authSource=admin`;
  } else {
    // 无认证的连接字符串（仅用于本地开发，且 MongoDB 未启用认证）
    MONGODB_URI = `mongodb://${host}:${port}/${database}`;
  }
}

const connectDB = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    
    // 如果有用户名和密码，添加认证选项
    if (process.env.MONGODB_USERNAME && process.env.MONGODB_PASSWORD) {
      options.authSource = process.env.MONGODB_AUTH_SOURCE || 'admin';
    }
    
    await mongoose.connect(MONGODB_URI, options);
    console.log('✅ MongoDB 连接成功');
    console.log(`   数据库: ${mongoose.connection.name}`);
    console.log(`   主机: ${mongoose.connection.host}:${mongoose.connection.port}`);
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    console.error('   请检查 .env 文件中的 MongoDB 配置');
    console.error('   连接字符串格式: mongodb://[username:password@]host:port/database');
    process.exit(1);
  }
};

// 监听连接事件
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB 连接已断开');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB 连接错误:', err);
});

module.exports = connectDB;

