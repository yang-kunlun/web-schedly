# web-schedly

现代化的AI驱动智能日程管理系统，提供全面、高效的个人时间管理解决方案。系统通过先进的人工智能技术，帮助用户精准和智能地管理个人时间，实现时间块智能规划和间隔优化。

## 技术栈

- React前端框架
- PostgreSQL数据库
- TypeScript开发
- Express.js后端服务
- DeepSeek AI智能分析
- Tailwind CSS
- OpenAI集成
- WebSocket实时通知
- Recharts数据可视化
- @hello-pangea/dnd拖放库
- 响应式设计架构
- 跨设备时间块同步系统

## 开发环境设置

### 前置要求

- Node.js 20.x
- PostgreSQL数据库
- npm包管理器

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/yang-kunlun/web-schedly.git
cd web-schedly
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
- 复制`.env.example`文件并重命名为`.env`
- 根据实际情况修改环境变量值

4. 启动开发服务器
```bash
npm run dev
```

## 部署指南

### 环境变量配置

部署前需要配置以下环境变量：

- `DATABASE_URL`: PostgreSQL数据库连接URL
- `REPLIT_DEPLOY_TOKEN`: Replit部署令牌（用于自动部署）
- `NODE_ENV`: 运行环境（production/development）
- `PORT`: 应用运行端口号（默认5000）

### 自动部署

项目使用GitHub Actions进行自动化部署：

1. 将代码推送到main分支会自动触发部署流程
2. GitHub Actions会自动构建项目并部署到Replit
3. 部署完成后可以通过Replit提供的URL访问应用

### 手动部署

如需手动部署，请按以下步骤操作：

1. 构建项目
```bash
npm run build
```

2. 启动生产服务器
```bash
npm run start
```

## 贡献指南

1. Fork本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建一个Pull Request

## 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件