<template>
  <div class="search-box">
    <input
      class="input"
      :placeholder="placeholder"
      v-model="query"
      @focus="open = true"
      @blur="onBlur"
    />
    <div v-if="open && results.length" class="search-dropdown">
      <button
        v-for="item in results"
        :key="item.id"
        class="search-item"
        type="button"
        @mousedown.prevent
        @click="select(item)"
      >
        <div class="title">{{ getLabel(item) }}</div>
        <div v-if="getSubLabel" class="sub">{{ getSubLabel(item) }}</div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  placeholder: { type: String, default: '搜索地标...' },
  getLabel: { type: Function, default: (i) => i?.name || '' },
  getSubLabel: { type: Function, default: null },
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['select', 'update:modelValue'])

const query = ref(props.modelValue || '')
const open = ref(false)

watch(() => props.modelValue, (next) => {
  if (next !== query.value) query.value = String(next || '')
})

watch(query, (val) => {
  emit('update:modelValue', String(val || ''))
})

const results = computed(() => {
  const q = String(query.value || '').trim().toLowerCase()
  if (!q) return []
  return props.items
    .filter(i => {
      const name = String(props.getLabel(i) || '').toLowerCase()
      const sub = props.getSubLabel ? String(props.getSubLabel(i) || '').toLowerCase() : ''
      return name.includes(q) || sub.includes(q)
    })
    .slice(0, 5)
})

function select(item) {
  emit('select', item)
  query.value = props.getLabel(item)
  open.value = false
}

function onBlur() {
  setTimeout(() => { open.value = false }, 120)
}
</script>

<style scoped>
.search-box { position: relative; width: 100%; }
.search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  z-index: 50;
  overflow: hidden;
}
.search-item {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  background: transparent;
  color: var(--text);
  border: none;
  cursor: pointer;
}
.search-item:hover { background: rgba(11,17,32,0.04); }
.title { font-weight: 600; }
.sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
</style>
