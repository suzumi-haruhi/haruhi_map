<template>
  <div class="page-pad community" :class="{ 'modal-active': publishOpen || publishLeaving, 'teleport-active': teleportToolbar }">
    <!-- 右下角回到顶部按钮（在社区容器内定位，不随内容滚动，但会随容器缩放） -->
    <button class="scroll-top-btn" :style="scrollBtnStyle" type="button" @click="scrollCommunityTop" aria-label="回到顶部">
      <img src="@/assets/konata_up.webp" alt="up" class="scroll-top-img" />
    </button>
    <template v-if="teleportToolbar">
      <teleport to="#community-topbar">
        <div class="community-topbar-inner">
          <CommunityToolbar
            :landmarks="landmarks"
            v-model:sortBy="sortBy"
            v-model:sortOrder="sortOrder"
            v-model:filterLandmark="filterLandmarkObj"
            :selectedFilterTags="selectedFilterTags"
            v-model:searchQuery="searchQuery"
            :adminOnly="adminOnly"
            :visibleCount="sortedPosts.length"
            :totalCount="posts.length"
            :activeFilterCount="activeFilterCount"
            @toggle-admin-only="toggleAdminOnly"
            @remove-filter-tag="removeSelectedFilterTag"
            @clear-filters="clearFilters"
            @open-publish="openPublish"
          />
        </div>
      </teleport>
    </template>

    <template v-else>
      <CommunityToolbar
        :landmarks="landmarks"
        v-model:sortBy="sortBy"
        v-model:sortOrder="sortOrder"
        v-model:filterLandmark="filterLandmarkObj"
        :selectedFilterTags="selectedFilterTags"
        v-model:searchQuery="searchQuery"
        :adminOnly="adminOnly"
        :visibleCount="sortedPosts.length"
        :totalCount="posts.length"
        :activeFilterCount="activeFilterCount"
        @toggle-admin-only="toggleAdminOnly"
        @remove-filter-tag="removeSelectedFilterTag"
        @clear-filters="clearFilters"
        @open-publish="openPublish"
      />
    </template>

    <div class="community-main">

      <TransitionGroup name="post-filter" tag="div" class="post-list">
        <article
            v-for="post in sortedPosts"
            :key="post.id"
            :id="'post-' + post.id"
            class="card post-card"
            @click="openPost(post)"
          >
          <!-- 头图 -->
          <div
            v-if="post.coverImages && post.coverImages.length"
            class="wf-cover"
            :class="{
              'is-grid': post.coverImages.length > 1,
              'count-2': post.coverImages.length === 2,
              'count-3': post.coverImages.length === 3
            }"
          >
            <template v-if="post.coverImages.length === 1">
              <img :src="post.coverImages[0]" alt="cover" loading="lazy" />
            </template>
            <template v-else>
              <div v-for="(img, idx) in post.coverImages" :key="`${post.id}-cover-${idx}`" class="wf-cover-tile">
                <img :src="img" alt="cover" loading="lazy" />
              </div>
            </template>
          </div>

          <div class="wf-body">
            <!-- 用户信息 + 发布时间 -->
            <div class="wf-meta-row">
              <div class="wf-user-info">
                <div class="post-avatar" v-if="post.user.avatar">
                  <img :src="post.user.avatar" alt="avatar" />
                </div>
                <div v-else class="post-avatar-placeholder">{{ (post.user.name || '?')[0].toUpperCase() }}</div>
                <span class="wf-user">{{ post.user.name }}</span>
              </div>
              <span class="muted wf-date">{{ formatDate(post.createdAt) }}</span>
            </div>

            <!-- 标题+地标标签（左）+ 普通标签（右） -->
            <div class="wf-tags-title-row">
              <div class="wf-left-col">
                <div v-if="post.title" class="wf-title">{{ post.title }}</div>
                <div class="wf-tags-landmark" v-if="post.tags && post.tags.filter(t => isLandmarkTag(t)).length">
                  <span
                    v-for="tag in post.tags.filter(t => isLandmarkTag(t))"
                    :key="tag"
                    class="tag wf-tag-chip tag-landmark"
                    @click.stop="clickPostTag(tag)"
                  >📍 {{ tag }}</span>
                </div>
              </div>
              <div class="wf-tags-normal" v-if="post.tags && post.tags.filter(t => !isLandmarkTag(t)).length">
                <span
                  v-for="tag in post.tags.filter(t => !isLandmarkTag(t))"
                  :key="tag"
                  class="tag wf-tag-chip tag-normal"
                  @click.stop="clickPostTag(tag)"
                >{{ tag }}</span>
              </div>
            </div>

            <!-- 摘要 -->
            <div v-if="post.summary" class="wf-summary">{{ post.summary }}</div>

            <!-- 点赞 -->
            <div class="wf-like-row">
              <div class="like-wrapper">
                <div class="like-image">
                  <img src="@/assets/haruhi_like.webp" alt="like" class="like-img" />
                </div>
                <button class="btn primary like-btn" @click.stop="togglePostLike(post)">
                  {{ post.liked ? '已赞' : '点赞' }} {{ post.likes || 0 }}
                </button>
              </div>
            </div>
          </div>
        </article>
      </TransitionGroup>
    </div>

    <!-- 详情页已迁移至独立路由 /posts/:id，overlay 已移除 -->

  <Transition name="publish-slide" @before-leave="onPublishBeforeLeave" @after-leave="onPublishAfterLeave">
    <Teleport to="body">
      <section v-if="publishOpen" class="publish-page" style="z-index: 10000; background: var(--bg); position: fixed; inset: 0;">
        <!-- Top bar layout -->
        <div class="publish-header-bar">
          <div style="width:120px; display: flex; align-items: center;">
            内容投稿 <span class="muted" style="cursor:pointer; font-size: 12px; margin-left: 6px; border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px;" @click="handleAdminLogin" :style="isAdminPost ? 'background: #000; color: #fff; border-color: #000;' : ''">管理员</span>
          </div>
          <div class="publish-actions" style="position: static; top: auto; right: auto; align-items: center; gap: 8px;">
            <span v-if="publishMsg" class="publish-msg-inline" :style="publishError ? 'color:#ff4d4f;' : 'color:#8fa1c2;'">{{ publishMsg }}</span>
            <button type="button" class="btn publish-back" style="position: static; top: auto; right: auto; left: auto; background: transparent; border: none; color: var(--accent);" @click="previewPublish">
              <span style="font-weight:bold; margin-right:4px;">👁</span> {{ previewMode ? '收起预览' : '预览' }}
            </button>
            <button type="button" class="btn primary" style="border-radius:4px; padding:6px 20px; font-weight:bold;" @click="confirmSubmitPost" :disabled="publishing">
              {{ publishing ? '发布中...' : '发布内容' }}
            </button>
            <button type="button" class="btn ghost" style="margin-left: 8px; color: var(--accent);" @click="closePublish">返回</button>
          </div>
        </div>

        <div class="publish-body-layout" :class="{ 'split-preview': previewMode }">
          <div class="publish-editor-pane" :class="{ 'is-previewing': previewMode }">
          <!-- Left side -->
          <div class="publish-side">
            <div class="publish-field">
              <label>头图 <span class="muted" style="font-size:10px;">(COVER IMAGE)</span></label>
              <div class="cover-source-switch" role="tablist" aria-label="选择头图来源">
                <button
                  type="button"
                  class="cover-source-btn"
                  :class="{ active: publishCoverSource === 'article' }"
                  @click="setPublishCoverSource('article')"
                >
                  从正文配图选
                </button>
                <button
                  type="button"
                  class="cover-source-btn"
                  :class="{ active: publishCoverSource === 'upload' }"
                  @click="setPublishCoverSource('upload')"
                >
                  上传头图
                </button>
              </div>

              <div v-if="publishCoverSource === 'article'" class="cover-branch-card">
                <div class="cover-branch-head">
                  <span class="cover-branch-title">正文封面</span>
                  <span class="muted">{{ articleCoverSelectionSummary }}</span>
                </div>

                <div v-if="articleCoverChoices.length" class="cover-choice-grid-wrap">
                  <div class="cover-choice-grid">
                    <button
                      v-for="item in articleCoverChoices"
                      :key="item.id"
                      type="button"
                      class="cover-choice-card"
                      :class="{ 'is-selected': isArticleCoverSelected(item.id) }"
                      @click="toggleArticleCover(item.id)"
                    >
                      <img :src="item.src" :alt="`正文配图 ${item.order}`" />
                      <span class="cover-choice-meta">正文图 {{ item.order }}</span>
                      <span v-if="articleCoverSelectionOrder(item.id)" class="cover-choice-badge">
                        {{ articleCoverSelectionOrder(item.id) }}
                      </span>
                    </button>
                  </div>
                </div>
                <div v-else class="cover-branch-empty">
                  添加正文图片后，可选 1-3 张作封面。
                </div>
              </div>

              <div v-else class="cover-branch-card">
                <div class="cover-uploader" @click="triggerCoverUpload">
                  <img v-if="publishCoverPreview" :src="publishCoverPreview" alt="cover" />
                  <div v-else class="uploader-placeholder">
                    <div class="up-icon">🖼️</div>
                    <div class="up-text">点击上传头图</div>
                    <div class="up-hint">上传后将直接作为封面使用</div>
                  </div>
                </div>
                <div class="cover-upload-meta">
                  <span class="muted">
                    {{ publishCoverPreview ? '已选择封面图，可继续替换' : '未上传头图时，可切换到正文配图封面' }}
                  </span>
                  <button
                    v-if="publishCoverPreview"
                    type="button"
                    class="btn ghost cover-clear-btn"
                    @click.stop="clearUploadedCover"
                  >
                    清除
                  </button>
                </div>
                <input type="file" ref="coverFileRef" hidden accept="image/*" @change="onPublishCoverFile" />
              </div>
            </div>

            <div class="publish-field">
              <label>标题 <span style="color:#ff4d4f">*</span></label>
              <input class="input outline-less publish-title-input" v-model="publishTitle" placeholder="请输入标题..." />
            </div>

            <div class="publish-field">
              <label>时间</label>
              <div class="readonly-text">{{ formattedCurrentDate }}</div>
            </div>

            <div class="publish-field" style="position:relative;">
              <label>标签</label>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  <span class="tag-chip" style="background: #000;" v-if="isAdminPost" @click="isAdminPost = false">管理员发布 ✕</span>
                </div>
                <FreeTagInput
                  v-model="selectedNormalTags"
                  button-text="添加标签"
                  placeholder="输入投稿标签"
                  empty-text="暂无标签"
                  :max-tags="4"
                />
              </div>
            </div>

            <div class="publish-field" style="position:relative;">
              <label>关联地标</label>
              <LandmarkPicker
                :items="landmarks"
                v-model="publishLandmark"
                :show-selected-tag="true"
                selected-tag-label="最终提交的地标"
              />
            </div>
          </div>

          <!-- Right side -->
          <div class="publish-main-col">
            <div class="publish-field">
              <label>首页摘要</label>
              <textarea class="input summary-textarea" rows="3" v-model="publishSummary" placeholder="输入首页卡片展示的摘要内容..."></textarea>
            </div>

            <div class="publish-field content-blocks-field">
              <label>正文内容</label>
              <div class="blocks-container">
                <div v-for="(block, idx) in publishBlocks" :key="block.id" class="content-block-item">
                  
                  <template v-if="block.type === 'paragraph'">
                    <textarea class="input block-paragraph" v-model="block.value" placeholder="点击输入段落..." rows="2" @input="autoResizeTextarea"></textarea>
                  </template>
                  
                  <template v-else-if="block.type === 'subtitle'">
                    <input class="input block-subtitle outline-less" v-model="block.value" placeholder="输入小标题..." />
                  </template>
                  
                  <template v-else-if="block.type === 'image'">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      <div class="block-image-uploader" @click="triggerBlockImage(idx)">
                        <img v-if="block.preview" :src="block.preview" alt="img" />
                        <div v-else class="uploader-placeholder">
                           <div class="up-icon">🖼️</div>
                           <div class="up-text">点击上传图片</div>
                        </div>
                      </div>
                      <input class="input outline-less" style="font-size: 13px; text-align: center; color: var(--muted); border-bottom: 1px dashed var(--border); padding-bottom: 4px;" v-model="block.value" placeholder="在此输入图片说明 (可选)..." />
                    </div>
                  </template>

                  <!-- Block Actions -->
                  <div class="block-toolbar">
                    <button class="btn icon-btn" @click.stop="removePublishBlock(idx)">✕</button>
                    <button class="btn icon-btn" @click.stop="movePublishBlock(idx, -1)" :disabled="idx === 0">↑</button>
                    <button class="btn icon-btn" @click.stop="movePublishBlock(idx, 1)" :disabled="idx === publishBlocks.length - 1">↓</button>
                  </div>
                </div>
              </div>

              <div class="block-add-controls">
                <button class="btn ghost add-block-btn" @click="addPublishBlock('paragraph')">+ 段落</button>
                <button class="btn ghost add-block-btn" @click="addPublishBlock('subtitle')">+ 标题</button>
                <button class="btn ghost add-block-btn" @click="addPublishBlock('image')">+ 图片</button>
              </div>
            </div>
          </div>
          </div>

          <Transition name="preview-pane">
            <aside v-if="previewMode" class="publish-preview-pane">
              <div class="preview-sheet">
                <div class="preview-top">实时预览</div>

                <div class="preview-title-block">
                  <h1 class="preview-main-title">{{ previewTitle || '未填写标题' }}</h1>
                  <h2 v-if="previewSummary" class="preview-sub-title">{{ previewSummary }}</h2>
                </div>

                <figure
                  v-if="previewCoverImages.length"
                  class="preview-cover-figure"
                  :class="{
                    'is-grid': previewCoverImages.length > 1,
                    'count-2': previewCoverImages.length === 2,
                    'count-3': previewCoverImages.length === 3
                  }"
                >
                  <template v-if="previewCoverImages.length === 1">
                    <img :src="previewCoverImages[0].src" alt="cover" class="preview-cover-img" />
                  </template>
                  <template v-else>
                    <div v-for="(item, idx) in previewCoverImages" :key="`preview-cover-${idx}`" class="preview-cover-tile">
                      <img :src="item.src" alt="cover" class="preview-cover-grid-img" />
                    </div>
                  </template>
                </figure>

                <div class="preview-body">
                  <template v-for="(item, idx) in previewBodyBlocks" :key="`pv-${idx}`">
                    <h3 v-if="item.type === 'subtitle'" class="preview-body-heading">{{ item.text }}</h3>
                    <p v-else-if="item.type === 'paragraph'" class="preview-body-para">{{ item.text }}</p>
                    <figure v-else class="preview-body-figure">
                      <img :src="item.src" alt="正文图片" class="preview-body-img" />
                      <figcaption class="preview-body-caption">{{ item.caption || ' ' }}</figcaption>
                    </figure>
                  </template>
                </div>
              </div>
            </aside>
          </Transition>
        </div>
      </section>
    </Teleport>
  </Transition>

  <Transition name="sheet-slide">
    <div v-if="previewOpen" class="community-image-overlay" @click="closeImagePreview">
      <section class="community-image-modal" @click.stop>
        <div class="community-image-body">
          <img :src="previewSrc" alt="preview" />
        </div>
        <div class="community-image-download">
          <a class="btn primary" :href="previewSrc" :download="previewName">下载图片</a>
        </div>
      </section>
    </div>
  </Transition>

  <div v-if="deleteAuthOpen" class="login-overlay" @click="closeDeleteAuth">
    <section class="card login-card" @click.stop>
      <div class="section-title">管理员验证</div>
      <div class="muted">输入管理员口令后删除该内容。</div>
      <div class="grid" style="grid-template-columns: 1fr; margin-top:12px; gap:10px;">
        <input class="input" type="password" placeholder="ADMIN_PASSWORD" v-model="deleteAuthPassword" />
        <button class="btn primary" @click="submitDeleteAuth">确认删除</button>
        <button class="btn ghost" @click="closeDeleteAuth">取消</button>
      </div>
      <div v-if="deleteAuthError" class="muted" style="color:#ff9b9b; margin-top:6px;">{{ deleteAuthError }}</div>
    </section>
  </div>

