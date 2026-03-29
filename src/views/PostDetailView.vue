<template>
  <div class="post-detail-page">
    <!-- 顶栏：左侧发布人头像+昵称，右侧返回+删除 -->
    <div class="post-header">
      <div class="post-header-left">
        <div class="post-avatar" v-if="post.user?.avatar">
          <img :src="post.user.avatar" alt="avatar" />
        </div>
        <div v-else class="post-avatar-fallback"></div>
        <span class="post-user">{{ post.user?.name || '匿名用户' }}</span>
      </div>
      <div class="post-header-right">
        <button class="btn ghost sm" type="button" @click="goBack">返回</button>
        <button v-if="isPostAuthor" class="btn danger sm" type="button" @click="requestDeletePost">删除</button>
      </div>
    </div>

    <!-- 点赞按钮（居中） -->
    <div class="like-row post-section">
      <div class="like-wrapper">
        <img src="@/assets/haruhi_like.webp" alt="like" class="like-img" />
        <button class="like-btn" :class="{liked: post.liked}" @click="togglePostLike">
          {{ post.liked ? '已赞' : '点赞' }} {{ post.likes || 0 }}
        </button>
      </div>
    </div>

    <!-- 标题 + 副标题 -->
    <div class="post-title-block post-section">
      <h1 class="post-main-title" v-if="post.title">{{ post.title }}</h1>
      <h2 class="post-sub-title" v-if="post.summary">{{ post.summary }}</h2>
    </div>

    <!-- 头图 -->
    <figure
      class="post-cover post-section"
      v-if="post.coverImages?.length"
      :class="{
        'is-grid': post.coverImages.length > 1,
        'count-2': post.coverImages.length === 2,
        'count-3': post.coverImages.length === 3
      }"
    >
      <template v-if="post.coverImages.length === 1">
        <img
          :src="post.coverImages[0]"
          alt="头图"
          class="post-cover-img"
          @click="openImageAt(0)"
        />
      </template>
      <template v-else>
        <button
          v-for="(img, idx) in post.coverImages"
          :key="`cover-${idx}`"
          class="post-cover-tile"
          type="button"
          @click="openImageAt(idx)"
        >
          <img :src="img" :alt="`头图 ${idx + 1}`" class="post-cover-grid-img" />
        </button>
      </template>
      <figcaption
        v-if="post.coverImages.length === 1"
        class="post-body-caption"
        :class="{ 'is-empty': !getCoverImageCaption() }"
      >{{ getCoverImageCaption() || ' ' }}</figcaption>
    </figure>

    <!-- 正文（按段落/标题顺序） -->
    <div class="post-body post-section">
      <template v-for="(item, idx) in contentLines" :key="idx">
        <h3 v-if="item.type === 'heading'" class="post-body-heading">{{ item.text }}</h3>
        <p v-else class="post-body-para">{{ item.text }}</p>
      </template>
    </div>

    <!-- 正文图片 -->
    <div v-if="post.bodyImages?.length" class="post-body-images post-section">
      <figure
        v-for="(img, idx) in post.bodyImages"
        :key="idx"
        class="post-body-figure"
        @click="openImageAt(post.coverImageCount + idx)"
      >
        <img :src="img" alt="正文图片" class="post-body-img" />
        <figcaption class="post-body-caption" :class="{ 'is-empty': !getBodyImageCaption(idx) }">{{ getBodyImageCaption(idx) || ' ' }}</figcaption>
      </figure>
    </div>

    <!-- COMMENTS -->
    <div class="comment-editor post-section">
      <textarea
        class="input"
        rows="3"
        v-model="commentText"
        :maxlength="commentMaxLen"
        :placeholder="commentPlaceholder"
      ></textarea>
      <div class="row" style="justify-content: space-between; margin-top:6px;">
        <div class="muted">{{ commentText.length }} / {{ commentMaxLen }}</div>
        <button class="btn primary" :disabled="commentSubmitting" @click="submitPostComment">
          {{ commentSubmitting ? '发布中...' : '发布评论' }}
        </button>
      </div>
      <div v-if="commentMsg" class="muted" :style="{color: commentErr ? '#ff9b9b' : '#8fa1c2'}">{{ commentMsg }}</div>
    </div>

    <div class="comment-order post-section">
      <label class="muted">评论排序</label>
      <select class="input" v-model="commentOrder">
        <option value="asc">正序</option>
        <option value="desc">倒序</option>
      </select>
    </div>

    <div class="comment-list post-section">
      <div v-for="c in comments" :key="c.id" class="comment-item">
        <div class="comment-meta">
          <div class="comment-avatar">
            <img v-if="c.user.avatar" :src="c.user.avatar" alt="avatar" />
            <div v-else class="avatar-fallback"></div>
          </div>
          <div class="comment-user">{{ c.user.name }}</div>
           <div class="comment-time muted">{{ formatDate(c.createdAt || c._raw?.created_at || c._raw?.createdAt || c._raw?.time || c._raw?.timestamp) }}</div>
        </div>
        <div class="comment-content">
          <div class="comment-body">
            <template v-if="c.body && String(c.body).trim()">
              {{ c.body }}
            </template>
            <template v-else-if="c._raw && c._raw.body && c._raw.body !== '[object Object]'">
              {{ c._raw.body }}
            </template>
            <template v-else>
              <div class="muted">（评论内容无法解析）</div>
            </template>
          </div>
        </div>
        <button v-if="canDeleteComment(c)" class="btn danger comment-delete" type="button" @click.stop="requestDeleteComment(c)">删除</button>
      </div>
      <div v-if="!comments.length" class="muted">暂无评论</div>
    </div>

    <!-- IMAGE PREVIEW -->
    <Transition name="preview-slide">
      <div v-if="previewOpen" class="post-modal-wrap" @click="closeImagePreview">
        <section class="image-preview" @click.stop>
          <div class="image-preview-header">
            <div class="image-title">{{ previewName || '图片预览' }}</div>
            <div class="image-preview-actions">
              <a class="btn primary" :href="previewSrc" :download="previewName" title="下载图片">下载</a>
              <button class="btn icon ghost" @click="closeImagePreview" aria-label="关闭预览">✕</button>
            </div>
          </div>
          <div class="image-preview-body">
            <img :src="previewSrc" alt="preview" />
          </div>
        </section>
      </div>
    </Transition>

  </div><!-- .post-detail-page -->
