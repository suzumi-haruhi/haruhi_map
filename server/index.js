import 'dotenv/config'
import express from 'express'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { initDb, getDb, listLandmarks, getLandmark, createLandmark, updateLandmark, deleteLandmark, listUsers, getUserById, getUserByNickname, createUser, deleteUser, updateUserAvatar, listUserLikedPhotos, listUserPhotos, listUserComments, addPhoto, listPhotosByLandmark, getPhoto, deletePhoto, listAdminPhotos, likePhoto, addComment, listComments, getComment, deleteComment, listAdminComments, likeComment, createPost, addPostImages, addPostTags, listPosts, getPostWithRelations, likePost, addPostComment, listPostComments, listUserLikedPosts, listUserPosts, listUserPostComments, getPostById, listPostImages, deletePostById, getPostCommentById, deletePostCommentById, updatePostStatus, updatePostCommentStatus, listUserFavorites, addUserFavorite, removeUserFavorite } from './db.js'
import { checkText, checkImage } from './ai.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_PORT = Number(process.env.API_PORT || 15555)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'map.sqlite')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'CHANGE_ME'
const COOKIE_NAME = 'haruhi_map_anon'
const COOKIE_SIG = 'haruhi_map_sig'
const USER_COOKIE = 'haruhi_map_user'
const USER_SIG = 'haruhi_map_user_sig'
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'dev-cookie-secret'
const LAT_MIN = 20
const LAT_MAX = 46
const LNG_MIN = 122
const LNG_MAX = 154
const ADMIN_POST_TAG = '管理员'
const CONTENT_STATUSES = ['pending', 'approved', 'locked']
const AI_REVIEW_INTERVAL_MS = 10 * 1000

function b64url(buf) {
	return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function sign(val) {
	return b64url(crypto.createHmac('sha256', COOKIE_SECRET).update(String(val)).digest())
}
function parseCookies(header) {
	const out = {}
	const s = String(header || '')
	if (!s) return out
	const parts = s.split(';')
	for (const p of parts) {
		const i = p.indexOf('=')
		if (i < 0) continue
		const k = p.slice(0, i).trim()
		const v = p.slice(i + 1).trim()
		if (!k) continue
		out[k] = decodeURIComponent(v)
	}
	return out
}
function setAnonCookie(res, id) {
	const sig = sign(id)
	const common = 'Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000'
	res.setHeader('Set-Cookie', [
		`${COOKIE_NAME}=${encodeURIComponent(id)}; ${common}`,
		`${COOKIE_SIG}=${encodeURIComponent(sig)}; ${common}`
	])
}
function setUserCookie(res, payload) {
	const raw = JSON.stringify(payload)
	const sig = sign(raw)
	const common = 'Path=/; HttpOnly; SameSite=Lax; Max-Age=604800'
	res.setHeader('Set-Cookie', [
		`${USER_COOKIE}=${encodeURIComponent(raw)}; ${common}`,
		`${USER_SIG}=${encodeURIComponent(sig)}; ${common}`
	])
}
function clearUserCookie(res) {
	const common = 'Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
	res.setHeader('Set-Cookie', [
		`${USER_COOKIE}=; ${common}`,
		`${USER_SIG}=; ${common}`
	])
}
function clampInt(v, min, max, d) {
	const n = Number(v)
	if (!Number.isFinite(n)) return d
	return Math.max(min, Math.min(max, Math.floor(n)))
}
function isAdmin(req) {
	const pwd = req.headers['x-admin-password']
	return pwd && String(pwd) === String(ADMIN_PASSWORD)
}
function mapFileUrl(rel) {
	if (!rel) return ''
	return `/api/uploads/${rel}`.replace(/\\/g, '/')
}

function isLatLngValid(lat, lng) {
	const a = Number(lat)
	const b = Number(lng)
	if (!Number.isFinite(a) || !Number.isFinite(b)) return false
	return a >= LAT_MIN && a <= LAT_MAX && b >= LNG_MIN && b <= LNG_MAX
}

function normalizeContentStatus(value, fallback = 'pending') {
	const key = String(value || '').trim().toLowerCase()
	return CONTENT_STATUSES.includes(key) ? key : fallback
}

function isWebpUpload(file) {
	const ext = path.extname(file?.originalname || '').toLowerCase()
	return file?.mimetype === 'image/webp' && ext === '.webp'
}

function uploadErrorMessage(err) {
	if (err?.code === 'LIMIT_FILE_SIZE') return 'image too large'
	if (err?.message === 'ONLY_WEBP') return 'webp only'
	return 'upload failed'
}

function handleUpload(uploader) {
	return (req, res, next) => {
		uploader(req, res, err => {
			if (!err) return next()
			const message = uploadErrorMessage(err)
			return res.status(400).json({ ok: false, message })
		})
	}
}

const aiReviewQueue = []
let aiReviewRunning = false

function enqueueAiReview(item) {
	aiReviewQueue.push(item)
}

async function processAiReviewQueue() {
	if (aiReviewRunning) return
	const item = aiReviewQueue.shift()
	if (!item) return
	aiReviewRunning = true
	try {
		if (item.type === 'post') {
			const current = await getPostById(item.id)
			if (!current || current.status !== 'pending') return
			let status = 'approved'
			const textCheck = await checkText(item.content || '')
			if (!textCheck.safe) status = 'locked'
			if (status === 'approved') {
				for (const rel of item.imagePaths || []) {
					const full = path.join(uploadsDir, rel)
					if (!fs.existsSync(full)) {
						status = 'locked'
						break
					}
					const imageCheck = await checkImage(full)
					if (!imageCheck.safe) {
						status = 'locked'
						break
					}
				}
			}
			await updatePostStatus(item.id, status)
		} else if (item.type === 'comment') {
			const current = await getPostCommentById(item.id)
			if (!current || current.status !== 'pending') return
			let status = 'approved'
			const textCheck = await checkText(item.body || '')
			if (!textCheck.safe) status = 'locked'
			await updatePostCommentStatus(item.id, status)
		}
	} catch (err) {
		console.error('AI review error:', err)
		aiReviewQueue.unshift(item)
	} finally {
		aiReviewRunning = false
	}
}

// ensure dirs
const dataDir = path.join(__dirname, 'data')
const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(dataDir, { recursive: true })
fs.mkdirSync(uploadsDir, { recursive: true })

setInterval(() => {
	processAiReviewQueue()
}, AI_REVIEW_INTERVAL_MS)

// multer setup
const storage = multer.diskStorage({
	destination(req, file, cb) {
		const d = new Date()
		const folder = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
		const dir = path.join(uploadsDir, folder)
		fs.mkdirSync(dir, { recursive: true })
		cb(null, dir)
	},
	filename(req, file, cb) {
		const ext = path.extname(file.originalname || '').toLowerCase() || '.bin'
		const safe = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
		cb(null, safe)
	}
})
const upload = multer({
	storage,
	limits: { fileSize: 16 * 1024 * 1024 },
	fileFilter(req, file, cb) {
		if (isWebpUpload(file)) return cb(null, true)
		return cb(new Error('ONLY_WEBP'))
	}
})
const postUpload = upload.array('images', 20)

// express app
const app = express()

app.use((req, res, next) => {
	const origin = req.headers.origin
	if (origin && (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))) {
		res.setHeader('Vary', 'Origin')
		res.setHeader('Access-Control-Allow-Origin', origin)
		res.setHeader('Access-Control-Allow-Credentials', 'true')
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password')
		res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
		if (req.method === 'OPTIONS') return res.status(204).end()
	}
	next()
})

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use((req, res, next) => {
	const c = parseCookies(req.headers.cookie || '')
	let id = c[COOKIE_NAME]
	const sig = c[COOKIE_SIG]
	const ok = id && sig && sign(id) === sig
	if (!ok) {
		id = crypto.randomUUID()
		setAnonCookie(res, id)
	}
	req.anonId = id
	// user cookie
	const u = c[USER_COOKIE]
	const us = c[USER_SIG]
	if (u && us && sign(u) === us) {
		try {
			req.user = JSON.parse(u)
		} catch {
			req.user = null
		}
	} else {
		req.user = null
	}
	req.userAnonId = req.user?.type === 'formal' ? `user:${req.user.id}` : req.anonId
	next()
})