</div>
</template>

<script setup>
// 防止teleportToolbar未定义警告，默认不开启
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
const teleportToolbar = ref(false)
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore.js'
import { api } from '../services/api.js'
import { compressFile } from '../utils/imageCompressor.js'
import { resolvePostMedia } from '../utils/postMedia.js'
import CommunityToolbar from '@/components/CommunityToolbar.vue'
import FreeTagInput from '../components/FreeTagInput.vue'
import LandmarkPicker from '../components/LandmarkPicker.vue'

const props = defineProps({
  defaultLandmarkName: { type: String, default: '' },
  preventRoutePush: { type: Boolean, default: false }
})
const emit = defineEmits(['enter-detail', 'exit-detail'])
const userStore = useUserStore()
const user = computed(() => userStore.user)
const route = useRoute()
const router = useRouter()
const parentCache = new Map()

// 当路由为帖子详情的子路由时，隐藏回到顶部按钮及某些交互
const isDetailRoute = computed(() => {
  try {
    if (!route) return false
    if (route.name === 'postDetail') return true
    // 兼容路径匹配
    return String(route.path || '').startsWith('/posts/') || String(route.fullPath || '').includes('/posts/')
  } catch (e) {
    return false
  }
})

const sortBy = ref('time')
const sortOrder = ref('desc')
const filterLandmark = ref('')
const filterLandmarkObj = computed({
  get: () => landmarks.value.find(lm => lm.name === filterLandmark.value) || null,
  set: (lm) => { filterLandmark.value = lm ? lm.name : '' }
})
const selectedFilterTags = ref([])
const searchQuery = ref('')
const adminOnly = ref(false)
const hasAppliedDefault = ref(false)
const activeFilterCount = computed(() => {
  let count = 0
  if (filterLandmark.value) count += 1
  if (selectedFilterTags.value.length) count += selectedFilterTags.value.length
  if (searchQuery.value.trim()) count += 1
  if (adminOnly.value) count += 1
  return count
})

const posts = ref([])
const landmarks = ref([])

const sortedPosts = computed(() => {
  let list = [...posts.value]
  if (filterLandmark.value) {
    list = list.filter(p => (p.tags || []).includes(filterLandmark.value))
  }
  if (selectedFilterTags.value.length) {
    list = list.filter(p => selectedFilterTags.value.every(t => (p.tags || []).includes(t)))
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(p => {
      const content = String(p.content || '').toLowerCase()
      const userName = String(p.user?.name || '').toLowerCase()
      const tags = (p.tags || []).join(' ').toLowerCase()
      return content.includes(q) || userName.includes(q) || tags.includes(q)
    })
  }
  const dir = sortOrder.value === 'asc' ? 1 : -1
  if (sortBy.value === 'likes') {
    return list.sort((a, b) => (a.likes - b.likes) * dir)
  }
  return list.sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) * dir)
})