</template>

<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
const emit = defineEmits(['close'])
const props = defineProps({ initialPostId: { type: [Number, String], default: 0 } })
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api.js'
import { useUserStore } from '../stores/userStore.js'
import { resolvePostMedia } from '../utils/postMedia.js'
const userStore = useUserStore()

const route = useRoute()
const router = useRouter()
const postId = ref(Number(props.initialPostId || route.params.id || 0))

// 当路由参数变化时重新加载（保留原有行为）
watch(() => route.params.id, (val) => {
  if (!props.initialPostId) {
    postId.value = Number(val || 0)
    console.log('[PostDetailView] route param id changed:', postId.value)
    loadPost()
  }
})

// 支持由外部直接传入的 initialPostId（例如嵌入场景）
watch(() => props.initialPostId, (val) => {
  const pid = Number(val || 0)
  if (pid && pid !== postId.value) {
    postId.value = pid
    console.log('[PostDetailView] initialPostId changed:', postId.value)
    loadPost()
  }
})

const post = ref({ tags: [], images: [], user: {}, parent: null, comments: [] })
const comments = ref([])
const currentImage = ref(0)
const previewOpen = ref(false)
const previewSrc = ref('')
const previewName = ref('')

const commentText = ref('')
const commentOrder = ref('asc')
const commentSubmitting = ref(false)
const commentMsg = ref('')
const commentErr = ref(false)
const commentMaxLen = 300
const commentPlaceholder = '发表评论...'

const isPostAuthor = computed(() => {
  const nick = userStore.user?.nickname
  return !!(nick && nick === post.value?.user?.name)
})

function canDeleteComment(comment) {
  const nickname = String(userStore.user?.nickname || '').trim()
  const author = String(comment?.user?.name || '').trim()
  return !!(nickname && author && nickname === author)
}