app.use(async (req, res, next) => {
	// Skip invalidation check for auth routes (user is deliberately creating new session)
	const isAuthRoute = req.path.startsWith('/api/auth/')
	if (!isAuthRoute && req.user?.type === 'formal') {
		const row = await getUserById(req.user.id)
		if (!row) {
			clearUserCookie(res)
			res.setHeader('x-user-invalidated', '1')
			req.user = null
			req.userAnonId = req.anonId
		}
	}
	next()
})

app.use('/api/uploads', express.static(uploadsDir))

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.get('/api/admin/verify', (req, res) => {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	res.json({ ok: true })
})

function hashPassword(pwd) {
	return crypto.createHash('sha256').update(String(pwd)).digest('hex')
}
function verifyPassword(stored, input) {
	const hashed = hashPassword(input)
	return stored === hashed || stored === input
}

function parseUserMetadata(raw) {
	if (!raw) return {}
	try {
		return JSON.parse(raw)
	} catch {
		return {}
	}
}

// ---- Auth ----
app.get('/api/auth/me', async (req, res) => {
	if (!req.user) return res.json({ ok: true, user: null })
	if (req.user.type === 'formal') {
		const row = await getUserById(req.user.id)
		if (!row) return res.json({ ok: true, user: null })
		const meta = parseUserMetadata(row.metadata)
		return res.json({ ok: true, user: {
			type: 'formal',
			id: row.id,
			nickname: row.id,
			avatar_url: mapFileUrl(meta.avatar_path)
		} })
	}
	res.json({ ok: true, user: req.user })
})

function parseMetadata(raw) {
	if (!raw) return null
	try {
		return JSON.parse(raw)
	} catch {
		return null
	}
}

function normalizeLandmarkRow(row) {
	const metadata = parseMetadata(row.metadata) || {}
	const name = String(metadata.name || row.name || '').trim()
	const lat = Number(metadata.lat ?? row.lat)
	const lng = Number(metadata.lng ?? row.lng)
	const address = String(metadata.address || row.address || '').trim()
	const description = String(metadata.description || row.description || '').trim()
	const alias = String(metadata.alias || '').trim()
	const animeSource = String(metadata.anime_source || '').trim()
	const shots = Array.isArray(metadata.anime_shots) ? metadata.anime_shots : []
	return {
		id: row.id,
		name,
		lat: Number.isFinite(lat) ? lat : null,
		lng: Number.isFinite(lng) ? lng : null,
		address,
		description,
		alias,
		anime_source: animeSource,
		anime_shot_urls: shots.map(mapFileUrl),
		photo_count: row.photo_count || 0,
		created_at: row.created_at,
		updated_at: row.updated_at,
		metadata
	}
}

// ---- Favorites ----
app.get('/api/user/favorites', async (req, res) => {
	if (!req.user || req.user.type !== 'formal') {
		return res.status(401).json({ ok: false, message: 'formal required' })
	}
	const rows = await listUserFavorites(req.userAnonId)
	const data = rows.map(normalizeLandmarkRow)
	res.json({ ok: true, data })
})

app.post('/api/user/favorites/:id', async (req, res) => {
	if (!req.user || req.user.type !== 'formal') {
		return res.status(401).json({ ok: false, message: 'formal required' })
	}
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const row = await addUserFavorite(req.userAnonId, id)
	if (!row) return res.status(404).json({ ok: false, message: 'not found' })
	res.json({ ok: true, data: normalizeLandmarkRow(row) })
})

app.delete('/api/user/favorites/:id', async (req, res) => {
	if (!req.user || req.user.type !== 'formal') {
		return res.status(401).json({ ok: false, message: 'formal required' })
	}
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	await removeUserFavorite(req.userAnonId, id)
	res.json({ ok: true })
})

app.post('/api/auth/login', async (req, res) => {
	const { id, password } = req.body || {}
	if (!id || !password) return res.status(400).json({ ok: false, message: 'missing id/password' })
	const user = await getUserById(String(id))
	const meta = parseUserMetadata(user?.metadata)
	if (!user || !verifyPassword(meta.password_hash, password)) {
		return res.status(401).json({ ok: false, message: 'invalid credentials' })
	}
	const payload = { type: 'formal', id: user.id, nickname: user.id }
	setUserCookie(res, payload)
	res.json({ ok: true, user: { ...payload, avatar_url: mapFileUrl(meta.avatar_path) } })
})

app.post('/api/auth/anonymous', async (req, res) => {
	const { nickname } = req.body || {}
	const name = String(nickname || '').trim().slice(0, 20)
	if (!name) return res.status(400).json({ ok: false, message: 'missing nickname' })

	const textCheck = await checkText(name)
	if (!textCheck.safe) return res.status(400).json({ ok: false, message: 'nickname blocked', reason: textCheck.reason })

	const exists = await getUserByNickname(name)
	if (exists) return res.status(400).json({ ok: false, message: 'nickname exists' })

	const payload = { type: 'anon', nickname: name }
	setUserCookie(res, payload)
	res.json({ ok: true, user: payload })
})