const selectedPost = ref(null)
const currentImage = ref(0)

const publishOpen = ref(false)
const publishLeaving = ref(false)
const publishFiles = ref([])
const publishPreviews = ref([])
const publishContent = ref('')
const publishSummary = ref('')
const publishTitle = ref('')
let publishBlockSeed = Date.now()
function nextPublishBlockId() {
  publishBlockSeed += 1
  return publishBlockSeed
}
function createPublishBlock(type = 'paragraph') {
  return {
    id: nextPublishBlockId(),
    type,
    value: '',
    preview: null,
    file: null
  }
}
const publishBlocks = ref([createPublishBlock()])
const publishCoverSource = ref('article')
const publishCoverFile = ref(null)
const publishCoverPreview = ref(null)
const selectedArticleCoverIds = ref([])
const isAdminPost = ref(false)

const handleAdminLogin = async () => {
  if (isAdminPost.value) return
  
  // 检查是否已有管理员缓存并依然有效
  if (api.hasAdminPassword()) {
    try {
      await api.adminVerify()
      isAdminPost.value = true
      return
    } catch {
      api.clearAdminPassword()
    }
  }

  const pwd = prompt('请输入管理员密码：')
  if (!pwd) return
  try {
    await api.adminVerify(pwd)
    api.setAdminPassword(pwd)
    isAdminPost.value = true
    alert('密码验证成功，已开启管理员发布模式')
  } catch (err) {
    alert('密码错误或验证失败！')
  }
}

const formattedCurrentDate = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

function revokeObjectUrl(url) {
  if (!url) return
  try {
    URL.revokeObjectURL(url)
  } catch (e) {}
}

function clearUploadedCover() {
  revokeObjectUrl(publishCoverPreview.value)
  publishCoverPreview.value = null
  publishCoverFile.value = null
  if (coverFileRef.value) coverFileRef.value.value = ''
}

function cleanupPublishBlockPreviews(blocks = publishBlocks.value) {
  for (const block of blocks) {
    revokeObjectUrl(block?.preview)
  }
}

function sameIdList(a, b) {
  if (a.length !== b.length) return false
  return a.every((id, index) => id === b[index])
}

const articleCoverChoices = computed(() => publishBlocks.value
  .filter(block => block.type === 'image' && block.file && block.preview)
  .map((block, index) => ({
    id: block.id,
    src: block.preview,
    caption: String(block.value || '').trim(),
    order: index + 1
  })))
const articleCoverSelectionLimit = computed(() => Math.min(3, articleCoverChoices.value.length))
const autoArticleCoverIds = computed(() => articleCoverChoices.value
  .slice(0, articleCoverSelectionLimit.value)
  .map(item => item.id))
const manualArticleCoverIds = computed(() => {
  const selected = new Set(selectedArticleCoverIds.value)
  return articleCoverChoices.value
    .filter(item => selected.has(item.id))
    .map(item => item.id)
    .slice(0, articleCoverSelectionLimit.value)
})
const hasManualArticleCoverSelection = computed(() => manualArticleCoverIds.value.length > 0)
const selectedArticleCoverIdsResolved = computed(() => (
  hasManualArticleCoverSelection.value ? manualArticleCoverIds.value : autoArticleCoverIds.value
))
const selectedArticleCoverIdSet = computed(() => new Set(selectedArticleCoverIdsResolved.value))
const articleCoverSelectionSummary = computed(() => {
  if (!articleCoverChoices.value.length) return '添加正文图片后可选择'
  if (!hasManualArticleCoverSelection.value) {
    return `默认使用前 ${selectedArticleCoverIdsResolved.value.length} 张`
  }
  return `已手动选择 ${selectedArticleCoverIdsResolved.value.length} / ${articleCoverSelectionLimit.value}`
})

function syncArticleCoverSelection() {
  const candidateIds = articleCoverChoices.value.map(item => item.id)
  const limit = articleCoverSelectionLimit.value
  let nextIds = selectedArticleCoverIds.value
    .filter(id => candidateIds.includes(id))
    .slice(0, limit)

  if (!sameIdList(nextIds, selectedArticleCoverIds.value)) {
    selectedArticleCoverIds.value = nextIds
  }
}

function setPublishCoverSource(source) {
  publishCoverSource.value = source
}

function isArticleCoverSelected(blockId) {
  return selectedArticleCoverIdSet.value.has(blockId)
}

function articleCoverSelectionOrder(blockId) {
  const index = selectedArticleCoverIdsResolved.value.indexOf(blockId)
  return index >= 0 ? index + 1 : 0
}

function toggleArticleCover(blockId) {
  const selectedIds = selectedArticleCoverIdsResolved.value
  if (selectedIds.includes(blockId)) {
    const nextIds = selectedIds.filter(id => id !== blockId)
    selectedArticleCoverIds.value = nextIds
    publishMsg.value = ''
    publishError.value = false
    return
  }
  if (selectedIds.length >= articleCoverSelectionLimit.value) {
    publishMsg.value = `最多选择 ${articleCoverSelectionLimit.value} 张正文配图作为封面`
    publishError.value = true
    return
  }
  publishMsg.value = ''
  publishError.value = false
  selectedArticleCoverIds.value = [...selectedIds, blockId]
}

const triggerCoverUpload = () => {
  if (coverFileRef.value) coverFileRef.value.click()
}
const coverFileRef = ref(null)
function onPublishCoverFile(e) {
  const file = e.target.files?.[0]
  if (e.target) e.target.value = ''
  if (!file) return
  clearUploadedCover()
  publishCoverFile.value = file
  publishCoverPreview.value = URL.createObjectURL(file)
  publishMsg.value = ''
  publishError.value = false
}

const addPublishBlock = (type) => {
  publishBlocks.value.push(createPublishBlock(type))
}
const removePublishBlock = (idx) => {
  const [removed] = publishBlocks.value.splice(idx, 1)
  revokeObjectUrl(removed?.preview)
}
const movePublishBlock = (idx, dir) => {
  if(idx + dir < 0 || idx + dir >= publishBlocks.value.length) return
  const temp = publishBlocks.value[idx]
  publishBlocks.value[idx] = publishBlocks.value[idx + dir]
  publishBlocks.value[idx + dir] = temp
}
const triggerBlockImage = (idx) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if(file) {
      revokeObjectUrl(publishBlocks.value[idx].preview)
      publishBlocks.value[idx].file = file
      publishBlocks.value[idx].preview = URL.createObjectURL(file)
    }
  }
  input.click()
}

const autoResizeTextarea = (e) => {
  e.target.style.height = 'auto'
  e.target.style.height = e.target.scrollHeight + 'px'
}
const publishLandmark = ref(null)
const selectedNormalTags = ref([])
const publishing = ref(false)
const publishMsg = ref('')
const publishError = ref(false)
const previewMode = ref(false)
const previewOpen = ref(false)
const previewSrc = ref('')
const previewName = ref('')
const commentText = ref('')
const commentOrder = ref('asc')
const commentSubmitting = ref(false)
const commentMsg = ref('')
const commentErr = ref(false)
const replyParent = ref(null)
const deleteAuthOpen = ref(false)
const deleteAuthPassword = ref('')
const deleteAuthError = ref('')
const deleteTargetPost = ref(null)
const deleteTargetComment = ref(null)
const deleteAuthMode = ref('post')

const commentMaxLen = computed(() => (user.value?.type === 'formal' ? 200 : 50))
const commentPlaceholder = computed(() => (user.value?.type === 'formal'
  ? '写下你的评论（最多 200 字）'
  : '写下你的评论（最多 50 字）'
))

const isFormal = computed(() => user.value?.type === 'formal')
const maxImages = computed(() => (isFormal.value ? 20 : 1))
const maxText = computed(() => (isFormal.value ? 2000 : 150))
const publishHint = computed(() => `图片上限 ${maxImages.value} 张，文字上限 ${maxText.value} 字`)
const landmarkLabel = computed(() => (publishLandmark.value?.name ? publishLandmark.value.name : '未选择'))
const previewTitle = computed(() => String(publishTitle.value || '').trim())
const previewSummary = computed(() => String(publishSummary.value || '').trim())
const previewContentBlocks = computed(() => {
  const out = []
  for (const block of publishBlocks.value) {
    if (block.type === 'paragraph') {
      const text = String(block.value || '').trim()
      if (text) out.push({ type: 'paragraph', text })
      continue
    }
    if (block.type === 'subtitle') {
      const text = String(block.value || '').trim()
      if (text) out.push({ type: 'subtitle', text })
      continue
    }
    if (block.type === 'image' && block.preview) {
      out.push({
        type: 'image',
        blockId: block.id,
        src: block.preview,
        caption: String(block.value || '').trim()
      })
    }
  }
  return out
})
const previewCoverImages = computed(() => {
  if (publishCoverSource.value === 'upload') {
    if (!publishCoverPreview.value) return []
    return [{ src: publishCoverPreview.value, caption: '' }]
  }
  return previewContentBlocks.value.filter(item => item.type === 'image' && selectedArticleCoverIdSet.value.has(item.blockId))
})
const previewBodyBlocks = computed(() => {
  if (publishCoverSource.value !== 'article') return previewContentBlocks.value
  return previewContentBlocks.value.filter(item => item.type !== 'image' || !selectedArticleCoverIdSet.value.has(item.blockId))
})

