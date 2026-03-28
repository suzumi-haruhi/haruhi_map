<template>
  <div class="landmark-detail-page" :class="{ 'split-open': showRelated, embedded }">
    <button v-if="!embedded" class="btn ghost back-btn" type="button" @click="goBack">返回</button>

    <section class="detail-layout" :class="{ related: showRelated, level2: relatedLevel === 2, embedded }">
      
      <div v-if="embedded">
        <div v-if="showRelated" class="related-embedded-split">
          <aside class="related-community">
            <CommunityHeader>
              <template #actions>
                <button
                  class="btn ghost"
                  @click="exitRelatedDetail"
                >
                  返回详情
                </button>
              </template>
            </CommunityHeader>
            <div class="community-pane-body">
              <CommunityView
                ref="communityRef"
                :preventRoutePush="true"
                :defaultLandmarkName="landmark?.name || ''"
                @enter-detail="enterRelatedDetail"
                @exit-detail="exitRelatedDetail"
              />
              <!-- 内嵌帖子详情：当 relatedLevel === 2 时从左侧滑入 -->
              <div v-if="relatedLevel === 2 || embeddedPostActive" class="post-detail-outer-slot">
                <Transition name="post-slide" mode="out-in" appear @after-leave="onRelatedPostAfterLeave">
                  <div v-if="embeddedPostActive" :key="'landmark-post-' + (embeddedPostId || '0')" class="post-detail-slot">
                    <PostDetailView :initialPostId="embeddedPostId" @close="exitRelatedDetail" />
                  </div>
                </Transition>
              </div>
            </div>
          </aside>

          <div class="detail-panel embedded-right">
            <section class="hero">
              <img v-if="heroImage" :src="heroImage" alt="anime shot" @click="openZoom(heroImage)" />
              <div v-else class="hero-fallback"></div>
              <button
                v-if="allImages.length > 1"
                class="btn ghost hero-nav hero-prev"
                type="button"
                @click.stop="prevHero"
              >‹</button>
              <button
                v-if="allImages.length > 1"
                class="btn ghost hero-nav hero-next"
                type="button"
                @click.stop="nextHero"
              >›</button>
              <div class="hero-overlay">
                <div class="hero-title">{{ landmark?.name || '' }}</div>
                <div class="hero-sub">
                  <span>{{ locationText }}</span>
                  <span v-if="aliasText" class="hero-alias">{{ aliasText }}</span>
                </div>
                <div class="hero-source">{{ sourceText }}</div>
              </div>
            </section>
            <div v-if="allImages.length" class="hero-indicator muted">
              {{ heroIndex + 1 }} / {{ allImages.length }}
            </div>

            <div class="related-actions">
              <button class="btn primary" type="button" @click="openRelated">相关帖子</button>
              <button class="btn ghost" type="button" @click="toggleFavoriteCurrent">
                {{ isFavoriteCurrent ? '取消收藏' : '收藏' }}
              </button>
            </div>

            <section class="detail-text">
              {{ landmark?.description || '' }}
            </section>

            <!-- 照片墙 -->
            <section v-if="photos.length" class="photo-wall-section">
              <div class="photo-wall-heading">📷 圣地照片</div>
              <div class="photo-wall">
                <div v-for="ph in photos" :key="ph.id" class="photo-wall-item" @click.stop="openPhotoZoom(ph)">
                  <img :src="ph.thumb_url || ph.file_url" :alt="ph.caption || ''" class="pw-img" loading="lazy" />
                  <div v-if="ph.caption" class="pw-caption">{{ ph.caption }}</div>
                </div>
              </div>
            </section>

            <Transition name="sheet-slide">
              <div v-if="zoomOpen && showRelated" class="zoom-overlay panel-zoom" @click="closeZoom">
                <div class="zoom-modal" @click.stop>
                  <img v-if="zoomSrc" :src="zoomSrc" alt="detail zoom" />
                  <a v-if="zoomSrc" class="btn primary" :href="zoomSrc" download>下载</a>
                </div>
              </div>
            </Transition>
          </div>
        </div>
        <div v-else class="detail-panel">
          <section class="hero">
            <img v-if="heroImage" :src="heroImage" alt="anime shot" @click="openZoom(heroImage)" />
            <div v-else class="hero-fallback"></div>
            <button
              v-if="allImages.length > 1"
              class="btn ghost hero-nav hero-prev"
              type="button"
              @click.stop="prevHero"
            >‹</button>
            <button
              v-if="allImages.length > 1"
              class="btn ghost hero-nav hero-next"
              type="button"
              @click.stop="nextHero"
            >›</button>
            <div class="hero-overlay">
              <div class="hero-title">{{ landmark?.name || '' }}</div>
              <div class="hero-sub">
                <span>{{ locationText }}</span>
                <span v-if="aliasText" class="hero-alias">{{ aliasText }}</span>
              </div>
              <div class="hero-source">{{ sourceText }}</div>
            </div>
          </section>
          <div v-if="allImages.length" class="hero-indicator muted">
            {{ heroIndex + 1 }} / {{ allImages.length }}
          </div>

          <div class="related-actions">
            <button class="btn primary" type="button" @click="openRelated">相关帖子</button>
            <button class="btn ghost" type="button" @click="toggleFavoriteCurrent">
              {{ isFavoriteCurrent ? '取消收藏' : '收藏' }}
            </button>
          </div>

          <section class="detail-text">
            {{ landmark?.description || '' }}
          </section>

          <!-- 照片墙 -->
          <section v-if="photos.length" class="photo-wall-section">
            <div class="photo-wall-heading">📷 圣地照片</div>
            <div class="photo-wall">
              <div v-for="ph in photos" :key="ph.id" class="photo-wall-item" @click.stop="openPhotoZoom(ph)">
                <img :src="ph.thumb_url || ph.file_url" :alt="ph.caption || ''" class="pw-img" loading="lazy" />
                <div v-if="ph.caption" class="pw-caption">{{ ph.caption }}</div>
              </div>
            </div>
          </section>

          <Transition name="sheet-slide">
            <div v-if="zoomOpen && showRelated" class="zoom-overlay panel-zoom" @click="closeZoom">
              <div class="zoom-modal" @click.stop>
                <img v-if="zoomSrc" :src="zoomSrc" alt="detail zoom" />
                <a v-if="zoomSrc" class="btn primary" :href="zoomSrc" download>下载</a>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <Transition name="pane-slide">
        <aside v-if="!embedded && showRelated" class="related-community">
          <CommunityHeader>
            <template #actions>
              <button class="btn ghost" @click="closeRelated">
                返回详情
              </button>
            </template>
          </CommunityHeader>
          <div class="community-pane-body">
            <CommunityView
              ref="communityRef"
              :preventRoutePush="true"
              :defaultLandmarkName="landmark?.name || ''"
              @enter-detail="enterRelatedDetail"
              @exit-detail="exitRelatedDetail"
            />
            <!-- 内嵌帖子详情：当 relatedLevel === 2 时从左侧滑入（与嵌入模式一致） -->
            <div v-if="relatedLevel === 2 || embeddedPostActive" class="post-detail-outer-slot">
              <Transition name="post-slide" mode="out-in" appear @after-leave="onRelatedPostAfterLeave">
                <div v-if="embeddedPostActive" :key="'landmark-post-' + (embeddedPostId || '0')" class="post-detail-slot">
                  <PostDetailView :initialPostId="embeddedPostId" @close="exitRelatedDetail" />
                </div>
              </Transition>
            </div>
          </div>
        </aside>
      </Transition>

      <div v-if="!embedded" class="detail-panel">
        <section class="hero">
          <img v-if="heroImage" :src="heroImage" alt="anime shot" @click="openZoom(heroImage)" />
          <div v-else class="hero-fallback"></div>
          <button
            v-if="allImages.length > 1"
            class="btn ghost hero-nav hero-prev"
            type="button"
            @click.stop="prevHero"
          >‹</button>
          <button
            v-if="allImages.length > 1"
            class="btn ghost hero-nav hero-next"
            type="button"
            @click.stop="nextHero"
          >›</button>
          <div class="hero-overlay">
            <div class="hero-title">{{ landmark?.name || '' }}</div>
            <div class="hero-sub">
              <span>{{ locationText }}</span>
              <span v-if="aliasText" class="hero-alias">{{ aliasText }}</span>
            </div>
            <div class="hero-source">{{ sourceText }}</div>
          </div>
        </section>
        <div v-if="allImages.length" class="hero-indicator muted">
          {{ heroIndex + 1 }} / {{ allImages.length }}
        </div>

        <div class="related-actions">
          <button class="btn primary" type="button" @click="openRelated">相关帖子</button>
          <button class="btn ghost" type="button" @click="toggleFavoriteCurrent">
            {{ isFavoriteCurrent ? '取消收藏' : '收藏' }}
          </button>
        </div>

        <section class="detail-text">
          {{ landmark?.description || '' }}
        </section>

        <!-- 照片墙 -->
        <section v-if="photos.length" class="photo-wall-section">
          <div class="photo-wall-heading">📷 圣地照片</div>
          <div class="photo-wall">
            <div v-for="ph in photos" :key="ph.id" class="photo-wall-item" @click.stop="openPhotoZoom(ph)">
              <img :src="ph.thumb_url || ph.file_url" :alt="ph.caption || ''" class="pw-img" loading="lazy" />
              <div v-if="ph.caption" class="pw-caption">{{ ph.caption }}</div>
            </div>
          </div>
        </section>

        <Transition name="sheet-slide">
          <div v-if="zoomOpen && showRelated" class="zoom-overlay panel-zoom" @click="closeZoom">
            <div class="zoom-modal" @click.stop>
              <img v-if="zoomSrc" :src="zoomSrc" alt="detail zoom" />
              <a v-if="zoomSrc" class="btn primary" :href="zoomSrc" download>下载</a>
            </div>
          </div>
        </Transition>
      </div>
    </section>

    <Transition name="sheet-slide">
      <div v-if="zoomOpen && !showRelated" class="zoom-overlay" @click="closeZoom">
        <div class="zoom-modal" @click.stop>
          <img v-if="zoomSrc" :src="zoomSrc" alt="detail zoom" />
          <a v-if="zoomSrc" class="btn primary" :href="zoomSrc" download>下载</a>
        </div>
      </div>
    </Transition>

    <!-- 照片放大浏览 -->
    <Transition name="sheet-slide">
      <div v-if="photoZoomOpen" class="photo-zoom-overlay" @click="closePhotoZoom">
        <div class="photo-zoom-modal" @click.stop>
          <img :src="photoZoomItem?.file_url" :alt="photoZoomItem?.caption || ''" />
          <div v-if="photoZoomItem?.caption" class="pz-caption">{{ photoZoomItem.caption }}</div>
          <div class="pz-actions">
            <a class="btn primary" :href="photoZoomItem?.file_url" target="_blank" :download="true">下载</a>
            <button class="btn ghost" type="button" @click="goToCommunityFromPhoto">前往社区</button>
            <button class="btn ghost" type="button" @click="closePhotoZoom">关闭</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api.js'