app.patch('/api/auth/nickname', async (req, res) => {
	if (!req.user || req.user.type !== 'anon') return res.status(401).json({ ok: false, message: 'anon only' })
	const { nickname } = req.body || {}
	const name = String(nickname || '').trim().slice(0, 20)
	if (!name) return res.status(400).json({ ok: false, message: 'missing nickname' })

	const textCheck = await checkText(name)
	if (!textCheck.safe) return res.status(400).json({ ok: false, message: 'nickname blocked', reason: textCheck.reason })

	const exists = await getUserByNickname(name)
	if (exists) return res.status(400).json({ ok: false, message: 'nickname exists' })

	const payload = { type: 'anon', nickname: name }
	setUserCookie(res, payload)
	res.json({ ok: true, user: payload })
})

// 兼容旧路径
app.post('/api/auth/anon', async (req, res) => {
	const { nickname } = req.body || {}
	const name = String(nickname || '').trim().slice(0, 20)
	if (!name) return res.status(400).json({ ok: false, message: 'missing nickname' })

	const textCheck = await checkText(name)
	if (!textCheck.safe) return res.status(400).json({ ok: false, message: 'nickname blocked', reason: textCheck.reason })

	const exists = await getUserByNickname(name)
	if (exists) return res.status(400).json({ ok: false, message: 'nickname exists' })

	const payload = { type: 'anon', nickname: name }
	setUserCookie(res, payload)
	res.json({ ok: true, user: payload })
})

app.post('/api/auth/logout', (req, res) => {
	clearUserCookie(res)
	res.json({ ok: true })
})

const avatarUpload = upload.single('avatar')
app.post('/api/user/avatar', handleUpload(avatarUpload), async (req, res) => {
	try {
		if (!req.user || req.user.type !== 'formal') return res.status(401).json({ ok: false, message: 'formal only' })
		if (!req.file) return res.status(400).json({ ok: false, message: 'missing avatar' })

		const imageCheck = await checkImage(req.file.path)
		if (!imageCheck.safe) return res.status(400).json({ ok: false, message: 'image blocked', reason: imageCheck.reason })

		const rel = path.relative(uploadsDir, req.file.path)
		const existing = await getUserById(req.user.id)
		const existingMeta = parseUserMetadata(existing?.metadata)
		if (existingMeta?.avatar_path) {
			const oldPath = path.join(uploadsDir, existingMeta.avatar_path)
			try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath) } catch {}
		}
		const row = await updateUserAvatar(req.user.id, rel)
		if (!row) return res.status(404).json({ ok: false, message: 'user not found' })
		const meta = parseUserMetadata(row.metadata)
		const payload = { type: 'formal', id: row.id, nickname: row.id }
		setUserCookie(res, payload)
		res.json({ ok: true, user: { ...payload, avatar_url: mapFileUrl(meta.avatar_path) } })
	} catch (err) {
		console.error('Avatar upload error:', err)
		res.status(500).json({ ok: false, message: 'avatar upload failed' })
	}
})

app.get('/api/user/likes', async (req, res) => {
	try {
		if (!req.user || req.user.type !== 'formal') return res.status(401).json({ ok: false, message: 'formal only' })
		const rows = await listUserLikedPhotos(req.userAnonId, clampInt(req.query.limit, 1, 200, 50))
		res.json({ ok: true, data: rows.map(p => ({
			id: p.id,
			landmark_id: p.landmark_id,
			caption: p.caption,
			uploader_name: p.uploader_name,
			created_at: p.created_at,
			file_url: mapFileUrl(p.file_path),
			thumb_url: mapFileUrl(p.thumb_path || p.file_path)
		})) })
	} catch (err) {
		console.error('List user likes error:', err)
		res.status(500).json({ ok: false, message: 'list likes failed' })
	}
})

app.get('/api/user/photos', async (req, res) => {
	try {
		if (!req.user || req.user.type !== 'formal') return res.status(401).json({ ok: false, message: 'formal only' })
		const rows = await listUserPhotos(req.userAnonId, clampInt(req.query.limit, 1, 200, 50))
		res.json({ ok: true, data: rows.map(p => ({
			id: p.id,
			landmark_id: p.landmark_id,
			caption: p.caption,
			uploader_name: p.uploader_name,
			created_at: p.created_at,
			file_url: mapFileUrl(p.file_path),
			thumb_url: mapFileUrl(p.thumb_path || p.file_path)
		})) })
	} catch (err) {
		console.error('List user photos error:', err)
		res.status(500).json({ ok: false, message: 'list photos failed' })
	}
})

app.get('/api/user/comments', async (req, res) => {
	try {
		if (!req.user || req.user.type !== 'formal') return res.status(401).json({ ok: false, message: 'formal only' })
		const rows = await listUserComments(req.userAnonId, clampInt(req.query.limit, 1, 200, 50))
		res.json({ ok: true, data: rows.map(c => ({
			id: c.id,
			photo_id: c.photo_id,
			landmark_id: c.landmark_id,
			body: c.body,
			created_at: c.created_at
		})) })
	} catch (err) {
		console.error('List user comments error:', err)
		res.status(500).json({ ok: false, message: 'list comments failed' })
	}
})

app.get('/api/user/post-likes', async (req, res) => {
	if (!req.user || req.user.type !== 'formal') return res.status(401).json({ ok: false, message: 'formal only' })
	const rows = await listUserLikedPosts(req.userAnonId, clampInt(req.query.limit, 1, 200, 50))
	res.json({ ok: true, data: rows.map(p => ({
		id: p.id,
		content: p.content,
		title: p.title,
		summary: p.summary,
		like_count: p.like_count,
		created_at: p.created_at,
		images: (p.images || []).map(i => mapFileUrl(i.file_path)),
		image_captions: (p.images || []).map(i => String(i.caption || '')),
		tags: (p.tags || []).map(t => t.tag)
	})) })
})

app.get('/api/user/posts', async (req, res) => {
	if (!req.user || req.user.type !== 'formal') return res.status(401).json({ ok: false, message: 'formal only' })
	const rows = await listUserPosts(req.userAnonId, clampInt(req.query.limit, 1, 200, 50))
	res.json({ ok: true, data: rows.map(p => ({
		id: p.id,
		content: p.content,
		title: p.title,
		summary: p.summary,
		status: p.status || 'approved',
		like_count: p.like_count,
		created_at: p.created_at,
		images: (p.images || []).map(i => mapFileUrl(i.file_path)),
		image_captions: (p.images || []).map(i => String(i.caption || '')),
		tags: (p.tags || []).map(t => t.tag)
	})) })
})

app.get('/api/user/post-comments', async (req, res) => {
	if (!req.user || req.user.type !== 'formal') return res.status(401).json({ ok: false, message: 'formal only' })
	const rows = await listUserPostComments(req.userAnonId, clampInt(req.query.limit, 1, 500, 100))
	res.json({ ok: true, data: rows.map(c => ({
		id: c.id,
		post_id: c.post_id,
		body: c.body,
		status: c.status || 'approved',
		created_at: c.created_at,
		post_content: c.post_content,
		post_created_at: c.post_created_at,
		post_images: (c.post_images || []).map(i => mapFileUrl(i.file_path)),
		post_tags: (c.post_tags || []).map(t => t.tag)
	})) })
})

