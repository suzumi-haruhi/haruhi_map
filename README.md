# Haruhi Map

圈子内部使用的**圣地内容展示 + 团内信息流 + 团员信息**三合一 Web 应用。前端基于 Vue 3 + Vite，后端基于 Node.js + Express + SQLite，支持内容发布、互动、智能审核与后台管理。

## 目录

- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境变量说明](#环境变量说明)
- [页面与交互说明](#页面与交互说明)
- [内容发布流程](#内容发布流程)
- [用户与身份体系](#用户与身份体系)
- [标签体系](#标签体系)
- [图片处理与审核](#图片处理与审核)
- [管理员后台](#管理员后台)
- [API 参考](#api-参考)
- [数据库结构](#数据库结构)
- [常见问题](#常见问题)

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API / `<script setup>`) + Vite 5 |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 地图 | Leaflet 1.9（OpenStreetMap 底图） |
| 图片裁剪 | Cropperjs |
| 后端 | Node.js (ESM) + Express 4 |
| 数据库 | SQLite（`sqlite` + `sqlite3`） |
| 文件上传 | Multer（WebP 格式，最大 16 MB） |
| AI 审核（可选） | DashScope（兼容 OpenAI SDK） |
| 身份认证 | HMAC-SHA256 签名的 HttpOnly Cookie |

## 项目结构

```
haruhi_map/
├── index.html
├── package.json
├── vite.config.js
├── scripts/
│   ├── start.mjs           # 并发启动前后端
│   └── convert-to-webp.js  # 图片批量转 WebP 工具
├── server/
│   ├── index.js            # Express 路由与中间件
│   ├── db.js               # SQLite 数据库操作
│   ├── ai.js               # AI 文本/图片审核模块
│   ├── data/               # SQLite 数据库文件
│   └── uploads/            # 上传文件存储（按年月分目录）
└── src/
    ├── App.vue
    ├── main.js
    ├── router/index.js
    ├── services/api.js         # 前端 HTTP 请求封装
    ├── stores/
    │   ├── userStore.js        # 登录态与用户信息
    │   ├── galleryStore.js     # 照片画廊缓存
    │   └── adminStore.js       # 管理员 API 封装
    ├── components/
    │   ├── MapCanvas.vue       # Leaflet 地图封装
    │   ├── CommunityHeader.vue # 社区顶部栏
    │   ├── LandmarkSearch.vue  # 地标搜索框
    │   ├── PhotoCard.vue       # 照片卡片
    │   └── UploadBox.vue       # 图片上传区域
    ├── views/
    │   ├── MapView.vue             # 主地图页（含社区侧栏）
    │   ├── LandmarkDetailView.vue  # 地标详情面板
    │   ├── CommunityView.vue       # 帖子列表 + 发布
    │   ├── PostDetailView.vue      # 帖子详情
    │   ├── LandmarksView.vue       # 地标列表页
    │   ├── UserView.vue            # 团员信息页
    │   └── AdminView.vue           # 管理员后台
    └── utils/
        ├── imageCompressor.js  # 前端图片压缩（canvas）
        ├── Sound.js            # 音效资源加载
        └── uiSound.js          # UI 交互音效
```

## 快速开始

**1. 安装依赖**

```bash
npm install
```

**2. 配置环境变量**

在根目录新建 `.env`：

```
API_PORT=15555
DB_PATH=server/data/map.sqlite
ADMIN_PASSWORD=your-admin-password
COOKIE_SECRET=change-me-cookie-secret
DASHSCOPE_API_KEY=your-dashscope-key
```

**3. 启动**

```bash
npm run start
```

`start` 脚本会并发启动前端开发服务器（Vite）与后端（Express）。  
或分别启动：`npm run dev`（前端）、`npm run dev:server`（后端）。

**4. 构建生产包**

```bash
npm run build
```

## 环境变量说明

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `API_PORT` | `15555` | 后端监听端口 |
| `DB_PATH` | `server/data/map.sqlite` | SQLite 数据库路径 |
| `ADMIN_PASSWORD` | `CHANGE_ME` | 管理员密码（明文或 SHA-256 哈希均可） |
| `COOKIE_SECRET` | `dev-cookie-secret` | Cookie 签名密钥，**生产环境必须修改** |
| `DASHSCOPE_API_KEY` | （空） | DashScope API Key，不填则跳过 AI 审核 |

## 页面与交互说明

### 地图主页（`/`）

- 全屏 Leaflet 地图展示所有地标（动画截图气泡 + 文字标记）
- 点击地标标记 → 右侧弹出地标详情面板，展示动画截图、地标信息、相关实拍和帖子
- 左侧可展开社区侧栏（帖子列表），点击含地标标签的帖子，地图自动 `flyTo` 该地标
- 顶部搜索框支持按名称 / 地址实时筛选地标，选中后地图飞至对应位置

### 圣地详情面板

- 三种渲染模式：独立页面（`/landmarks/:id`）；嵌入地图+左右分屏；嵌入地图+帖子覆盖
- 展示地标的动画截图（多张时可切换）、地址、描述、别名、原作来源
- 下方展示相关实拍（最多 8 张）和相关帖子（最多 5 条），可跳转查看全部
- 支持发布实拍（WebP 格式，上传前可添加图注）

### 社区帖子列表

- 排序：最新 / 最多点赞
- 筛选：关联地标（单选）；普通标签（多选）；仅看管理员
- 帖子卡片展示头图、标题、摘要、标签、评论数、点赞数
- 未登录用户可浏览，发布需匿名或正式身份

### 帖子详情

- 展示完整正文、所有图片（支持全屏浏览）、评论列表
- 评论支持点赞；正式用户评论带用户标识
- 正式用户可跟帖（引用原帖），详情页显示跟帖数与跳转链接
- 管理员可直接删除帖子或评论

### 圣地列表（`/landmarks`）

- 卡片式展示所有地标，支持按名称/地址搜索
- 点击卡片跳转地标详情页

### 团员信息（`/user`）

- 两类身份展示不同内容（见[用户与身份体系](#用户与身份体系)）
- 正式用户可查看自己的帖子、点赞、评论历史，并管理头像
- 页面底部提供管理员后台入口

## 内容发布流程

发帖分以下步骤（均在 `CommunityView.vue` 的发布抽屉内完成）：

1. **头图**：可选，上传后前端自动压缩为 WebP（失败则原图回退）
2. **标题 / 摘要**：标题最多 100 字，摘要最多 200 字（均为可选）
3. **关联地标**：通过 `LandmarkSearch` 组件选择，帖子会带地标标签；点击帖子时地图自动 flyTo
4. **普通标签**：最多选 4 个，来自已有帖子的历史标签
5. **正文图片 + 正文**：正文必填（或至少有一张图），图片最多 20 张
6. **预览 → 发布**：提交前可预览，提交后进入 AI 审核队列（约 10 秒内处理）

管理员发帖自动添加「管理员」标签，且跳过审核直接变为 `approved`。

## 用户与身份体系

| 维度 | 匿名用户 | 正式用户 |
|------|----------|----------|
| 创建方式 | 首次访问自动分配 Cookie | 管理员后台手动添加 |
| 标识 | `anon_id`（UUID，存于 HttpOnly Cookie） | `user_id`（字符串，管理员设定） |
| 显示名 | 可修改昵称（最长 20 字） | 头像 + 固定用户名 |
| 发帖/评论 | ✅ | ✅（带用户标识） |
| 跟帖 | ❌ | ✅ |
| 头像 | ❌ | ✅ 可裁剪上传 |
| 点赞每日限制 | 每目标每天 1 次 | 同左 |
| 历史记录 | 基于 Cookie，换设备/清除后失效 | 跨设备持久 |

## 标签体系

| 类型 | 来源 | 用途 |
|------|------|------|
| **地标标签** | 发帖时选择关联地标 | 地图 flyTo；按地标筛选帖子 |
| **普通标签** | 发帖时自由输入（最多 4 个） | 帖子列表多选筛选 |
| **管理员标签** | 管理员发帖自动添加 | "仅看管理员"筛选开关 |

标签存储于 `post_tags` 表，`tag_type` 字段区分 `landmark`、`normal`、`admin`。

## 图片处理与审核

### 上传流程

1. 前端通过 `imageCompressor.js` 将图片转换为 WebP（质量 0.82，最大宽度 2560 px）
2. 后端 Multer 只接受 `image/webp` 文件，其他格式返回 400
3. 文件按 `YYYY-MM` 分目录存放于 `server/uploads/`
4. 头像上传限制为 2 MB，帖子/圣地图片限制为 16 MB

### AI 审核策略

- 帖子发布后进入 `aiReviewQueue`，每 10 秒处理一条
- 先审核文本（正文），再依次审核图片（如有）
- 任一环节不通过则状态更新为 `locked`（前台不可见）
- `DASHSCOPE_API_KEY` 未配置时跳过所有审核，状态直接设为 `approved`
- 管理员帖子不经过审核队列，直接 `approved`

## 管理员后台

访问路径：`/admin`（需输入 `ADMIN_PASSWORD`，验证结果缓存 1 小时于 `localStorage`）

| 模块 | 功能 |
|------|------|
| 地标管理 | 新增 / 编辑 / 删除；支持多张动画截图；经纬度限制在日本范围（20–46°N, 122–154°E） |
| 帖子管理 | 按排序 / 地标 / 标签筛选；查看详情与评论；手动修改审核状态（`approved` / `locked`） |
| 管理员帖子 | 独立发布入口，自动添加「管理员」标签，直接 `approved` |
| 用户管理 | 添加 / 删除正式用户（指定 ID、用户名、密码） |

## API 参考

所有接口均以 `/api` 为前缀，JSON 响应。管理员接口需在请求头携带 `x-admin-password`。

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 服务健康检查 |

### 身份认证

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/me` | 获取当前登录用户信息 |
| POST | `/api/auth/login` | 正式用户登录（`id`, `password`） |
| POST | `/api/auth/anonymous` | 创建/重建匿名身份 |
| PATCH | `/api/auth/nickname` | 修改匿名昵称（`nickname`，最长 20 字） |
| POST | `/api/auth/logout` | 注销正式用户 Session |

### 用户中心

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/avatar` | 上传/更新头像（`multipart/form-data`, file `avatar`，最大 2 MB） |
| GET | `/api/user/likes` | 当前用户点赞的实拍列表 |
| GET | `/api/user/photos` | 当前用户上传的实拍列表 |
| GET | `/api/user/comments` | 当前用户的实拍评论列表 |
| GET | `/api/user/post-likes` | 当前用户点赞的帖子列表 |
| GET | `/api/user/posts` | 当前用户发布的帖子列表 |
| GET | `/api/user/post-comments` | 当前用户的帖子评论列表 |
| GET | `/api/user/favorites` | 当前用户收藏的地标 |
| POST | `/api/user/favorites/:id` | 收藏地标 |
| DELETE | `/api/user/favorites/:id` | 取消收藏地标 |

### 地标

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/landmarks` | 公开 | 获取所有地标列表（含实拍数） |
| POST | `/api/landmarks` | 管理员 | 新建地标（`name`, `lat`, `lng`, `address?`, `description?`, file `anime_shot`） |
| PUT | `/api/landmarks/:id` | 管理员 | 更新地标信息 |
| DELETE | `/api/landmarks/:id` | 管理员 | 删除地标（关联照片级联删除，帖子 landmark_id 置 NULL） |

### 实拍（Photos）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/landmarks/:id/photos` | 获取地标实拍列表（默认最多 50 张） |
| POST | `/api/landmarks/:id/photos` | 上传实拍（`multipart/form-data`, file `photo`, `uploader_name?`, `caption?`） |
| POST | `/api/photos/:id/like` | 点赞实拍 |
| DELETE | `/api/photos/:id` | 删除实拍（本人或管理员） |

### 实拍评论

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/photos/:id/comments` | 获取实拍评论（默认最多 80 条） |
| POST | `/api/photos/:id/comments` | 发表评论（`body`, `user_name?`） |
| POST | `/api/comments/:id/like` | 点赞评论 |
| DELETE | `/api/comments/:id` | 删除评论（本人或管理员） |

### 帖子（Posts）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posts` | 帖子列表（query: `page`, `limit`, `sort`, `landmark_id`, `tags`, `admin_only`） |
| GET | `/api/posts/:id` | 帖子详情（含图片、标签、跟帖数） |
| POST | `/api/posts` | 发布帖子（`multipart/form-data`, files `images`, fields `content`, `title?`, `summary?`, `landmark_id?`, `normal_tags?`, `parent_post_id?`, `image_captions?`） |
| POST | `/api/posts/:id/like` | 点赞帖子 |
| DELETE | `/api/posts/:id` | 删除帖子（本人或管理员） |

### 帖子评论

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posts/:id/comments` | 获取帖子评论（query: `order=asc|desc`） |
| POST | `/api/posts/:id/comments` | 发表评论（`body`） |
| DELETE | `/api/post-comments/:id` | 删除评论（本人或管理员） |

### 管理员

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/verify` | 验证管理员密码 |
| GET | `/api/admin/posts` | 帖子列表（支持状态/地标/标签筛选） |
| GET | `/api/admin/posts/:id/comments` | 查看帖子全部评论 |
| PATCH | `/api/admin/posts/:id/status` | 修改帖子状态（`pending`/`approved`/`locked`） |
| PATCH | `/api/admin/post-comments/:id/status` | 修改评论状态 |
| POST | `/api/admin/posts` | 管理员发帖（同 `/api/posts`，自动加「管理员」标签） |
| GET | `/api/admin/photos` | 查看实拍列表 |
| GET | `/api/admin/comments` | 查看实拍评论列表 |
| GET | `/api/admin/users` | 获取正式用户列表 |
| POST | `/api/admin/users` | 新增正式用户（`id`, `nickname`, `password`） |
| DELETE | `/api/admin/users/:id` | 删除正式用户 |

## 数据库结构

| 表名 | 说明 |
|------|------|
| `landmarks` | 地标信息（名称、经纬度、地址、描述、动画截图、`metadata` JSON） |
| `photos` | 地标实拍（`landmark_id` 外键、上传者、图注、点赞数、审核状态） |
| `comments` | 实拍评论（`photo_id` 外键、匿名 ID、发布者、点赞数、状态） |
| `posts` | 帖子（标题、摘要、正文、关联地标、上级帖子 ID、发布者、状态） |
| `post_images` | 帖子图片（`post_id` 外键、文件路径、图注） |
| `post_tags` | 帖子标签（`tag_type`: `landmark` / `normal` / `admin`） |
| `post_comments` | 帖子评论（`post_id` 外键、发布者信息、审核状态） |
| `users` | 正式用户（UUID 主键、`metadata` JSON 存储昵称/头像/密码哈希） |
| `user_likes` | 用户点赞记录（`target_type` + `target_id`，去重） |
| `user_favorites` | 用户收藏地标（`anon_id` + `landmark_id`，去重） |
| `likes_daily` | 每日点赞限额（实拍 & 实拍评论，每目标每天最多 1 次） |

## 常见问题

**Q: 上传图片时提示 "webp only"？**  
A: 后端只接受 WebP 格式。前端会自动转换，若直接调用 API 需先转换格式。

**Q: 帖子发布后不显示？**  
A: 帖子进入 AI 审核队列，约 10 秒内处理。内容不合规时状态变为 `locked`，可由管理员在后台手动修改。

**Q: 修改管理员密码后如何生效？**  
A: 修改 `.env` 中 `ADMIN_PASSWORD` 后重启服务器。`localStorage` 的旧缓存会在下次打开后台时重新验证。

**Q: 如何批量将已有图片转为 WebP？**  
A: 运行 `node scripts/convert-to-webp.js`，脚本会遍历 `server/uploads/` 目录并转换。
