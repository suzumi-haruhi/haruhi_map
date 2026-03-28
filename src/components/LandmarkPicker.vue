<template>
  <div class="lp-root">
    <div class="lp-row">
      <div class="lp-input-wrap">
        <input
          class="input lp-input"
          :placeholder="placeholder"
          v-model="searchQuery"
          @focus="onFocus"
          @blur="onBlur"
          autocomplete="off"
        />
        <button
          v-if="modelValue"
          class="lp-clear"
          type="button"
          title="清除选择"
          @mousedown.prevent
          @click="clearSelection"
        >✕</button>
      </div>
      <button
        class="btn ghost lp-all-btn"
        type="button"
        @mousedown.prevent
        @click="toggleShowAll"
      >{{ showAll ? '收起列表' : '查看所有地标' }}</button>
    </div>

    <Transition name="lp-drop">
      <div v-if="isOpen" class="lp-dropdown">
        <div v-if="displayItems.length === 0" class="lp-empty">
          {{ searchQuery.trim() ? '未找到匹配的地标' : '暂无地标' }}
        </div>
        <button
          v-for="item in displayItems"
          :key="item.id"
          class="lp-item"
          :class="{ 'lp-item-selected': modelValue?.id === item.id }"
          type="button"
          @mousedown.prevent
          @click="selectItem(item)"
        >
          <span class="lp-item-name">{{ item.name }}</span>
          <span v-if="item.alias" class="lp-item-alias">{{ item.alias }}</span>
        </button>
      </div>
    </Transition>

    <div v-if="showSelectedTag && modelValue" class="lp-selected-wrap">
      <div class="muted lp-selected-label">{{ selectedTagLabel }}</div>
      <button class="tag-chip lp-selected-tag" type="button" @click="clearSelection">
        {{ modelValue.name }} ✕
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  modelValue: { type: Object, default: null },
  placeholder: { type: String, default: '搜索地标名称或别名...' },
  showSelectedTag: { type: Boolean, default: false },
  selectedTagLabel: { type: String, default: '最终添加的地标' }
})
const emit = defineEmits(['update:modelValue'])

const searchQuery = ref(props.modelValue ? props.modelValue.name : '')
const localOpen = ref(false)
const showAll = ref(false)

watch(() => props.modelValue, (val) => {
  if (!localOpen.value) {
    searchQuery.value = props.showSelectedTag ? '' : (val ? val.name : '')
  }
})

const isOpen = computed(() => (localOpen.value || showAll.value) && props.items.length > 0)

const displayItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (showAll.value || (localOpen.value && !q)) return props.items
  if (!q) return []
  return props.items.filter(lm => {
    const name = String(lm.name || '').toLowerCase()
    const alias = String(lm.alias || '').toLowerCase()
    return name.includes(q) || alias.includes(q)
  })
})

function onFocus() {
  localOpen.value = true
  if (props.modelValue) searchQuery.value = ''
}

function onBlur() {
  setTimeout(() => {
    if (!localOpen.value && !showAll.value) return
    if (props.showSelectedTag) {
      searchQuery.value = ''
    } else if (props.modelValue && !searchQuery.value.trim()) {
      searchQuery.value = props.modelValue.name
    } else if (!props.modelValue) {
      searchQuery.value = ''
    }
    localOpen.value = false
    showAll.value = false
  }, 150)
}

function toggleShowAll() {
  showAll.value = !showAll.value
  if (showAll.value) {
    localOpen.value = true
  } else {
    localOpen.value = false
  }
}

function selectItem(item) {
  emit('update:modelValue', item)
  searchQuery.value = props.showSelectedTag ? '' : item.name
  localOpen.value = false
  showAll.value = false
}

function clearSelection() {
  emit('update:modelValue', null)
  searchQuery.value = ''
  localOpen.value = false
  showAll.value = false
}
</script>

<style scoped>
.lp-root {
  position: relative;
  width: 100%;
}

.lp-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.lp-input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.lp-input {
  width: 100%;
  padding-right: 26px;
}

.lp-clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--muted, #8fa1c2);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  line-height: 1;
}
.lp-clear:hover { color: var(--text, #111); }

.lp-all-btn {
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 12px;
  padding: 4px 10px;
}

.lp-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--card, #fff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  z-index: 200;
  max-height: 240px;
  overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0,0,0,0.10);
}

.lp-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  background: transparent;
  color: var(--text, #111);
  border: none;
  cursor: pointer;
  transition: background 0.12s;
}
.lp-item:hover { background: rgba(99,122,255,0.06); }
.lp-item-selected { color: var(--accent, #637aff); background: rgba(99,122,255,0.06); }

.lp-item-name { font-weight: 600; font-size: 13.5px; }
.lp-item-alias { font-size: 12px; color: var(--muted, #8fa1c2); }

.lp-empty {
  padding: 10px 12px;
  color: var(--muted, #8fa1c2);
  font-size: 13px;
}

.lp-selected-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}

.lp-selected-label {
  font-size: 12px;
}

.lp-selected-tag {
  align-self: flex-start;
  border: none;
  cursor: pointer;
  background: #ff9800;
  color: #fff;
}

/* Transition */
.lp-drop-enter-active,
.lp-drop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.lp-drop-enter-from,
.lp-drop-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