// ---- Community ----
app.get('/api/posts', async (req, res) => {
	const sortBy = String(req.query.sortBy || 'time') === 'likes' ? 'likes' : 'time'
	const order = String(req.query.order || 'desc') === 'asc' ? 'asc' : 'desc'
	const limit = clampInt(req.query.limit, 1, 200, 50)
	const adminOnly = String(req.query.adminOnly || '') === '1'
	const includeAll = String(req.query.includeAll || '') === '1'
	const status = includeAll && isAdmin(req) ? 'all' : 'approved'
	const landmarkId = req.query.landmarkId ? Number(req.query.landmarkId) : null
	const rows = await listPosts({ sortBy, order, limit, adminOnly, status, landmarkId: Number.isFinite(landmarkId) ? landmarkId : null })
	let likedSet = new Set()
	if (rows.length) {
		const ids = rows.map(r => r.id)
		const placeholders = ids.map(() => '?').join(',')
		const db = getDb()
		const likedRows = await db.all(
			`SELECT target_id FROM user_likes WHERE anon_id=? AND target_type='post' AND target_id IN (${placeholders})`,
			[req.userAnonId, ...ids]
		)
		likedSet = new Set(likedRows.map(r => r.target_id))
	}
	res.json({
		ok: true,
		data: rows.map(p => ({
			id: p.id,
			user_name: p.user_name,
			user_avatar_url: mapFileUrl(parseUserMetadata(p.user_metadata).avatar_path),
			user_type: p.user_type,
			landmark_id: p.landmark_id,
			parent_post_id: p.parent_post_id || null,
			content: p.content,
			title: p.title,
			summary: p.summary,
			status: p.status || 'approved',
			like_count: p.like_count,
			liked: likedSet.has(p.id),
			created_at: p.created_at,
			images: (p.images || []).map(i => mapFileUrl(i.file_path)),
			image_captions: (p.images || []).map(i => String(i.caption || '')),
			tags: (p.tags || []).map(t => t.tag)
		}))
	})
})

app.get('/api/posts/:id', async (req, res) => {
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const row = await getPostWithRelations(id)
	if (!row) return res.status(404).json({ ok: false, message: 'not found' })
	if (row.status !== 'approved' && !isAdmin(req) && row.anon_id !== req.userAnonId) {
		return res.status(403).json({ ok: false, message: 'forbidden' })
	}
	const db = getDb()
	const likedRow = await db.get(
		`SELECT id FROM user_likes WHERE anon_id=? AND target_type='post' AND target_id=?`,
		[req.userAnonId, id]
	)
	res.json({
		ok: true,
		data: {
			id: row.id,
			user_name: row.user_name,
			user_avatar_url: mapFileUrl(parseUserMetadata(row.user_metadata).avatar_path),
			user_type: row.user_type,
			landmark_id: row.landmark_id,
			parent_post_id: row.parent_post_id || null,
			content: row.content,
			title: row.title,
			summary: row.summary,
			status: row.status || 'approved',
			like_count: row.like_count,
			liked: !!likedRow,
			created_at: row.created_at,
			images: (row.images || []).map(i => mapFileUrl(i.file_path)),
			image_captions: (row.images || []).map(i => String(i.caption || '')),
			tags: (row.tags || []).map(t => t.tag)
		}
	})
})

app.post('/api/posts/:id/like', async (req, res) => {
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const post = await getPostById(id)
	if (!post) return res.status(404).json({ ok: false, message: 'not found' })
	if (post.status !== 'approved') return res.status(403).json({ ok: false, message: 'forbidden' })
	const result = await likePost(id, req.userAnonId)
	const db = getDb()
	const row = await db.get(`SELECT like_count FROM posts WHERE id=?`, [id])
	res.json({ ok: true, like_count: row?.like_count || 0, liked: result?.liked === true })
})

app.get('/api/posts/:id/comments', async (req, res) => {
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const post = await getPostById(id)
	if (!post) return res.status(404).json({ ok: false, message: 'not found' })
	if (post.status !== 'approved') return res.status(403).json({ ok: false, message: 'forbidden' })
	const order = String(req.query.order || 'asc') === 'desc' ? 'desc' : 'asc'
	const limit = clampInt(req.query.limit, 1, 500, 200)
	const rows = await listPostComments(id, order, limit, 'approved')
	res.json({
		ok: true,
		data: rows.map(c => ({
			id: c.id,
			post_id: c.post_id,
			user_name: c.user_name,
			user_type: c.user_type,
			body: c.body,
			created_at: c.created_at,
			user_avatar_url: mapFileUrl(parseUserMetadata(c.user_metadata).avatar_path)
		}))
	})
})

app.post('/api/posts/:id/comments', async (req, res) => {
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	if (!req.user || !req.user.nickname) return res.status(401).json({ ok: false, message: 'login required' })
	const post = await getPostById(id)
	if (!post) return res.status(404).json({ ok: false, message: 'not found' })
	if (post.status !== 'approved') return res.status(403).json({ ok: false, message: 'forbidden' })
		const isFormal = req.user.type === 'formal'
		const maxLen = isFormal ? 200 : 50

		// Accept comment body as string or structured object.
		// If object, try to extract a readable plain-text representation
		// (common fields: plain_text, text, blocks, ops). If extraction fails,
		// fall back to JSON.stringify to preserve the original content instead
		// of saving "[object Object]".
		const bodyRaw = req.body?.body
		let body = ''
		if (bodyRaw == null) {
			body = ''
		} else if (typeof bodyRaw === 'string') {
			body = bodyRaw.trim()
		} else if (typeof bodyRaw === 'object') {
			if (typeof bodyRaw.plain_text === 'string') {
				body = bodyRaw.plain_text.trim()
			} else if (typeof bodyRaw.text === 'string') {
				body = bodyRaw.text.trim()
			} else if (Array.isArray(bodyRaw.blocks)) {
				body = bodyRaw.blocks.map(b => {
					if (typeof b === 'string') return b
					if (b && typeof b.text === 'string') return b.text
					if (b && b.data && typeof b.data.text === 'string') return b.data.text
					return ''
				}).filter(Boolean).join('\n').trim()
			} else if (Array.isArray(bodyRaw.ops)) {
				body = bodyRaw.ops.map(o => (o && (o.insert || ''))).join('').trim()
			} else {
				try {
					body = JSON.stringify(bodyRaw)
				} catch (err) {
					body = String(bodyRaw)
				}
			}
			if (body === '[object Object]') {
				try { body = JSON.stringify(bodyRaw) } catch {}
			}
			body = String(body || '').trim()
		} else {
			body = String(bodyRaw).trim()
		}

		if (!body) return res.status(400).json({ ok: false, message: 'empty comment' })
		if (body.length > maxLen) return res.status(400).json({ ok: false, message: 'comment too long' })

	const status = 'pending'

	const row = await addPostComment({
		post_id: id,
		anon_id: req.userAnonId,
		user_name: req.user.nickname,
		user_type: req.user.type,
		body,
		status
	})

	enqueueAiReview({
		type: 'comment',
		id: row.id,
		body
	})
	res.json({
		ok: true,
		data: {
			id: row.id,
			post_id: row.post_id,
			user_name: row.user_name,
			user_type: row.user_type,
			body: row.body,
			status: row.status || 'pending',
			created_at: row.created_at,
			user_avatar_url: mapFileUrl(parseUserMetadata((await getUserByNickname(row.user_name))?.metadata).avatar_path)
		}
	})
})

