import { compressFile } from '../utils/imageCompressor.js'

const API_BASE = '/api'
const ADMIN_CACHE_KEY = 'haruhi_map_admin_auth'
const ADMIN_CACHE_TTL = 60 * 60 * 1000

function canUseStorage() {
  return typeof localStorage !== 'undefined'
}

function readAdminCache() {
  if (!canUseStorage()) return null
  try {
    const raw = localStorage.getItem(ADMIN_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getCachedAdminPassword() {
  const data = readAdminCache()
  if (!data?.password || !data?.ts) return ''
  if (Date.now() - Number(data.ts) > ADMIN_CACHE_TTL) {
    clearCachedAdminPassword()
    return ''
  }
  return String(data.password || '')
}

function setCachedAdminPassword(password) {
  if (!canUseStorage()) return
  const payload = { password: String(password || ''), ts: Date.now() }
  localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(payload))
}

function clearCachedAdminPassword() {
  if (!canUseStorage()) return
  localStorage.removeItem(ADMIN_CACHE_KEY)
}

function hasValidAdminPassword() {
  return !!getCachedAdminPassword()
}

function adminHeaders(adminPassword) {
  return adminPassword ? { 'x-admin-password': adminPassword } : undefined
}

async function request(path, options = {}) {
  const isForm = options.body instanceof FormData
  const baseHeaders = isForm ? {} : { 'Content-Type': 'application/json' }
  const headers = { ...baseHeaders, ...(options.headers || {}) }
  if (!headers['x-admin-password']) {
    const cachedAdmin = getCachedAdminPassword()
    if (cachedAdmin) headers['x-admin-password'] = cachedAdmin
  }
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) delete headers[key]
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers
  })
  if (res.headers.get('x-user-invalidated') === '1' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('haruhi:session-invalidated'))
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) {
    const message = data.message || res.statusText || 'Request failed'
    throw new Error(message)
  }
  return data
}