import CommunityView from './CommunityView.vue'
import PostDetailView from './PostDetailView.vue'
import { useUserStore } from '../stores/userStore.js'
import CommunityHeader from '@/components/CommunityHeader.vue'

const props = defineProps({
  embedded: { type: Boolean, default: false },
  landmarkId: { type: [String, Number], default: null }
})
const emit = defineEmits(['close', 'open-related'])
const router = useRouter()
const route = useRoute()
const landmark = ref(null)
const userStore = useUserStore()
const heroIndex = ref(0)
const zoomOpen = ref(false)
const zoomSrc = ref('')
const showRelated = ref(false)
const photos = ref([])
const photoZoomOpen = ref(false)
const photoZoomItem = ref(null)
const relatedLevel = ref(1)
const communityRef = ref(null)
const embeddedPostId = ref(null)
const embeddedPostActive = ref(false)
// 当内嵌帖子详情完全离开后，通知社区滚动并清理状态
function onRelatedPostAfterLeave() {
  try {
    const pid = Number(embeddedPostId.value)
    if (pid && communityRef.value && typeof communityRef.value.scrollToPostId === 'function') {
      communityRef.value.scrollToPostId(pid)
    }
  } catch (e) {}
  embeddedPostId.value = null
  embeddedPostActive.value = false
  relatedLevel.value = 1
}
let heroTimer = null