app.delete('/api/posts/:id', async (req, res) => {
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const post = await getPostById(id)
	if (!post) return res.status(404).json({ ok: false, message: 'not found' })
	if (!isAdmin(req) && post.anon_id !== req.userAnonId) {
		return res.status(403).json({ ok: false, message: 'forbidden' })
	}
	const images = await listPostImages(id)
	for (const img of images) {
		const full = path.join(uploadsDir, img.file_path)
		try { if (fs.existsSync(full)) fs.unlinkSync(full) } catch {}
	}
	const db = getDb()
	await db.run(`DELETE FROM user_likes WHERE target_type='post' AND target_id=?`, [id])
	await deletePostById(id)
	res.json({ ok: true })
})

app.delete('/api/post-comments/:id', async (req, res) => {
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const row = await getPostCommentById(id)
	if (!row) return res.status(404).json({ ok: false, message: 'not found' })
	if (!isAdmin(req) && row.anon_id !== req.userAnonId) {
		return res.status(403).json({ ok: false, message: 'forbidden' })
	}
	await deletePostCommentById(id)
	res.json({ ok: true })
})

app.post('/api/posts', handleUpload(postUpload), async (req, res) => {
	if (!req.user || !req.user.nickname) return res.status(401).json({ ok: false, message: 'login required' })
	const isFormal = req.user.type === 'formal'
	const maxImages = isFormal ? 20 : 1
	const maxText = isFormal ? 2000 : 150
	const files = req.files || []
	const content = String(req.body.content || '').trim()
	const summary = String(req.body.summary || '').trim()
	const title = String(req.body.title || '').trim()
	const normalTagsRaw = String(req.body.normal_tags || '[]')
	const imageCaptionsRaw = String(req.body.image_captions || '[]')
	const landmarkId = req.body.landmark_id ? Number(req.body.landmark_id) : null
	const parentPostId = req.body.parent_post_id ? Number(req.body.parent_post_id) : null

	function cleanupUploads() {
		for (const f of files) {
			try { if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path) } catch {}
		}
	}

	if (!content) {
		cleanupUploads()
		return res.status(400).json({ ok: false, message: 'content required' })
	}
	if (content.length > maxText) {
		cleanupUploads()
		return res.status(400).json({ ok: false, message: 'content too long' })
	}
	if (files.length > maxImages) {
		cleanupUploads()
		return res.status(400).json({ ok: false, message: 'too many images' })
	}
	if (Number.isFinite(parentPostId)) {
		if (!isFormal) {
			cleanupUploads()
			return res.status(403).json({ ok: false, message: 'formal only' })
		}
		const parent = await getPostById(parentPostId)
		if (!parent) {
			cleanupUploads()
			return res.status(400).json({ ok: false, message: 'parent not found' })
		}
	}

	const status = 'pending'

	let landmarkTag = null
	if (Number.isFinite(landmarkId)) {
		const landmark = await getLandmark(landmarkId)
		if (landmark) landmarkTag = landmark.name
	}

	let normalTags = []
	try {
		normalTags = JSON.parse(normalTagsRaw)
		if (!Array.isArray(normalTags)) normalTags = []
	} catch {
		normalTags = []
	}
	const cleanedNormalTags = normalTags.map(t => String(t || '').trim()).filter(Boolean).slice(0, 4)

	const row = await createPost({
		anon_id: req.userAnonId,
		user_name: req.user.nickname,
		user_type: req.user.type,
		landmark_id: Number.isFinite(landmarkId) ? landmarkId : null,
		parent_post_id: Number.isFinite(parentPostId) ? parentPostId : null,
		content,
		summary,
		title,
		status
	})

	const relPaths = files.map(f => path.relative(uploadsDir, f.path))
	let imageCaptions = []
	try {
		const parsed = JSON.parse(imageCaptionsRaw)
		if (Array.isArray(parsed)) imageCaptions = parsed
	} catch {
		imageCaptions = []
	}
	const cleanedImageCaptions = relPaths.map((_, idx) => String(imageCaptions[idx] || '').trim().slice(0, 200))
	if (relPaths.length) await addPostImages(row.id, relPaths, cleanedImageCaptions)

	const tagsToAdd = []
	if (landmarkTag) tagsToAdd.push({ tag: landmarkTag, tag_type: 'landmark' })
	for (const t of cleanedNormalTags) tagsToAdd.push({ tag: t, tag_type: 'normal' })
	if (tagsToAdd.length) await addPostTags(row.id, tagsToAdd)

	enqueueAiReview({
		type: 'post',
		id: row.id,
		content,
		imagePaths: relPaths
	})

	res.json({
		ok: true,
		data: {
			id: row.id,
			user_name: row.user_name,
			user_type: row.user_type,
			landmark_id: row.landmark_id,
			parent_post_id: row.parent_post_id || null,
			content: row.content,
			title: row.title,
			summary: row.summary,
			status: row.status || 'pending',
			like_count: row.like_count,
			created_at: row.created_at,
			images: relPaths.map(mapFileUrl),
			image_captions: cleanedImageCaptions,
			tags: tagsToAdd.map(t => t.tag)
		}
	})
})

app.get('/api/admin/posts', async (req, res) => {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	const sortBy = String(req.query.sortBy || 'time') === 'likes' ? 'likes' : 'time'
	const order = String(req.query.order || 'desc') === 'asc' ? 'asc' : 'desc'
	const limit = clampInt(req.query.limit, 1, 200, 50)
	const rows = await listPosts({ sortBy, order, limit, adminOnly: true, status: 'all' })
	res.json({
		ok: true,
		data: rows.map(p => ({
			id: p.id,
			user_name: p.user_name,
			user_avatar_url: mapFileUrl(parseUserMetadata(p.user_metadata).avatar_path),
			user_type: p.user_type,
			landmark_id: p.landmark_id,
			parent_post_id: p.parent_post_id || null,
			content: p.content,
			title: p.title,
			summary: p.summary,
			status: p.status || 'approved',
			like_count: p.like_count,
			created_at: p.created_at,
			images: (p.images || []).map(i => mapFileUrl(i.file_path)),
			image_captions: (p.images || []).map(i => String(i.caption || '')),
			tags: (p.tags || []).map(t => t.tag)
		}))
	})
})

