<template>
  <div class="upload-box">
    <div class="muted" style="margin-bottom:6px;">上传你的实拍：</div>
    <div class="row wrap">
      <input class="input" type="file" accept="image/*" @change="onFile" />
      <input class="input" placeholder="一句话说明（可选）" v-model="caption" />
      <button class="btn primary" :disabled="uploading || !file" @click="submit">
        {{ uploading ? '上传中...' : '上传' }}
      </button>
    </div>
    <div v-if="message" class="muted" :style="{color: error ? '#ff9b9b' : '#8fa1c2'}">{{ message }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  uploading: { type: Boolean, default: false },
  message: { type: String, default: '' },
  error: { type: Boolean, default: false }
})
const emit = defineEmits(['file-selected', 'submit'])

const file = ref(null)
const caption = ref('')

function onFile(e) {
  const f = e.target.files?.[0] || null
  file.value = f
  emit('file-selected', f)
}

function submit() {
  if (!file.value) return
  emit('submit', {
    caption: caption.value,
    file: file.value
  })
}
</script>