const contentLines = computed(() => {
  const resolvedCoverCaption = getCoverImageCaption()
  const captions = (Array.isArray(post.value?.imageCaptions) ? post.value.imageCaptions : [])
    .map(t => String(t || '').trim())
    .filter(Boolean)
  if (resolvedCoverCaption) captions.push(resolvedCoverCaption)
  const captionSet = new Set(captions)
  return String(post.value.content || '').split(/\n+/).map(s => s.trim()).filter(Boolean).filter(line => {
    // 避免把图片说明同时渲染在正文与图片下方
    return !captionSet.has(line)
  }).map(line => {
    if (line.startsWith('## ')) return { type: 'heading', text: line.substring(3).trim() }
    return { type: 'para', text: line }
  })
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString()
}

function truncate(text, max) {
  const s = String(text || '')
  return s.length > max ? `${s.slice(0, max)}...` : s
}

function getShortContentLines() {
  return String(post.value?.content || '')
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith('## ') && line.length <= 80)
}

function getBodyImageCaption(imageIndex) {
  const list = Array.isArray(post.value?.bodyImageCaptions) ? post.value.bodyImageCaptions : []
  const text = String(list[imageIndex] || '').trim()
  return text
}

function getCoverImageCaption() {
  const list = Array.isArray(post.value?.coverCaptions) ? post.value.coverCaptions : []
  const explicit = String(list[0] || '').trim()
  if (explicit) return explicit

  // 兼容历史数据：单图帖子且未单独存图注时，正文末段短文本作为首图图注
  const onlyOneImage = Array.isArray(post.value?.images) && post.value.images.length === 1
  if (!onlyOneImage) return ''
  const lines = getShortContentLines()
  if (!lines.length) return ''
  const lastLine = String(lines[lines.length - 1] || '').trim()
  if (!lastLine) return ''
  return lastLine
}

function extractCommentText(val) {
  if (val == null) return ''
  if (typeof val === 'string') {
    // try parse JSON string
    const trimmed = val.trim()
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) ) {
      try {
        const parsed = JSON.parse(trimmed)
        return extractCommentText(parsed)
      } catch {}
    }
    return val
  }
  if (typeof val === 'object') {
    // Common rich text shapes
    if (Array.isArray(val)) return val.map(extractCommentText).join('\n')
    if (val.plain_text) return String(val.plain_text)
    if (val.text) return String(val.text)
    if (val.message) return String(val.message)
    if (val.content && Array.isArray(val.content)) return val.content.map(extractCommentText).join('')
    if (val.blocks && Array.isArray(val.blocks)) return val.blocks.map(b => b.text || '').join('\n')
    if (val.ops && Array.isArray(val.ops)) return val.ops.map(o => (typeof o.insert === 'string' ? o.insert : '')).join('')
    if (val.delta && Array.isArray(val.delta.ops)) return val.delta.ops.map(o => (typeof o.insert === 'string' ? o.insert : '')).join('')
    // fallback to any text-like props
    for (const k of ['body', 'content', 'text', 'message']) {
      if (val[k]) return extractCommentText(val[k])
    }
    try {
      const s = JSON.stringify(val)
      return s === '{}' ? '' : s
    } catch {
      return ''
    }
  }
  return String(val)
}

