<template>
  <div class="map-page">
    <div class="map-layout" :class="{ 'detail-open': detailOpen || detailLeaving, 'community-hidden': postRouteActive, 'split': (panelLevel > 0) || postRouteActive || detailOpen }">
      <Transition name="community-slide" @after-leave="onCommunityAfterLeave">
        <aside v-if="panelLevel > 0" class="community-pane" @click="activateCommunity">
          <CommunityHeader>
            <template #actions>
              <button class="btn ghost" @click.stop="collapsePanel">
                收起
              </button>
            </template>
          </CommunityHeader>
          <div class="community-pane-body">
            <div class="community-scroll">
              <CommunityView ref="communityRef" @enter-detail="enterDetail" @exit-detail="exitDetail" />
            </div>
          </div>
        </aside>
      </Transition>
      <!-- 全局帖子详情插槽：仅在帖子路由激活时显示，避免占用地标详情布局 -->
      <div v-if="postRouteActive" class="post-detail-outer-slot">
        <RouterView v-slot="{ Component, route: childRoute }">
          <Transition name="post-slide" mode="out-in" appear @after-leave="onPostAfterLeave">
            <div v-if="Component" :key="childRoute.fullPath + '-post'" class="post-detail-slot">
              <component :is="Component" />
            </div>
          </Transition>
        </RouterView>
      </div>
      <div class="map-stage">
        <MapCanvas
          class="map-fullscreen-canvas"
          :markers="landmarks"
          :selectedId="selectedId"
          :focusId="searchFocusId"
          :focusTick="searchFocusTick"
          :resizeTick="resizeTick"
          @select="onMarkerSelect"
        />

        <div class="map-search">
          <LandmarkSearch
            :items="landmarks"
            placeholder="搜索地标..."
            :getLabel="(i) => i.name"
            :getSubLabel="(i) => i.address"
            @select="onSearchSelect"
          />
        </div>

        <div v-if="panelLevel === 0" class="panel-toggle">
          <button class="panel-toggle-btn" @click="openPanel" aria-label="打开社区">
            <img src="@/assets/community_button.webp" alt="community" />
          </button>
        </div>

      </div>

      <Transition name="detail-slide" @before-leave="onDetailBeforeLeave" @after-leave="onDetailAfterLeave">
        <aside v-if="selected && detailOpen" class="landmark-detail-pane">
          <div class="detail-pane-head">
            <div class="section-title" style="margin:0;">圣地详情</div>
            <button class="btn ghost" type="button" @click="closeDetail">关闭</button>
          </div>
          <div class="detail-pane-body">
            <LandmarkDetailView
              :embedded="true"
              :landmarkId="selected.id"
              @close="closeDetail"
              @open-related="onLandmarkOpenRelated"
            />
          </div>
        </aside>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import MapCanvas from '../components/MapCanvas.vue'
import LandmarkSearch from '../components/LandmarkSearch.vue'
import { useGalleryStore } from '../stores/galleryStore.js'
import CommunityView from './CommunityView.vue'
import LandmarkDetailView from './LandmarkDetailView.vue'
import CommunityHeader from '@/components/CommunityHeader.vue'

const gallery = useGalleryStore()
const { landmarks, selectedId, selected } = storeToRefs(gallery)

const detailOpen = ref(false)
const detailLeaving = ref(false)
const searchFocusId = ref(null)
const searchFocusTick = ref(0)
const panelLevel = ref(1)
const resizeTick = ref(0)

const route = useRoute()
const router = useRouter()
const postRouteActive = ref(false)
const communityRef = ref(null)
const lastOpenedPostId = ref(null)

async function onMarkerSelect(id) {
  if (!id) return

  const openDetail = async () => {
    await gallery.selectLandmark(id)
    detailOpen.value = true
    focusPhotoIfNeeded()
  }

  // 如果当前正在显示帖子详情，先关闭帖子详情并收起社区，再打开地标详情（确保动画顺序正确）
  if (postRouteActive.value) {
    panelLevel.value = 0
    router.push({ name: 'map', query: { landmarkId: String(id) } }).catch(() => {})
    return
  }

  // 如果社区面板还在打开中，先收起社区（动画 360ms），再打开地标详情
  if (panelLevel.value > 0) {
    panelLevel.value = 0
    setTimeout(() => {
      openDetail()
    }, 360)
    return
  }

  await openDetail()
}

