import { defineStore } from 'pinia'
import { api } from '../services/api.js'

export const useAdminStore = defineStore('admin', {
  state: () => ({
    landmarks: [],
    loading: false,
    error: ''
  }),

  actions: {
    async loadLandmarks() {
      this.loading = true
      this.error = ''
      try {
        const res = await api.getLandmarks()
        this.landmarks = res.data || []
      } catch (err) {
        this.error = err?.message || '加载失败'
      } finally {
        this.loading = false
      }
    },

    upsertLandmark(row) {
      if (!row) return
      const exists = this.landmarks.findIndex(l => l.id === row.id)
      if (exists >= 0) {
        this.landmarks.splice(exists, 1, row)
      } else {
        this.landmarks.unshift(row)
      }
    },

    removeLandmark(id) {
      this.landmarks = this.landmarks.filter(l => l.id !== id)
    }
  }
})
