<template>
  <div class="admin-page">
    <template v-if="adminReady">
      <div class="admin-shell">
    <aside class="admin-nav">
      <div class="admin-brand">管理员界面</div>
      <nav class="admin-links">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="admin-link"
          :class="{ active: activeKey === item.key }"
          type="button"
          @click="goSection(item.key)"
        >{{ item.label }}</button>
      </nav>
    </aside>

    <main class="admin-content">
      <div class="admin-head">
        <div class="section-title" style="margin:0;">{{ activeLabel }}</div>
        <div v-if="activeKey === 'landmarks'" class="admin-search">
          <input class="input" v-model="searchQuery" placeholder="搜索地标..." />
        </div>
        <div v-else-if="activeKey === 'users'" class="admin-actions">
          <button class="btn primary" type="button" @click="openAddUser">添加用户</button>
          <div class="admin-search">
            <input class="input" v-model="userSearchQuery" placeholder="搜索用户 ID..." />
          </div>
        </div>
      </div>

      <div v-if="activeKey === 'landmarks'" class="admin-section">
        <div class="row" style="justify-content: space-between; align-items:center; margin-top:12px;">
          <div class="muted">地标数据全部存储在 metadata 中。</div>
          <button class="btn primary" @click="openCreate">添加地标</button>
        </div>

        <div class="admin-landmark-list">
          <div v-if="landmarkLoading" class="muted">加载中...</div>
          <div v-else-if="landmarkError" class="muted" style="color:#ff9b9b;">{{ landmarkError }}</div>
          <div v-else class="landmark-grid admin-grid">
            <article
              v-for="lm in filteredLandmarks"
              :key="lm.id"
              class="landmark-card"
              role="button"
              tabindex="0"
              @click="openEdit(lm)"
              @keydown.enter="openEdit(lm)"
            >
              <div class="landmark-image" :style="cardImage(lm)"></div>
              <div class="landmark-name">{{ lm.name }}</div>
              <button class="btn danger btn-delete" type="button" @click.stop="confirmDelete(lm)">删除</button>
            </article>
          </div>
        </div>
      </div>

      <div v-else-if="activeKey === 'posts'" class="admin-section">
        <div class="toolbar" style="margin-top:12px;">
          <div class="toolbar-group">
            <label class="muted">排序</label>
            <select class="input" v-model="postSortBy">
              <option value="time">时间</option>
              <option value="likes">点赞</option>
            </select>
            <select class="input" v-model="postSortOrder">
              <option value="desc">倒序</option>
              <option value="asc">正序</option>
            </select>
          </div>
          <div class="toolbar-group">
            <label class="muted">地标筛选</label>
            <LandmarkPicker :items="landmarks" v-model="postFilterLandmarkObj" />
          </div>
          <div class="toolbar-group toolbar-tags">
            <label class="muted">普通标签筛选（可多选）</label>
            <FreeTagInput
              v-model="postSelectedTags"
              button-text="添加筛选标签"
              placeholder="输入要筛选的标签"
            />
          </div>
          <div class="toolbar-group">
            <label class="muted">管理员</label>
            <button
              class="btn ghost"
              :style="postAdminOnly ? 'border-color: var(--accent); color: var(--accent);' : ''"
              @click="togglePostAdminOnly"
            >只看管理员</button>
            <button class="btn primary" type="button" @click="openAdminPublish">发布管理员帖</button>
          </div>
          <div class="toolbar-group toolbar-search">
            <label class="muted">搜索</label>
            <input class="input" v-model="postSearchQuery" placeholder="搜索内容 / 用户名 / 标签" />
          </div>
        </div>

        <div class="post-list">
          <div v-if="postLoading" class="muted">加载中...</div>
          <div v-else-if="postError" class="muted" style="color:#ff9b9b;">{{ postError }}</div>
          <div v-else class="post-items">
            <article
              v-for="post in filteredPosts"
              :key="post.id"
              class="card post-card"
              @click="openPost(post)"
            >
              <div class="post-head">
                <div class="post-user-row">
                  <div class="post-avatar" v-if="post.user.avatar">
                    <img :src="post.user.avatar" alt="avatar" />
                  </div>
                  <div class="post-user">{{ post.user.name }}</div>
                  <div class="muted">{{ formatDate(post.createdAt) }}</div>
                </div>
                <div class="tag-row">
                  <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
                </div>
              </div>
              <div class="post-status-row">
                <span class="status-pill" :class="statusClass(post.status)">{{ statusLabel(post.status) }}</span>
                <select
                  class="input status-select"
                  :value="post.status"
                  @click.stop
                  @change.stop="onPostStatusChange(post, $event.target.value)"
                >
                  <option v-for="s in contentStatusOptions" :key="s" :value="s">{{ statusLabel(s) }}</option>
                </select>
              </div>

              <div v-if="post.images.length" class="post-cover">
                <img :src="post.images[0]" alt="cover" />
              </div>
              <div v-if="post.images.length" class="muted" style="margin-top:8px;">共有 {{ post.images.length }} 张照片</div>

              <div class="post-text">{{ truncate(post.content, 150) }}</div>
              <button class="btn danger post-delete-btn" type="button" @click.stop="confirmDeletePost(post)">删除</button>
            </article>
          </div>
        </div>
      </div>

      <div v-else-if="activeKey === 'users'" class="admin-section">
        <div class="user-list">
          <div v-if="userLoading" class="muted">加载中...</div>
          <div v-else-if="userError" class="muted" style="color:#ff9b9b;">{{ userError }}</div>
          <div v-else class="user-grid">
            <article v-for="u in filteredUsers" :key="u.id" class="card user-card">
              <div class="user-avatar">
                <img v-if="u.avatar_url" :src="u.avatar_url" alt="avatar" />
                <div v-else class="avatar-fallback"></div>
              </div>
              <div class="user-meta">
                <div class="user-id">{{ u.id }}</div>
              </div>
              <div class="user-actions">
                <button class="btn danger" type="button" @click="confirmDeleteUser(u)">删除</button>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div v-else class="muted" style="margin-top:6px;">页面建设中。</div>
    </main>

    <div v-if="selectedPost" class="post-modal-wrap" @click="closePost">
      <section class="post-modal" @click.stop>
        <div class="post-modal-head">
          <div class="post-user-row">
            <div class="post-avatar" v-if="selectedPost.user.avatar">
              <img :src="selectedPost.user.avatar" alt="avatar" />
            </div>
            <div class="post-user">{{ selectedPost.user.name }}</div>
            <div class="muted">{{ formatDate(selectedPost.createdAt) }}</div>
          </div>
          <div class="post-status-actions">
            <span class="status-pill" :class="statusClass(selectedPost.status)">{{ statusLabel(selectedPost.status) }}</span>
            <select
              class="input status-select"
              :value="selectedPost.status"
              @click.stop
              @change.stop="onPostStatusChange(selectedPost, $event.target.value)"
            >
              <option v-for="s in contentStatusOptions" :key="s" :value="s">{{ statusLabel(s) }}</option>
            </select>
            <button class="btn danger" type="button" @click="confirmDeletePost(selectedPost)">删除</button>
          </div>
        </div>

        <div class="post-modal-body">
          <div v-if="selectedPost.images.length" class="carousel">
            <button class="btn ghost" @click="prevPostImage">‹</button>
            <div class="carousel-image">
              <img :src="selectedPost.images[postImageIndex]" alt="detail" />
              <div class="carousel-indicator">{{ postImageIndex + 1 }} / {{ selectedPost.images.length }}</div>
            </div>
            <button class="btn ghost" @click="nextPostImage">›</button>
          </div>

          <div class="post-modal-text">{{ selectedPost.content }}</div>

          <div class="comment-list">
            <div class="comment-title muted">评论</div>
            <div v-if="commentLoading" class="muted">加载中...</div>
            <div v-else-if="commentError" class="muted" style="color:#ff9b9b;">{{ commentError }}</div>
            <div v-else>
              <div v-for="c in selectedPost.comments" :key="c.id" class="comment-item">
                <div class="comment-avatar">
                  <img v-if="c.user.avatar" :src="c.user.avatar" alt="avatar" />
                  <div v-else class="avatar-fallback"></div>
                </div>
                <div class="comment-content">
                  <div class="comment-user">{{ c.user.name }}</div>
                  <div class="status-pill" :class="statusClass(c.status)">{{ statusLabel(c.status) }}</div>
                  <div class="comment-body">{{ c.body }}</div>
                  <div class="muted" style="margin-top:4px;">{{ formatDate(c.created_at) }}</div>
                </div>
                <div class="comment-actions">
                  <select
                    class="input status-select"
                    :value="c.status"
                    @click.stop
                    @change.stop="onCommentStatusChange(c, $event.target.value)"
                  >
                    <option v-for="s in contentStatusOptions" :key="s" :value="s">{{ statusLabel(s) }}</option>
                  </select>
                  <button class="btn danger" @click="confirmDeleteComment(c)">删除</button>
                </div>
              </div>
              <div v-if="!selectedPost.comments.length" class="muted">暂无评论</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="adminPublishOpen" class="modal-overlay" @click="closeAdminPublish">
      <section class="card modal-card" @click.stop>
        <div class="section-title">发布管理员帖子</div>
        <div class="muted" style="margin-top:6px;">图片上限 20 张，文字上限 2000 字</div>

        <div class="field" style="margin-top:12px;">
          <label class="muted">选择图片</label>
          <input class="input" type="file" accept="image/*" multiple @change="onAdminPublishFiles" />
          <div class="muted" style="margin-top:6px;">已选择 {{ adminPublishFiles.length }} / 20 张</div>
          <div v-if="adminPublishFiles.length" class="file-list">
            <div v-for="(file, idx) in adminPublishFiles" :key="file.name + idx" class="file-item">
              <img :src="adminPublishPreviews[idx]" alt="thumb" />
              <div class="file-name">{{ file.name }}</div>
              <button class="btn ghost" @click="removeAdminPublishFile(idx)">删除</button>
            </div>
          </div>
        </div>

        <div class="field">
          <label class="muted">首页摘要（可选）</label>
          <input class="input" v-model="adminPublishSummary" placeholder="一句话简介" />
        </div>

        <div class="field">
          <label class="muted">文字内容</label>
          <textarea class="input" rows="5" v-model="adminPublishContent" :maxlength="adminMaxText"></textarea>
          <div class="muted">{{ adminPublishContent.length }} / {{ adminMaxText }}</div>
        </div>

        <div class="field">
          <label class="muted">地标标签</label>
          <LandmarkPicker
            :items="landmarks"
            v-model="adminPublishLandmark"
            :show-selected-tag="true"
            selected-tag-label="最终提交的地标"
          />
        </div>

        <div class="field">
          <label class="muted">普通标签（最多 4 个）</label>
          <FreeTagInput
            v-model="adminSelectedTags"
            button-text="添加标签"
            placeholder="输入管理员帖子标签"
            empty-text="暂无标签"
            :max-tags="4"
          />
        </div>

        <div v-if="adminPublishMsg" class="muted" :style="{color: adminPublishError ? '#ff9b9b' : '#8fa1c2'}">{{ adminPublishMsg }}</div>

        <div class="row" style="justify-content: flex-end; gap:8px; margin-top:14px;">
          <button class="btn ghost" @click="closeAdminPublish">取消</button>
          <button class="btn primary" :disabled="adminPublishing" @click="submitAdminPost">
            {{ adminPublishing ? '发布中...' : '发布' }}
          </button>
        </div>
      </section>
    </div>

    <div v-if="addUserOpen" class="modal-overlay" @click="closeAddUser">
      <section class="card modal-card" @click.stop>
        <div class="section-title">添加用户</div>
        <div class="grid" style="grid-template-columns: 1fr; margin-top:12px; gap:10px;">
          <input class="input" v-model="addUserId" placeholder="用户 ID" />
          <input class="input" type="password" v-model="addUserPassword" placeholder="用户密码" />
        </div>
        <div class="row" style="justify-content: flex-end; gap:8px; margin-top:14px;">
          <button class="btn ghost" @click="closeAddUser">取消</button>
          <button class="btn primary" :disabled="addUserSubmitting" @click="submitAddUser">确认</button>
        </div>
        <div v-if="addUserError" class="muted" style="color:#ff9b9b; margin-top:6px;">{{ addUserError }}</div>
      </section>
    </div>

    <div v-if="createOpen" class="modal-overlay" @click="closeCreate">
      <section class="card modal-card" @click.stop>
        <div class="section-title">添加地标</div>
        <div class="muted" style="margin-top:6px;">经纬度范围：北纬 20-46，东经 122-154，精度到 0.0001</div>

        <div class="grid" style="grid-template-columns: 1fr 1fr; gap:10px; margin-top:12px;">
          <div>
            <label class="muted">地标名称（必填）</label>
            <input class="input" v-model="form.name" placeholder="名称" />
          </div>
          <div>
            <label class="muted">地标地址（必填）</label>
            <input class="input" v-model="form.address" placeholder="地址" />
          </div>
          <div>
            <label class="muted">纬度 lat（必填）</label>
            <input class="input" v-model.number="form.lat" type="number" step="0.0001" placeholder="纬度" />
          </div>
          <div>
            <label class="muted">经度 lng（必填）</label>
            <input class="input" v-model.number="form.lng" type="number" step="0.0001" placeholder="经度" />
          </div>
        </div>

        <div style="margin-top:10px;">
          <label class="muted">动画截图（必填）</label>
          <input class="input" type="file" accept="image/*" multiple @change="onShots" />
          <div class="muted" style="margin-top:6px;">已选择 {{ shotFiles.length }} 张</div>
          <div v-if="shotFiles.length" class="file-list">
            <div v-for="(file, idx) in shotFiles" :key="file.name + idx" class="file-item">
              <img :src="shotPreviews[idx]" alt="thumb" />
              <div class="file-name">{{ file.name }}</div>
              <button class="btn ghost" @click="removeShot(idx)">删除</button>
            </div>
          </div>
        </div>

        <div style="margin-top:10px;">
          <label class="muted">动画出处（必填）</label>
          <input class="input" v-model="form.animeSource" placeholder="作品名 第x集 xx分xx秒" />
          <div class="muted" style="font-size:12px; margin-top:4px;">推荐的格式为 作品名 第x集 xx分xx秒</div>
        </div>

        <div class="grid" style="grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
          <div>
            <label class="muted">地标别名（可选）</label>
            <input class="input" v-model="form.alias" placeholder="别名" />
          </div>
          <div>
            <label class="muted">地标介绍（可选）</label>
            <input class="input" v-model="form.description" placeholder="介绍" />
          </div>
        </div>

        <div class="row" style="justify-content: flex-end; gap:8px; margin-top:14px;">
          <button class="btn ghost" @click="closeCreate">取消</button>
          <button class="btn primary" :disabled="submitting" @click="submitCreate">
            {{ submitting ? '提交中...' : '创建' }}
          </button>
        </div>
        <div v-if="error" class="muted" style="color:#ff9b9b; margin-top:6px;">{{ error }}</div>
      </section>
    </div>

    <div v-if="editOpen" class="modal-overlay" @click="closeEdit">
      <section class="card modal-card" @click.stop>
        <div class="section-title">编辑地标</div>
        <div class="muted" style="margin-top:6px;">经纬度范围：北纬 20-46，东经 122-154，精度到 0.0001</div>

        <div class="grid" style="grid-template-columns: 1fr 1fr; gap:10px; margin-top:12px;">
          <div>
            <label class="muted">地标名称（必填）</label>
            <input class="input" v-model="editForm.name" placeholder="名称" />
          </div>
          <div>
            <label class="muted">地标地址（必填）</label>
            <input class="input" v-model="editForm.address" placeholder="地址" />
          </div>
          <div>
            <label class="muted">纬度 lat（必填）</label>
            <input class="input" v-model.number="editForm.lat" type="number" step="0.0001" placeholder="纬度" />
          </div>
          <div>
            <label class="muted">经度 lng（必填）</label>
            <input class="input" v-model.number="editForm.lng" type="number" step="0.0001" placeholder="经度" />
          </div>
        </div>

        <div style="margin-top:10px;">
          <label class="muted">动画截图（可选）</label>
          <input class="input" type="file" accept="image/*" multiple @change="onEditShots" />
          <div class="muted" style="margin-top:6px;">已选择 {{ editShotFiles.length }} 张（不选择则保留现有截图）</div>
          <div v-if="existingShots.length" class="file-list">
            <div v-for="(item, idx) in existingShots" :key="item.key" class="file-item">
              <img :src="item.url" alt="existing" />
              <div class="file-name">已上传截图 {{ idx + 1 }}</div>
              <div class="file-actions">
                <button class="btn ghost" @click="replaceExistingShot(idx)">替换</button>
                <button class="btn ghost" @click="removeExistingShot(idx)">删除</button>
              </div>
            </div>
          </div>
          <input
            ref="replaceInput"
            type="file"
            accept="image/*"
            style="display:none;"
            @change="onReplaceExisting"
          />
          <div v-if="editShotFiles.length" class="file-list">
            <div v-for="(file, idx) in editShotFiles" :key="file.name + idx" class="file-item">
              <img :src="editShotPreviews[idx]" alt="thumb" />
              <div class="file-name">{{ file.name }}</div>
              <button class="btn ghost" @click="removeEditShot(idx)">删除</button>
            </div>
          </div>
        </div>

        <div style="margin-top:10px;">
          <label class="muted">动画出处（必填）</label>
          <input class="input" v-model="editForm.animeSource" placeholder="作品名 第x集 xx分xx秒" />
          <div class="muted" style="font-size:12px; margin-top:4px;">推荐的格式为 作品名 第x集 xx分xx秒</div>
        </div>

        <div class="grid" style="grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
          <div>
            <label class="muted">地标别名（可选）</label>
            <input class="input" v-model="editForm.alias" placeholder="别名" />
          </div>
          <div>
            <label class="muted">地标介绍（可选）</label>
            <input class="input" v-model="editForm.description" placeholder="介绍" />
          </div>
        </div>

        <div class="row" style="justify-content: flex-end; gap:8px; margin-top:14px;">
          <button class="btn ghost" @click="closeEdit">取消</button>
          <button class="btn primary" :disabled="editSubmitting" @click="submitEdit">
            {{ editSubmitting ? '保存中...' : '保存修改' }}
          </button>
        </div>
        <div v-if="editError" class="muted" style="color:#ff9b9b; margin-top:6px;">{{ editError }}</div>
      </section>
    </div>

      </div>

      <div v-if="authOpen" class="modal-overlay">
        <section class="card modal-card" @click.stop>
          <div class="section-title">管理员验证</div>
          <div class="muted" style="margin-top:6px;">口令 1 小时内有效</div>
          <div style="margin-top:12px;">
            <input class="input" type="password" v-model="authPassword" placeholder="ADMIN_PASSWORD" />
          </div>
          <div class="row" style="justify-content: flex-end; gap:8px; margin-top:14px;">
            <button class="btn primary" :disabled="authSubmitting" @click="submitAuth">
              {{ authSubmitting ? '验证中...' : '确认' }}
            </button>
          </div>
          <div v-if="authError" class="muted" style="color:#ff9b9b; margin-top:6px;">{{ authError }}</div>
        </section>
      </div>
    </template>

    <div v-else class="admin-gate-shell">
      <section class="card admin-gate-card">
        <div class="section-title">管理员验证</div>
        <div v-if="adminChecking" class="muted" style="margin-top:6px;">正在验证缓存口令...</div>
        <template v-else>
          <div class="muted" style="margin-top:6px;">验证通过前不显示后台内容。</div>
          <div style="margin-top:12px;">
            <input class="input" type="password" v-model="authPassword" placeholder="ADMIN_PASSWORD" />
          </div>
          <div class="row" style="justify-content: flex-end; gap:8px; margin-top:14px;">
            <button class="btn primary" :disabled="authSubmitting" @click="submitAuth">
              {{ authSubmitting ? '验证中...' : '进入管理员界面' }}
            </button>
          </div>
          <div v-if="authError" class="muted" style="color:#ff9b9b; margin-top:6px;">{{ authError }}</div>
        </template>
      </section>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api.js'
