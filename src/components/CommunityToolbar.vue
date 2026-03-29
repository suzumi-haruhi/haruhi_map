<template>
  <section class="community-toolbar-card">
    <div class="toolbar-top-row">
      <div class="toolbar-intro">
        <div class="toolbar-overline">Community Feed</div>
        <div class="toolbar-summary-row">
          <div class="toolbar-badges">
            <span class="toolbar-badge toolbar-badge-primary">显示 {{ visibleCount }} 条</span>
            <span class="toolbar-badge">当前数据 {{ totalCount }} 条</span>
            <span v-if="activeFilterCount" class="toolbar-badge toolbar-badge-accent">{{ activeFilterCount }} 项筛选中</span>
          </div>
          <div class="toolbar-note">按关键词、地标、标签和管理员状态快速整理帖子列表。</div>
        </div>
      </div>

      <div class="toolbar-actions">
        <details ref="toolbarSettingsRef" class="toolbar-settings toolbar-settings-inline">
          <summary class="btn ghost toolbar-settings-trigger">
            <span class="toolbar-settings-current">{{ settingsButtonLabel }}</span>
            <span v-if="adminOnly" class="toolbar-settings-flag">管理员</span>
          </summary>

          <div class="toolbar-settings-panel">
            <div class="toolbar-settings-group">
              <div class="toolbar-settings-title">排序依据</div>
              <div class="toolbar-chip-row">
                <button
                  class="btn ghost toolbar-chip"
                  :class="{ active: sortBy === 'time' }"
                  type="button"
                  @click="setSortBy('time')"
                >
                  按时间
                </button>
                <button
                  class="btn ghost toolbar-chip"
                  :class="{ active: sortBy === 'likes' }"
                  type="button"
                  @click="setSortBy('likes')"
                >
                  按点赞
                </button>
              </div>
            </div>

            <div class="toolbar-settings-group">
              <div class="toolbar-settings-title">排序方向</div>
              <div class="toolbar-chip-row">
                <button
                  class="btn ghost toolbar-chip"
                  :class="{ active: sortOrder === 'desc' }"
                  type="button"
                  @click="setSortOrder('desc')"
                >
                  从新到旧
                </button>
                <button
                  class="btn ghost toolbar-chip"
                  :class="{ active: sortOrder === 'asc' }"
                  type="button"
                  @click="setSortOrder('asc')"
                >
                  从旧到新
                </button>
              </div>
            </div>

            <div class="toolbar-settings-group">
              <div class="toolbar-settings-title">显示范围</div>
              <button
                class="btn ghost toolbar-chip toolbar-chip-wide"
                :class="{ active: adminOnly }"
                :aria-pressed="adminOnly"
                type="button"
                @click="$emit('toggle-admin-only')"
              >
                只看管理员
              </button>
            </div>
          </div>
        </details>

        <button
          v-if="activeFilterCount"
          class="btn ghost toolbar-reset-btn"
          type="button"
          @click="$emit('clear-filters')"
        >
          清空筛选
        </button>

        <button class="btn primary toolbar-publish-btn" type="button" @click="$emit('open-publish')">
          <img src="@/assets/yuki_upload.webp" alt="publish" class="toolbar-publish-art" />
          <span>发布内容</span>
        </button>
      </div>
    </div>

    <div v-if="selectedFilterTags.length" class="toolbar-active-tags">
      <button
        v-for="tag in selectedFilterTags"
        :key="tag"
        class="toolbar-filter-chip"
        type="button"
        @click="$emit('remove-filter-tag', tag)"
      >
        <span class="toolbar-filter-chip-label">{{ tag }}</span>
        <span class="toolbar-filter-chip-close">✕</span>
      </button>
    </div>

    <div class="toolbar-grid">
      <label class="toolbar-field">
        <span class="toolbar-label">搜索</span>
        <div class="toolbar-search-wrap">
          <img src="@/assets/yuki_search.webp" alt="search" class="toolbar-search-art" />
          <input
            v-model="searchQueryModel"
            class="input toolbar-search-input"
            placeholder="搜索内容 / 用户名 / 标签"
          />
        </div>
      </label>

      <div class="toolbar-field">
        <span class="toolbar-label">地标筛选</span>
        <LandmarkPicker
          :items="landmarks"
          v-model="filterLandmarkModel"
          placeholder="筛选地标..."
          :compact="true"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import LandmarkPicker from './LandmarkPicker.vue'

const props = defineProps({
  landmarks: { type: Array, default: () => [] },
  sortBy: { type: String, default: 'time' },
  sortOrder: { type: String, default: 'desc' },
  filterLandmark: { type: Object, default: null },
  selectedFilterTags: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  adminOnly: { type: Boolean, default: false },
  visibleCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  activeFilterCount: { type: Number, default: 0 }
})

const emit = defineEmits([
  'update:sortBy',
  'update:sortOrder',
  'update:filterLandmark',
  'update:searchQuery',
  'toggle-admin-only',
  'remove-filter-tag',
  'clear-filters',
  'open-publish'
])