const allImages = computed(() => {
  const urls = Array.isArray(landmark.value?.anime_shot_urls) ? landmark.value.anime_shot_urls : []
  return urls.filter(Boolean)
})

const heroImage = computed(() => allImages.value[heroIndex.value] || '')

const locationText = computed(() => {
  if (landmark.value?.address) return landmark.value.address
  const lat = landmark.value?.lat
  const lng = landmark.value?.lng
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
  return ''
})

const aliasText = computed(() => landmark.value?.alias || '')
const sourceText = computed(() => landmark.value?.anime_source || '')

const isFavoriteCurrent = computed(() => userStore.isFavorite(landmark.value?.id))

const embedded = computed(() => props.embedded)

function goBack() {
  if (embedded.value) {
    emit('close')
    return
  }
  router.back()
}

function prevHero() {
  if (allImages.value.length <= 1) return
  heroIndex.value = (heroIndex.value - 1 + allImages.value.length) % allImages.value.length
}

function nextHero() {
  if (allImages.value.length <= 1) return
  heroIndex.value = (heroIndex.value + 1) % allImages.value.length
}

function openZoom(src) {
  if (!src) return
  zoomSrc.value = src
  zoomOpen.value = true
}

function closeZoom() {
  zoomOpen.value = false
  zoomSrc.value = ''
}