import { compressFile } from '../utils/imageCompressor.js'
import FreeTagInput from '../components/FreeTagInput.vue'
import LandmarkPicker from '../components/LandmarkPicker.vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { key: 'landmarks', label: '地标管理' },
  { key: 'posts', label: '帖子管理' },
  { key: 'users', label: '用户管理' }
]

const createOpen = ref(false)
const submitting = ref(false)
const error = ref('')
const shotFiles = ref([])
const shotPreviews = ref([])
const authOpen = ref(false)
const authSubmitting = ref(false)
const authPassword = ref('')
const authError = ref('')
const adminChecking = ref(true)
const adminReady = ref(false)
const landmarks = ref([])
const landmarkLoading = ref(false)
const landmarkError = ref('')
const postLoading = ref(false)
const postError = ref('')
const posts = ref([])
const selectedPost = ref(null)
const postImageIndex = ref(0)
const commentLoading = ref(false)
const commentError = ref('')
const postSortBy = ref('time')
const postSortOrder = ref('desc')
const postFilterLandmark = ref('')
const postFilterLandmarkObj = computed({
  get: () => landmarks.value.find(lm => lm.name === postFilterLandmark.value) || null,
  set: (lm) => { postFilterLandmark.value = lm ? lm.name : '' }
})
const postSelectedTags = ref([])
const postSearchQuery = ref('')
const postAdminOnly = ref(false)
const contentStatusOptions = ['pending', 'approved', 'locked']
const userLoading = ref(false)
const userError = ref('')
const users = ref([])
const userSearchQuery = ref('')
const addUserOpen = ref(false)
const addUserId = ref('')
const addUserPassword = ref('')
const addUserSubmitting = ref(false)
const addUserError = ref('')
const adminPublishOpen = ref(false)
const adminPublishing = ref(false)
const adminPublishMsg = ref('')
const adminPublishError = ref(false)
const adminPublishFiles = ref([])
const adminPublishPreviews = ref([])
const adminPublishContent = ref('')
const adminPublishSummary = ref('')
const adminPublishLandmark = ref(null)
const adminSelectedTags = ref([])
const editOpen = ref(false)
const editSubmitting = ref(false)
const editError = ref('')
const editShotFiles = ref([])
const editShotPreviews = ref([])
const existingShots = ref([])
const replaceInput = ref(null)
const replaceIndex = ref(null)
const editId = ref(null)
const form = ref({
  name: '',
  address: '',
  lat: '',
  lng: '',
  animeSource: '',
  alias: '',
  description: ''
})
const editForm = ref({
  name: '',
  address: '',
  lat: '',
  lng: '',
  animeSource: '',
  alias: '',
  description: ''
})