async function loadPost() {
  if (!postId.value) {
    console.warn('[PostDetailView] missing postId')
    return
  }
  try {
    console.log('[PostDetailView] loading post', postId.value)
    const data = await api.getPost(postId.value)
    console.log('[PostDetailView] api.getPost response:', data)
    // 兼容不同后端返回格式：{ ok:true, data: {...} } 或 { post: {...} } 或 {...}
    const raw = data?.data || data?.post || data
    function normalizeApiPost(src) {
      if (!src) return { tags: [], images: [], user: {}, parent: null, comments: [], title: '', summary: '' }
      const imageSource = Array.isArray(src.images) ? src.images : (src.photos || src.photo_urls || [])
      const normalizedImages = imageSource.map((item) => {
        if (typeof item === 'string') return item
        const direct = item?.url || item?.src || item?.file_url || item?.path || item?.file_path || ''
        if (!direct) return ''
        if (String(direct).startsWith('/api/')) return String(direct)
        return `/api/uploads/${String(direct).replace(/^\/+/, '')}`
      }).filter(Boolean)

      const captionsFromImageObjects = imageSource.map(item => {
        if (item && typeof item === 'object') {
          return String(item.caption || item.image_caption || item.description || '')
        }
        return ''
      })

      const explicitCaptions = Array.isArray(src.image_captions)
        ? src.image_captions
        : (Array.isArray(src.imageCaptions) ? src.imageCaptions : (Array.isArray(src.captions) ? src.captions : []))

      const mergedCaptions = normalizedImages.map((_, idx) => {
        const explicit = String(explicitCaptions[idx] || '').trim()
        if (explicit) return explicit
        return String(captionsFromImageObjects[idx] || '').trim()
      })

      const postData = {
        id: src.id || src._id || src.post_id || null,
        title: src.title || '',
        content: src.content || src.body || src.caption || '',
        summary: src.summary || '',
        user: {
          name: src.user_name || (src.user && (src.user.name || src.user.username)) || '',
          avatar: src.user_avatar_url || (src.user && (src.user.avatar || src.user.avatar_url)) || ''
        },
        images: normalizedImages,
        imageCaptions: mergedCaptions,
        coverMode: src.cover_mode || src.coverMode || 'manual',
        coverImageCount: src.cover_image_count ?? src.coverImageCount ?? 0,
        tags: src.tags || src.tag_list || [],
        parent: src.parent_post || src.parent || null,
        likes: typeof src.like_count !== 'undefined' ? src.like_count : (src.likes || 0),
        liked: !!src.liked
      }
      return { ...postData, ...resolvePostMedia(postData) }
    }
    post.value = normalizeApiPost(raw)
    // reset image index when a new post is loaded
    currentImage.value = 0
    await loadComments()
    // 确保详情面板从顶部开始显示（外层容器可能承载滚动）
    try {
      await nextTick()
      setTimeout(() => {
        try {
          // 优先寻找外层的滚动容器（由 MapView 提供）
          const outer = document.querySelector('.post-detail-slot') || document.querySelector('.post-detail-outer-slot') || document.querySelector('.post-detail-panel')
          if (outer && typeof outer.scrollTo === 'function') {
            outer.scrollTo({ top: 0, behavior: 'auto' })
            return
          }
          // 回退到组件根节点自身
          const self = document.querySelector('.post-detail-page')
          if (self && typeof self.scrollTo === 'function') self.scrollTo({ top: 0, behavior: 'auto' })
        } catch (e) {}
      }, 40)
    } catch (e) {}
  } catch (err) {
    console.error(err)
  }
}

async function loadComments() {
  if (!postId.value) return
  try {
    const res = await api.getPostComments(postId.value, commentOrder.value)
    // 支持多种返回格式
    const list = res?.comments || res?.data?.comments || res?.data || res || []
    console.log('[PostDetailView] raw comments response:', res)
    // 规范化评论项，兼容更多可能的字段名
    const mapped = (Array.isArray(list) ? list : []).map(c => {
      const nested = c?.data || c?.payload || c?.attributes || {}
      const userObj = c.user || nested.user || {}
      let bodyVal = c.body || c.content || c.text || c.message || c.msg || c.comment || nested.body || nested.message || nested.text || ''
      const createdVal = c.createdAt || c.created_at || c.time || c.timestamp || c.created || nested.createdAt || nested.created_at || nested.time || ''
      // if bodyVal is object or JSON, extract readable text
      bodyVal = extractCommentText(bodyVal)
      // if backend stored the literal string "[object Object]", try to extract from raw/nested
      if (String(bodyVal).trim() === '[object Object]') {
        bodyVal = extractCommentText(c._raw) || extractCommentText(nested) || ''
      }
      if (!bodyVal) {
        // try raw fields
        bodyVal = extractCommentText(c._raw) || extractCommentText(nested) || ''
      }
      return {
        id: c.id || c._id || c.comment_id || nested.id || null,
        body: bodyVal,
        createdAt: createdVal,
        user: {
          name: c.user_name || c.username || userObj.name || userObj.username || '',
          avatar: c.user_avatar_url || userObj.avatar || userObj.avatar_url || ''
        },
        _raw: c
      }
    })
    console.log('[PostDetailView] normalized comments:', mapped)
    comments.value = mapped
    post.value.comments = comments.value
  } catch (err) {
    console.error(err)
  }
}

