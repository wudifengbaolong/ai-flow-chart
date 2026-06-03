# AI 流程图

AI 驱动的代码 → PlantUML → 可视化流程图在线编辑工具。

## 功能特性

- **AI 智能转换**：支持 C/C++/Python 代码自动生成流程图
- **可视化编辑**：拖拽节点、连线、编辑标签
- **双向同步**：编辑画布实时更新 PUML 源码，修改源码实时更新画布
- **多 AI 供应商**：支持 DeepSeek、OpenAI、Claude
- **保存/加载**：云端保存项目，随时打开继续编辑
- **多格式导出**：PNG、SVG、PDF
- **完整流程语法**：支持 if/else、while/for、嵌套分支

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vite + React 19 + TypeScript + TailwindCSS + ReactFlow |
| 后端 | FastAPI + Python 3.12 + SQLAlchemy + Alembic |
| 数据库 | PostgreSQL + Redis |
| AI | DeepSeek / OpenAI / Claude（用户自带 API Key） |

## 快速开始

### 环境要求

- Python 3.12+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 1. 克隆项目

```bash
git clone https://github.com/你的用户名/ai-flow-chart.git
cd ai-flow-chart
```

### 2. 启动数据库

```bash
docker-compose up -d
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，修改数据库连接、JWT 密钥等
```

### 4. 启动后端

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 5. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 6. 访问

- 前端：http://localhost:5173
- 后端 API 文档：http://localhost:8000/docs

## 使用说明

1. 注册/登录账号
2. 在 AI 输入框中：
   - 选择 AI 供应商（DeepSeek/OpenAI/Claude）
   - 输入你的 API Key（在对应平台获取）
   - 粘贴代码
   - 点击「生成流程图」
3. 在画布上编辑流程图
4. 修改右侧 PUML 源码，画布实时同步
5. 点击「保存」存储到云端
6. 点击「导出」下载 PNG/SVG/PDF

## API Key 获取

| 供应商 | 获取地址 |
|--------|----------|
| DeepSeek | https://platform.deepseek.com |
| OpenAI | https://platform.openai.com |
| Claude | https://console.anthropic.com |

## 项目结构

```
ai-flow-chart/
├── backend/          # FastAPI 后端
│   ├── app/
│   │   ├── api/      # 路由
│   │   ├── services/ # 业务逻辑
│   │   └── models/  # 数据模型
│   └── requirements.txt
├── frontend/         # React 前端
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   └── stores/
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## 开发

### 运行测试

```bash
cd backend
python test_parser.py
```

### 添加新功能

参考 `开发者指南.md` 了解项目架构和开发规范。

## License

MIT