function toggleFavoriteCurrent() {
  if (!landmark.value) return
  userStore.toggleFavorite(landmark.value)
}

function openRelated() {
  showRelated.value = true
  relatedLevel.value = 1
  emit('open-related')
}

function closeRelated() {
  showRelated.value = false
  relatedLevel.value = 1
}


function enterRelatedDetail(openedId) {
  relatedLevel.value = 2
  try { if (openedId) embeddedPostId.value = Number(openedId) } catch (e) { embeddedPostId.value = null }
  embeddedPostActive.value = true
}

function exitRelatedDetail() {
  // 触发离场动画，实际清理在 after-leave 中完成以允许动画执行
  embeddedPostActive.value = false
}

function startHeroTimer() {
  if (heroTimer) clearInterval(heroTimer)
  if (allImages.value.length <= 1) return
  heroTimer = setInterval(() => {
    nextHero()
  }, 4000)
}

function getLandmarkId() {
  if (embedded.value && props.landmarkId !== null && props.landmarkId !== undefined) {
    return Number(props.landmarkId)
  }
  return Number(route.params.id)
}

async function loadLandmark() {
  const id = getLandmarkId()
  if (!id) return
  const res = await api.getLandmarks()
  const list = res.data || []
  landmark.value = list.find(l => Number(l.id) === id) || null
  heroIndex.value = 0
  zoomOpen.value = false
  zoomSrc.value = ''
  relatedLevel.value = 1
  photos.value = []
  startHeroTimer()
  loadPhotos(id)
}

async function loadPhotos(landmarkId) {
  try {
    const res = await api.getPosts({ landmarkId, limit: 200 })
    const posts = res.data || []
    // 从帖子中提取所有图片，每张带上来源帖子信息
    const items = []
    for (const post of posts) {
      const imgs = post.images || []
      const captions = post.image_captions || []
      imgs.forEach((url, idx) => {
        items.push({
          id: `${post.id}-${idx}`,
          file_url: url,
          thumb_url: url,
          caption: captions[idx] || post.title || '',
          postId: post.id,
          postTitle: post.title || ''
        })
      })
    }
    photos.value = items
  } catch {
    photos.value = []
  }
}

function openPhotoZoom(photo) {
  photoZoomItem.value = photo
  photoZoomOpen.value = true
}

function closePhotoZoom() {
  photoZoomOpen.value = false
  photoZoomItem.value = null
}

function goToCommunityFromPhoto() {
  closePhotoZoom()
  openRelated()
}

