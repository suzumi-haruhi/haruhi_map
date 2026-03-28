<template>
  <div class="page-pad">
    <!-- 匿名用户 -->
    <div class="card" v-if="user?.type === 'anon'">
      <div class="section-title">团员信息</div>

      <div class="row" style="justify-content: space-between; align-items: center; margin-top:6px;">
        <div>
          <div class="muted">我的昵称</div>
          <div style="font-weight:700; margin-top:4px;">{{ user.nickname }}</div>
        </div>
        <button class="btn ghost" @click="toggleEdit">编辑</button>
      </div>

      <div v-if="editing" class="row wrap" style="margin-top:10px; gap:8px;">
        <input class="input" placeholder="新昵称" v-model="newNickname" />
        <button class="btn primary" :disabled="!newNickname" @click="saveNickname">保存</button>
        <button class="btn ghost" @click="cancelEdit">取消</button>
      </div>

      <hr class="divider" />

      <div class="row" style="gap: 8px; flex-wrap: wrap;">
        <button class="btn primary" @click="openFormal">作为正式用户登录</button>
      </div>
    </div>

    <!-- 正式用户 -->
    <div class="card" v-else-if="user?.type === 'formal'">
      <div class="row" style="align-items: center; gap: 12px; justify-content: space-between; flex-wrap: wrap;">
        <div class="row" style="align-items: center; gap: 12px;">
          <div class="avatar" @click="triggerAvatar">
            <img :src="user.avatar_url || defaultAvatar" alt="avatar" />
          </div>
          <div>
            <div class="muted">昵称</div>
            <div style="font-weight:700; margin-top:4px;">{{ user.nickname }}</div>
          </div>
          <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarFile" />
        </div>
        <div class="row" style="gap: 8px;">
          <button class="btn ghost" @click="logoutToAnon">退出登录</button>
        </div>
      </div>

      <div style="margin-top:12px;">
        <details class="card fold">
          <summary>我的收藏</summary>
          <div class="grid" style="grid-template-columns: 1fr; margin-top:10px;">
            <div v-if="!favorites.length" class="muted">暂无收藏</div>
            <div v-for="lm in favorites" :key="lm.id" class="lm-card clickable" @click="openFavorite(lm)">
              <div class="post-row">
                <img v-if="favoriteCover(lm)" :src="favoriteCover(lm)" alt="favorite" />
                <div class="post-info">
                  <div class="post-text">{{ lm.name }}</div>
                </div>
              </div>
              <div class="card-actions">
                <button class="btn danger" @click.stop="removeFavorite(lm)">取消收藏</button>
              </div>
            </div>
          </div>
        </details>

        <details class="card fold">
          <summary>我的点赞</summary>
          <div class="grid" style="grid-template-columns: 1fr; margin-top:10px;">
            <div v-for="p in myLikedPosts" :key="p.id" class="lm-card clickable" @click="openLikedPost(p)">
              <div class="post-row">
                <img v-if="p.images.length" :src="p.images[0]" alt="like" />
                <div class="post-info">
                  <div class="muted">{{ formatDate(p.created_at) }}</div>
                  <div class="post-text">{{ truncate(p.content, 150) }}</div>
                  <div class="tag-row">
                    <span v-for="tag in p.tags" :key="tag" class="tag">{{ tag }}</span>
                  </div>
                </div>
              </div>
              <div class="card-actions">
                <button class="btn ghost" @click.stop="removeLike(p)">取消点赞</button>
              </div>
            </div>
          </div>
        </details>

        <details class="card fold" style="margin-top:10px;">
          <summary>我的评论</summary>
          <div class="grid" style="grid-template-columns: 1fr; margin-top:10px;">
            <div v-for="c in myPostComments" :key="c.id" class="lm-card clickable" @click="openCommentPost(c)">
              <div class="muted">{{ formatDate(c.created_at) }}</div>
              <div class="post-text" style="margin-top:6px;">
                <template v-if="isJsonLike(c.body)">
                  <template v-if="extractBodyFromJson(c.body)">
                    {{ truncate(extractBodyFromJson(c.body), 150) }}
                  </template>
                  <template v-else>
                    <!-- 如果是 JSON 但无法提取可读字段，则隐藏显示 -->
                    <span class="muted">（已隐藏内容）</span>
                  </template>
                </template>
                <template v-else>
                  {{ truncate(c.body, 150) }}
                </template>
              </div>
              <div class="muted" style="margin-top:8px;">关联帖子：</div>
              <div class="post-row" style="margin-top:6px;">
                <img v-if="c.post_images.length" :src="c.post_images[0]" alt="post" />
                <div class="post-info">
                  <div class="muted">{{ formatDate(c.post_created_at) }}</div>
                  <div class="post-text">{{ truncate(c.post_content, 150) }}</div>
                  <div class="tag-row">
                    <span v-for="tag in c.post_tags" :key="tag" class="tag">{{ tag }}</span>
                  </div>
                </div>
              </div>
              <div class="card-actions">
                <button class="btn danger" @click.stop="removePostComment(c)">删除评论</button>
              </div>
            </div>
          </div>
        </details>

        <details class="card fold" style="margin-top:10px;">
          <summary>我的发布</summary>
          <div class="grid" style="grid-template-columns: 1fr; margin-top:10px;">
            <div v-for="p in myPosts" :key="p.id" class="lm-card clickable" @click="openMyPost(p)">
              <div class="post-row">
                <img v-if="p.images.length" :src="p.images[0]" alt="post" />
                <div class="post-info">
                  <div class="muted">{{ formatDate(p.created_at) }}</div>
                  <div class="post-text">{{ truncate(p.content, 150) }}</div>
                  <div class="tag-row">
                    <span v-for="tag in p.tags" :key="tag" class="tag">{{ tag }}</span>
                  </div>
                </div>
              </div>
              <div class="card-actions">
                <button class="btn danger" @click.stop="removePostItem(p)">删除帖子</button>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>

    <div class="card" v-else>
      <div class="section-title">团员信息</div>
      <div class="muted">内容建设中。</div>
    </div>

    <!-- 正式用户登录弹窗（匿名进入后使用） -->
    <div v-if="formalModal" class="login-overlay">
      <section class="card login-card" @click.stop>
        <div class="section-title">正式用户登录</div>
        <div class="grid" style="grid-template-columns: 1fr; margin-top:12px; gap:10px;">
          <input class="input" placeholder="ID" v-model="formalId" />
          <input class="input" type="password" placeholder="密码" v-model="formalPwd" />
          <button class="btn primary" :disabled="!canFormalLogin" @click="formalLogin">登录</button>
          <button class="btn ghost" @click="closeFormal">取消</button>
        </div>
      </section>
    </div>

    <!-- 头像裁剪弹窗 -->
    <div v-if="cropOpen" class="login-overlay">
      <section class="card login-card" @click.stop>
        <div class="section-title">裁剪头像</div>
        <div class="cropper-wrap">
          <img ref="cropImg" :src="cropSrc" alt="crop" />
        </div>
        <div class="row" style="justify-content: flex-end; margin-top:10px;">
          <button class="btn ghost" @click="closeCrop">取消</button>
          <button class="btn primary" @click="saveAvatar">保存</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { storeToRefs } from 'pinia'