const searchQuery = ref('')

const activeKey = computed(() => {
  const key = String(route.query.section || 'landmarks')
  return navItems.some(i => i.key === key) ? key : 'landmarks'
})

const activeLabel = computed(() => {
  return navItems.find(i => i.key === activeKey.value)?.label || '地标管理'
})

const filteredLandmarks = computed(() => {
  const q = String(searchQuery.value || '').trim().toLowerCase()
  if (!q) return landmarks.value
  return landmarks.value.filter(lm => {
    const name = String(lm.name || '').toLowerCase()
    const address = String(lm.address || '').toLowerCase()
    const alias = String(lm.alias || '').toLowerCase()
    const source = String(lm.anime_source || '').toLowerCase()
    return name.includes(q) || address.includes(q) || alias.includes(q) || source.includes(q)
  })
})

const filteredPosts = computed(() => {
  let list = [...posts.value]
  if (postFilterLandmark.value) {
    list = list.filter(p => (p.tags || []).includes(postFilterLandmark.value))
  }
  if (postSelectedTags.value.length) {
    list = list.filter(p => postSelectedTags.value.every(t => (p.tags || []).includes(t)))
  }
  if (String(postSearchQuery.value || '').trim()) {
    const q = String(postSearchQuery.value || '').trim().toLowerCase()
    list = list.filter(p => {
      const content = String(p.content || '').toLowerCase()
      const userName = String(p.user?.name || '').toLowerCase()
      const tags = (p.tags || []).join(' ').toLowerCase()
      return content.includes(q) || userName.includes(q) || tags.includes(q)
    })
  }
  const dir = postSortOrder.value === 'asc' ? 1 : -1
  if (postSortBy.value === 'likes') {
    return list.sort((a, b) => (a.likes - b.likes) * dir)
  }
  return list.sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) * dir)
})