// 非嵌入模式下阻止详情容器边界处的页面滚动穿透
function preventPageScrollOnDetail() {
  if (embedded.value) return
  const detailEls = [
    ...document.querySelectorAll('.related-community'),
    ...document.querySelectorAll('.detail-panel')
  ]
  if (!detailEls.length) return
  function wheelHandler(e) {
    const targetEl = detailEls.find(el => el.contains(e.target))
    if (!targetEl) return
    const { scrollTop, scrollHeight, clientHeight } = targetEl
    const canScroll = scrollHeight > clientHeight
    const atTop = scrollTop === 0
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1
    if (!canScroll || (e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
      e.preventDefault()
    }
    e.stopPropagation()
  }
  detailEls.forEach(el => el.addEventListener('wheel', wheelHandler, { passive: false }))
  onBeforeUnmount(() => detailEls.forEach(el => el.removeEventListener('wheel', wheelHandler)))
}

onMounted(() => {
  loadLandmark()
  preventPageScrollOnDetail()
})

watch(() => props.landmarkId, () => {
  if (embedded.value) loadLandmark()
})

onBeforeUnmount(() => {
  if (heroTimer) clearInterval(heroTimer)
  document.body.classList.remove('split-lock')
})

watch(allImages, () => {
  heroIndex.value = 0
  startHeroTimer()
})

watch(showRelated, (next) => {
  if (embedded.value) return
  document.body.classList.toggle('split-lock', next)
})
</script>

<style scoped>
.landmark-detail-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: var(--bg);
}
.landmark-detail-page.embedded {
  min-height: 100%;
  height: 100%;
  background: transparent;
}
.landmark-detail-page.embedded .back-btn {
  display: none;
}
.landmark-detail-page.split-open {
  height: 100vh;
  overflow: hidden;
}
:global(body.split-lock) {
  overflow: hidden;
}
.back-btn {
  position: fixed;
  top: calc(16px + 1.5cm);
  left: 16px;
  z-index: 6;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
}
.landmark-detail-page.split-open .back-btn {
  left: calc(50% + 16px);
}
.hero {
  position: relative;
  width: 100%;
  height: min(56vh, 520px);
  background: var(--card);
  overflow: hidden;
}
.hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  cursor: zoom-in;
}
.hero-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 4;
  padding: 6px 10px;
  font-size: 18px;
}
.hero-prev { left: 12px; }
.hero-next { right: 12px; }
.hero-fallback {
  width: 100%;
  height: 100%;
  background: var(--card);
}
.hero-overlay {
  position: absolute;
  left: 0;
  bottom: 0;
  padding: 18px 20px;
  background: linear-gradient(0deg, rgba(255,255,255,0.92), rgba(255,255,255,0));
  width: 100%;
}
.hero-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.3px;
}
.hero-sub {
  margin-top: 6px;
  color: var(--muted);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.hero-alias {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0,119,255,0.08);
  color: var(--text);
  font-size: 12px;
}
.hero-source {
  margin-top: 6px;
  color: var(--muted);
  font-size: 12px;
}
.hero-indicator {
  padding: 8px 20px 0;
  text-align: right;
}
.detail-layout {
  display: block;
}
.detail-layout.embedded {
  height: 100%;
}
.detail-layout.related {
  height: 100vh;
  position: relative;
}
.detail-layout.embedded.related {
  height: 100%;
}
.detail-layout.related:not(.embedded) .detail-panel {
  width: 50%;
  margin-left: 50%;
}
.detail-panel {
  display: block;
  min-width: 0;
  overflow: auto;
  height: 100vh;
  position: relative;
}
.detail-layout.embedded .detail-panel {
  height: 100%;
}
.detail-layout.related.level2 .detail-panel {
  visibility: visible;
  pointer-events: auto;
}
.detail-layout.related .detail-text {
  padding: 18px 20px 24px;
}
.detail-text {
  padding: 18px 20px 24px;
  color: var(--text);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
}
.detail-layout.related .detail-text {
  max-height: 50vh;
  overflow: auto;
}
.related-actions {
  padding: 0 20px 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.detail-layout.related .related-actions {
  padding: 0 20px 16px;
}
.related-community {
  background: var(--card);
  border-right: 1px solid var(--border);
  overflow: auto;
  /* leave space for the top navigation/header so header and close button are not covered */
  position: absolute;
  left: 0;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  width: 50%;
  max-width: 50%;
  min-width: 0;
  z-index: 6;
}
.related-community { overscroll-behavior: contain; }

/* Embedded split layout: left = community/post, right = landmark detail */
.related-embedded-split {
  display: flex;
  height: 100%;
}
.related-embedded-split .related-community {
  position: relative;
  flex: 0 0 50%;
  max-width: 50%;
  min-width: 320px;
}
.related-embedded-split .embedded-right {
  flex: 1 1 50%;
  max-width: 50%;
  margin-left: 50%;
  position: relative;
  height: 100%;
  overflow: auto;
}

/* 内嵌帖子详情插槽 */
.post-detail-outer-slot {
  position: absolute;
  left: 0;
  top: 56px;
  bottom: 0;
  width: 100%;
  z-index: 1800;
  display: flex;
  flex-direction: column;
}
.post-detail-outer-slot .post-detail-slot {
  background: var(--card);
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
  height: 100%;
  overflow: auto;
  padding: 12px;
}

@media (max-width: 980px) {
  /* Make embedded post detail a fixed fullscreen overlay on mobile
     so it fully covers underlying landmark content and supports touch scrolling. */
  .post-detail-outer-slot {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    /* use padding to reserve space for the topbar so content sits below it */
    padding-top: var(--topbar-height);
    height: 100vh;
    width: 100%;
    z-index: 1800;
    display: flex;
    flex-direction: column;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    background: transparent;
  }

  .post-detail-outer-slot .post-detail-slot {
    height: calc(100% - var(--topbar-height));
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    background: var(--card);
    box-shadow: none;
    padding: 12px;
  }

  /* Ensure when split-open the overlay still covers the viewport on mobile */
  .landmark-detail-page.split-open .post-detail-outer-slot {
    left: 0;
    right: 0;
  }
}

/* 帖子详情滑入/滑出过渡 */
.post-slide-enter-active,
.post-slide-leave-active {
  transition: transform 420ms cubic-bezier(.22,.9,.36,1), opacity 420ms cubic-bezier(.22,.9,.36,1);
}
.post-slide-enter-from { transform: translateX(-100%); opacity: 0 }
.post-slide-enter-to { transform: translateX(0); opacity: 1 }
.post-slide-leave-from { transform: translateX(0); opacity: 1 }
.post-slide-leave-to { transform: translateX(-100%); opacity: 0 }
.related-only {
  background: var(--card);
  border-right: 1px solid var(--border);
  min-width: 0;
  overflow: auto;
  /* content should sit directly below the global header */
  padding-top: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}
.related-only :deep(.post-modal-wrap) {
  position: absolute;
  inset: 0;
  z-index: 1200;
}
.related-only :deep(.post-modal) {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, 92%);
  height: min(80vh, 720px);
}
.pane-slide-enter-active,
.pane-slide-leave-active {
  transition: transform 380ms ease-out, opacity 380ms ease-out;
  position: relative;
}
.pane-slide-leave-active {
  position: absolute;
  left: 0;
  top: 0;
  width: 50%;
  height: 100%;
}
.pane-slide-enter-active {
  z-index: 2;
}
.pane-slide-leave-active {
  z-index: 1;
  pointer-events: none;
}
.pane-slide-enter-from {
  transform: translateX(-16px);
  opacity: 0.2;
}
.pane-slide-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.pane-slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.pane-slide-leave-to {
  transform: translateX(12px);
  opacity: 0.15;
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
.related-community :deep(.post-modal-wrap) {
  position: absolute;
  inset: 0;
  z-index: 1200;
}
.related-community :deep(.post-modal) {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, 92%);
  height: min(80vh, 720px);
}