import { useUserStore } from '../stores/userStore.js'
import { api } from '../services/api.js'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const { user, favorites } = storeToRefs(userStore)
const router = useRouter()

const editing = ref(false)
const newNickname = ref('')

const formalModal = ref(false)
const formalId = ref('')
const formalPwd = ref('')
const canFormalLogin = computed(() => String(formalId.value || '').trim() && String(formalPwd.value || '').trim())

const defaultAvatar = '/favicon.ico'
const avatarInput = ref(null)
const cropOpen = ref(false)
const cropSrc = ref('')
const cropImg = ref(null)
let cropper = null

const myLikedPosts = ref([])
const myPostComments = ref([])
const myPosts = ref([])

function favoriteCover(lm) {
  const urls = Array.isArray(lm?.anime_shot_urls) ? lm.anime_shot_urls : []
  return urls.find(Boolean) || ''
}

function toggleEdit() {
  editing.value = !editing.value
  newNickname.value = ''
}

function cancelEdit() {
  editing.value = false
  newNickname.value = ''
}

async function saveNickname() {
  const name = String(newNickname.value || '').trim()
  if (!name) return
  try {
    await userStore.updateNickname(name)
    editing.value = false
    newNickname.value = ''
  } catch (err) {
    alert(err?.message || '修改失败')
  }
}

function openFormal() {
  formalModal.value = true
}

function closeFormal() {
  formalModal.value = false
  formalId.value = ''
  formalPwd.value = ''
}

async function formalLogin() {
  if (!canFormalLogin.value) return
  try {
    await userStore.login(formalId.value.trim(), formalPwd.value)
    window.location.reload()
  } catch (err) {
    alert(err?.message || '登录失败')
  }
}

async function logoutToAnon() {
  const input = prompt('请输入作为匿名用户的昵称', user.value?.nickname || '')
  if (input === null) return
  const nickname = input.trim()
  if (!nickname) {
    alert('昵称不能为空')
    return
  }
  try {
    await userStore.logout()
    await userStore.anonymousLogin(nickname)
    window.location.reload()
  } catch (err) {
    alert(err?.message || '切换失败')
  }
}

function triggerAvatar() {
  avatarInput.value?.click()
}

async function onAvatarFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  cropSrc.value = URL.createObjectURL(file)
  cropOpen.value = true
  await nextTick()
  if (cropper) cropper.destroy()
  cropper = new Cropper(cropImg.value, {
    aspectRatio: 1,
    viewMode: 1,
    autoCropArea: 1
  })
}

function closeCrop() {
  cropOpen.value = false
  if (cropper) {
    cropper.destroy()
    cropper = null
  }
  if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
  cropSrc.value = ''
}