const filteredUsers = computed(() => {
  const q = String(userSearchQuery.value || '').trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(u => String(u?.id || '').toLowerCase().includes(q))
})

const adminMaxImages = 20
const adminMaxText = 2000

function goSection(key) {
  router.replace({ name: 'admin', query: { section: key } })
}

function openCreate() {
  if (!ensureAdminReady()) return
  createOpen.value = true
  error.value = ''
}

function closeCreate() {
  createOpen.value = false
  error.value = ''
  clearShotPreviews()
  shotFiles.value = []
}

function openAuth() {
  authOpen.value = true
  authPassword.value = ''
  authError.value = ''
}

function closeAuth() {
  authOpen.value = false
  authError.value = ''
}

function ensureAdminReady() {
  if (adminReady.value) return true
  openAuth()
  return false
}

function onShots(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  const nextFiles = [...shotFiles.value, ...files]
  const nextPreviews = [...shotPreviews.value, ...files.map(f => URL.createObjectURL(f))]
  shotFiles.value = nextFiles
  shotPreviews.value = nextPreviews
  e.target.value = ''
}

function onEditShots(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  const nextFiles = [...editShotFiles.value, ...files]
  const nextPreviews = [...editShotPreviews.value, ...files.map(f => URL.createObjectURL(f))]
  editShotFiles.value = nextFiles
  editShotPreviews.value = nextPreviews
  e.target.value = ''
}

