# ============================================================================
# Dockerfile - Next.js 多阶段构建（用于 Docker Compose）
# 
# 优化目标：
# - 最小化镜像大小（~150MB vs ~500MB）
# - 利用多层缓存提高构建速度
# - 仅在生产镜像中包含必需的依赖
# ============================================================================

# ============================================================================
# 第一阶段：依赖安装（deps）
# ============================================================================
FROM node:20-alpine AS deps

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@latest

# 复制 package 文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
# 注意：Alpine 上 bcrypt 需要编译工具
RUN apk add --no-cache python3 make g++ && \
    pnpm install --frozen-lockfile && \
    apk del python3 make g++

# ============================================================================
# 第二阶段：构建（builder）
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@latest

# 复制依赖（从 deps 阶段）
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建 Next.js 应用（输出 standalone 模式）
RUN pnpm run build

# ============================================================================
# 第三阶段：运行时（runner）
# ============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 创建非 root 用户运行应用（安全）
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 从 builder 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 启动命令
CMD ["node", "server.js"]
