import { defineStore } from 'pinia'
import { api } from '../services/api.js'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    ready: false,
    error: '',
    favorites: []
  }),

  actions: {
    async loadFavorites() {
      if (!this.user || this.user.type !== 'formal') {
        this.favorites = []
        return
      }
      try {
        const res = await api.getMyFavorites()
        this.favorites = res.data || []
      } catch {
        this.favorites = []
      }
    },

    isFavorite(id) {
      if (!id) return false
      return this.favorites.some(f => Number(f.id) === Number(id))
    },

    async toggleFavorite(landmark) {
      if (!this.user || this.user.type === 'anon') {
        alert('请先登录正式用户后再收藏')
        return
      }
      const id = landmark?.id
      if (!id) return
      if (this.isFavorite(id)) {
        await api.removeFavorite(id)
        this.favorites = this.favorites.filter(f => Number(f.id) !== Number(id))
      } else {
        const res = await api.addFavorite(id)
        const item = res.data || {
          id: landmark.id,
          name: landmark.name || '',
          anime_shot_urls: landmark.anime_shot_urls || []
        }
        this.favorites = [item, ...this.favorites]
      }
    },

    async removeFavorite(id) {
      if (!id) return
      await api.removeFavorite(id)
      this.favorites = this.favorites.filter(f => Number(f.id) !== Number(id))
    },

    async init() {
      this.error = ''
      try {
        const res = await api.authMe()
        this.user = res.user || null
        this.loadFavorites()
      } catch (err) {
        this.error = err?.message || '加载失败'
      } finally {
        this.ready = true
      }
    },

    async login(id, password) {
      this.error = ''
      const res = await api.authLogin(id, password)
      this.user = res.user || null
      this.loadFavorites()
      return this.user
    },

    async anonymousLogin(nickname) {
      this.error = ''
      const res = await api.authAnonymous(nickname)
      this.user = res.user || null
      this.loadFavorites()
      return this.user
    },

    async updateNickname(nickname) {
      this.error = ''
      const res = await api.authUpdateNickname(nickname)
      this.user = res.user || null
      return this.user
    },

    async updateAvatar(file) {
      this.error = ''
      const res = await api.uploadAvatar(file)
      this.user = res.user || null
      return this.user
    },

    async logout() {
      await api.authLogout()
      this.user = null
      this.favorites = []
    }
  }
})