function removeShot(idx) {
  if (idx < 0 || idx >= shotFiles.value.length) return
  const nextFiles = [...shotFiles.value]
  const nextPreviews = [...shotPreviews.value]
  const [removedUrl] = nextPreviews.splice(idx, 1)
  if (removedUrl) URL.revokeObjectURL(removedUrl)
  nextFiles.splice(idx, 1)
  shotFiles.value = nextFiles
  shotPreviews.value = nextPreviews
}

function removeEditShot(idx) {
  if (idx < 0 || idx >= editShotFiles.value.length) return
  const nextFiles = [...editShotFiles.value]
  const nextPreviews = [...editShotPreviews.value]
  const [removedUrl] = nextPreviews.splice(idx, 1)
  if (removedUrl) URL.revokeObjectURL(removedUrl)
  nextFiles.splice(idx, 1)
  editShotFiles.value = nextFiles
  editShotPreviews.value = nextPreviews
}

function clearShotPreviews() {
  shotPreviews.value.forEach(url => URL.revokeObjectURL(url))
  shotPreviews.value = []
}

function clearEditShotPreviews() {
  editShotPreviews.value.forEach(url => URL.revokeObjectURL(url))
  editShotPreviews.value = []
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString()
}

function truncate(text, max) {
  const s = String(text || '')
  return s.length > max ? `${s.slice(0, max)}...` : s
}

function isBlobUrl(url) {
  return String(url || '').startsWith('blob:')
}

function extractRelPath(url) {
  const s = String(url || '')
  const idx = s.indexOf('/api/uploads/')
  if (idx === -1) return ''
  return s.slice(idx + '/api/uploads/'.length)
}

function initExistingShots(urls) {
  existingShots.value = (Array.isArray(urls) ? urls : [])
    .filter(Boolean)
    .map((url, idx) => ({
      key: `${url}-${idx}`,
      url,
      rel: extractRelPath(url),
      file: null
    }))
}

function clearExistingShots() {
  existingShots.value.forEach(item => {
    if (item?.file && isBlobUrl(item.url)) URL.revokeObjectURL(item.url)
  })
  existingShots.value = []
}

function removeExistingShot(idx) {
  if (idx < 0 || idx >= existingShots.value.length) return
  const next = [...existingShots.value]
  const removed = next.splice(idx, 1)[0]
  if (removed?.file && isBlobUrl(removed.url)) URL.revokeObjectURL(removed.url)
  existingShots.value = next
}

function replaceExistingShot(idx) {
  replaceIndex.value = idx
  if (replaceInput.value) replaceInput.value.click()
}

function onReplaceExisting(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  const file = files[0]
  const idx = Number(replaceIndex.value)
  if (!Number.isFinite(idx) || idx < 0 || idx >= existingShots.value.length) return
  const next = [...existingShots.value]
  const prev = next[idx]
  if (prev?.file && isBlobUrl(prev.url)) URL.revokeObjectURL(prev.url)
  next[idx] = {
    key: `${prev?.key || idx}-replaced-${Date.now()}`,
    url: URL.createObjectURL(file),
    rel: '__upload__',
    file
  }
  existingShots.value = next
  e.target.value = ''
}

function validateLatLng(lat, lng) {
  return lat >= 20 && lat <= 46 && lng >= 122 && lng <= 154
}

function togglePostAdminOnly() {
  postAdminOnly.value = !postAdminOnly.value
}

function openAddUser() {
  if (!ensureAdminReady()) return
  addUserOpen.value = true
  addUserError.value = ''
}

function closeAddUser() {
  addUserOpen.value = false
  addUserId.value = ''
  addUserPassword.value = ''
  addUserError.value = ''
}

async function confirmDeleteUser(user) {
  if (!ensureAdminReady()) return
  const uid = String(user?.id || '').trim()
  if (!uid) return
  const ok = confirm(`确认删除用户 ${uid} 吗？此操作不可撤销。`)
  if (!ok) return
  try {
    await api.adminDeleteUser(uid)
    await loadUsers()
  } catch (err) {
    alert(err?.message || '删除失败')
  }
}

function openAdminPublish() {
  if (!ensureAdminReady()) return
  adminPublishOpen.value = true
  adminPublishMsg.value = ''
  adminPublishError.value = false
}

function closeAdminPublish() {
  adminPublishOpen.value = false
  cleanupAdminPublishPreviews()
  adminPublishFiles.value = []
  adminPublishContent.value = ''
  adminPublishSummary.value = ''
  adminPublishLandmark.value = null
  adminSelectedTags.value = []
  adminPublishMsg.value = ''
  adminPublishError.value = false
}

function onAdminPublishFiles(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  const combined = [...adminPublishFiles.value, ...files]
  if (combined.length > adminMaxImages) {
    adminPublishMsg.value = `最多选择 ${adminMaxImages} 张图片`
    adminPublishError.value = true
  }
  const nextFiles = combined.slice(0, adminMaxImages)
  rebuildAdminPublishPreviews(nextFiles)
  adminPublishFiles.value = nextFiles
  e.target.value = ''
}