// scroll-top 按钮样式数据与定位逻辑
const scrollBtnStyle = ref({ position: 'fixed', right: '18px', bottom: '18px' })
let ro = null
let containerScrollEl = null
// pinnedLeft: when set, keep horizontal position stable (prevents jumps when posts open/close)
let pinnedLeft = null
const scrollTopAnimations = new WeakMap()

function updateScrollBtnPos() {
  const container = document.querySelector('.page-pad.community')
  const btnW = 46
  const btnH = 46
  const margin = 18
  // allow running even if container is not present (e.g. during some route transitions)
  const rect = container ? container.getBoundingClientRect() : { left: 0, right: window.innerWidth }
  // 如果当前社区被嵌入在地图界面的左侧 pane（存在 .community-pane 并且可见），
  // 将按钮固定在社区容器的左下角，否则固定在视口右下角。
  // Prefer the actual community page/container first to avoid targeting the detail panel
  const communityContainer = document.querySelector('.page-pad.community') || document.querySelector('.community-main')
  if (communityContainer) {
    const cRect = communityContainer.getBoundingClientRect()
    if (pinnedLeft == null) pinnedLeft = Math.max(8, Math.round(cRect.left) + margin)
    scrollBtnStyle.value = { position: 'fixed', left: `${pinnedLeft}px`, bottom: `${margin}px` }
    return
  }

  // fallback: if community is rendered as a pane in the map layout, use its left edge
  const communityPane = document.querySelector('.community-pane')
  const isPaneVisible = communityPane && (getComputedStyle(communityPane).display !== 'none') && communityPane.offsetParent !== null
  if (isPaneVisible) {
    const paneRect = communityPane.getBoundingClientRect()
    if (pinnedLeft == null) pinnedLeft = Math.max(8, Math.round(paneRect.left) + margin)
    scrollBtnStyle.value = { position: 'fixed', left: `${pinnedLeft}px`, bottom: `${margin}px` }
    return
  }

  // If the page originates from the Landmarks list (landmarks-page), align to that page's left
  const landmarksPage = document.querySelector('.landmarks-page')
  if (landmarksPage) {
    if (pinnedLeft == null) {
      const lpRect = landmarksPage.getBoundingClientRect()
      pinnedLeft = Math.max(8, Math.round(lpRect.left) + margin)
    }
    scrollBtnStyle.value = { position: 'fixed', left: `${pinnedLeft}px`, bottom: `${margin}px` }
    return
  }

  // 默认：固定在视口右下角，避免在打开/关闭详情页时横向位置跳动
  // no left-pin targets found: clear pinnedLeft and use default right-bottom
  pinnedLeft = null
  scrollBtnStyle.value = { position: 'fixed', right: `${margin}px`, bottom: `${margin}px` }
}

onMounted(() => {
  updateScrollBtnPos()
  window.addEventListener('resize', updateScrollBtnPos)
  window.addEventListener('scroll', updateScrollBtnPos, { passive: true })
  const container = document.querySelector('.page-pad.community')
  if (container && 'ResizeObserver' in window) {
    ro = new ResizeObserver(updateScrollBtnPos)
    ro.observe(container)
    // 监听容器内部滚动，确保按钮位置相对于容器稳定
    containerScrollEl = container
    containerScrollEl.addEventListener('scroll', updateScrollBtnPos, { passive: true })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScrollBtnPos)
  window.removeEventListener('scroll', updateScrollBtnPos)
  if (ro) ro.disconnect()
  if (containerScrollEl) containerScrollEl.removeEventListener('scroll', updateScrollBtnPos)
  cleanupPublishBlockPreviews()
  clearUploadedCover()
})

function openPost(post) {
  if (!props.preventRoutePush) {
    const query = {}
    if (post.landmarkId) query.focusLandmarkId = String(post.landmarkId)
    router.push({ path: `/posts/${post.id}`, query }).catch(() => {})
    return
  }
  // 嵌入模式：在当前面板内打开帖子详情
  selectedPost.value = post
  currentImage.value = 0
  commentOrder.value = 'asc'
  commentText.value = ''
  commentMsg.value = ''
  commentErr.value = false
  loadPostComments()
  ensureParent(post)
  emit('enter-detail', post?.id)
}

// 在外部调用时，将社区列表滚动到指定帖子项
function scrollToPostId(postId) {
  if (!postId) return
  nextTick(() => {
    try {
      const el = document.getElementById(`post-${postId}`)
      if (el) {
        const headerH = document.querySelector('.top-header')?.offsetHeight || 36
        // find nearest scrollable ancestor（仅在布局容器内查找，不使用 window 滚动）
        let container = el.parentElement
        while (container && container !== document.body && container !== document.documentElement) {
          const style = getComputedStyle(container)
          const overflowY = style.overflowY
          if ((overflowY === 'auto' || overflowY === 'scroll') && container.scrollHeight > container.clientHeight) break
          container = container.parentElement
        }
        if (!container || container === document.body || container === document.documentElement) {
          // 社区面板固定在布局容器内，帖子已在可视区域，不滚动 window 以避免布局偏移
          return
        }
        // container scroll
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const desired = container.scrollTop + (elRect.top - containerRect.top) - headerH - 8
        if (desired > 0) {
          try { container.scrollTo({ top: desired, behavior: 'smooth' }) } catch (e) { container.scrollTop = desired }
        }
        return
      }
      // 兜底：直接定位 .community-scroll 容器滚动
      const communityScroll = document.querySelector('.community-scroll')
      if (communityScroll && communityScroll.scrollHeight > communityScroll.clientHeight) {
        const candidate = communityScroll.querySelector(`#post-${postId}`)
        if (candidate) {
          const headerH = document.querySelector('.top-header')?.offsetHeight || 36
          const scrollRect = communityScroll.getBoundingClientRect()
          const candidateRect = candidate.getBoundingClientRect()
          const desired = communityScroll.scrollTop + (candidateRect.top - scrollRect.top) - headerH - 8
          if (desired > 0) {
            try { communityScroll.scrollTo({ top: desired, behavior: 'smooth' }) } catch (e) { communityScroll.scrollTop = desired }
          }
        }
      }
    } catch (e) {}
  })
}

defineExpose({ scrollToPostId })


function closePost() {
  selectedPost.value = null
  currentImage.value = 0
  emit('exit-detail')
}

function animateScrollTop(el, top = 0) {
  return new Promise((resolve) => {
    if (!el) {
      resolve(false)
      return
    }

    const startTop = Number(el.scrollTop || 0)
    const targetTop = Math.max(0, Number(top || 0))
    const distance = targetTop - startTop
    if (Math.abs(distance) < 2) {
      el.scrollTop = targetTop
      resolve(true)
      return
    }

    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.scrollTop = targetTop
        resolve(true)
        return
      }
    } catch (e) {}

    const previousState = scrollTopAnimations.get(el)
    if (previousState?.frame) cancelAnimationFrame(previousState.frame)
    if (previousState?.resolve) previousState.resolve(false)

    const duration = Math.min(760, Math.max(420, Math.abs(distance) * 0.5))
    const startTime = performance.now()
    const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5)

    const finish = (completed) => {
      const activeState = scrollTopAnimations.get(el)
      if (activeState === state) {
        scrollTopAnimations.delete(el)
      }
      resolve(completed)
    }

    const step = (now) => {
      const progress = Math.min(1, (now - startTime) / duration)
      el.scrollTop = startTop + distance * easeOutQuint(progress)
      if (progress < 1) {
        state.frame = requestAnimationFrame(step)
        scrollTopAnimations.set(el, state)
        return
      }
      el.scrollTop = targetTop
      finish(true)
    }

    const state = {
      frame: 0,
      resolve: finish
    }

    state.frame = requestAnimationFrame(step)
    scrollTopAnimations.set(el, state)
  })
}