.community-pane-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.related-community :deep(.page-pad) {
  padding: 12px;
}
.related-community :deep(.community-header) {
  padding: 12px 0 0;
}
.related-community :deep(.toolbar) {
  padding: 10px 0 0;
}
.related-community :deep(.post-list) {
  padding: 12px 0 16px;
}
@media (max-width: 980px) {
  .detail-layout.related {
    height: auto;
  }
  .detail-panel,
  .related-community {
    height: auto;
  }
  .detail-layout.related:not(.embedded) .detail-panel {
    width: 100%;
    margin-left: 0;
  .detail-panel { overscroll-behavior: contain; }
  }
  .related-community {
    position: relative;
    width: 100%;
    max-width: 100%;
  }
  /* Embedded split should stack vertically on mobile */
  .related-embedded-split {
    flex-direction: column;
  }
  .related-embedded-split .related-community {
    flex: 0 0 auto;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }
  .related-embedded-split .embedded-right {
    margin-left: 0;
    max-width: 100%;
    width: 100%;
  }
}
.zoom-overlay {
  position: fixed;
  inset: 0;
  background: transparent;
  backdrop-filter: none;
  display: grid;
  place-items: center;
  z-index: 20;
}
.landmark-detail-page.embedded .zoom-overlay {
  /* 在半屏模式下，让弹窗覆盖当前面板而不是整个视口 */
  position: absolute;
  inset: 0;
  z-index: 30;
  background: transparent;
  backdrop-filter: none;
}
.zoom-overlay.panel-zoom {
  position: absolute;
  z-index: 30;
}
.zoom-modal {
  width: min(960px, 94vw);
  max-height: 90vh;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  display: grid;
  gap: 14px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.55);
}
.detail-layout.related .zoom-modal {
  width: min(520px, 92%);
  max-width: 520px;
}
.landmark-detail-page.embedded .zoom-modal {
  width: min(520px, 92%);
  max-width: 520px;
}
.zoom-modal img {
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
}