function cleanupAdminPublishPreviews() {
  for (const url of adminPublishPreviews.value) {
    try { URL.revokeObjectURL(url) } catch {}
  }
  adminPublishPreviews.value = []
}

function rebuildAdminPublishPreviews(files) {
  cleanupAdminPublishPreviews()
  adminPublishPreviews.value = files.map(f => URL.createObjectURL(f))
}

function removeAdminPublishFile(index) {
  const nextFiles = adminPublishFiles.value.filter((_, i) => i !== index)
  rebuildAdminPublishPreviews(nextFiles)
  adminPublishFiles.value = nextFiles
}

function selectAdminLandmark(lm) {
  adminPublishLandmark.value = lm
}

async function submitAdminPost() {
  adminPublishMsg.value = ''
  adminPublishError.value = false
  const content = String(adminPublishContent.value || '').trim()
  const summary = String(adminPublishSummary.value || '').trim()
  if (!content) {
    adminPublishMsg.value = '请输入内容'
    adminPublishError.value = true
    return
  }
  if (content.length > adminMaxText) {
    adminPublishMsg.value = '内容过长'
    adminPublishError.value = true
    return
  }
  if (adminPublishFiles.value.length > adminMaxImages) {
    adminPublishMsg.value = '图片数量超出限制'
    adminPublishError.value = true
    return
  }

  adminPublishing.value = true
  try {
    const fd = new FormData()
    fd.append('content', content)
    fd.append('summary', summary)
    if (adminPublishLandmark.value?.id) fd.append('landmark_id', adminPublishLandmark.value.id)
    fd.append('normal_tags', JSON.stringify(adminSelectedTags.value))

    for (const f of adminPublishFiles.value) {
      let fileToUpload = null
      try {
        fileToUpload = await compressFile(f, { quality: 0.82, maxWidth: 2560 })
      } catch {
        throw new Error('图片转换失败，请重试')
      }
      fd.append('images', fileToUpload)
    }

    const res = await api.adminCreatePost(fd)
    const mapped = mapPost(res.data)
    posts.value = [mapped, ...posts.value]
    closeAdminPublish()
  } catch (err) {
    adminPublishMsg.value = err?.message || '发布失败'
    adminPublishError.value = true
  } finally {
    adminPublishing.value = false
  }
}

async function submitCreate() {
  if (!ensureAdminReady()) return
  const payload = form.value
  const lat = Number(Number(payload.lat).toFixed(4))
  const lng = Number(Number(payload.lng).toFixed(4))
  if (!payload.name || !payload.address || !payload.animeSource || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    error.value = '请填写所有必填项'
    return
  }
  if (!validateLatLng(lat, lng)) {
    error.value = '经纬度超出范围'
    return
  }
  if (!shotFiles.value.length) {
    error.value = '请上传动画截图'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    const metadata = {
      name: payload.name,
      lat,
      lng,
      address: payload.address,
      anime_source: payload.animeSource,
      alias: payload.alias,
      description: payload.description
    }
    const fd = new FormData()
    fd.append('name', payload.name)
    fd.append('lat', String(lat))
    fd.append('lng', String(lng))
    fd.append('address', payload.address)
    fd.append('anime_source', payload.animeSource)
    fd.append('alias', payload.alias || '')
    fd.append('description', payload.description || '')
    fd.append('metadata', JSON.stringify(metadata))
    for (const f of shotFiles.value) {
      let fileToUpload = null
      try {
        fileToUpload = await compressFile(f, { quality: 0.92 })
      } catch {
        throw new Error('截图转换失败，请重试')
      }
      fd.append('anime_shots', fileToUpload)
    }
    await api.createLandmark(fd)
    closeCreate()
    await loadLandmarks()
  } catch (err) {
    error.value = err?.message || '创建失败'
  } finally {
    submitting.value = false
  }
}

function cardImage(lm) {
  const urls = Array.isArray(lm?.anime_shot_urls) ? lm.anime_shot_urls : []
  const url = urls[0] || ''
  if (!url) return ''
  return `background-image: url('${url}')`
}

function mapPost(p) {
  return {
    id: p.id,
    user: { name: p.user_name, avatar: p.user_avatar_url || '' },
    createdAt: p.created_at,
    likes: p.like_count || 0,
    content: p.content || '',
    status: p.status || 'approved',
    tags: p.tags || [],
    images: p.images || [],
    comments: []
  }
}

function statusLabel(status) {
  if (status === 'pending') return '待审核'
  if (status === 'locked') return '已锁定'
  return '已通过'
}

function statusClass(status) {
  if (status === 'pending') return 'status-pending'
  if (status === 'locked') return 'status-locked'
  return 'status-approved'
}

function openPost(post) {
  selectedPost.value = post
  postImageIndex.value = 0
  commentError.value = ''
  loadPostComments()
}

function closePost() {
  selectedPost.value = null
  postImageIndex.value = 0
}

function prevPostImage() {
  if (!selectedPost.value?.images?.length) return
  postImageIndex.value = (postImageIndex.value - 1 + selectedPost.value.images.length) % selectedPost.value.images.length
}

function nextPostImage() {
  if (!selectedPost.value?.images?.length) return
  postImageIndex.value = (postImageIndex.value + 1) % selectedPost.value.images.length
}

async function loadPostComments() {
  if (!selectedPost.value?.id) return
  commentLoading.value = true
  commentError.value = ''
  try {
    const res = await api.adminGetPostComments(selectedPost.value.id, 'asc')
    const list = res.data || []
    selectedPost.value.comments = list.map(c => ({
      id: c.id,
      user: { name: c.user_name, avatar: c.user_avatar_url || '' },
      body: c.body,
      status: c.status || 'approved',
      created_at: c.created_at
    }))
  } catch (err) {
    commentError.value = err?.message || '评论加载失败'
  } finally {
    commentLoading.value = false
  }
}

async function confirmDeletePost(post) {
  if (!post?.id) return
  const ok = confirm('确认删除该帖子吗？此操作不可撤销。')
  if (!ok) return
  try {
    await api.adminDeletePost(post.id)
    posts.value = posts.value.filter(p => p.id !== post.id)
    if (selectedPost.value?.id === post.id) closePost()
  } catch (err) {
    alert(err?.message || '删除失败')
  }
}