app.get('/api/admin/posts/:id/comments', async (req, res) => {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const order = String(req.query.order || 'asc') === 'desc' ? 'desc' : 'asc'
	const limit = clampInt(req.query.limit, 1, 500, 200)
	const rows = await listPostComments(id, order, limit, 'all')
	res.json({
		ok: true,
		data: rows.map(c => ({
			id: c.id,
			post_id: c.post_id,
			user_name: c.user_name,
			user_type: c.user_type,
			body: c.body,
			status: c.status || 'approved',
			created_at: c.created_at,
			user_avatar_url: mapFileUrl(parseUserMetadata(c.user_metadata).avatar_path)
		}))
	})
})

async function handleAdminPostStatusUpdate(req, res) {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const status = normalizeContentStatus(req.body?.status, '')
	if (!status) return res.status(400).json({ ok: false, message: 'invalid status' })
	const row = await updatePostStatus(id, status)
	if (!row) return res.status(404).json({ ok: false, message: 'not found' })
	res.json({ ok: true, data: { id: row.id, status: row.status } })
}

async function handleAdminPostCommentStatusUpdate(req, res) {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const status = normalizeContentStatus(req.body?.status, '')
	if (!status) return res.status(400).json({ ok: false, message: 'invalid status' })
	const row = await updatePostCommentStatus(id, status)
	if (!row) return res.status(404).json({ ok: false, message: 'not found' })
	res.json({ ok: true, data: { id: row.id, status: row.status } })
}

app.patch('/api/admin/posts/:id/status', handleAdminPostStatusUpdate)
app.post('/api/admin/posts/:id/status', handleAdminPostStatusUpdate)
app.patch('/api/admin/post-comments/:id/status', handleAdminPostCommentStatusUpdate)
app.post('/api/admin/post-comments/:id/status', handleAdminPostCommentStatusUpdate)

app.post('/api/admin/posts', (req, res, next) => {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	handleUpload(postUpload)(req, res, next)
}, async (req, res) => {
	const maxImages = 20
	const maxText = 2000
	const files = req.files || []
	const content = String(req.body.content || '').trim()
	const summary = String(req.body.summary || '').trim()
	const title = String(req.body.title || '').trim()
	const normalTagsRaw = String(req.body.normal_tags || '[]')
	const imageCaptionsRaw = String(req.body.image_captions || '[]')
	const landmarkId = req.body.landmark_id ? Number(req.body.landmark_id) : null
	const parentPostId = req.body.parent_post_id ? Number(req.body.parent_post_id) : null

	function cleanupUploads() {
		for (const f of files) {
			try { if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path) } catch {}
		}
	}

	if (!content) {
		cleanupUploads()
		return res.status(400).json({ ok: false, message: 'content required' })
	}
	if (content.length > maxText) {
		cleanupUploads()
		return res.status(400).json({ ok: false, message: 'content too long' })
	}
	if (files.length > maxImages) {
		cleanupUploads()
		return res.status(400).json({ ok: false, message: 'too many images' })
	}
	if (Number.isFinite(parentPostId)) {
		const parent = await getPostById(parentPostId)
		if (!parent) {
			cleanupUploads()
			return res.status(400).json({ ok: false, message: 'parent not found' })
		}
	}

	const textCheck = await checkText(content)
	if (!textCheck.safe) {
		cleanupUploads()
		return res.status(400).json({ ok: false, message: 'content blocked', reason: textCheck.reason })
	}

	let landmarkTag = null
	if (Number.isFinite(landmarkId)) {
		const landmark = await getLandmark(landmarkId)
		if (landmark) landmarkTag = landmark.name
	}

	let normalTags = []
	try {
		normalTags = JSON.parse(normalTagsRaw)
		if (!Array.isArray(normalTags)) normalTags = []
	} catch {
		normalTags = []
	}
	const cleanedNormalTags = normalTags.map(t => String(t || '').trim()).filter(Boolean).slice(0, 4)

	for (const f of files) {
		const imageCheck = await checkImage(f.path)
		if (!imageCheck.safe) {
			cleanupUploads()
			return res.status(400).json({ ok: false, message: 'image blocked', reason: imageCheck.reason })
		}
	}

	const row = await createPost({
		anon_id: 'admin',
		user_name: ADMIN_POST_TAG,
		user_type: 'admin',
		landmark_id: Number.isFinite(landmarkId) ? landmarkId : null,
		parent_post_id: Number.isFinite(parentPostId) ? parentPostId : null,
		content,
		summary,
		title,
		status: 'approved'
	})

	const relPaths = files.map(f => path.relative(uploadsDir, f.path))
	let imageCaptions = []
	try {
		const parsed = JSON.parse(imageCaptionsRaw)
		if (Array.isArray(parsed)) imageCaptions = parsed
	} catch {
		imageCaptions = []
	}
	const cleanedImageCaptions = relPaths.map((_, idx) => String(imageCaptions[idx] || '').trim().slice(0, 200))
	if (relPaths.length) await addPostImages(row.id, relPaths, cleanedImageCaptions)

	const tagsToAdd = [{ tag: ADMIN_POST_TAG, tag_type: 'admin' }]
	if (landmarkTag) tagsToAdd.push({ tag: landmarkTag, tag_type: 'landmark' })
	for (const t of cleanedNormalTags) tagsToAdd.push({ tag: t, tag_type: 'normal' })
	if (tagsToAdd.length) await addPostTags(row.id, tagsToAdd)

	res.json({
		ok: true,
		data: {
			id: row.id,
			user_name: row.user_name,
			user_type: row.user_type,
			landmark_id: row.landmark_id,
			parent_post_id: row.parent_post_id || null,
			content: row.content,
			title: row.title,
			summary: row.summary,
			status: row.status || 'approved',
			like_count: row.like_count,
			created_at: row.created_at,
			images: relPaths.map(mapFileUrl),
			image_captions: cleanedImageCaptions,
			tags: tagsToAdd.map(t => t.tag)
		}
	})
})

// ---- Landmarks ----

app.get('/api/landmarks', async (req, res) => {
	const rows = await listLandmarks()
	const data = rows.map(normalizeLandmarkRow)
	res.json({ ok: true, data })
})

const landmarkUpload = upload.array('anime_shots')