function isScrollableCommunityEl(el) {
  if (!el) return false
  const style = getComputedStyle(el)
  const overflowY = style.overflowY
  return (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight
}

function getCommunityScrollTarget() {
  const paneBody = document.querySelector('.community-pane-body')
  if (paneBody && paneBody.scrollHeight > paneBody.clientHeight) {
    return paneBody
  }

  const candidates = [
    document.querySelector('.community-pane'),
    document.querySelector('.community-scroll'),
    document.querySelector('.post-list'),
    document.querySelector('.community-main'),
    document.querySelector('.page-pad.community')
  ]

  return candidates.find(el => isScrollableCommunityEl(el)) || null
}

// 将社区页面（社区容器或主滚动区域）滚动到顶部
function scrollCommunityTop() {
  const target = getCommunityScrollTarget()
  if (!target) return Promise.resolve(false)
  try {
    return animateScrollTop(target, 0)
  } catch (e) {
    target.scrollTop = 0
    return Promise.resolve(false)
  }
}

async function scrollCommunityTopBeforeFilterChange() {
  const target = getCommunityScrollTarget()
  if (!target) return
  const currentTop = Number(target.scrollTop || 0)
  if (currentTop < 36) return
  try {
    await animateScrollTop(target, 0)
  } catch (e) {
    target.scrollTop = 0
  }
}

function canDeleteAsOwner(post) {
  const nickname = String(user.value?.nickname || '').trim()
  const author = String(post?.user?.name || '').trim()
  return nickname && author && nickname === author
}

function canDeleteCommentAsOwner(comment) {
  const nickname = String(user.value?.nickname || '').trim()
  const author = String(comment?.user?.name || '').trim()
  return nickname && author && nickname === author
}

async function requestDeletePost(post) {
  if (!post?.id) return
  if (canDeleteAsOwner(post)) {
    const ok = confirm('确认删除该帖子吗？此操作不可撤销。')
    if (!ok) return
    await deletePostByOwner(post.id)
    return
  }
  deleteTargetPost.value = post
  deleteTargetComment.value = null
  deleteAuthMode.value = 'post'
  deleteAuthOpen.value = true
  deleteAuthPassword.value = ''
  deleteAuthError.value = ''
}

async function requestDeleteComment(comment) {
  if (!comment?.id) return
  if (canDeleteCommentAsOwner(comment)) {
    const ok = confirm('确认删除该评论吗？此操作不可撤销。')
    if (!ok) return
    await deleteCommentByOwner(comment.id)
    return
  }
  deleteTargetComment.value = comment
  deleteTargetPost.value = null
  deleteAuthMode.value = 'comment'
  deleteAuthOpen.value = true
  deleteAuthPassword.value = ''
  deleteAuthError.value = ''
}

async function deletePostByOwner(postId) {
  try {
    await api.deletePost(postId)
    removePostFromList(postId)
  } catch (err) {
    alert(err?.message || '删除失败')
  }
}

async function deleteCommentByOwner(commentId) {
  try {
    await api.deletePostComment(commentId)
    removeCommentFromList(commentId)
  } catch (err) {
    alert(err?.message || '删除失败')
  }
}

function closeDeleteAuth() {
  deleteAuthOpen.value = false
  deleteAuthPassword.value = ''
  deleteAuthError.value = ''
  deleteTargetPost.value = null
  deleteTargetComment.value = null
  deleteAuthMode.value = 'post'
}

async function submitDeleteAuth() {
  if (deleteAuthMode.value === 'comment') {
    if (!deleteTargetComment.value?.id) return
  } else if (!deleteTargetPost.value?.id) {
    return
  }
  if (!deleteAuthPassword.value) {
    deleteAuthError.value = '请输入管理员口令'
    return
  }
  try {
    if (deleteAuthMode.value === 'comment') {
      await api.adminDeletePostComment(deleteTargetComment.value.id, deleteAuthPassword.value)
      removeCommentFromList(deleteTargetComment.value.id)
    } else {
      await api.adminDeletePost(deleteTargetPost.value.id, deleteAuthPassword.value)
      removePostFromList(deleteTargetPost.value.id)
    }
    closeDeleteAuth()
  } catch (err) {
    deleteAuthError.value = err?.message || '删除失败'
  }
}

function removePostFromList(postId) {
  posts.value = posts.value.filter(p => p.id !== postId)
  if (selectedPost.value?.id === postId) {
    closePost()
  }
}

function removeCommentFromList(commentId) {
  if (!selectedPost.value) return
  selectedPost.value.comments = (selectedPost.value.comments || []).filter(c => c.id !== commentId)
}

function prevImage() {
  if (!selectedPost.value?.images?.length) return
  currentImage.value = (currentImage.value - 1 + selectedPost.value.images.length) % selectedPost.value.images.length
}

function nextImage() {
  if (!selectedPost.value?.images?.length) return
  currentImage.value = (currentImage.value + 1) % selectedPost.value.images.length
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString()
}

function openImagePreview() {
  const src = selectedPost.value?.images?.[currentImage.value]
  if (!src) return
  previewSrc.value = src
  previewName.value = `post-${selectedPost.value?.id || 'image'}-${currentImage.value + 1}.jpg`
  previewOpen.value = true
}

function closeImagePreview() {
  previewOpen.value = false
  previewSrc.value = ''
  previewName.value = ''
}

function openPublish(parentPost = null) {
  replyParent.value = parentPost ? normalizeParent(parentPost) : null
  publishLeaving.value = false
  publishOpen.value = true
}

function closePublish() {
  publishOpen.value = false
  previewMode.value = false
  cleanupPublishBlockPreviews()
  cleanupPublishPreviews()
  publishFiles.value = []
  publishContent.value = ''
  publishTitle.value = ''
  publishSummary.value = ''
  publishBlocks.value = [createPublishBlock()]
  publishCoverSource.value = 'article'
  clearUploadedCover()
  selectedArticleCoverIds.value = []
  publishLandmark.value = null
  selectedNormalTags.value = []
  isAdminPost.value = false
  publishMsg.value = ''
  publishError.value = false
  replyParent.value = null
}

function onPublishBeforeLeave() {
  publishLeaving.value = true
}

function onPublishAfterLeave() {
  publishLeaving.value = false
}

function onPublishFiles(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  const combined = [...publishFiles.value, ...files]
  if (combined.length > maxImages.value) {
    publishMsg.value = `最多选择 ${maxImages.value} 张图片`
    publishError.value = true
  }
  const nextFiles = combined.slice(0, maxImages.value)
  rebuildPublishPreviews(nextFiles)
  publishFiles.value = nextFiles
  e.target.value = ''
}

function cleanupPublishPreviews() {
  for (const url of publishPreviews.value) {
    try { URL.revokeObjectURL(url) } catch {}
  }
  publishPreviews.value = []
}

function rebuildPublishPreviews(files) {
  cleanupPublishPreviews()
  publishPreviews.value = files.map(f => URL.createObjectURL(f))
}

function removePublishFile(index) {
  const nextFiles = publishFiles.value.filter((_, i) => i !== index)
  rebuildPublishPreviews(nextFiles)
  publishFiles.value = nextFiles
}

function selectLandmark(lm) {
  publishLandmark.value = lm
}

function toggleAdminOnly() {
  adminOnly.value = !adminOnly.value
}

function clearFilters() {
  filterLandmark.value = ''
  selectedFilterTags.value = []
  searchQuery.value = ''
  adminOnly.value = false
}

function removeSelectedFilterTag(tag) {
  selectedFilterTags.value = selectedFilterTags.value.filter(item => item !== tag)
}

function isLandmarkTag(tag) {
  return landmarks.value.some(lm => lm.name === tag)
}

async function clickPostTag(tag) {
  await scrollCommunityTopBeforeFilterChange()

  if (isLandmarkTag(tag)) {
    filterLandmark.value = tag
    selectedFilterTags.value = []
  } else {
    filterLandmark.value = ''
    if (selectedFilterTags.value.includes(tag)) {
      selectedFilterTags.value = selectedFilterTags.value.filter(item => item !== tag)
    } else {
      selectedFilterTags.value = [...selectedFilterTags.value, tag]
    }
  }
}

function previewPublish() {
  previewMode.value = !previewMode.value
}

function confirmSubmitPost() {
  if (publishing.value) return
  submitPost()
}

async function submitPost() {
  publishMsg.value = ''
  publishError.value = false

  // 从 blocks 构建正文内容与图片文件列表
  const contentParts = []
  const imageBlocks = []
  for (const block of publishBlocks.value) {
    if (block.type === 'paragraph' && String(block.value || '').trim()) {
      contentParts.push(String(block.value).trim())
    } else if (block.type === 'subtitle' && String(block.value || '').trim()) {
      contentParts.push(`## ${String(block.value).trim()}`)
    } else if (block.type === 'image') {
      if (block.file) {
        imageBlocks.push({
          id: block.id,
          file: block.file,
          caption: String(block.value || '').trim()
        })
      }
    }
  }

  const content = contentParts.join('\n\n')
  const summary = String(publishSummary.value || '').trim()
  const title = String(publishTitle.value || '').trim()
  const usingUploadedCover = publishCoverSource.value === 'upload' && !!publishCoverFile.value
  let orderedImageBlocks = [...imageBlocks]
  let coverMode = 'manual'
  let coverImageCount = 0

  if (publishCoverSource.value === 'article' && imageBlocks.length) {
    const selectedIds = selectedArticleCoverIdsResolved.value
    if (!selectedIds.length) {
      publishMsg.value = '请先从正文配图中选择 1 到 3 张封面图'
      publishError.value = true
      return
    }
    const selectedIdSet = new Set(selectedIds)
    const selectedBlocks = imageBlocks.filter(block => selectedIdSet.has(block.id))
    const otherBlocks = imageBlocks.filter(block => !selectedIdSet.has(block.id))
    // 服务端仍按前几张图解释自动封面，这里按所选结果重排上传顺序。
    orderedImageBlocks = selectedBlocks.concat(otherBlocks)
    coverMode = 'auto'
    coverImageCount = selectedBlocks.length
  } else if (publishCoverSource.value === 'upload' && imageBlocks.length && !usingUploadedCover) {
    publishMsg.value = '请先上传头图，或切换到正文配图封面'
    publishError.value = true
    return
  } else if (usingUploadedCover) {
    coverMode = 'manual'
    coverImageCount = 1
  }

  const totalImages = (usingUploadedCover ? 1 : 0) + orderedImageBlocks.length

  if (!content && !totalImages) {
    publishMsg.value = '请输入正文内容或添加图片'
    publishError.value = true
    return
  }
  if (content.length > maxText.value) {
    publishMsg.value = '内容过长'
    publishError.value = true
    return
  }
  if (replyParent.value && !isFormal.value) {
    publishMsg.value = '仅正式团员可跟帖'
    publishError.value = true
    return
  }
  if (totalImages > maxImages.value) {
    publishMsg.value = `图片数量超出限制（最多 ${maxImages.value} 张）`
    publishError.value = true
    return
  }

  publishing.value = true
  try {
    const fd = new FormData()
    fd.append('content', content || title || summary || ' ')
    if (summary) fd.append('summary', summary)
    if (title) fd.append('title', title)
    if (publishLandmark.value?.id) fd.append('landmark_id', publishLandmark.value.id)
    fd.append('cover_mode', coverMode)
    fd.append('cover_image_count', String(coverImageCount))
    fd.append('normal_tags', JSON.stringify(selectedNormalTags.value))
    if (replyParent.value?.id) fd.append('parent_post_id', replyParent.value.id)

    // 头图优先作为第一张图片
    if (usingUploadedCover) {
      let fileToUpload
      try {
        fileToUpload = await compressFile(publishCoverFile.value, { quality: 0.82, maxWidth: 2560 })
      } catch {
        throw new Error('头图转换失败，请重试')
      }
      fd.append('images', fileToUpload)
    }

    for (const imageBlock of orderedImageBlocks) {
      let fileToUpload
      try {
        fileToUpload = await compressFile(imageBlock.file, { quality: 0.82, maxWidth: 2560 })
      } catch {
        throw new Error('图片转换失败，请重试')
      }
      fd.append('images', fileToUpload)
    }

    const captionPayload = (usingUploadedCover ? [''] : []).concat(orderedImageBlocks.map(block => block.caption))
    fd.append('image_captions', JSON.stringify(captionPayload))

    const postFn = isAdminPost.value ? api.adminCreatePost.bind(api) : api.createPost.bind(api)
    const res = await postFn(fd)
    if (res.data?.status && res.data.status !== 'approved') {
      closePublish()
      alert('已提交审核，通过后将在列表中展示')
      return
    }
    const mapped = mapPost(res.data, replyParent.value)
    posts.value = [mapped, ...posts.value]
    closePublish()
  } catch (err) {
    publishMsg.value = err?.message || '发布失败'
    publishError.value = true
  } finally {
    publishing.value = false
  }
}

function normalizeParent(raw) {
  if (!raw) return null
  const id = raw.id || raw.parent_post_id || raw.post_id
  if (!id) return null
  return {
    id,
    user: {
      name: raw.user?.name || raw.user_name || '原帖',
      avatar: raw.user?.avatar || raw.user_avatar_url || ''
    },
    content: raw.content || '',
    tags: raw.tags || [],
    images: raw.images || [],
    likes: raw.likes || raw.like_count || 0,
    createdAt: raw.createdAt || raw.created_at || ''
  }
}

function mapPost(p, fallbackParent = null) {
  const parentId = p.parent_post_id || p.parent_id || p.parentId || p.parentPostId || null
  const parent = normalizeParent(p.parent || p.parent_post || p.parentPost || fallbackParent)
  if (parent?.id) parentCache.set(parent.id, parent)
  const post = {
    id: p.id,
    user: { name: p.user_name, avatar: p.user_avatar_url || '' },
    createdAt: p.created_at,
    likes: p.like_count || 0,
    liked: !!p.liked,
    content: p.content || '',
    title: p.title || '',
    summary: p.summary || '',
    imageCaptions: p.image_captions || p.imageCaptions || [],
    coverMode: p.cover_mode || p.coverMode || 'manual',
    coverImageCount: p.cover_image_count ?? p.coverImageCount ?? 0,
    tags: p.tags || [],
    images: p.images || [],
    comments: [],
    parent,
    parentId: parent?.id || parentId || null,
    landmarkId: p.landmark_id ?? p.landmarkId ?? null
  }
  return { ...post, ...resolvePostMedia(post) }
}

async function ensureParent(post) {
  if (!post?.parent && post?.parentId) {
    if (parentCache.has(post.parentId)) {
      post.parent = parentCache.get(post.parentId)
      syncPostParent(post.id, post.parent)
      return
    }
    try {
      const res = await api.getPost(post.parentId)
      const mapped = mapPost(res.data)
      parentCache.set(mapped.id, mapped)
      post.parent = mapped
      syncPostParent(post.id, mapped)
    } catch {}
  }
}

function syncPostParent(postId, parent) {
  posts.value = posts.value.map(p => (p.id === postId ? { ...p, parent } : p))
  if (selectedPost.value?.id === postId) {
    selectedPost.value = { ...selectedPost.value, parent }
  }
}

function resolveParentLinks() {
  const idMap = new Map(posts.value.map(p => [p.id, p]))
  posts.value = posts.value.map(p => {
    if (!p.parent && p.parentId && idMap.has(p.parentId)) {
      return { ...p, parent: idMap.get(p.parentId) }
    }
    return p
  })
}

async function togglePostLike(post) {
  try {
    const res = await api.likePost(post.id)
    post.likes = res.like_count ?? post.likes
    post.liked = res.liked === true
  } catch (err) {
    alert(err?.message || '点赞失败')
  }
}

async function loadPostComments() {
  if (!selectedPost.value?.id) return
  try {
    const res = await api.getPostComments(selectedPost.value.id, commentOrder.value)
    const list = res.data || []
    selectedPost.value.comments = list.map(c => ({
      id: c.id,
      user: { name: c.user_name, avatar: c.user_avatar_url || '' },
      body: c.body,
      created_at: c.created_at
    }))
  } catch (err) {
    commentMsg.value = err?.message || '评论加载失败'
    commentErr.value = true
  }
}

function clearReply() {
  replyParent.value = null
}

async function openOriginal(postId) {
  if (!postId) return
  const target = posts.value.find(p => p.id === postId)
  if (target) {
    await ensureParent(target)
    openPost(target)
    return
  }
  if (selectedPost.value?.parent && selectedPost.value.parent.id === postId) {
    const synthetic = mapPost({
      id: postId,
      user_name: selectedPost.value.parent.user?.name,
      user_avatar_url: selectedPost.value.parent.user?.avatar,
      content: selectedPost.value.parent.content,
      tags: selectedPost.value.parent.tags,
      images: selectedPost.value.parent.images,
      like_count: selectedPost.value.parent.likes,
      created_at: selectedPost.value.parent.createdAt
    })
    await ensureParent(synthetic)
    openPost(synthetic)
    return
  }
  try {
    if (parentCache.has(postId)) {
      openPost(parentCache.get(postId))
      return
    }
    const res = await api.getPost(postId)
    const mapped = mapPost(res.data)
    parentCache.set(mapped.id, mapped)
    openPost(mapped)
  } catch {
    alert('未找到原帖')
  }
}

async function submitPostComment() {
  if (!selectedPost.value?.id) return
  const body = String(commentText.value || '').trim()
  if (!body) return
  if (body.length > commentMaxLen.value) {
    commentMsg.value = '评论过长'
    commentErr.value = true
    return
  }
  commentSubmitting.value = true
  commentMsg.value = ''
  commentErr.value = false
  try {
    const res = await api.addPostComment(selectedPost.value.id, body)
    const c = res.data
    commentText.value = ''
    if (c?.status && c.status !== 'approved') {
      commentMsg.value = '评论已提交审核'
      commentErr.value = false
      return
    }
    const next = {
      id: c.id,
      user: { name: c.user_name, avatar: c.user_avatar_url || '' },
      body: c.body,
      created_at: c.created_at
    }
    if (commentOrder.value === 'asc') {
      selectedPost.value.comments = [...(selectedPost.value.comments || []), next]
    } else {
      selectedPost.value.comments = [next, ...(selectedPost.value.comments || [])]
    }
  } catch (err) {
    commentMsg.value = err?.message || '评论失败'
    commentErr.value = true
  } finally {
    commentSubmitting.value = false
  }
}

async function loadPosts() {
  const res = await api.getPosts({ sortBy: sortBy.value, order: sortOrder.value, adminOnly: adminOnly.value })
  posts.value = (res.data || []).map(mapPost)
  resolveParentLinks()
  posts.value.forEach(p => { ensureParent(p) })
  openPostFromRoute()
}

async function loadLandmarks() {
  const res = await api.getLandmarks()
  landmarks.value = res.data || []
  applyRouteQuery()
}

onMounted(() => {
  loadPosts()
  loadLandmarks()
  applyDefaultLandmark()

  // NOTE: community scroll restore removed (no sessionStorage usage)
})

watch([sortBy, sortOrder], () => {
  loadPosts()
})

watch(adminOnly, () => {
  loadPosts()
})

watch(() => route.query, () => {
  applyRouteQuery()
})

watch(() => props.defaultLandmarkName, () => {
  applyDefaultLandmark()
})

function applyRouteQuery() {
  const landmarkId = Number(route.query.landmarkId)
  if (Number.isFinite(landmarkId) && landmarks.value.length) {
    const lm = landmarks.value.find(l => l.id === landmarkId)
    if (lm) {
      filterLandmark.value = lm.name
      if (String(route.query.openPublish || '') === '1') {
        publishLandmark.value = lm
        openPublish()
      }
      return
    }
  }
  if (String(route.query.openPublish || '') === '1') {
    openPublish()
  }
  openPostFromRoute()
  // 清理已消费的查询参数，避免回退/导航时重复触发
  try {
    const q = { ...route.query }
    let changed = false
    for (const k of ['postId', 'openPublish', 'photoId']) {
      if (typeof q[k] !== 'undefined') { delete q[k]; changed = true }
    }
    if (changed) router.replace({ name: 'map', query: q }).catch(() => {})
  } catch (e) {}
}

async function openPostFromRoute() {
  const id = Number(route.query.postId)
  if (!Number.isFinite(id)) return
  if (selectedPost.value?.id === id) return
  const local = posts.value.find(p => Number(p.id) === id)
  if (local) {
    // 清理 URL 中的 postId 查询，避免返回时再次触发打开
    try {
      const q = { ...route.query }
      delete q.postId
      await router.replace({ name: 'map', query: q })
    } catch (e) {}
    openPost(local)
    return
  }
  try {
    // 同样在通过路由打开远程帖子前清理 postId 查询参数，避免返回循环
    try {
      const q = { ...route.query }
      delete q.postId
      await router.replace({ name: 'map', query: q })
    } catch (e) {}
    const res = await api.getPost(id)
    const mapped = mapPost(res.data)
    posts.value = [mapped, ...posts.value.filter(p => p.id !== id)]
    openPost(mapped)
  } catch {}
}

function applyDefaultLandmark() {
  if (hasAppliedDefault.value) return
  const name = String(props.defaultLandmarkName || '').trim()
  if (!name) return
  if (!filterLandmark.value) {
    filterLandmark.value = name
  }
  hasAppliedDefault.value = true
}

watch(commentOrder, () => {
  if (selectedPost.value) loadPostComments()
})

watch(articleCoverChoices, () => {
  syncArticleCoverSelection()
}, { immediate: true })

watch(publishCoverSource, (source) => {
  if (source === 'article') {
    syncArticleCoverSelection()
  }
})

</script>

<style scoped>
.community {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  min-height: 100%;
  scrollbar-width: none;
}
.community::-webkit-scrollbar {
  width: 0;
  height: 0;
}
.community.modal-active {
  overflow: hidden;
}
.community.modal-active .post-detail-body {
  overflow: hidden;
}
.scroll-top-btn {
  position: absolute;
  left: 18px;
  bottom: 18px;
  width: 44px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  box-shadow: 0 8px 22px rgba(11,18,32,0.08);
  border: none;
  cursor: pointer;
  z-index: 2000;
  pointer-events: auto;
  transition: transform 120ms ease, left 180ms ease, right 180ms ease;
  will-change: transform, left, right;
  overflow: visible; /* allow larger image to overflow the circular button */
}
.scroll-top-btn img.scroll-top-img {
  width: 69px;
  height: 69px;
  display: block;
  object-fit: contain;
  pointer-events: none; /* ensure clicks go to the button */
}
/* like button image wrapper */
.like-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.like-image {
  width: 48px;
}
.like-image .like-img {
  width: 100%;
  display: block;
}
.like-btn {
  margin-top: -6px;
  padding: 0 10px;
  height: 32px;
}
.community-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 100%;
}
.post-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: 12px 0 16px;
  position: relative;
}
.post-detail-panel {
  position: absolute;
  inset: 0;
  background: var(--bg);
  z-index: 20;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.publish-page {
  position: fixed;
  inset: 0;
  background: var(--bg);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.publish-back {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--accent);
  color: var(--accent);
  background: rgba(0, 123, 255, 0.08);
}
.publish-back:hover {
  background: rgba(0, 123, 255, 0.16);
}
.publish-page {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: sans-serif;
}

.publish-msg-inline {
  font-size: 13px;
  flex-shrink: 0;
}

.publish-header-bar {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  flex-shrink: 0;
}

.publish-body-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.publish-editor-pane {
  display: flex;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  transition: width 320ms cubic-bezier(.22,.9,.36,1), transform 320ms cubic-bezier(.22,.9,.36,1);
}

.publish-editor-pane.is-previewing {
  width: 50%;
}

.publish-body-layout.split-preview .publish-side {
  width: 220px;
}

.publish-preview-pane {
  width: 50%;
  min-width: 0;
  border-left: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
  overflow: auto;
}

.preview-sheet {
  max-width: 920px;
  margin: 0 auto;
  padding: 22px 26px 30px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.preview-top {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--muted);
  text-transform: uppercase;
}

.preview-title-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-main-title {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: var(--text);
  line-height: 1.35;
}

.preview-sub-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--muted, #8fa1c2);
}