async function onSearchSelect(item) {
  if (!item?.id) return

  const openDetail = async () => {
    searchFocusId.value = item.id
    searchFocusTick.value += 1
    await gallery.selectLandmark(item.id)
    detailOpen.value = true
  }

  if (panelLevel.value > 0) {
    panelLevel.value = 0
    setTimeout(() => {
      openDetail()
    }, 420)
    return
  }

  await openDetail()
}

// 打开地标详情但不关闭/收起社区面板（供帖子详情同时显示地标详情时使用）
async function openLandmarkDetail(id) {
  if (!id) return
  try {
    await gallery.selectLandmark(id)
    detailOpen.value = true
  } catch (e) {}
}

function focusPhotoIfNeeded() {
  const targetId = Number(route.query.photoId)
  if (!targetId) return
  const tryScroll = (attempt = 0) => {
    const el = document.getElementById(`photo-${targetId}`)
    if (el) {
      // scroll with offset to avoid being hidden under fixed topbar
      const headerH = document.querySelector('.topbar')?.offsetHeight || 56
      const top = window.scrollY + el.getBoundingClientRect().top - headerH - 8
      window.scrollTo({ top, behavior: 'smooth' })
      return
    }
    if (attempt < 3) {
      setTimeout(() => tryScroll(attempt + 1), 200)
    }
  }
  requestAnimationFrame(() => tryScroll())
}

function closeDetail() {
  detailOpen.value = false
}

function onDetailBeforeLeave() {
  detailLeaving.value = true
}

function onDetailAfterLeave() {
  detailLeaving.value = false
  resizeTick.value += 1
}

function onCommunityAfterLeave() {
  resizeTick.value += 1
}

function openPanel() {
  activateCommunity()
}

function collapsePanel() {
  panelLevel.value = 0
}

function enterDetail(openedId) {
  // 保存之前面板状态并收起社区（与路由打开帖子时一致的行为）
  try {
    _prevPanelLevel = panelLevel.value
  } catch (e) { _prevPanelLevel = null }
  panelLevel.value = 0
  postRouteActive.value = true
  try { if (openedId) lastOpenedPostId.value = Number(openedId) } catch (e) {}
}

function exitDetail() {
  // 恢复之前的面板状态并尝试从 sessionStorage 恢复滚动位置
  const restoreTo = (_prevPanelLevel == null) ? 1 : _prevPanelLevel
  _prevPanelLevel = null
  setTimeout(() => { panelLevel.value = restoreTo }, 50)
  // 对于内嵌关闭，延迟清除 postRouteActive 以允许 leave 动画执行
  setTimeout(() => { postRouteActive.value = false }, 440)
}

function onPostAfterLeave() {
  try { postRouteActive.value = false } catch (e) {}
  // 帖子详情完全离开后，若存在记录的帖子 id，则请求社区滚动到该帖子
  try {
    const pid = Number(lastOpenedPostId.value)
    if (pid && communityRef.value && typeof communityRef.value.scrollToPostId === 'function') {
      communityRef.value.scrollToPostId(pid)
    }
  } catch (e) {}
  lastOpenedPostId.value = null
}

function activateCommunity() {
  if (detailOpen.value) {
    closeDetail()
  }
  if (panelLevel.value === 0) {
    panelLevel.value = 1
  }
}

// When LandmarkDetailView requests to open related posts from the map-right-pane,
// first close the detail pane, then open the community panel after the leave animation.
function onLandmarkOpenRelated() {
  // close detail (triggers transition)
  closeDetail()
  // open community after detail slide-out completes (detail-slide leave ~520ms)
  setTimeout(() => {
    panelLevel.value = 1
  }, 560)
}

function preventOuterScroll() {
  const outerEl = document.querySelector('.detail-pane-body');
  if (!outerEl || outerEl._wheelHandler) return; // 避免重复添加
  function wheelHandler(e) {
    const { scrollTop, scrollHeight, clientHeight } = outerEl;
    const delta = e.deltaY;
    const atTop = scrollTop === 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
    if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
      e.preventDefault();
    }
  }
  outerEl.addEventListener('wheel', wheelHandler, { passive: false });
  outerEl._wheelHandler = wheelHandler; // 存储引用
}

