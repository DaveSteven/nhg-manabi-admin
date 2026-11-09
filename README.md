# nhg-manabi-admin

JLPT GO! 管理端（nhg-manabi），基于 React 19 + Ant Design 6 + Vite+ 的后台管理应用。当前核心功能为「真题校正」——从学生端项目 [`nhg-manabi-web`](../nhg-manabi-web) 迁移而来，对接真实后端 [`nhg-manabi-api`](../nhg-manabi-api)。

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 构建工具 | [Vite+](https://viteplus.dev)（`vp` 统一命令行） |
| UI 框架 | [Ant Design 6.x](https://ant.design) |
| 路由 | [TanStack Router](https://tanstack.com/router)（文件式路由） |
| 异步状态 | [TanStack Query v5](https://tanstack.com/query) |
| 本地状态 | [Zustand](https://zustand.docs.pmnd.rs)（auth / settings 持久化） |
| 校验 | [Zod v4](https://zod.dev)（API 契约 schema） |
| 图标 | [lucide-react](https://lucide.dev/guide/packages/lucide-react) |
| API Mock | [MSW 2.x](https://mswjs.io)（Service Worker，显式开启） |
| E2E 测试 | [Playwright](https://playwright.dev) |
| 语言 | TypeScript 5.9（strict） |

## 功能

- **真题校正（`/exam-questions`）** — 真题列表（关键词/等级/分类/答案状态/解析状态筛选 + 分页）、校正编辑器（正确选项、答案与解析状态、翻译、结构化解析、学生端预览、版本历史），修改自动记录 revision
- **真实后端对接** — 单 Bearer token 认证（`POST /api/auth/login`）、`GET /api/me` 会话恢复、401 自动登出、响应 schema 校验（snake_case 契约原样保留）
- **权限** — 由后端 `is_admin` 派生前端权限（复用 `user:view`），控制菜单与路由访问，无权限跳 403
- **URL 优先状态** — 筛选、分页、选中题目均同步到 URL search params，可深链
- **暗色模式** — Ant Design 算法一键切换
- **MSW Mock（可选）** — 镜像真实 API 契约（裸 JSON、snake_case），本地无后端时开发用

## 快速开始

### 前置要求

- Node.js >= 20
- [Vite+](https://viteplus.dev/guide/) CLI（`vp`，或直接使用 `node_modules/.bin/vp`）
- 真实后端：见 [`nhg-manabi-api`](../nhg-manabi-api)（本地 Docker：`nhg-manabi-api` 容器，端口 8000）

### 安装与运行

```bash
pnpm install   # 或 vp install
pnpm dev       # 即 vp dev
```

打开 [http://localhost:5180](http://localhost:5180)（端口 5180，避开学生端 dev server 的 5173）。

- 开发模式默认**直连真实后端**：vite dev server 将 `/api` 代理到 `http://127.0.0.1:8000`，无 CORS 问题
- 登录账号来自后端数据库（管理员账号可查 `users` 表中 `is_admin = t` 的记录）

### Mock 模式（无后端开发）

```bash
VITE_ENABLE_MOCK=true pnpm dev
```

MSW 拦截 `/api` 请求（登录 `admin` / `admin`），auth、users、exam-questions 均有 mock 数据。mock 响应与真实后端契约一致（裸 JSON、snake_case）。

### 构建与检查

```bash
pnpm build                 # tsc + vp build
vp check --no-fmt          # 格式 / lint / 类型检查
```

### E2E 测试

```bash
pnpm run test:e2e        # 全部
pnpm run test:e2e:core   # login + users 核心流程
pnpm run test:e2e:ui     # 交互式 UI 模式
```

Playwright 独立起 dev server 于 `127.0.0.1:5181`（强制 IPv4，避免 macOS 上 vite 默认仅绑 IPv6 导致探测失败）。

## 页面

| 路由 | 说明 |
| --- | --- |
| `/login` | 登录（真实后端单 token） |
| `/dashboard` | 概览（模板演示数据） |
| `/exam-questions` | **真题校正**：筛选列表 + 校正编辑器 + 版本历史 |
| `/users` | 用户 CRUD（模板演示，MSW mock 数据；真实后端暂无用户 CRUD 接口） |
| `/403` / `/404` | 无权限 / 未找到 |

## 项目结构

```
src/
├── api/                        # Zod schema、端点常量
│   ├── schemas.ts              # 领域模型（Session/SessionUser、ExamQuestion* 等）
│   ├── auth.ts                 # 认证端点（login/logout/me）
│   ├── user.ts                 # 用户 CRUD 端点（模板演示）
│   └── examQuestion.ts         # 真题校正端点 + 请求/响应 schema 解析
├── routes/
│   ├── _auth/exam-questions/   # 真题校正页（index + -QuestionFilters/-QuestionList/-QuestionEditor）
│   ├── _auth/users/            # 用户 CRUD（模板演示）
│   ├── _auth/dashboard/ · _auth/403/ · login/ · 404/
├── stores/auth.ts              # 单 token 认证状态（持久化 auth-storage）
├── utils/
│   ├── http.ts                 # HTTP 客户端（Bearer 注入、401 登出、裸 JSON 兼容）
│   ├── session.ts              # GET /api/me 会话恢复 + 权限派生 + 菜单过滤
│   └── appMenu.ts              # 内置菜单树 + 路径权限映射
├── mocks/                      # MSW（镜像真实契约；VITE_ENABLE_MOCK=true 时启用）
└── main.tsx                    # 入口（MSW 按环境变量开关 → React 渲染）
```

## 部署要点（本地 Docker 后端）

- 后端容器：`nhg-manabi-api`（8000）/ `nhg-manabi-db`（5432），见 `nhg-manabi-api/docker-compose.yml`
- 后端 `CORS_ORIGINS` 已包含 `localhost:5180`；开发态经 vite 代理为同源请求，通常不触发 CORS
- 数据卷 `japanese_study_api_postgres_data` 为 external 引用，数据库随旧部署目录无缝迁移

## 开发须知

- 使用 Vite+ 命令（`vp install` / `vp check` / `vp test`），不要直接调用 pnpm/npm 底层命令；详见 [AGENTS.md](./AGENTS.md)
- API 契约字段保持后端 snake_case 原样，不做改名映射
- 领域文案（状态、提示）为中文；模板页面（登录/用户）保留英文