export const api = {
  setAdminPassword(password) {
    setCachedAdminPassword(password)
  },
  clearAdminPassword() {
    clearCachedAdminPassword()
  },
  hasAdminPassword() {
    return hasValidAdminPassword()
  },
  authMe() {
    return request('/auth/me')
  },
  authLogin(id, password) {
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ id, password }) })
  },
  authAnonymous(nickname) {
    return request('/auth/anonymous', { method: 'POST', body: JSON.stringify({ nickname }) })
      .catch(err => {
        if (String(err?.message || '').toLowerCase().includes('not found')) {
          return request('/auth/anon', { method: 'POST', body: JSON.stringify({ nickname }) })
        }
        throw err
      })
  },
  authUpdateNickname(nickname) {
    return request('/auth/nickname', { method: 'PATCH', body: JSON.stringify({ nickname }) })
  },
  async uploadAvatar(file) {
    const fd = new FormData()
    let fileToUpload = null
    try {
      fileToUpload = await compressFile(file, { quality: 0.9, maxWidth: 512, name: 'avatar.webp' })
    } catch {
      throw new Error('头像转换失败，请重试')
    }
    fd.append('avatar', fileToUpload)
    return request('/user/avatar', { method: 'POST', body: fd })
  },
  getMyLikes() {
    return request('/user/likes')
  },
  getMyPhotos() {
    return request('/user/photos')
  },
  getMyComments() {
    return request('/user/comments')
  },
  getMyPostLikes() {
    return request('/user/post-likes')
  },
  getMyPostComments() {
    return request('/user/post-comments')
  },
  getMyPosts() {
    return request('/user/posts')
  },
  getMyFavorites() {
    return request('/user/favorites')
  },
  addFavorite(landmarkId) {
    return request(`/user/favorites/${landmarkId}`, { method: 'POST' })
  },
  removeFavorite(landmarkId) {
    return request(`/user/favorites/${landmarkId}`, { method: 'DELETE' })
  },
  getPosts(params = {}) {
    const search = new URLSearchParams()
    if (params.sortBy) search.set('sortBy', params.sortBy)
    if (params.order) search.set('order', params.order)
    if (params.limit) search.set('limit', params.limit)
    if (params.adminOnly) search.set('adminOnly', '1')
    if (params.includeAll) search.set('includeAll', '1')
    if (params.landmarkId) search.set('landmarkId', String(params.landmarkId))
    const qs = search.toString()
    return request(`/posts${qs ? `?${qs}` : ''}`)
  },
  adminListAdminPosts(adminPassword, params = {}) {
    const search = new URLSearchParams()
    if (params.sortBy) search.set('sortBy', params.sortBy)
    if (params.order) search.set('order', params.order)
    if (params.limit) search.set('limit', params.limit)
    const qs = search.toString()
    return request(`/admin/posts${qs ? `?${qs}` : ''}`, {
      headers: adminHeaders(adminPassword)
    })
  },
  adminCreatePost(formData, adminPassword) {
    return request('/admin/posts', {
      method: 'POST',
      headers: adminHeaders(adminPassword),
      body: formData
    })
  },
  getPost(id) {
    return request(`/posts/${id}`)
  },
  likePost(id) {
    return request(`/posts/${id}/like`, { method: 'POST' })
  },
  getPostComments(id, order = 'asc') {
    const qs = `order=${order}`
    return request(`/posts/${id}/comments?${qs}`)
  },
  adminGetPostComments(id, order = 'asc', adminPassword) {
    const qs = `order=${order}`
    return request(`/admin/posts/${id}/comments?${qs}`, {
      headers: adminHeaders(adminPassword)
    })
  },
  addPostComment(id, body) {
    return request(`/posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    })
  },
  deletePost(id) {
    return request(`/posts/${id}`, { method: 'DELETE' })
  },
  adminDeletePost(id, adminPassword) {
    return request(`/posts/${id}`, { method: 'DELETE', headers: adminHeaders(adminPassword) })
  },
  deletePostComment(id) {
    return request(`/post-comments/${id}`, { method: 'DELETE' })
  },
  adminDeletePostComment(id, adminPassword) {
    return request(`/post-comments/${id}`, { method: 'DELETE', headers: adminHeaders(adminPassword) })
  },
  adminUpdatePostStatus(id, status, adminPassword) {
    return request(`/admin/posts/${id}/status`, {
      method: 'POST',
      headers: adminHeaders(adminPassword),
      body: JSON.stringify({ status })
    })
  },
  adminUpdatePostCommentStatus(id, status, adminPassword) {
    return request(`/admin/post-comments/${id}/status`, {
      method: 'POST',
      headers: adminHeaders(adminPassword),
      body: JSON.stringify({ status })
    })
  },
  createPost(formData) {
    return request('/posts', { method: 'POST', body: formData })
  },
  authLogout() {
    return request('/auth/logout', { method: 'POST' })
  },
  getLandmarks() {
    return request('/landmarks')
  },
  createLandmark(payload, adminPassword) {
    return request('/landmarks', {
      method: 'POST',
      headers: adminHeaders(adminPassword),
      body: payload
    })
  },
  updateLandmark(id, payload, adminPassword) {
    return request(`/landmarks/${id}`, {
      method: 'PUT',
      headers: adminHeaders(adminPassword),
      body: payload
    })
  },
  deleteLandmark(id, adminPassword) {
    return request(`/landmarks/${id}`, {
      method: 'DELETE',
      headers: adminHeaders(adminPassword)
    })
  },
  adminVerify(adminPassword) {
    return request('/admin/verify', {
      headers: adminHeaders(adminPassword)
    })
  },
  getPhotos(landmarkId, limit = 50) {
    return request(`/landmarks/${landmarkId}/photos?limit=${limit}`)
  },
  deletePhoto(id, adminPassword) {
    return request(`/photos/${id}`, { method: 'DELETE', headers: adminHeaders(adminPassword) })
  },
  async uploadPhoto(landmarkId, file, fields = {}) {
    const fd = new FormData()
    let fileToUpload = null
    try {
      fileToUpload = await compressFile(file, { quality: 0.86, maxWidth: 2560 })
    } catch {
      throw new Error('图片转换失败，请重试')
    }
    fd.append('photo', fileToUpload)
    if (fields.uploader_name) fd.append('uploader_name', fields.uploader_name)
    if (fields.caption) fd.append('caption', fields.caption)
    return request(`/landmarks/${landmarkId}/photos`, {
      method: 'POST',
      body: fd
    })
  },
  likePhoto(id) {
    return request(`/photos/${id}/like`, { method: 'POST' })
  },
  getComments(photoId, limit = 80) {
    return request(`/photos/${photoId}/comments?limit=${limit}`)
  },
  deleteComment(id, adminPassword) {
    return request(`/comments/${id}`, { method: 'DELETE', headers: adminHeaders(adminPassword) })
  },
  addComment(photoId, payload) {
    return request(`/photos/${photoId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  likeComment(id) {
    return request(`/comments/${id}/like`, { method: 'POST' })
  },

  adminListPhotos(adminPassword, limit = 120) {
    return request(`/admin/photos?limit=${limit}`, {
      headers: adminHeaders(adminPassword)
    })
  },
  adminListComments(adminPassword, limit = 160) {
    return request(`/admin/comments?limit=${limit}`, {
      headers: adminHeaders(adminPassword)
    })
  },
  adminListUsers(adminPassword) {
    return request('/admin/users', {
      headers: adminHeaders(adminPassword)
    })
  },
  adminCreateUser(id, password, adminPassword) {
    return request('/admin/users', {
      method: 'POST',
      headers: adminHeaders(adminPassword),
      body: JSON.stringify({ id, password })
    })
  },
  adminDeleteUser(id, adminPassword) {
    return request(`/admin/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: adminHeaders(adminPassword)
    })
  }
}
