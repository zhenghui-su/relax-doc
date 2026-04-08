# @relax/doc

一个基于 Next.js App Router、Prisma、NextAuth、Tiptap 和 Hocuspocus 的协同文档产品。当前实现包含登录注册、文档空间、文档树、收藏/归档、分享链接和多人实时协同编辑。

## 技术栈

- Next.js 16.2.2
- React 19
- Tailwind CSS 4
- Prisma 7
- PostgreSQL
- NextAuth 5 beta
- Tiptap 3
- Hocuspocus + Yjs

## 环境要求

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+，或者本地 Docker

## 环境变量

先复制环境变量模板：

```bash
cp .env.example .env
```

`.env.example` 中当前需要的变量：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/doc?schema=public"
AUTH_SECRET="replace-with-a-long-random-string"
AUTH_TRUST_HOST="true"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
COLLAB_SECRET="replace-with-a-separate-long-random-string"
NEXT_PUBLIC_COLLAB_SERVER_URL="ws://localhost:1234"
```

说明：

- `DATABASE_URL`：Prisma 和种子脚本使用的数据库连接
- `AUTH_SECRET`：NextAuth 签名密钥
- `COLLAB_SECRET`：协同编辑 token 的签名密钥，建议和 `AUTH_SECRET` 分开
- `NEXT_PUBLIC_COLLAB_SERVER_URL`：前端连接的协同 WebSocket 地址

## 安装依赖

```bash
pnpm install
```

## 数据库启动

项目根目录已经提供了本地 Postgres 的 Docker Compose 配置。

启动数据库：

```bash
docker compose up -d
```

查看数据库状态：

```bash
docker compose ps
```

停止数据库：

```bash
docker compose down
```

如果你不用 Docker，也可以自己启动本地 PostgreSQL，但必须保证 `.env` 里的 `DATABASE_URL` 可用。

## Prisma 初始化流程

第一次启动项目时，建议按这个顺序执行：

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

说明：

- `pnpm db:generate`：根据 `prisma/schema.prisma` 生成 Prisma Client
- `pnpm db:push`：把当前 schema 推到数据库
- `pnpm db:seed`：写入初始化数据

如果只是更新了 schema，通常重新执行：

```bash
pnpm db:generate
pnpm db:push
```

## 启动流程

这个项目有两个服务：

1. Next.js Web 应用，默认运行在 `http://localhost:3000`
2. Hocuspocus 协同服务，默认运行在 `ws://localhost:1234`

### 方式一：完整启动，推荐

同时启动 Web 和协同服务：

```bash
pnpm dev:full
```

对应脚本：

```json
"dev:full": "concurrently \"pnpm dev\" \"pnpm collab\""
```

适合日常开发，因为文档实时协同依赖协同服务。

### 方式二：分别启动

先启动 Web：

```bash
pnpm dev
```

再启动协同服务：

```bash
pnpm collab
```

### 最小可运行顺序

如果你是第一次拉起项目，建议严格按下面顺序：

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev:full
```

启动后访问：

- Web 应用：`http://localhost:3000`
- 协同服务：`ws://localhost:1234`

## 常用脚本

```bash
pnpm dev         # 启动 Next.js 开发服务
pnpm collab      # 启动协同编辑服务
pnpm dev:full    # 同时启动 Web + 协同服务
pnpm lint        # 运行 ESLint
pnpm build       # 生产构建
pnpm start       # 启动生产服务
pnpm db:generate # 生成 Prisma Client
pnpm db:push     # 同步 Prisma schema 到数据库
pnpm db:seed     # 执行种子数据
```

## 目录说明

```text
src/app/(app)        应用内页面，包含文档空间和文档页
src/app/(auth)       登录和注册页面
src/app/actions      Server Actions
src/components       业务组件和 UI 组件
src/lib              认证、数据库、协同、工具函数
server/              Hocuspocus 协同服务
prisma/              Prisma schema 和 seed
```

## 开发说明

### 1. 协同编辑依赖单独服务

文档编辑器不是纯前端本地状态，它依赖：

- `/api/documents/[id]/collab-token`
- `server/collab-server.ts`
- `NEXT_PUBLIC_COLLAB_SERVER_URL`
- `COLLAB_SECRET`

如果 Web 正常但协同服务没启动，文档页仍可能打开，但实时协同不会正常工作。

### 2. 数据库没启动时的典型报错

如果执行 `pnpm db:push` 或启动服务时报数据库连接失败，优先检查：

- Docker 容器是否已启动
- `DATABASE_URL` 是否正确
- PostgreSQL 端口 `5432` 是否可访问

### 3. 修改 Prisma schema 后

每次改动 `prisma/schema.prisma` 后，至少执行：

```bash
pnpm db:generate
```

如果改动涉及数据库结构，再执行：

```bash
pnpm db:push
```

### 4. 生产检查

提交前至少执行：

```bash
pnpm lint
pnpm build
```

## 常见问题

### 协同服务启动失败

检查以下几项：

- `.env` 是否存在
- `COLLAB_SECRET` 是否配置
- `DATABASE_URL` 是否可连接
- `COLLAB_PORT` 是否和其他进程冲突

### 页面能打开，但编辑不同步

通常是以下原因之一：

- 没有启动 `pnpm collab`
- `NEXT_PUBLIC_COLLAB_SERVER_URL` 配置错误
- Web 和协同服务使用了不同的 `COLLAB_SECRET`

### `pnpm db:push` 失败

大概率是本地数据库没起来。先执行：

```bash
docker compose up -d
```

然后再重试：

```bash
pnpm db:push
```