watch(commentOrder, () => loadComments())

function prevImage() { if (!post.value?.images?.length) return; currentImage.value = (currentImage.value - 1 + post.value.images.length) % post.value.images.length }
function nextImage() { if (!post.value?.images?.length) return; currentImage.value = (currentImage.value + 1) % post.value.images.length }

function openImagePreview() {
  const src = post.value?.images?.[currentImage.value]
  if (!src) return
  previewSrc.value = src
  previewName.value = `post-${post.value?.id || 'image'}-${currentImage.value + 1}.jpg`
  previewOpen.value = true
}
function openImageAt(index) {
  currentImage.value = Number(index || 0)
  openImagePreview()
}
function closeImagePreview() { previewOpen.value = false; previewSrc.value = ''; previewName.value = '' }

async function togglePostLike() {
  if (!post.value?.id) return
  try {
    await api.likePost(post.value.id)
    // 简单更新 UI
    post.value.liked = !post.value.liked
    post.value.likes = (post.value.likes || 0) + (post.value.liked ? 1 : -1)
  } catch (e) { console.error(e) }
}

async function submitPostComment() {
  if (!postId.value) return
  if (!commentText.value.trim()) return
  if (commentSubmitting.value) return
  commentSubmitting.value = true
  try {
    await api.addPostComment(postId.value, { body: commentText.value })
    commentText.value = ''
    commentMsg.value = '发布成功'
    commentErr.value = false
    await loadComments()
  } catch (err) {
    commentMsg.value = err?.message || '发布失败'
    commentErr.value = true
  } finally {
    commentSubmitting.value = false
  }
}

function openOriginal(id) {
  if (!id) return
  router.push({ path: `/posts/${id}` })
}

function goBack() {
  // 如果通过 initialPostId 以嵌入方式被父组件打开，则只发出 close 事件
  try {
    const initial = Number(props?.initialPostId || 0)
    if (initial) {
      emit('close')
      return
    }
  } catch (e) {}
  router.back()
}

function requestDeletePost() {
  if (!isPostAuthor.value) return
  const ok = confirm('确认删除该帖子吗？此操作不可撤销。')
  if (!ok) return
  api.deletePost(post.value.id)
    .then(() => goBack())
    .catch(err => alert(err?.message || '删除失败'))
}

function requestDeleteComment(c) {
  if (!c?.id || !canDeleteComment(c)) return
  const ok = confirm('确认删除该评论吗？此操作不可撤销。')
  if (!ok) return
  api.deletePostComment(c.id)
    .then(() => loadComments())
    .catch(err => alert(err?.message || '删除失败'))
}

onMounted(() => {
  loadPost()
})

</script>

<style scoped>
/* ---- 页面容器 ---- */
.post-detail-page {
  --section-gap: 28px;
  --media-max-width: 920px;
  padding: 16px;
  width: 100%;
  max-width: none;
  margin: 0;
  box-sizing: border-box;
}
.post-section + .post-section { margin-top: var(--section-gap); }