.preview-cover-figure,
.preview-body-figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.preview-cover-figure.is-grid {
  width: min(100%, 860px);
  align-self: center;
  display: grid;
  gap: 6px;
}
.preview-cover-figure.count-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.preview-cover-figure.count-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.preview-cover-tile {
  min-width: 0;
  overflow: hidden;
  border-radius: 10px;
}

.preview-cover-img,
.preview-body-img {
  width: min(100%, 860px);
  max-height: 460px;
  border-radius: 10px;
  object-fit: cover;
  display: block;
}
.preview-cover-grid-img {
  width: 100%;
  height: 300px;
  object-fit: cover;
  display: block;
}

.preview-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.preview-body-heading {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.preview-body-para {
  margin: 0;
  line-height: 1.75;
  font-size: 15px;
  color: var(--text);
  white-space: pre-wrap;
}

.preview-body-caption {
  font-size: 13px;
  color: var(--muted, #8fa1c2);
  text-align: center;
  min-height: 20px;
}

.preview-pane-enter-active,
.preview-pane-leave-active {
  transition: transform 320ms cubic-bezier(.22,.9,.36,1), opacity 320ms cubic-bezier(.22,.9,.36,1);
}

.preview-pane-enter-from,
.preview-pane-leave-to {
  transform: translateX(40px);
  opacity: 0;
}

.preview-pane-enter-to,
.preview-pane-leave-from {
  transform: translateX(0);
  opacity: 1;
}

.publish-side {
  width: 260px;
  padding: 20px;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--bg);
}

.publish-main-col {
  flex: 1;
  padding: 20px 40px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--bg);
}

