<template>
  <div class="free-tag-input">
    <div class="free-tag-actions">
      <button v-if="!editing" class="btn ghost" type="button" @click="startEditing">
        {{ buttonText }}
      </button>
      <template v-else>
        <input
          ref="inputRef"
          class="input free-tag-field"
          :placeholder="placeholder"
          v-model="draft"
          @keydown.enter.prevent="confirmAdd"
          @keydown.esc.prevent="cancelAdd"
        />
        <button class="btn primary" type="button" @click="confirmAdd">添加</button>
        <button class="btn ghost" type="button" @click="cancelAdd">取消</button>
      </template>
    </div>

    <div class="free-tag-list">
      <button
        v-for="tag in tags"
        :key="tag"
        class="tag-chip free-tag-chip"
        type="button"
        @click="removeTag(tag)"
      >{{ tag }} ✕</button>
      <div v-if="!tags.length && emptyText" class="muted free-tag-empty">{{ emptyText }}</div>
    </div>

    <div v-if="maxTags > 0" class="muted free-tag-count">{{ tags.length }} / {{ maxTags }}</div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  buttonText: { type: String, default: '添加标签' },
  placeholder: { type: String, default: '输入标签' },
  emptyText: { type: String, default: '' },
  maxTags: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue'])

const editing = ref(false)
const draft = ref('')
const inputRef = ref(null)

const tags = computed(() => Array.isArray(props.modelValue) ? props.modelValue : [])

function startEditing() {
  if (props.maxTags > 0 && tags.value.length >= props.maxTags) return
  editing.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
}

function cancelAdd() {
  draft.value = ''
  editing.value = false
}

function confirmAdd() {
  const value = String(draft.value || '').trim()
  if (!value) {
    cancelAdd()
    return
  }
  if (tags.value.includes(value)) {
    cancelAdd()
    return
  }
  if (props.maxTags > 0 && tags.value.length >= props.maxTags) {
    cancelAdd()
    return
  }
  emit('update:modelValue', [...tags.value, value])
  cancelAdd()
}

function removeTag(tag) {
  emit('update:modelValue', tags.value.filter(item => item !== tag))
}
</script>

<style scoped>
.free-tag-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.free-tag-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.free-tag-field {
  flex: 1 1 180px;
  min-width: 160px;
}

.free-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.free-tag-chip {
  border: none;
  cursor: pointer;
}

.free-tag-empty,
.free-tag-count {
  font-size: 12px;
}
</style>