function removeOuterScroll() {
  const outerEl = document.querySelector('.detail-pane-body');
  if (outerEl && outerEl._wheelHandler) {
    outerEl.removeEventListener('wheel', outerEl._wheelHandler);
    delete outerEl._wheelHandler;
  }
}


function onKeydown(e) {
  if (e.key === 'Escape' && detailOpen.value) {
    closeDetail()
  }
}


onMounted(() => {
  if (route.query.panel === '0') {
    panelLevel.value = 0
  }
  gallery.loadLandmarks()
  window.addEventListener('keydown', onKeydown)
  if (route.query.landmarkId) {
    const id = Number(route.query.landmarkId)
    if (id) onMarkerSelect(id)
  }
  // 监听详情面板打开时添加滚轮监听，并将地图视角切换到选中地标
  watch(detailOpen, async (newVal) => {
    if (newVal) {
      await nextTick();
      preventOuterScroll();
      // 等待 resizeTick 触发的 invalidateSize（rAF ~16ms）完成后再飞到地标
      setTimeout(() => {
        if (selected.value?.id) {
          searchFocusId.value = selected.value.id
          searchFocusTick.value += 1
        }
      }, 80)
    } else {
      removeOuterScroll();
    }
  });
})

// 监听路由变化：当进入帖子详情子路由时，先保存面板状态并关闭社区（panelLevel=0），离开时恢复并尝试恢复滚动位置
let _prevPanelLevel = null
watch(() => route.fullPath, async (nv, ov) => {
  try {
    const isPost = route.name === 'postDetail' || String(route.path || '').startsWith('/posts/') || String(route.fullPath || '').includes('/posts/')
    if (isPost) {
      // 标记为帖子路由激活，保存之前面板状态并收起社区
      postRouteActive.value = true
      _prevPanelLevel = panelLevel.value
      panelLevel.value = 0
      // 记录通过路由打开的帖子 id，供关闭时滚动使用
      try {
        const pid = Number(route.params?.id) || Number(route.query?.postId) || null
        if (pid) lastOpenedPostId.value = pid
        else {
          const m = String(route.fullPath || '').match(/\/posts\/(\d+)/)
          if (m && m[1]) lastOpenedPostId.value = Number(m[1])
        }
      } catch (e) {}
      // 若路由携带地标 id，则将地图视角飞到该地标（不打开详情面板，避免与帖子详情并列）
      const lm = Number(route.query.landmarkId)
      if (lm) {
        searchFocusId.value = lm
        searchFocusTick.value += 1
      }
    } else {
      // 离开帖子详情时恢复之前的面板状态（若有）
      // 注意：postRouteActive 将在 Transition 的 after-leave 回调中被清除以允许动画执行
      const lm = Number(route.query.landmarkId)
      const restoreTo = lm ? 0 : ((_prevPanelLevel == null) ? 1 : _prevPanelLevel)
      _prevPanelLevel = null
      // 恢复面板（延迟以等待过渡完成）
      setTimeout(() => { panelLevel.value = restoreTo }, 50)

      // 如果路由携带 landmarkId，则在帖子详情关闭后打开对应地标详情（用于点击地图图钉时的顺序控制）
      if (lm) {
        setTimeout(() => openLandmarkDetail(lm), 560)
      }
    }
  } catch (e) {}
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

watch(selectedId, () => {
  if (detailOpen.value && !selected.value) {
    detailOpen.value = false
  }
})

watch([panelLevel, detailOpen], () => {
  resizeTick.value += 1
})
</script>

<style scoped>
.map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  min-height: 0;
}
.map-layout {
  position: relative;
  width: 100%;
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}
.community-pane {
  flex: 0 0 50%;
  border-right: 1px solid var(--border);
  background: var(--card);
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  overflow: auto;
  overscroll-behavior: contain;
}
.community-pane :deep(.post-modal-wrap) {
  position: absolute;
  inset: 0;
  z-index: 1200;
}
.community-pane :deep(.post-modal) {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, 92%);
  height: min(80vh, 720px);
}

