# 登录模块：账号密码 + 密保问题找回密码

## Context

当前项目所有 API 路由硬编码 `DEFAULT_USER_ID = "default_user"`，无认证机制。需要添加完整的登录/注册/找回密码功能，支持多用户隔离。

项目已安装 `next-auth@5.0.0-beta.25` 和 `bcrypt` 但均未使用。采用 next-auth v5 Credentials Provider + JWT 策略实现（Credentials Provider 不支持数据库 Session，JWT 存储在 httpOnly cookie 中，用户体验与 Session 等价）。

## 实现步骤

### Step 1: 基础配置

**`next.config.ts`** — 添加 bcrypt 为 server 外部包：
```ts
serverExternalPackages: ["bcrypt"]
```

**`.env.local`** — 添加：
```
AUTH_SECRET=<openssl rand -base64 32 生成>
```

**`.env.example`** — 清理旧 Postgres 变量，更新为当前变量

### Step 2: Prisma Schema 扩展 User 模型

**`prisma/schema.prisma`** — User 模型添加字段：
```prisma
email              String   @unique
password           String                           // bcrypt hash
securityQuestion   String   @map("security_question")
securityAnswer     String   @map("security_answer")  // bcrypt hash
```

- `email` 作为登录标识，`@unique`
- `password` / `securityAnswer` 存 bcrypt hash
- 新用户 `userId` 设为 email 值（保持与 Conversation 的关联不变）
- 不需要 Account/Session 等额外模型（JWT 策略无需数据库存储 session）

执行 `prisma db push` 同步。需要先处理已有的 `default_user` 记录（email 为必填）。

### Step 3: Auth 核心配置

**新建 `auth.ts`（项目根目录）** — NextAuth v5 配置：
- Credentials Provider：email + password 登录
- `authorize` 中用 Prisma 查用户 + bcrypt.compare 验证密码
- JWT 策略，`maxAge: 30天`
- callbacks.jwt：写入 `userId` 到 token
- callbacks.session：暴露 `userId` 到 session
- callbacks.authorized：供 middleware 判断登录状态
- `pages.signIn: "/login"` 指向自定义登录页

**新建 `lib/auth-types.ts`** — 类型扩展：
- 给 Session.user 和 JWT 添加 `userId` 字段声明

### Step 4: NextAuth 路由 + 注册/找回密码 API

**新建 `app/api/auth/[...nextauth]/route.ts`** — 导出 handlers

**新建 `app/api/auth/register/route.ts`** — 注册：
- Zod 校验：name, email, password(≥6), securityQuestion, securityAnswer
- 检查 email 重复 → 409
- bcrypt hash password + securityAnswer（answer 先 lowercase+trim）
- 创建 User（userId 设为 email）
- 返回 201

**新建 `app/api/auth/forgot-password/question/route.ts`** — 查询密保问题：
- POST { email } → 返回 securityQuestion 文本，或 404

**新建 `app/api/auth/forgot-password/verify/route.ts`** — 验证密保答案：
- POST { email, securityAnswer } → bcrypt.compare
- 成功：返回 JWT 签名的短期 token（10分钟有效）
- 失败：401

**新建 `app/api/auth/forgot-password/reset/route.ts`** — 重置密码：
- POST { email, newPassword, token } → 验证 token → bcrypt hash 新密码 → 更新 User

### Step 5: Middleware 路由保护

**新建 `middleware.ts`（项目根目录）**：
- 导出 `auth` 作为 middleware
- matcher 排除：`/login`, `/register`, `/forgot-password`, `/api/auth/*`, `/_next/*`, 静态资源
- 未登录自动重定向到 `/login?callbackUrl=...`

### Step 6: Auth 页面

**新建 `app/(auth)/layout.tsx`** — 居中卡片布局（无侧边栏）

