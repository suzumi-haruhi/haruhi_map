<template>
  <div class="page-pad landmarks-page">
    <div class="landmark-search">
      <LandmarkSearch
        v-model="query"
        :items="landmarks"
        placeholder="搜索地标..."
        :getLabel="(i) => i.name"
        :getSubLabel="(i) => i.address"
        @select="selectLandmark"
      />
    </div>

    <div v-if="loading" class="muted">加载中...</div>
    <div v-else-if="error" class="muted" style="color:#ff9b9b;">{{ error }}</div>

    <div v-else class="landmark-grid">
      <article
        v-for="lm in filteredLandmarks"
        :key="lm.id"
        class="landmark-card"
        role="button"
        tabindex="0"
        @click="openDetail(lm)"
        @keydown.enter="openDetail(lm)"
      >
        <div class="landmark-image" :style="cardImage(lm)"></div>
        <div class="landmark-name">{{ lm.name }}</div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import LandmarkSearch from '../components/LandmarkSearch.vue'
import { api } from '../services/api.js'

const landmarks = ref([])
const loading = ref(false)
const error = ref('')
const query = ref('')
const router = useRouter()

const filteredLandmarks = computed(() => {
  const q = String(query.value || '').trim().toLowerCase()
  if (!q) return landmarks.value
  return landmarks.value.filter(l => {
    const name = String(l.name || '').toLowerCase()
    const address = String(l.address || '').toLowerCase()
    return name.includes(q) || address.includes(q)
  })
})

function cardImage(lm) {
  const urls = Array.isArray(lm.anime_shot_urls) ? lm.anime_shot_urls : []
  const url = urls[0] || ''
  if (!url) return ''
  return `background-image: url('${url}')`
}

function selectLandmark(item) {
  if (!item?.name) return
  query.value = item.name
}

function openDetail(lm) {
  if (!lm?.id) return
  router.push({ name: 'landmarkDetail', params: { id: String(lm.id) } })
}

async function loadLandmarks() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.getLandmarks()
    landmarks.value = res.data || []
  } catch (err) {
    error.value = err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLandmarks()
})
</script>

<style scoped>
.landmarks-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}
.landmark-search {
  display: flex;
  justify-content: center;
  width: 100%;
  margin: 0 auto;
}
.landmark-search :deep(.search-box) {
  width: min(820px, 92vw);
}
.landmark-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.landmark-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 300px;
  box-shadow: 0 10px 24px rgba(10,20,40,0.06);
  cursor: pointer;
  transition: transform 180ms cubic-bezier(.22,.9,.36,1), box-shadow 180ms ease, border-color 160ms ease;
  will-change: transform, box-shadow;
  position: relative;
}
.landmark-card:hover {
  transform: translateY(-8px);
  z-index: 1100;
  box-shadow: 0 18px 48px rgba(6,12,20,0.18);
  border-color: rgba(0,119,255,0.9);
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

@media (max-width: 1200px) {
  .landmark-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .landmark-grid {
    grid-template-columns: 1fr;
  }
}
</style>
