import { defineStore } from 'pinia'
import { api } from '../services/api.js'

function normalizePhoto(p) {
  const fileUrl = p.file_url || (p.file_path ? `/api/uploads/${String(p.file_path)}` : '')
  const thumbUrl = p.thumb_url || (p.thumb_path ? `/api/uploads/${String(p.thumb_path)}` : fileUrl)
  return { ...p, file_url: fileUrl, thumb_url: thumbUrl }
}

export const useGalleryStore = defineStore('gallery', {
  state: () => ({
    landmarks: [],
    selectedId: null,
    photos: [],
    comments: {},
    commentLoading: false,
    openCommentsFor: null,
    loadingLandmarks: false,
    loadingPhotos: false,
    error: ''
  }),

  getters: {
    selected(state) {
      return state.landmarks.find(l => l.id === state.selectedId)
    }
  },

  actions: {
    async loadLandmarks() {
      this.loadingLandmarks = true
      this.error = ''
      try {
        const res = await api.getLandmarks()
        this.landmarks = res.data || []
        if (!this.selectedId && this.landmarks.length) {
          await this.selectLandmark(this.landmarks[0].id)
        }
      } catch (err) {
        this.error = err?.message || '加载失败'
      } finally {
        this.loadingLandmarks = false
      }
    },

    async selectLandmark(id) {
      this.selectedId = id
      await this.loadPhotos(id)
    },

    async loadPhotos(id) {
      this.loadingPhotos = true
      try {
        const res = await api.getPhotos(id)
        this.photos = (res.data || []).map(normalizePhoto)
      } finally {
        this.loadingPhotos = false
      }
    },

    prependPhoto(photo) {
      this.photos.unshift(normalizePhoto(photo))
    },

    removePhoto(photoId) {
      this.photos = this.photos.filter(p => p.id !== photoId)
      const next = { ...this.comments }
      delete next[photoId]
      this.comments = next
    },

    async loadComments(photoId) {
      const res = await api.getComments(photoId)
      this.comments = { ...this.comments, [photoId]: res.data || [] }
      return this.comments[photoId]
    },

    async addComment(photoId, payload) {
      const res = await api.addComment(photoId, payload)
      const list = this.comments[photoId] || []
      this.comments = { ...this.comments, [photoId]: [res.data, ...list] }
      return res.data
    },

    removeComment(photoId, commentId) {
      const list = this.comments[photoId] || []
      this.comments = { ...this.comments, [photoId]: list.filter(c => c.id !== commentId) }
    }
  }
})
