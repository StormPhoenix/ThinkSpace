# Docker 脚本使用说明

本目录包含用于构建和运行 ThinkSpace Docker 容器的脚本。

## 脚本列表

### 1. `build.sh` - 构建 Docker 镜像

构建 ThinkSpace 应用的 Docker 镜像。

```bash
./scripts/build.sh [tag]
```

**参数：**
- `tag`: 镜像标签（可选，默认为 `latest`）

**示例：**
```bash
# 使用默认标签 latest
./scripts/build.sh

# 使用自定义标签
./scripts/build.sh v1.0.0
```

### 2. `run.sh` - 启动服务

使用 docker-compose 启动所有服务（包括 MongoDB、Node.js 应用和 Mongo Express）。

```bash
./scripts/run.sh
```

**功能：**
- 检查 Docker 和 Docker Compose 是否安装
- 检查并创建 .env 文件
- 构建并启动所有容器
- 显示服务信息（包括 Mongo Express 访问地址）

### 3. `stop.sh` - 停止服务

停止并移除所有运行中的容器。

```bash
./scripts/stop.sh
```

**注意：** 数据卷会被保留，数据不会丢失。

### 4. `logs.sh` - 查看日志

查看容器日志。

```bash
# 查看所有服务日志
./scripts/logs.sh

# 查看特定服务日志
./scripts/logs.sh app            # 查看应用日志
./scripts/logs.sh mongodb         # 查看数据库日志
./scripts/logs.sh mongo-express   # 查看 Mongo Express 日志
```

### 5. `clean.sh` - 清理资源

清理未使用的 Docker 资源。

```bash
./scripts/clean.sh
```

**功能：**
- 停止并移除容器
- 可选：删除数据卷（会删除所有数据库数据）
- 可选：删除镜像

## 快速开始

### 1. 准备环境变量

```bash
# 复制 Docker 环境配置示例
cp .env.docker.example .env

# 根据需要修改 .env 文件中的配置
```

### 2. 启动服务

```bash
./scripts/run.sh
```

### 3. 访问应用

- **应用地址**: http://localhost:3000
- **Mongo Express (数据库管理)**: http://localhost:8081
  - 默认用户名: `admin`
  - 默认密码: `pass`
  - 可在 `.env` 文件中通过 `MONGO_EXPRESS_USERNAME` 和 `MONGO_EXPRESS_PASSWORD` 修改

### 4. 查看日志

```bash
./scripts/logs.sh
```

### 5. 停止服务

```bash
./scripts/stop.sh
```

## 手动使用 Docker Compose

如果你不想使用脚本，也可以直接使用 docker-compose 命令：

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

## 端口映射

- **应用端口**: 3000 (可在 .env 中通过 `APP_PORT` 修改)
- **MongoDB 端口**: 27017
- **Mongo Express 端口**: 8081 (可在 .env 中通过 `MONGO_EXPRESS_PORT` 修改)

## 数据持久化

MongoDB 数据存储在 Docker 数据卷中，即使容器被删除，数据也会保留。

如需删除数据卷：
```bash
docker-compose down -v
```

## 故障排查

### 端口被占用

如果 3000 端口被占用，修改 `.env` 文件中的 `APP_PORT`：

```env
APP_PORT=3001
```

### MongoDB 连接失败

1. 检查 MongoDB 容器是否正常运行：
```bash
docker-compose ps
```

2. 查看 MongoDB 日志：
```bash
./scripts/logs.sh mongodb
```

3. 检查 .env 文件中的 MongoDB 配置是否正确

### 应用无法访问

1. 检查应用容器是否正常运行：
```bash
docker-compose ps
```

2. 查看应用日志：
```bash
./scripts/logs.sh app
```

3. 检查端口映射是否正确

## 注意事项

1. **首次运行**：首次运行 `run.sh` 时会自动构建镜像，可能需要几分钟时间
2. **环境变量**：确保 `.env` 文件存在且配置正确
3. **数据备份**：定期备份 MongoDB 数据卷
4. **生产环境**：生产环境建议使用更强的密码和更安全的配置

