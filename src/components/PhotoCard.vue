<template>
  <div class="photo-card" :id="photoDomId">
    <img :src="photo.thumb_url || photo.file_url" :alt="'photo-'+photo.id" />
    <div v-if="photo.caption" class="caption">{{ photo.caption }}</div>
    <div class="row" style="justify-content: space-between; align-items: center; margin-top:8px;">
      <div>
        <div class="muted">by {{ photo.uploader_name || '匿名' }}</div>
        <div class="muted" style="font-size:12px;">{{ new Date(photo.created_at).toLocaleString() }}</div>
      </div>
      <div class="row" style="gap:8px; align-items:center;">
        <button class="btn ghost" @click="$emit('like-photo', photo)">👍 {{ photo.like_count || 0 }}</button>
        <a class="btn ghost" :href="downloadUrl" :download="downloadName">下载</a>
        <button v-if="photo.is_owner" class="btn danger" @click="$emit('delete-photo', photo)">删除</button>
      </div>
    </div>

    <div class="comments">
      <details :open="open" @toggle="$emit('toggle-comments', photo, $event)">
        <summary>评论</summary>
        <div v-if="loading" class="muted">加载中...</div>
        <div v-else>
          <div v-if="comments && comments.length" class="comment-list">
            <div class="comment-item" v-for="c in comments" :key="c.id">
              <div class="comment-head">
                <span>{{ c.user_name || '匿名' }}</span>
                <span class="muted" style="font-size:12px;">{{ new Date(c.created_at).toLocaleString() }}</span>
              </div>
              <div>{{ c.body }}</div>
              <div class="row" style="gap:8px; align-items:center;">
                <button class="btn ghost" @click="$emit('like-comment', c)">👍 {{ c.like_count || 0 }}</button>
                <button v-if="c.is_owner" class="btn danger" @click="$emit('delete-comment', photo, c)">删除</button>
              </div>
            </div>
          </div>
          <div v-else class="muted">暂无评论</div>

          <div class="row wrap" style="margin-top:10px; gap:8px;">
            <input class="input" placeholder="写点什么..." v-model="draft.body" />
            <button class="btn primary" :disabled="!draft.body" @click="submitComment">发送</button>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'

const props = defineProps({
  photo: { type: Object, required: true },
  photoId: { type: [Number, String], default: null },
  comments: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  open: { type: Boolean, default: false }
})
const emit = defineEmits(['toggle-comments', 'like-photo', 'like-comment', 'submit-comment', 'delete-photo', 'delete-comment'])

const photoDomId = computed(() => `photo-${props.photoId || props.photo?.id}`)

const downloadUrl = computed(() => props.photo.original_url || props.photo.file_url || props.photo.thumb_url || '')
const downloadName = computed(() => {
  const base = String(props.photo.uploader_name || 'photo').replace(/\s+/g, '-')
  return `${base}-${props.photo.id || 'download'}.webp`
})

const draft = reactive({ body: '' })

function submitComment() {
  if (!draft.body) return
  emit('submit-comment', {
    photoId: props.photo.id,
    body: draft.body
  })
  draft.body = ''
}
</script>

<style scoped>
.photo-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px; }
.photo-card img { width: 100%; border-radius: 10px; object-fit: cover; }
.caption { margin-top: 8px; color: var(--text); font-weight: 600; line-height: 1.4; }
.comment-list { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.comment-item { background: rgba(11,17,32,0.02); border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
.comment-head { display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 4px; }
details summary { cursor: pointer; color: var(--accent); }
</style>