async function confirmDeleteComment(comment) {
  if (!comment?.id || !selectedPost.value) return
  const ok = confirm('确认删除该评论吗？此操作不可撤销。')
  if (!ok) return
  try {
    await api.adminDeletePostComment(comment.id)
    selectedPost.value.comments = (selectedPost.value.comments || []).filter(c => c.id !== comment.id)
  } catch (err) {
    alert(err?.message || '删除失败')
  }
}

function openEdit(lm) {
  if (!ensureAdminReady()) return
  if (!lm?.id) return
  editId.value = lm.id
  editForm.value = {
    name: lm.name || '',
    address: lm.address || '',
    lat: Number.isFinite(lm.lat) ? lm.lat : '',
    lng: Number.isFinite(lm.lng) ? lm.lng : '',
    animeSource: lm.anime_source || '',
    alias: lm.alias || '',
    description: lm.description || ''
  }
  initExistingShots(lm.anime_shot_urls)
  clearEditShotPreviews()
  editShotFiles.value = []
  editError.value = ''
  editOpen.value = true
}

async function confirmDelete(lm) {
  if (!ensureAdminReady()) return
  if (!lm?.id) return
  const ok = confirm(`确认删除地标「${lm.name || ''}」吗？此操作不可撤销。`)
  if (!ok) return
  try {
    await api.deleteLandmark(lm.id)
    await loadLandmarks()
  } catch (err) {
    alert(err?.message || '删除失败')
  }
}

function closeEdit() {
  editOpen.value = false
  editError.value = ''
  clearEditShotPreviews()
  editShotFiles.value = []
  clearExistingShots()
  editId.value = null
}

async function submitEdit() {
  if (!ensureAdminReady()) return
  if (!editId.value) return
  const payload = editForm.value
  const lat = Number(Number(payload.lat).toFixed(4))
  const lng = Number(Number(payload.lng).toFixed(4))
  if (!payload.name || !payload.address || !payload.animeSource || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    editError.value = '请填写所有必填项'
    return
  }
  if (!validateLatLng(lat, lng)) {
    editError.value = '经纬度超出范围'
    return
  }

  editSubmitting.value = true
  editError.value = ''
  try {
    const uploadMarker = '__upload__'
    const existingShotsPayload = []
    const uploadFiles = []
    existingShots.value.forEach(item => {
      if (item?.rel === uploadMarker && item.file) {
        existingShotsPayload.push(uploadMarker)
        uploadFiles.push(item.file)
      } else if (item?.rel) {
        existingShotsPayload.push(item.rel)
      }
    })
    editShotFiles.value.forEach(file => {
      existingShotsPayload.push(uploadMarker)
      uploadFiles.push(file)
    })

    const metadata = {
      name: payload.name,
      lat,
      lng,
      address: payload.address,
      anime_source: payload.animeSource,
      alias: payload.alias,
      description: payload.description,
      anime_shots: existingShotsPayload
    }
    const fd = new FormData()
    fd.append('name', payload.name)
    fd.append('lat', String(lat))
    fd.append('lng', String(lng))
    fd.append('address', payload.address)
    fd.append('anime_source', payload.animeSource)
    fd.append('alias', payload.alias || '')
    fd.append('description', payload.description || '')
    fd.append('metadata', JSON.stringify(metadata))
    for (const f of uploadFiles) {
      let fileToUpload = null
      try {
        fileToUpload = await compressFile(f, { quality: 0.92 })
      } catch {
        throw new Error('截图转换失败，请重试')
      }
      fd.append('anime_shots', fileToUpload)
    }
    await api.updateLandmark(editId.value, fd)
    closeEdit()
    await loadLandmarks()
  } catch (err) {
    editError.value = err?.message || '保存失败'
  } finally {
    editSubmitting.value = false
  }
}

async function verifyCachedAdmin() {
  adminChecking.value = true
  authError.value = ''
  if (!api.hasAdminPassword()) {
    adminReady.value = false
    openAuth()
    adminChecking.value = false
    return
  }
  try {
    await api.adminVerify()
    adminReady.value = true
    authOpen.value = false
  } catch {
    api.clearAdminPassword()
    adminReady.value = false
    openAuth()
    authError.value = '口令已失效，请重新输入'
  } finally {
    adminChecking.value = false
  }
}

async function loadLandmarks() {
  if (!adminReady.value) return
  landmarkLoading.value = true
  landmarkError.value = ''
  try {
    const res = await api.getLandmarks()
    landmarks.value = res.data || []
  } catch (err) {
    landmarkError.value = err?.message || '加载失败'
  } finally {
    landmarkLoading.value = false
  }
}

async function loadPosts() {
  if (!adminReady.value) return
  postLoading.value = true
  postError.value = ''
  try {
    const res = await api.getPosts({
      sortBy: postSortBy.value,
      order: postSortOrder.value,
      adminOnly: postAdminOnly.value,
      limit: 200,
      includeAll: true
    })
    posts.value = (res.data || []).map(mapPost)
  } catch (err) {
    postError.value = err?.message || '加载失败'
  } finally {
    postLoading.value = false
  }
}

async function onPostStatusChange(post, nextStatus) {
  const target = String(nextStatus || '').trim()
  if (!post?.id || !target) return
  const prev = post.status
  post.status = target
  try {
    await api.adminUpdatePostStatus(post.id, target)
  } catch (err) {
    post.status = prev
    alert(err?.message || '更新失败')
  }
}

async function onCommentStatusChange(comment, nextStatus) {
  const target = String(nextStatus || '').trim()
  if (!comment?.id || !target) return
  const prev = comment.status
  comment.status = target
  try {
    await api.adminUpdatePostCommentStatus(comment.id, target)
  } catch (err) {
    comment.status = prev
    alert(err?.message || '更新失败')
  }
}

async function loadUsers() {
  if (!adminReady.value) return
  userLoading.value = true
  userError.value = ''
  try {
    const res = await api.adminListUsers()
    users.value = res.data || []
  } catch (err) {
    userError.value = err?.message || '加载失败'
  } finally {
    userLoading.value = false
  }
}