app.post('/api/landmarks', handleUpload(landmarkUpload), async (req, res) => {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	const { name, lat, lng, address, description, alias, anime_source, metadata: metadataRaw } = req.body
	const files = Array.isArray(req.files) ? req.files : []
	if (!files.length) return res.status(400).json({ ok: false, message: 'missing anime shots' })

	const relShots = files.map(f => path.relative(uploadsDir, f.path))
	const baseMetadata = parseMetadata(metadataRaw) || {}
	const metadataObj = {
		...baseMetadata,
		name: String(baseMetadata.name ?? name ?? '').trim(),
		lat: Number(baseMetadata.lat ?? lat),
		lng: Number(baseMetadata.lng ?? lng),
		address: String(baseMetadata.address ?? address ?? '').trim(),
		anime_source: String(baseMetadata.anime_source ?? anime_source ?? '').trim(),
		alias: String(baseMetadata.alias ?? alias ?? '').trim(),
		description: String(baseMetadata.description ?? description ?? '').trim(),
		anime_shots: relShots
	}

	if (!metadataObj.name || !metadataObj.address || !metadataObj.anime_source) {
		return res.status(400).json({ ok: false, message: 'missing required fields' })
	}
	if (!Number.isFinite(metadataObj.lat) || !Number.isFinite(metadataObj.lng)) {
		return res.status(400).json({ ok: false, message: 'missing lat/lng' })
	}
	if (!isLatLngValid(metadataObj.lat, metadataObj.lng)) {
		return res.status(400).json({ ok: false, message: 'lat/lng out of range' })
	}

	const payload = {
		name: metadataObj.name,
		lat: metadataObj.lat,
		lng: metadataObj.lng,
		address: metadataObj.address,
		description: metadataObj.description,
		anime_shot: relShots[0] || null,
		metadata: JSON.stringify(metadataObj)
	}
	const row = await createLandmark(payload)
	res.json({ ok: true, data: normalizeLandmarkRow(row) })
})

app.put('/api/landmarks/:id', handleUpload(landmarkUpload), async (req, res) => {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const exists = await getLandmark(id)
	if (!exists) return res.status(404).json({ ok: false, message: 'not found' })

	const { name, lat, lng, address, description, alias, anime_source, metadata: metadataRaw } = req.body
	const files = Array.isArray(req.files) ? req.files : []
	const relShots = files.map(f => path.relative(uploadsDir, f.path))
	const currentMetadata = parseMetadata(exists.metadata) || {}
	const inputMetadata = parseMetadata(metadataRaw) || {}
	const metadataObj = { ...currentMetadata, ...inputMetadata }
	const uploadMarker = '__upload__'

	if (name !== undefined) metadataObj.name = String(name || '').trim()
	if (lat !== undefined) metadataObj.lat = Number(lat)
	if (lng !== undefined) metadataObj.lng = Number(lng)
	if (address !== undefined) metadataObj.address = String(address || '').trim()
	if (anime_source !== undefined) metadataObj.anime_source = String(anime_source || '').trim()
	if (alias !== undefined) metadataObj.alias = String(alias || '').trim()
	if (description !== undefined) metadataObj.description = String(description || '').trim()
	let nextShots = Array.isArray(metadataObj.anime_shots) ? metadataObj.anime_shots : []
	if (!nextShots.length) {
		nextShots = Array.isArray(currentMetadata.anime_shots) ? currentMetadata.anime_shots : []
	}
	if (relShots.length) {
		let idx = 0
		nextShots = nextShots.map(s => {
			if (String(s) === uploadMarker && idx < relShots.length) {
				return relShots[idx++]
			}
			return s
		})
		while (idx < relShots.length) {
			nextShots.push(relShots[idx++])
		}
	}
	metadataObj.anime_shots = nextShots.filter(Boolean)

	const metaName = String(metadataObj.name || '').trim()
	const metaLat = Number(metadataObj.lat)
	const metaLng = Number(metadataObj.lng)
	const metaAddress = String(metadataObj.address || '').trim()
	const metaDesc = String(metadataObj.description || '').trim()
	const metaSource = String(metadataObj.anime_source || '').trim()
	const metaAlias = String(metadataObj.alias || '').trim()
	const fallbackName = String(currentMetadata.name || exists.name || '').trim()
	const fallbackAddress = String(currentMetadata.address || exists.address || '').trim()
	const fallbackDesc = String(currentMetadata.description || exists.description || '').trim()
	const fallbackSource = String(currentMetadata.anime_source || '').trim()
	const fallbackAlias = String(currentMetadata.alias || '').trim()
	const fallbackLat = Number(currentMetadata.lat ?? exists.lat)
	const fallbackLng = Number(currentMetadata.lng ?? exists.lng)

	const finalName = metaName || fallbackName
	const finalAddress = metaAddress || fallbackAddress
	const finalDesc = metaDesc || fallbackDesc
	const finalSource = metaSource || fallbackSource
	const finalAlias = metaAlias || fallbackAlias
	const finalLat = Number.isFinite(metaLat) ? metaLat : fallbackLat
	const finalLng = Number.isFinite(metaLng) ? metaLng : fallbackLng

	if (!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) {
		return res.status(400).json({ ok: false, message: 'missing lat/lng' })
	}
	if (!isLatLngValid(finalLat, finalLng)) {
		return res.status(400).json({ ok: false, message: 'lat/lng out of range' })
	}

	const payload = {
		name: finalName || exists.name,
		lat: finalLat,
		lng: finalLng,
		address: finalAddress || exists.address,
		description: finalDesc || exists.description,
		anime_shot: (metadataObj.anime_shots[0] || null) ?? exists.anime_shot,
		metadata: JSON.stringify({
			name: finalName,
			lat: finalLat,
			lng: finalLng,
			address: finalAddress,
			anime_source: finalSource,
			alias: finalAlias,
			description: finalDesc,
			anime_shots: metadataObj.anime_shots
		})
	}
	const row = await updateLandmark(id, payload)
	res.json({ ok: true, data: normalizeLandmarkRow(row) })
})

app.delete('/api/landmarks/:id', async (req, res) => {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	await deleteLandmark(id)
	res.json({ ok: true })
})

// ---- Photos ----
const photoUpload = upload.single('photo')