.publish-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.publish-field label {
  font-weight: bold;
  font-size: 14px;
  color: var(--text);
}

.cover-source-switch {
  display: flex;
  gap: 8px;
}
.cover-source-btn {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255,255,255,0.02);
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, color 0.2s, transform 0.2s;
}
.cover-source-btn:hover {
  border-color: var(--accent);
  color: var(--text);
}
.cover-source-btn.active {
  border-color: rgba(0,119,255,0.48);
  background: rgba(0,119,255,0.1);
  color: var(--accent);
  box-shadow: 0 10px 26px rgba(0,119,255,0.12);
}
.cover-branch-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255,255,255,0.02);
}
.cover-branch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.cover-branch-title {
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  white-space: nowrap;
}
.cover-choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  max-height: 320px;
  overflow: auto;
}
.cover-choice-grid-wrap {
  position: relative;
}
.cover-choice-card {
  position: relative;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.cover-choice-card:hover {
  transform: translateY(-1px);
  border-color: rgba(0,119,255,0.48);
  box-shadow: 0 10px 24px rgba(6,12,20,0.08);
}
.cover-choice-card.is-selected {
  border-color: rgba(0,119,255,0.7);
  box-shadow: 0 0 0 2px rgba(0,119,255,0.12);
}
.cover-choice-card img {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: block;
  object-fit: cover;
}
.cover-choice-meta {
  display: block;
  padding: 8px 10px 10px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}
.cover-choice-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 8px 18px rgba(0,119,255,0.28);
}
.cover-branch-empty {
  padding: 18px 14px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
  line-height: 1.55;
  text-wrap: balance;
  word-break: keep-all;
}

