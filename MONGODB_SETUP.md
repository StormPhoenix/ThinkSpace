# MongoDB 数据库配置说明

## 快速开始

### 1. 创建 .env 文件

复制 `.env.example` 文件并重命名为 `.env`：

```bash
cp .env.example .env
```

### 2. 配置数据库连接

有两种方式配置 MongoDB 连接：

#### 方式1: 使用完整连接字符串（推荐）

在 `.env` 文件中设置 `MONGODB_URI`：

**无密码（本地开发，MongoDB 未启用认证）：**
```env
MONGODB_URI=mongodb://localhost:27017/thinkspace
```

**有用户名和密码：**
```env
MONGODB_URI=mongodb://myuser:mypassword@localhost:27017/thinkspace?authSource=admin
```

**MongoDB Atlas（云数据库）：**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/thinkspace?retryWrites=true&w=majority
```

#### 方式2: 使用单独配置项

如果不想使用完整 URI，可以分别设置：

```env
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=thinkspace
MONGODB_USERNAME=your_username
MONGODB_PASSWORD=your_password
MONGODB_AUTH_SOURCE=admin
```

## 常见配置场景

### 场景1: 本地 MongoDB，无认证

如果你的本地 MongoDB 没有启用认证（默认安装通常如此）：

```env
MONGODB_URI=mongodb://localhost:27017/thinkspace
```

### 场景2: 本地 MongoDB，已启用认证

如果你的本地 MongoDB 已启用认证：

```env
MONGODB_URI=mongodb://username:password@localhost:27017/thinkspace?authSource=admin
```

或者使用单独配置项：

```env
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=thinkspace
MONGODB_USERNAME=your_username
MONGODB_PASSWORD=your_password
MONGODB_AUTH_SOURCE=admin
```

### 场景3: MongoDB Atlas（云数据库）

1. 登录 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 创建集群并获取连接字符串
3. 在 `.env` 文件中设置：

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/thinkspace?retryWrites=true&w=majority
```

**注意：** 将 `username` 和 `password` 替换为你的实际用户名和密码。

## 如何为本地 MongoDB 创建用户（如果需要）

如果你需要为本地 MongoDB 启用认证并创建用户：

1. 启动 MongoDB（无认证模式）
2. 连接到 MongoDB：

```bash
mongosh
```

3. 切换到 admin 数据库并创建用户：

```javascript
use admin
db.createUser({
  user: "your_username",
  pwd: "your_password",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})
```

4. 重启 MongoDB 并启用认证（编辑 MongoDB 配置文件，添加 `security: authorization: enabled`）

5. 在 `.env` 文件中配置用户名和密码

## 验证配置

启动应用后，如果看到以下信息，说明连接成功：

```
✅ MongoDB 连接成功
   数据库: thinkspace
   主机: localhost:27017
```

如果连接失败，请检查：
1. MongoDB 服务是否正在运行
2. `.env` 文件中的配置是否正确
3. 用户名和密码是否正确
4. 网络连接是否正常（云数据库）

## 安全提示

⚠️ **重要：** 
- 不要将 `.env` 文件提交到 Git 仓库
- `.env` 文件已添加到 `.gitignore`
- 生产环境建议使用环境变量或密钥管理服务