/* ---- 顶栏 ---- */
.post-header { display:flex; align-items:center; justify-content:space-between; gap:12px }
.post-header-left { display:flex; align-items:center; gap:10px; min-width:0 }
.post-header-right { display:flex; gap:8px; flex-shrink:0 }
.post-avatar img { width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid var(--border) }
.post-avatar-fallback { width:44px; height:44px; border-radius:50%; background:var(--border); flex-shrink:0 }
.post-user { font-weight:600; font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

/* ---- 点赞按钮 ---- */
.like-row { display:flex; justify-content:center }
.like-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.like-img { width: 56px; display: block }
.like-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 20px;
  border: 2px solid var(--accent, #7b9cff);
  border-radius: 99px;
  background: transparent;
  color: var(--accent, #7b9cff);
  font-size: 15px; font-weight: 600;
  cursor: pointer; transition: background 0.15s, color 0.15s;
}
.like-btn:hover { background: rgba(123,156,255,0.12) }
.like-btn.liked { background: var(--accent, #7b9cff); color: #fff }

/* ---- 标题区 ---- */
.post-title-block { text-align: center; padding: 0 8px }
.post-main-title {
  font-size: 24px; font-weight: 700;
  color: var(--text); margin: 0 0 8px 0; line-height: 1.35;
}
.post-sub-title {
  font-size: 16px; font-weight: 600;
  color: var(--muted, #8fa1c2); margin: 0; line-height: 1.5;
}

/* ---- 头图 ---- */
.post-cover { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.post-cover.is-grid {
  width: 100%;
  display: grid;
  gap: 6px;
  align-items: stretch;
}
.post-cover.is-grid.count-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.post-cover.is-grid.count-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.post-cover-tile {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
  border-radius: 10px;
}
.post-cover-img {
  width: min(100%, var(--media-max-width));
  max-height: 480px;
  object-fit: cover;
  display: block;
  cursor: zoom-in;
  border-radius: 10px;
}
.post-cover-grid-img {
  width: 100%;
  height: 320px;
  object-fit: cover;
  display: block;
}

/* ---- 正文 ---- */
.post-body { padding: 0 2px; display: flex; flex-direction: column; gap: 16px; }
.post-body-heading {
  font-size: 21px;
  font-weight: 700;
  color: #111;
  margin: 0;
  display: block;
}
.post-body-para {
  font-size: 15px; line-height: 1.75;
  color: var(--text); margin: 0;
}

/* ---- 正文图片 ---- */
.post-body-images { display: flex; flex-direction: column; gap: 16px; }
.post-body-figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: zoom-in;
}
.post-body-img {
  width: min(100%, var(--media-max-width));
  max-height: 480px;
  object-fit: cover;
  border-radius: 10px;
  display: block;
}
.post-body-caption {
  color: var(--muted, #8fa1c2);
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  min-height: 20px;
}
.post-body-caption.is-empty {
  opacity: 0;
}
.post-modal-text { margin-top:8px }
.comment-list { margin-top:0 }
.comment-item { display:flex; gap:12px; align-items:flex-start; padding:12px 0; border-bottom:1px solid var(--border) }
.comment-meta { width:84px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:6px }
.comment-meta .comment-avatar img { width:48px; height:48px; border-radius:6px; object-fit:cover }
.comment-user { font-weight:600; font-size:14px }
.comment-time { font-size:12px; color:var(--muted) }
.comment-content { flex:1 }
.comment-body { white-space:pre-wrap }

/* Image preview modal styles (matching CommunityView) */
.post-modal-wrap {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  background: rgba(5,10,18,0.45);
  backdrop-filter: blur(2px);
}

.image-preview {
  width: min(92vw, 820px);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
  box-shadow: 0 12px 30px rgba(2,6,23,0.08);
  color: var(--text);
}
.image-preview img {
  width: 100%;
  max-height: calc(80vh - 100px);
  object-fit: contain;
  border-radius: 10px;
  background: var(--card);
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

@media (max-width: 900px) {
  .post-detail-page { padding: 12px }
  .post-cover-grid-img { height: 220px; }
}

@media (max-width: 480px) {
  .post-cover-grid-img { height: 160px; }
  .image-preview {
    width: calc(100vw - 24px);
    border-radius: 10px;
    padding: 8px;
  }
  .image-preview img {
    max-height: calc(100vh - 140px);
  }
  .image-title { max-width: 60% }
}

/* preview-slide: slide up on enter, slide down on leave */
.preview-slide-enter-active, .preview-slide-leave-active {
  transition: transform 320ms cubic-bezier(.22,.9,.36,1), opacity 320ms cubic-bezier(.22,.9,.36,1);
}
.preview-slide-enter-from { transform: translateY(24px); opacity: 0 }
.preview-slide-enter-to { transform: translateY(0); opacity: 1 }
.preview-slide-leave-from { transform: translateY(0); opacity: 1 }
.preview-slide-leave-to { transform: translateY(24px); opacity: 0 }
</style>