**新建 `app/(auth)/login/page.tsx`** — 登录页：
- email + password 表单
- 调用 `signIn("credentials", ...)` 提交
- callbackUrl 读取 + 登录后跳回
- 错误提示（密码错误等）
- 链接：注册 / 忘记密码
- 已登录用户自动跳转 `/`

**新建 `app/(auth)/register/page.tsx`** — 注册页：
- name + email + password + 确认密码 + 密保问题（下拉）+ 密保答案
- 预设密保问题：宠物名字 / 出生城市 / 母亲姓氏 / 第一所学校 / 最喜欢的书
- 客户端 Zod 校验
- POST `/api/auth/register`，成功后跳转 `/login`
- 链接：已有账号？去登录

**新建 `app/(auth)/forgot-password/page.tsx`** — 找回密码（三步）：
1. 输入 email → 查询密保问题
2. 回答密保问题 → 获取验证 token
3. 输入新密码 → 重置

### Step 7: Layout + Sidebar 改造

**`app/layout.tsx`** — 包裹 `SessionProvider`

**`app/components/Sidebar.tsx`** — 底部添加：
- 显示当前用户名/邮箱
- 退出登录按钮（调用 `signOut()`）

### Step 8: API 路由鉴权改造

**新建 `lib/auth-utils.ts`** — 封装 `requireAuth()` 获取已认证 userId

**修改 `app/api/conversations/route.ts`**：
- 移除 `DEFAULT_USER_ID` 和 `ensureDefaultUser()`
- GET/POST 从 session 获取 userId

**修改 `app/api/conversations/[id]/route.ts`**：
- GET/PUT/DELETE 添加 auth 检查

**修改 `app/api/research/route.ts`**：
- POST 添加 auth 检查

### Step 9: 客户端 401 处理

**修改 `app/utils/api.ts`**：
- 封装 `authFetch`，遇到 401 自动跳转 `/login`
- 替换所有 `fetch` 调用

## 文件清单

| 新建文件 | 用途 |
|----------|------|
| `auth.ts` | NextAuth v5 配置 |
| `middleware.ts` | 路由保护 |
| `lib/auth-types.ts` | Session 类型扩展 |
| `lib/auth-utils.ts` | API 路由 auth helper |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth handler |
| `app/api/auth/register/route.ts` | 注册 API |
| `app/api/auth/forgot-password/question/route.ts` | 查询密保问题 |
| `app/api/auth/forgot-password/verify/route.ts` | 验证密保答案 |
| `app/api/auth/forgot-password/reset/route.ts` | 重置密码 |
| `app/(auth)/layout.tsx` | Auth 页面布局 |
| `app/(auth)/login/page.tsx` | 登录页 |
| `app/(auth)/register/page.tsx` | 注册页 |
| `app/(auth)/forgot-password/page.tsx` | 找回密码页 |

| 修改文件 | 改动 |
|----------|------|
| `prisma/schema.prisma` | User +email/password/securityQuestion/securityAnswer |
| `next.config.ts` | +serverExternalPackages |
| `.env.local` | +AUTH_SECRET |
| `.env.example` | 清理旧变量，添加新变量 |
| `app/layout.tsx` | +SessionProvider |
| `app/components/Sidebar.tsx` | +用户信息+退出按钮 |
| `app/api/conversations/route.ts` | 移除硬编码用户，加 auth |
| `app/api/conversations/[id]/route.ts` | +auth 检查 |
| `app/api/research/route.ts` | +auth 检查 |
| `app/utils/api.ts` | +401 处理 |

## 验证

1. 访问 `/` → 自动跳转到 `/login`
2. 注册新用户 → 跳转到 `/login` → 登录成功 → 跳转到 `/`
3. 退出登录 → 跳转到 `/login`
4. 忘记密码 → 输入邮箱 → 回答密保问题 → 重置密码 → 用新密码登录
5. 未登录直接访问 `/api/conversations` → 返回 401
6. 新用户看到空对话列表（非 default_user 的数据）