const toolbarSettingsRef = ref(null)

const sortByModel = computed({
  get: () => props.sortBy,
  set: (value) => emit('update:sortBy', value)
})

const sortOrderModel = computed({
  get: () => props.sortOrder,
  set: (value) => emit('update:sortOrder', value)
})

const filterLandmarkModel = computed({
  get: () => props.filterLandmark,
  set: (value) => emit('update:filterLandmark', value)
})

const searchQueryModel = computed({
  get: () => props.searchQuery,
  set: (value) => emit('update:searchQuery', value)
})

const sortByLabel = computed(() => props.sortBy === 'likes' ? '点赞' : '时间')
const sortOrderLabel = computed(() => props.sortOrder === 'asc' ? '升序' : '降序')
const settingsButtonLabel = computed(() => `${sortByLabel.value} · ${sortOrderLabel.value}`)

function setSortBy(value) {
  emit('update:sortBy', value)
}

function setSortOrder(value) {
  emit('update:sortOrder', value)
}

function handleOutsidePointerDown(event) {
  const detailsEl = toolbarSettingsRef.value
  if (!detailsEl?.open) return
  if (detailsEl.contains(event.target)) return
  detailsEl.open = false
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown)
})
</script>

<style scoped>
.community-toolbar-card {
  position: relative;
  z-index: 1200;
  margin: 0 16px;
  padding: 14px;
  border: 1px solid rgba(0, 119, 255, 0.12);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(245, 249, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%);
  box-shadow:
    0 14px 30px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.toolbar-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.toolbar-intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.toolbar-overline {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.toolbar-summary-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.toolbar-badge-primary {
  background: rgba(0, 119, 255, 0.12);
  color: var(--accent);
}

.toolbar-badge-accent {
  background: rgba(11, 18, 32, 0.08);
  color: var(--text);
}

.toolbar-note {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.toolbar-active-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.toolbar-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(0, 119, 255, 0.18);
  border-radius: 999px;
  background: rgba(0, 119, 255, 0.08);
  color: var(--accent);
  cursor: pointer;
}

.toolbar-filter-chip-label {
  font-size: 12px;
  font-weight: 600;
}

.toolbar-filter-chip-close {
  font-size: 11px;
  line-height: 1;
}

.toolbar-reset-btn {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
}

.toolbar-publish-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 2px 14px 2px 8px;
  border-radius: 12px;
  box-shadow: 0 10px 18px rgba(0, 119, 255, 0.18);
}

.toolbar-publish-art {
  width: 34px;
  height: 34px;
  object-fit: contain;
  pointer-events: none;
  transform: translateY(-1px);
}

.toolbar-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
  gap: 12px 14px;
  margin-top: 14px;
  align-items: start;
}

.toolbar-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.toolbar-label {
  padding-left: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.toolbar-search-wrap {
  position: relative;
}

.toolbar-search-art {
  position: absolute;
  left: 10px;
  top: 50%;
  width: 30px;
  height: 30px;
  object-fit: contain;
  transform: translateY(-50%);
  pointer-events: none;
}

.toolbar-search-input {
  min-height: 42px;
  padding-left: 50px;
  border-radius: 12px;
}

.toolbar-settings {
  position: relative;
  z-index: 1;
}

.toolbar-settings-inline {
  flex-shrink: 0;
}

.toolbar-settings summary {
  list-style: none;
}

.toolbar-settings summary::-webkit-details-marker {
  display: none;
}

.toolbar-settings-trigger {
  min-height: 36px;
  width: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 12px;
  border-radius: 10px;
}

.toolbar-settings[open] .toolbar-settings-trigger {
  border-color: rgba(0, 119, 255, 0.3);
  background: rgba(0, 119, 255, 0.08);
}

.toolbar-settings-current {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
}

.toolbar-settings-flag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(0, 119, 255, 0.12);
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.toolbar-settings-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1210;
  width: min(320px, calc(100vw - 48px));
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(11, 18, 32, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 32px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(8px);
}

.toolbar-settings-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar-settings-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}

.toolbar-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar-chip {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  white-space: nowrap;
}

.toolbar-chip-wide {
  width: 100%;
  justify-content: center;
}

.toolbar-chip.active {
  border-color: rgba(0, 119, 255, 0.36);
  background: rgba(0, 119, 255, 0.08);
  color: var(--accent);
}

@media (max-width: 860px) {
  .toolbar-top-row {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-actions {
    justify-content: flex-start;
  }

  .toolbar-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-settings-panel {
    position: static;
    margin-top: 8px;
  }
}

@media (max-width: 560px) {
  .community-toolbar-card {
    margin: 0 12px;
    padding: 12px;
    border-radius: 16px;
  }

  .toolbar-actions {
    width: 100%;
  }

  .toolbar-reset-btn,
  .toolbar-publish-btn,
  .toolbar-settings-trigger {
    width: 100%;
    justify-content: center;
  }

  .toolbar-settings-inline {
    width: 100%;
  }
}
</style>