async function saveAvatar() {
  if (!cropper) return
  const canvas = cropper.getCroppedCanvas({ width: 512, height: 512 })
  canvas.toBlob(async (blob) => {
    if (!blob) return
    const file = new File([blob], 'avatar.png', { type: 'image/png' })
    try {
      await userStore.updateAvatar(file)
      closeCrop()
    } catch (err) {
      alert(err?.message || '头像更新失败')
    }
  }, 'image/png')
}

function truncate(text, max = 100) {
  const s = String(text || '')
  return s.length > max ? `${s.slice(0, max)}...` : s
}

function formatDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleString() : ''
}

async function removeLike(p) {
  if (!confirm('确认取消点赞？')) return
  try {
    await api.likePost(p.id)
    myLikedPosts.value = myLikedPosts.value.filter(x => x.id !== p.id)
  } catch (err) {
    alert(err?.message || '操作失败')
  }
}

async function removePostComment(c) {
  if (!confirm('确认删除这条评论？')) return
  try {
    await api.deletePostComment(c.id)
    myPostComments.value = myPostComments.value.filter(x => x.id !== c.id)
  } catch (err) {
    alert(err?.message || '删除失败')
  }
}

async function removePostItem(p) {
  if (!confirm('确认删除这条帖子？')) return
  try {
    await api.deletePost(p.id)
    myPosts.value = myPosts.value.filter(x => x.id !== p.id)
  } catch (err) {
    alert(err?.message || '删除失败')
  }
}

// 检测是否像 JSON 字符串或对象（用于隐藏调试/序列化错误的内容）
function isJsonLike(val) {
  if (val == null) return false
  if (typeof val === 'object') return true
  if (typeof val !== 'string') return false
  const t = val.trim()
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))
}

// 尝试从 JSON 字符串或对象中提取常见的可读字段（如 body/text/message）
function extractBodyFromJson(val) {
  if (val == null) return ''
  let obj = null
  if (typeof val === 'object') obj = val
  else if (typeof val === 'string') {
    try { obj = JSON.parse(val) } catch { return '' }
  } else return ''

  if (!obj) return ''
  if (typeof obj.body === 'string' && obj.body.trim()) return obj.body.trim()
  if (typeof obj.text === 'string' && obj.text.trim()) return obj.text.trim()
  if (typeof obj.message === 'string' && obj.message.trim()) return obj.message.trim()
  // 支持常见嵌套结构
  if (obj.data && typeof obj.data === 'object') {
    if (typeof obj.data.text === 'string' && obj.data.text.trim()) return obj.data.text.trim()
  }
  return ''
}

function openMyPost(p) {
  if (!p?.id) return
  router.push({ name: 'map', query: { postId: String(p.id) } })
}

function openPostById(id) {
  const postId = Number(id)
  if (!Number.isFinite(postId)) return
  router.push({ name: 'map', query: { postId: String(postId) } })
}

function openLikedPost(p) {
  openPostById(p?.id)
}

function openCommentPost(c) {
  openPostById(c?.post_id)
}

function openFavorite(lm) {
  if (!lm?.id) return
  router.push({ name: 'map', query: { landmarkId: String(lm.id) } })
}

async function removeFavorite(lm) {
  if (!confirm('确认取消收藏？')) return
  await userStore.removeFavorite(lm.id)
}

async function loadFormalLists() {
  if (user.value?.type !== 'formal') return
  const [likesRes, commentsRes, postsRes] = await Promise.all([
    api.getMyPostLikes(),
    api.getMyPostComments(),
    api.getMyPosts()
  ])
  myLikedPosts.value = likesRes.data || []
  myPostComments.value = commentsRes.data || []
  myPosts.value = postsRes.data || []
}

onMounted(() => {
  loadFormalLists()
})

watch(user, () => {
  loadFormalLists()
})
</script>

<style scoped>
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
  cursor: pointer;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.hidden { display: none; }
.fold { padding: 12px; }
.card + .card { margin-top: 10px; }
.fold .grid {
  gap: 14px;
}
.cropper-wrap { width: min(420px, 80vw); height: min(420px, 80vw); }
.cropper-wrap img { max-width: 100%; }
.lm-card {
  border: 1px solid var(--border);
  border-left: 4px solid rgba(0,119,255,0.14);
  border-radius: 12px;
  padding: 12px;
  background: var(--card);
  box-shadow: 0 8px 20px rgba(10,20,40,0.04);
}
.lm-card + .lm-card {
  border-top: 2px solid rgba(11,17,32,0.04);
}
.post-row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 10px;
  align-items: start;
}
.post-row img {
  width: 96px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.post-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card-actions {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
  text-align: right;
}
.post-text {
  color: var(--text);
  line-height: 1.5;
}
.tag-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0,119,255,0.08);
  color: var(--muted);
  font-size: 12px;
  line-height: 1;
}
.lm-card.clickable {
  cursor: pointer;
}
.lm-card.clickable:hover {
  border-color: #5a82b8;
}
</style>