.community-pane-body {
  position: absolute; /* Allows child route content to overlay */
  /* leave space at top for the pane head to avoid overlap */
  inset: 56px 0 0 0;
  z-index: 1600;
  min-height: 0;
}
.community-detail-slot > * {
  pointer-events: auto; /* Enables pointer events for child route content */
  height: 100%;
  width: 100%;
  overflow: auto;
  padding: 0;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.community-detail-slot {
  position: absolute;
  inset: 0;
  z-index: 1700;
  display: block;
  pointer-events: none; /* 不拦截底层事件，子元素会启用自身交互 */
}
.community-detail-slot > * {
  position: absolute;
  inset: 0;
  background: var(--card);
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  padding: 12px;
}
.community-scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
}
.community-scroll {
  pointer-events: auto;
  height: 100%;
  overflow: auto;
}
.community-scroll :deep(.page-pad) {
  padding: 0 0 74px;
  min-height: 100%;
}
.community-pane-body .community-main {
  grid-template-columns: 1fr;
}
.community-pane-body .post-list {
  margin-left: 0;
}
.map-stage {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
}
.map-layout.detail-open .map-stage {
  flex: 1 1 50%;
  max-width: 50%;
  order: 2;
}

/* 当帖子详情激活时强制隐藏社区面板以避免透出 */
.map-layout.community-hidden .community-pane {
  display: none !important;
}

/* 外层帖子详情插槽样式：作为左侧 flex 子项（与社区面板同级） */
.post-detail-outer-slot {
  flex: 0 0 50%;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  z-index: 1200;
}
.post-detail-outer-slot .post-detail-slot {
  flex: 1;
  margin-top: 0;
  background: var(--card);
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
  height: 100%;
  overflow: auto;
  pointer-events: auto;
  overscroll-behavior: contain;
}

.map-layout.split .map-stage {
  flex: 1 1 50%;
  max-width: 50%;
  order: 2;
}
.map-layout.split .community-pane {
  width: 50vw;
  min-width: 360px;
  max-width: 50vw;
  display: flex;
}
.map-fullscreen-canvas {
  width: 100%;
  height: 100%;
}
.map-search {
  position: absolute;
  top: 16px;
  right: 16px;
  width: min(360px, 80vw);
  z-index: 950;
}
.panel-toggle {
  position: absolute;
  left: 0;
  top: 12px;
  z-index: 960;
  pointer-events: none; /* allow clicks only on the inner button */
}
.panel-toggle-btn {
  pointer-events: auto;
  position: relative;
  width: 120px; /* visible area width */
  height: auto;
  padding: 0;
  border: none;
  background: transparent;
  display: block;
  overflow: visible;
}
.panel-toggle-btn img {
  width: 150px; /* image slightly larger so left part can be offscreen */
  height: auto;
  display: block;
  /* tilt, shift left and slightly lift + vertical scale to reduce 'flat' look */
  transform: rotate(-12deg) translateX(-30px) translateY(-8px) scaleY(1.12);
  transform-origin: left center;
  object-fit: cover;
  border-radius: 16px; /* rounder corners */
  box-shadow: 14px 20px 42px rgba(6,12,20,0.46);
  -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 28%);
  mask-image: linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 28%);
}
/* subtle right-edge shadow overlay to emphasize card edge */
.panel-toggle-btn::after {
  content: '';
  position: absolute;
  /* place roughly where the visible right edge will be, then rotate to match image */
  right: 8px;
  top: 6px;
  height: calc(100% - 12px);
  width: 52px;
  pointer-events: none;
  background: linear-gradient(to left, rgba(0,0,0,0.40), rgba(0,0,0,0));
  border-radius: 10px;
  transform: rotate(-12deg);
  transform-origin: right center;
  filter: blur(10px);
  opacity: 1;
}
:deep(.leaflet-control-zoom) {
  margin-top: 72px;
}