@media (max-width: 980px) {
  /* Make the related community pane act as a fullscreen overlay on mobile
     so it covers the landmark content, supports touch scrolling, and
     prevents scroll from passing through to the underlying page. */
  .detail-layout.related .related-community {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    /* reserve topbar space via padding so content sits immediately below nav */
    padding-top: var(--topbar-height);
    height: 100vh;
    width: 100%;
    max-width: 100%;
    z-index: 1700;
    background: var(--card);
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    box-shadow: none;
  }

  .detail-layout.related .related-community .community-pane-body {
    /* Override global absolute inset so header sits at top of overlay */
    position: relative !important;
    inset: auto !important;
    top: auto !important;
    flex: 1 1 auto;
    min-height: 0;
    height: calc(100% - var(--topbar-height));
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    padding-top: 0;
  }

  /* remove page padding top so content sits flush under the nav */
  .detail-layout.related .related-community :deep(.page-pad) {
    padding-top: 0;
    padding-left: 12px;
    padding-right: 12px;
  }

  /* Ensure embedded split layout's left column (community) becomes overlay */
  .related-embedded-split .related-community {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    padding-top: var(--topbar-height);
    height: 100vh;
    width: 100%;
    z-index: 1700;
    background: var(--card);
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
}

/* ===== 照片墙 ===== */
.photo-wall-section {
  padding: 0 20px 28px;
}
.photo-wall-heading {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 10px;
  letter-spacing: 0.04em;
}
.photo-wall {
  column-count: 3;
  column-gap: 8px;
}
.photo-wall-item {
  break-inside: avoid;
  margin-bottom: 8px;
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  background: var(--card);
  border: 1px solid var(--border);
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.photo-wall-item:hover {
  transform: scale(1.02);
  box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  z-index: 1;
}
.pw-img {
  width: 100%;
  display: block;
  object-fit: cover;
  transition: transform 220ms ease;
}
.pw-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 8px;
  font-size: 11px;
  line-height: 1.4;
  background: linear-gradient(0deg, rgba(0,0,0,0.65), transparent);
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
}
.photo-wall-item:hover .pw-caption {
  opacity: 1;
}
@media (max-width: 600px) {
  .photo-wall {
    column-count: 2;
  }
}

/* ===== 照片放大浏览 ===== */
.photo-zoom-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  z-index: 25000;
}
.photo-zoom-modal {
  width: min(900px, 94vw);
  max-height: 92vh;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.6);
  overflow: auto;
}
.photo-zoom-modal img {
  width: 100%;
  max-height: 68vh;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
}
.pz-caption {
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}
.pz-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