app.get('/api/landmarks/:id/photos', async (req, res) => {
	const landmarkId = Number(req.params.id)
	if (!Number.isFinite(landmarkId)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const photos = await listPhotosByLandmark(landmarkId, clampInt(req.query.limit, 1, 200, 50))
	res.json({ ok: true, data: photos.map(p => ({
		id: p.id,
		landmark_id: p.landmark_id,
		caption: p.caption,
		uploader_name: p.uploader_name,
		like_count: p.like_count,
		created_at: p.created_at,
		is_owner: p.anon_id === req.userAnonId,
		file_url: mapFileUrl(p.file_path),
		thumb_url: mapFileUrl(p.thumb_path || p.file_path)
	})) })
})

app.post('/api/landmarks/:id/photos', handleUpload(photoUpload), async (req, res) => {
	const landmarkId = Number(req.params.id)
	if (!Number.isFinite(landmarkId)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const landmark = await getLandmark(landmarkId)
	if (!landmark) return res.status(404).json({ ok: false, message: 'landmark not found' })
	if (!req.file) return res.status(400).json({ ok: false, message: 'missing photo file' })

	const rel = path.relative(uploadsDir, req.file.path)
	const uploader_name = String(req.body.uploader_name || '').slice(0, 40)
	const caption = String(req.body.caption || '').slice(0, 200)

	// basic AI checks
	const [textCheck, imageCheck] = await Promise.all([
		checkText(caption),
		checkImage(req.file.path)
	])
	if (!textCheck.safe) return res.status(400).json({ ok: false, message: 'caption blocked', reason: textCheck.reason })
	if (!imageCheck.safe) return res.status(400).json({ ok: false, message: 'image blocked', reason: imageCheck.reason })

	const row = await addPhoto({
		landmark_id: landmarkId,
		file_path: rel,
		thumb_path: null,
		uploader_name,
		caption,
		anon_id: req.userAnonId,
		status: 'approved'
	})

	res.json({ ok: true, data: {
		id: row.id,
		landmark_id: row.landmark_id,
		caption: row.caption,
		uploader_name: row.uploader_name,
		like_count: row.like_count,
		created_at: row.created_at,
		is_owner: row.anon_id === req.userAnonId,
		file_url: mapFileUrl(row.file_path),
		thumb_url: mapFileUrl(row.thumb_path || row.file_path)
	} })
})

app.delete('/api/photos/:id', async (req, res) => {
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const photo = await getPhoto(id)
	if (!photo) return res.status(404).json({ ok: false, message: 'not found' })
	if (!isAdmin(req) && photo.anon_id !== req.userAnonId) {
		return res.status(403).json({ ok: false, message: 'forbidden' })
	}

	function safeUnlink(rel) {
		if (!rel) return
		const full = path.join(uploadsDir, rel)
		if (!full.startsWith(uploadsDir)) return
		try {
			if (fs.existsSync(full)) fs.unlinkSync(full)
		} catch {}
	}
	// 删除原图/缩略图文件（如果存在）
	safeUnlink(photo.file_path)
	safeUnlink(photo.thumb_path)

	await deletePhoto(id)
	res.json({ ok: true })
})

app.post('/api/photos/:id/like', async (req, res) => {
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const result = await likePhoto(id, req.userAnonId)
	const photo = await getPhoto(id)
	res.json({ ok: true, like_count: photo?.like_count || 0, liked: result?.liked === true })
})

// ---- Comments ----
app.get('/api/photos/:id/comments', async (req, res) => {
	const photoId = Number(req.params.id)
	if (!Number.isFinite(photoId)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const rows = await listComments(photoId, clampInt(req.query.limit, 1, 200, 80))
	res.json({ ok: true, data: rows.map(r => ({
		id: r.id,
		photo_id: r.photo_id,
		user_name: r.user_name,
		body: r.body,
		like_count: r.like_count,
		created_at: r.created_at,
		is_owner: r.anon_id === req.userAnonId
	})) })
})

app.post('/api/photos/:id/comments', async (req, res) => {
	const photoId = Number(req.params.id)
	if (!Number.isFinite(photoId)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const { user_name, body } = req.body
	if (!body || !String(body).trim()) return res.status(400).json({ ok: false, message: 'empty comment' })

	const textCheck = await checkText(body)
	if (!textCheck.safe) return res.status(400).json({ ok: false, message: 'comment blocked', reason: textCheck.reason })

	const row = await addComment({
		photo_id: photoId,
		anon_id: req.userAnonId,
		user_name: String(user_name || '').slice(0, 40),
		body: String(body || '').slice(0, 500),
		status: 'public'
	})
	res.json({ ok: true, data: { ...row, is_owner: row.anon_id === req.userAnonId } })
})

app.delete('/api/comments/:id', async (req, res) => {
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const row = await getComment(id)
	if (!row) return res.status(404).json({ ok: false, message: 'not found' })
	if (!isAdmin(req) && row.anon_id !== req.userAnonId) {
		return res.status(403).json({ ok: false, message: 'forbidden' })
	}
	await deleteComment(id)
	res.json({ ok: true })
})

// ---- Admin moderation ----
app.get('/api/admin/photos', async (req, res) => {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	const rows = await listAdminPhotos(clampInt(req.query.limit, 1, 500, 120))
	res.json({ ok: true, data: rows.map(p => ({
		id: p.id,
		landmark_id: p.landmark_id,
		landmark_name: p.landmark_name,
		caption: p.caption,
		uploader_name: p.uploader_name,
		like_count: p.like_count,
		created_at: p.created_at,
		file_url: mapFileUrl(p.file_path),
		thumb_url: mapFileUrl(p.thumb_path || p.file_path)
	})) })
})

app.get('/api/admin/comments', async (req, res) => {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	const rows = await listAdminComments(clampInt(req.query.limit, 1, 500, 160))
	res.json({ ok: true, data: rows.map(c => ({
		id: c.id,
		photo_id: c.photo_id,
		landmark_id: c.landmark_id,
		landmark_name: c.landmark_name,
		user_name: c.user_name,
		body: c.body,
		like_count: c.like_count,
		created_at: c.created_at
	})) })
})

app.get('/api/admin/users', async (req, res) => {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	const rows = await listUsers()
	res.json({ ok: true, data: rows.map(u => ({
		id: u.id,
		avatar_url: mapFileUrl(parseUserMetadata(u.metadata).avatar_path || '')
	})) })
})

app.post('/api/admin/users', async (req, res) => {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	const { id, password } = req.body || {}
	const uid = String(id || '').trim()
	const pwd = String(password || '').trim()
	if (!uid || !pwd) return res.status(400).json({ ok: false, message: 'missing id/password' })

	const exists = await getUserById(uid)
	if (exists) return res.status(400).json({ ok: false, message: 'user exists' })
	const metadata = {
		id: uid,
		password_hash: hashPassword(pwd),
		avatar_path: ''
	}
	const row = await createUser({
		id: uid,
		metadata: JSON.stringify(metadata)
	})
	res.json({ ok: true, data: { id: row.id } })
})

app.delete('/api/admin/users/:id', async (req, res) => {
	if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'admin required' })
	const id = String(req.params.id || '')
	if (!id) return res.status(400).json({ ok: false, message: 'invalid id' })
	await deleteUser(id)
	res.json({ ok: true })
})

app.post('/api/comments/:id/like', async (req, res) => {
	const id = Number(req.params.id)
	if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'invalid id' })
	const result = await likeComment(id, req.userAnonId)
	const db = getDb()
	const row = await db.get(`SELECT like_count FROM comments WHERE id=?`, [id])
	res.json({ ok: true, like_count: row?.like_count || 0, liked: result?.liked === true })
})

// ---- bootstrap ----
const dbReady = initDb(DB_PATH)

dbReady.then(() => {
	app.listen(API_PORT, () => {
		console.log(`API listening on :${API_PORT}`)
	})
}).catch(err => {
	console.error('DB init failed', err)
	process.exit(1)
})