/* 移动端微调：将社区面板向上移动，消除顶部与导航栏之间的细小缝隙 */
@media (max-width: 768px) {
  /* 在移动端让社区面板固定于导航下方并占满剩余高度，彻底消除顶部空隙 */
  .community-pane {
    transform: none !important;
    position: fixed !important;
    top: 36px;
    left: 0;
    right: 0;
    width: 100%;
    height: calc(100vh - 36px);
    min-height: calc(100vh - 36px);
    display: flex;
    flex-direction: column;
    flex-basis: auto;
    border-right: none;
    z-index: 2990;
    box-shadow: 0 6px 18px rgba(10,20,40,0.06);
  }
  /* header 固定在面板顶部，body 填满剩余空间 */

  .community-scroll { height: 100%; }
  /* 保证头部下方区域不透出背景图（移动端） */
  .map-layout { background: var(--card); }
}
.landmark-detail-pane {
  width: min(48vw, 720px);
  min-width: 320px;
  max-width: 48vw;
  height: 100%;
  border-left: 1px solid var(--border);
  background: var(--card);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.map-layout.detail-open .landmark-detail-pane {
  width: 50%;
  max-width: 50%;
  min-width: 0;
  order: 1;
  border-left: none;
  border-right: 1px solid var(--border);
}
.detail-pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--card);
}
.detail-pane-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.detail-pane-body :deep(.landmark-detail-page) {
  min-height: 100%;
}
.detail-pane-body :deep(.back-btn) {
  display: none;
}
.detail-pane-body :deep(.landmark-detail-page) {
  height: 100%;
}
.detail-pane-body :deep(.detail-layout) {
  height: 100%;
}
.detail-pane-body :deep(.detail-panel) {
  padding-bottom: 24px;
}
.detail-slide-enter-active,
.detail-slide-leave-active {
  transition: transform 520ms cubic-bezier(.22,.9,.36,1), opacity 520ms cubic-bezier(.22,.9,.36,1);
  position: relative;
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

/* Community pane slide (smooth left slide-out without layout flash) */
.community-slide-enter-active,
.community-slide-leave-active {
  transition: transform 360ms cubic-bezier(.22,.9,.36,1), opacity 360ms cubic-bezier(.22,.9,.36,1);
}
.community-slide-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.community-slide-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.community-slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.community-slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
/* Keep the leaving pane positioned so the map-stage doesn't reflow during animation */
.community-slide-leave-active {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 50%;
  z-index: 1900;
}
@media (max-width: 980px) {
  .community-slide-leave-active { width: 100% !important; }
}
.detail-slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.detail-slide-leave-to {
  transform: translateX(-120px);
  opacity: 0;
}

/* 帖子详情从左侧滑入/滑出 */
.post-slide-enter-active,
.post-slide-leave-active {
  transition: transform 420ms cubic-bezier(.22,.9,.36,1), opacity 420ms cubic-bezier(.22,.9,.36,1);
}
.post-slide-enter-from { transform: translateX(-100%); opacity: 0 }
.post-slide-enter-to { transform: translateX(0); opacity: 1 }
.post-slide-leave-from { transform: translateX(0); opacity: 1 }
.post-slide-leave-to { transform: translateX(-100%); opacity: 0 }
.post-preview-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.post-preview-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.post-preview-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.post-user-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.post-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.post-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.post-user { font-weight: 700; }
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
  background: rgba(0, 119, 255, 0.08);
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


/* 滚动条样式（WebKit） */
.landmark-modal::-webkit-scrollbar {
  width: 10px;
}
.landmark-modal::-webkit-scrollbar-track {
  background: var(--card);
  border-left: 1px solid var(--border);
  border-radius: 12px;
}
.landmark-modal::-webkit-scrollbar-thumb {
  background: rgba(11,17,32,0.06);
  border: 2px solid var(--card);
  border-radius: 12px;
}
.landmark-modal::-webkit-scrollbar-thumb:hover {
  background: rgba(11,17,32,0.10);
}

/* Mobile: disable left/right split — opened pane should occupy whole screen */
@media (max-width: 980px) {
  .map-layout.split .community-pane,
  .map-layout.detail-open .landmark-detail-pane,
  .post-detail-outer-slot {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    order: 1 !important;
    position: relative !important;
    height: 100vh;
  }
  /* hide the map stage when a pane is opened */
  .map-layout.split .map-stage,
  .map-layout.detail-open .map-stage,
  .map-layout.community-hidden .map-stage {
    display: none !important;
  }

  /* make community pane overlay the full viewport on mobile when opened from the map
     (instead of merely hiding the right half). Keep header visible and body scrollable.) */
  .map-layout.split .community-pane {
    position: fixed !important;
    inset: 56px 0 0 0 !important;
    z-index: 2200 !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: calc(100vh - 56px) !important;
    display: flex !important;
    background: var(--card) !important;
    border-right: none !important;
    border-left: none !important;
    overflow: auto !important;
  }
  /* make post-detail overlay full height on mobile */
  .post-detail-outer-slot {
    position: fixed !important;
    inset: 56px 0 0 0;
    z-index: 2200;
    background: var(--card);
  }
  .post-detail-outer-slot .post-detail-slot {
    height: calc(100vh - 56px) !important;
  }
}
</style>