.cover-uploader {
  width: 100%;
  aspect-ratio: 16/9;
  border: 1px dashed var(--border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  background: transparent;
  transition: background 0.2s;
}
.cover-uploader:hover {
  background: rgba(0,0,0,0.02);
}
.cover-uploader img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.uploader-placeholder {
  width: 100%;
  max-width: 220px;
  margin: 0 auto;
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  color: var(--muted);
}
.up-text,
.up-hint {
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
}
.up-text {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}
.up-icon {
  font-size: 24px;
  margin-bottom: 4px;
}
.up-hint {
  font-size: 10px;
  color: var(--muted);
  opacity: 0.8;
  line-height: 1.45;
}
.cover-upload-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.cover-upload-meta .muted {
  flex: 1 1 auto;
  min-width: 0;
  line-height: 1.45;
  white-space: normal;
  overflow-wrap: anywhere;
}
.cover-clear-btn {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.publish-title-input {
  font-size: 18px;
  font-weight: bold;
}

.readonly-text {
  padding: 6px 0;
  color: var(--muted);
}

.summary-textarea {
  resize: vertical;
  min-height: 60px;
}

.tag-selector {
  min-height: 36px;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  cursor: pointer;
  background: var(--bg);
  transition: border-color 0.2s;
}
.tag-selector:hover {
  border-color: var(--text);
}
.tag-chip {
  background: var(--accent);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
}

.content-blocks-field {
  flex: 1;
}
.blocks-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.content-block-item {
  position: relative;
  background: var(--bg);
  border: 1px solid var(--border);
  padding: 12px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  transition: box-shadow 0.2s, border-color 0.2s;
}
.content-block-item:focus-within {
  border-color: var(--text);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.block-toolbar {
  position: absolute;
  top: -10px;
  right: -10px;
  display: none;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 2px;
}
.content-block-item:hover .block-toolbar {
  display: flex;
}
.block-toolbar .icon-btn {
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text);
  background: transparent;
  border: none;
}
.block-toolbar .icon-btn:hover {
  background: rgba(0,0,0,0.05);
}

.block-paragraph {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  min-height: 40px;
  font-size: 15px;
  line-height: 1.6;
  background: transparent;
  color: var(--text);
}
.block-subtitle {
  width: 100%;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
  background: transparent;
  color: var(--text);
}
.block-image-uploader {
  width: 100%;
  aspect-ratio: 16/9;
  border: 1px dashed var(--border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: transparent;
  transition: background 0.2s;
}
.block-image-uploader:hover {
  background: rgba(0,0,0,0.02);
}
.block-image-uploader img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.block-add-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 16px 0;
}
.add-block-btn {
  font-size: 12px;
  color: var(--accent);
  border: 1px dashed var(--accent);
  background: transparent;
  transition: all 0.2s;
}
.add-block-btn:hover {
  background: var(--accent);
  color: var(--bg);
  border-color: var(--accent);
}

.publish-actions {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 12px;
}
.publish-action-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--accent);
  color: var(--accent);
  background: rgba(0, 123, 255, 0.08);
}
.publish-action-btn:hover {
  background: rgba(0, 123, 255, 0.16);
}
.publish-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.publish-slide-enter-active,
.publish-slide-leave-active {
  transition: opacity 240ms ease, transform 240ms ease;
}
.publish-slide-enter-from,
.publish-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.publish-slide-enter-to,
.publish-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}
.post-detail-footer {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--card);
}
.post-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--card);
}
.post-detail-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
}
.post-title {
  font-size: 20px;
  font-weight: 700;
  margin-top: 8px;
  margin-bottom: 10px;
}
.post-summary {
  font-size: 14px;
  color: var(--muted, #8fa1c2);
  margin-bottom: 10px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid var(--accent);
  border-radius: 4px;
}
.post-cover img,
.post-paragraph-image {
  width: 100%;
  border-radius: 12px;
  display: block;
  margin: 10px 0;
  object-fit: cover;
}
.post-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.post-paragraph {
  line-height: 1.7;
  color: var(--text);
  word-break: break-word;
}
.post-subtitle {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin-top: 12px;
  margin-bottom: 6px;
  border-bottom: 2px solid var(--accent);
  display: inline-block;
  padding-bottom: 2px;
}
.post-detail-body::-webkit-scrollbar {
  width: 0;
  height: 0;
}
.post-detail-body {
  scrollbar-width: none;
}
.local-overlay {
  position: absolute;
  inset: 0;
  z-index: 1400;
  background: rgba(5, 10, 18, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12px;
}
.detail-slide-enter-active,
.detail-slide-leave-active {
  transition: transform 520ms cubic-bezier(.22,.9,.36,1), opacity 520ms cubic-bezier(.22,.9,.36,1);
  position: absolute;
  inset: 0;
}
.detail-slide-enter-active {
  z-index: 2;
}
.detail-slide-leave-active {
  z-index: 1;
  pointer-events: none;
}
.detail-slide-enter-from {
  transform: translateX(-120px);
  opacity: 0;
}
.detail-slide-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.detail-slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.detail-slide-leave-to {
  transform: translateX(-120px);
  opacity: 0;
}
.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 320ms ease, opacity 320ms ease;
}
.sheet-slide-enter-from {
  transform: translateY(36px);
  opacity: 0;
}
.sheet-slide-enter-to {
  transform: translateY(0);
  opacity: 1;
}
.sheet-slide-leave-from {
  transform: translateY(0);
  opacity: 1;
}
.sheet-slide-leave-to {
  transform: translateY(36px);
  opacity: 0;
}
@media (max-width: 900px) {
  .community-main {
    grid-template-columns: 1fr;
  }
  .post-list {
    max-width: 100%;
  }
  .cover-choice-grid {
    grid-template-columns: 1fr;
  }
  .cover-branch-head,
  .cover-upload-meta {
    align-items: flex-start;
    flex-direction: column;
  }
  .cover-source-switch {
    flex-direction: column;
  }
}
/* 全宽单列卡片 */
.post-card {
  display: block;
  width: 100%;
  overflow: hidden;
  padding: 0;
  transition: transform 180ms cubic-bezier(.22,.9,.36,1), box-shadow 180ms ease, border-color 160ms ease;
  will-change: transform, box-shadow;
  position: relative;
}
.post-card:hover {
  transform: translateY(-3px);
  z-index: 1100;
  box-shadow: 0 14px 40px rgba(6,12,20,0.16);
  border-color: rgba(0,119,255,0.8);
}
.post-filter-enter-active,
.post-filter-leave-active {
  transition:
    opacity 280ms cubic-bezier(.22,.9,.36,1),
    transform 340ms cubic-bezier(.22,.9,.36,1),
    filter 320ms cubic-bezier(.2,.8,.2,1);
  will-change: transform, opacity, filter;
  transform-origin: center top;
}
.post-filter-move {
  transition: transform 300ms cubic-bezier(.22,.9,.36,1);
}
.post-filter-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.972);
  filter: blur(10px) saturate(0.82);
}
.post-filter-enter-to,
.post-filter-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0) saturate(1);
}
.post-filter-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.978);
  filter: blur(12px) saturate(0.78);
}
.post-filter-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
  pointer-events: none;
}
.wf-cover {
  width: 100%;
  overflow: hidden;
  border-radius: 8px 8px 0 0;
  line-height: 0;
  max-height: 400px;
  background: rgba(10, 18, 30, 0.94);
  display: grid;
  grid-template-columns: 1fr;
}
.wf-cover.is-grid {
  gap: 4px;
  padding: 4px;
}
.wf-cover.count-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.wf-cover.count-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.wf-cover-tile {
  overflow: hidden;
  min-width: 0;
  border-radius: 6px;
}
.wf-cover img {
  width: 100%;
  height: 400px;
  display: block;
  object-fit: cover;
  transition: transform 240ms ease;
}
.wf-cover.count-2 img {
  height: 320px;
}
.wf-cover.count-3 img {
  height: 260px;
}
.post-card:hover .wf-cover img {
  transform: scale(1.02);
}
.wf-body {
  padding: 14px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* 用户信息行 */
.wf-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.wf-user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.post-avatar-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent, #0077ff);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wf-user {
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wf-date {
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}
/* 标签 + 标题行 */
.wf-tags-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.wf-left-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.wf-tags-normal {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex-shrink: 0;
  max-width: 45%;
  justify-content: flex-end;
}
.wf-tags-landmark {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.wf-tags-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  max-width: 50%;
}
.wf-tag-chip {
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  user-select: none;
}
.wf-tag-chip:hover {
  opacity: 0.75;
  transform: scale(1.05);
}
.tag-landmark {
  background: rgba(255, 152, 0, 0.12);
  color: #d4810a;
  border: 1px solid rgba(255, 152, 0, 0.3);
}
.tag-normal {
  background: rgba(0, 119, 255, 0.08);
  color: var(--text);
}
.wf-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.4;
  word-break: break-word;
}
.wf-summary {
  font-size: 13px;
  color: var(--muted, #8fa1c2);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
/* 点赞行 */
.wf-like-row {
  display: flex;
  justify-content: flex-end;
}
@media (max-width: 600px) {
  .wf-tags-title-row {
    flex-direction: column;
    gap: 6px;
  }
  .wf-tags-normal {
    max-width: 100%;
    justify-content: flex-start;
  }
  .wf-cover img {
    height: 220px;
  }
  .wf-cover.count-2 img,
  .wf-cover.count-3 img {
    height: 180px;
  }
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
  cursor: zoom-in;
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
.detail-like-row {
  display: flex;
  justify-content: flex-start;
}
.parent-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  padding: 10px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  transform: scale(0.98);
  opacity: 0.9;
  cursor: pointer;
  transition: transform 120ms ease, opacity 120ms ease, border-color 120ms ease;
}
.parent-preview:hover {
  transform: scale(0.995);
  opacity: 1;
  border-color: var(--accent);
}
.parent-preview.inset {
  background: rgba(255,255,255,0.03);
}
.parent-label {
  font-size: 12px;
  color: var(--accent);
  letter-spacing: 0.5px;
}
.parent-body {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 10px;
  align-items: center;
}
.parent-img img {
  width: 96px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  filter: blur(1px) saturate(0.9);
}
.parent-text {
  color: #cfdcff;
  line-height: 1.4;
  filter: blur(0.2px) saturate(0.9);
}
.reply-action {
  display: flex;
  justify-content: flex-start;
}
.reply-source {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
}
.reply-banner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
}
.comment-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.comment-order {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
}
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.comment-item {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 10px;
  align-items: start;
}
.comment-delete {
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1;
  height: 24px;
  align-self: start;
}
.comment-avatar {
  width: 36px;
  height: 36px;
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
  background: rgba(255,255,255,0.08);
}
.comment-user {
  font-weight: 600;
}
.comment-body {
  color: var(--text);
  margin-top: 2px;
}
.comment-input {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--card);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-weight: 600;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.image-preview {
  width: min(92vw, 980px);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
  box-shadow: 0 12px 30px rgba(11,18,32,0.06);
}
.image-preview img {
  width: 100%;
  max-height: calc(80vh - 100px);
  object-fit: contain;
  border-radius: 10px;
  background: var(--bg);
}
.image-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 6px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}
.image-title {
  font-weight: 600;
  color: var(--text);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}
.image-preview-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.image-preview-body {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 6px;
}
.btn.icon {
  padding: 8px 10px;
  min-width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Community-left-half image overlay */
.community-image-overlay {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  right: 50%;
  background: rgba(11,18,32,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1800;
}
.community-image-modal {
  /* ensure modal stays within left half with margins */
  width: min(86%, calc(50vw - 96px), 520px);
  max-height: 86vh;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 12px 30px rgba(11,18,32,0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}
.community-image-body {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  overflow: auto;
  padding: 6px 0;
}
.community-image-body img {
  max-width: 100%;
  max-height: calc(86vh - 120px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  background: var(--bg);
}
.community-image-download { display:flex; justify-content:center; padding-bottom:6px; }
.community-image-download .btn.primary { min-width:140px; }
.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.file-item {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
}
.file-item img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 8px;
}
.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