async function submitAddUser() {
  if (!ensureAdminReady()) return
  const uid = String(addUserId.value || '').trim()
  const pwd = String(addUserPassword.value || '').trim()
  if (!uid || !pwd) {
    addUserError.value = '请填写用户 ID 和密码'
    return
  }
  const ok = confirm(`确认添加用户 ${uid} 吗？`)
  if (!ok) return
  addUserSubmitting.value = true
  addUserError.value = ''
  try {
    await api.adminCreateUser(uid, pwd)
    closeAddUser()
    await loadUsers()
  } catch (err) {
    addUserError.value = err?.message || '添加失败'
  } finally {
    addUserSubmitting.value = false
  }
}

async function submitAuth() {
  if (!authPassword.value) {
    authError.value = '请输入管理员口令'
    return
  }
  authSubmitting.value = true
  authError.value = ''
  try {
    await api.adminVerify(authPassword.value)
    api.setAdminPassword(authPassword.value)
    adminReady.value = true
    authOpen.value = false
    authPassword.value = ''
  } catch (err) {
    authError.value = err?.message || '验证失败'
  } finally {
    authSubmitting.value = false
  }
}

onMounted(() => {
  verifyCachedAdmin()
})

watch(adminReady, (next) => {
  if (next) {
    loadLandmarks()
    loadUsers()
    loadPosts()
    return
  }
  selectedPost.value = null
  landmarks.value = []
  posts.value = []
  users.value = []
}, { flush: 'post' })

watch([postSortBy, postSortOrder, postAdminOnly], () => {
  loadPosts()
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--bg);
}
.admin-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
  background: var(--bg);
  width: 100%;
  flex: 1;
  min-width: 0;
}
.admin-gate-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg);
}
.admin-gate-card {
  width: min(420px, 100%);
}
.admin-nav {
  border-right: 1px solid var(--border);
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.admin-brand {
  font-weight: 700;
  letter-spacing: 0.2px;
}
.admin-links {
  display: grid;
  gap: 8px;
}
.admin-link {
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  cursor: pointer;
  font-weight: 600;
}
.admin-link.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(74, 208, 255, 0.08);
}
.admin-content {
  padding: 18px;
  width: 100%;
}
.admin-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.admin-search {
  width: min(320px, 40vw);
}
.admin-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}
.toolbar {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.toolbar-search {
  width: 100%;
}
.toolbar-search .input {
  min-width: min(420px, 90vw);
}
.toolbar-group.toolbar-tags {
  flex: 1 1 280px;
  min-width: 240px;
  align-items: flex-start;
}
.tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.post-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  width: 100%;
  padding: 12px 0 16px;
}
.post-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.post-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  width: 100%;
  position: relative;
}
.post-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.post-status-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-pill {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
}
.status-approved {
  background: rgba(74, 208, 255, 0.12);
  color: #6fd9ff;
  border-color: rgba(74, 208, 255, 0.4);
}
.status-pending {
  background: rgba(255, 199, 92, 0.14);
  color: #ffd48a;
  border-color: rgba(255, 199, 92, 0.35);
}
.status-locked {
  background: rgba(255, 107, 107, 0.12);
  color: #ff9b9b;
  border-color: rgba(255, 107, 107, 0.35);
}
.status-select {
  min-width: 110px;
}
.post-delete-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
}
.post-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.post-user-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.post-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.post-avatar img {
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}
.post-user {
  width: 100%;
  font-weight: 700;
}
.tag-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0,119,255,0.08);
  color: var(--text);
  font-size: 12px;
  line-height: 1;
}
.post-cover img {
  width: 100%;
  border-radius: 10px;
  object-fit: cover;
}
.post-text {
  color: var(--text);
  line-height: 1.5;
}
.post-modal {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(880px, 92vw);
  height: min(80vh, 720px);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
}
.post-modal-wrap {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(5, 10, 18, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.post-modal-head {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.post-modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.carousel {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
}
.carousel-image {
  position: relative;
}
.carousel img {
  width: 100%;
  border-radius: 12px;
  object-fit: cover;
}
.carousel-indicator {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 4px 8px;
  border-radius: 10px;
  background: rgba(10, 16, 28, 0.45);
  color: var(--text);
  font-size: 12px;
}
.post-modal-text {
  line-height: 1.7;
  color: var(--text);
}
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.comment-title {
  font-weight: 600;
}
.comment-item {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: 10px;
  align-items: flex-start;
}
.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border);
}
.comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(11,17,32,0.04);
}
.comment-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.comment-user {
  font-weight: 700;
}
.comment-body {
  color: var(--text);
  line-height: 1.5;
}
.comment-actions {
  display: flex;
  align-items: center;
}
.user-list {
  margin-top: 12px;
}
.user-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-actions {
  margin-left: auto;
}
.tag-manage-list {
  margin-top: 12px;
}
.tag-manage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.tag-manage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.tag-name {
  font-weight: 700;
}
.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #132032;
}
.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.user-id {
  font-weight: 700;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 10, 18, 0.45);
  backdrop-filter: blur(2px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-card {
  width: min(720px, 92vw);
}
.admin-landmark-list {
  margin-top: 16px;
  width: 100%;
}
.admin-section {
  width: 100%;
}
.landmark-grid.admin-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 12px;
  width: 100%;
}
.landmark-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 260px;
  box-shadow: 0 10px 24px rgba(10,20,40,0.06);
  cursor: pointer;
  position: relative;
}
.btn-delete {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 6px 10px;
  font-size: 12px;
}
.landmark-image {
  width: 100%;
  aspect-ratio: 5 / 4;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--card);
  background-position: center;
  background-size: cover;
}
.landmark-name {
  font-weight: 700;
  font-size: 20px;
  letter-spacing: 0.2px;
  padding: 4px 6px 2px;
}
.file-list {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}
.file-item {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
}
.file-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.file-item img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.file-name {
  font-size: 12px;
  color: var(--muted);
  word-break: break-all;
}

@media (max-width: 880px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }
  .admin-nav {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--bg);
  }
}
@media (max-width: 1200px) {
  .landmark-grid.admin-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .user-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .tag-manage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .landmark-grid.admin-grid {
    grid-template-columns: 1fr;
  }
  .user-grid {
    grid-template-columns: 1fr;
  }
  .tag-manage-grid {
    grid-template-columns: 1fr;
  }
}
</style>
