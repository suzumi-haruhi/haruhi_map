import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

let _db = null

export function getDb() {
  if (!_db) throw new Error('DB not initialized')
  return _db
}

function now() {
  return new Date().toISOString()
}

export async function initDb(dbPath) {
  _db = await open({ filename: dbPath, driver: sqlite3.Database })
  await _db.exec(`PRAGMA foreign_keys=ON;`)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS landmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      address TEXT,
      description TEXT,
      anime_shot TEXT,
      metadata TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `)

  const landmarkCols = await _db.all(`PRAGMA table_info(landmarks)`)
  if (!landmarkCols.find(c => c.name === 'metadata')) {
    await _db.exec(`ALTER TABLE landmarks ADD COLUMN metadata TEXT`)
  }

  const legacyLandmarks = await _db.all(`SELECT id, name, lat, lng, address, description, anime_shot, metadata FROM landmarks`)
  for (const lm of legacyLandmarks) {
    if (lm.metadata) continue
    const meta = {
      name: lm.name || '',
      lat: lm.lat,
      lng: lm.lng,
      address: lm.address || '',
      anime_source: '',
      alias: '',
      description: lm.description || '',
      anime_shots: lm.anime_shot ? [lm.anime_shot] : []
    }
    await _db.run(`UPDATE landmarks SET metadata=? WHERE id=?`, [JSON.stringify(meta), lm.id])
  }

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      landmark_id INTEGER NOT NULL REFERENCES landmarks(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      thumb_path TEXT,
      caption TEXT,
      uploader_name TEXT,
      anon_id TEXT,
      like_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      created_at TEXT
    );
  `)
  await _db.exec(`CREATE INDEX IF NOT EXISTS idx_photos_landmark ON photos(landmark_id, datetime(created_at));`)

  // Migrate older databases missing caption column
  const photoCols = await _db.all(`PRAGMA table_info(photos)`)
  if (!photoCols.find(c => c.name === 'caption')) {
    await _db.exec(`ALTER TABLE photos ADD COLUMN caption TEXT`)
  }
  if (!photoCols.find(c => c.name === 'anon_id')) {
    await _db.exec(`ALTER TABLE photos ADD COLUMN anon_id TEXT`)
  }
  if (!photoCols.find(c => c.name === 'status')) {
    await _db.exec(`ALTER TABLE photos ADD COLUMN status TEXT DEFAULT 'approved'`)
  }

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      anon_id TEXT,
      user_name TEXT,
      body TEXT,
      like_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'public',
      created_at TEXT
    );
  `)
  await _db.exec(`CREATE INDEX IF NOT EXISTS idx_comments_photo ON comments(photo_id, datetime(created_at));`)

  const commentCols = await _db.all(`PRAGMA table_info(comments)`)
  if (!commentCols.find(c => c.name === 'anon_id')) {
    await _db.exec(`ALTER TABLE comments ADD COLUMN anon_id TEXT`)
  }
  if (!commentCols.find(c => c.name === 'status')) {
    await _db.exec(`ALTER TABLE comments ADD COLUMN status TEXT DEFAULT 'public'`)
  }

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS likes_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anon_id TEXT,
      target_type TEXT,
      target_id INTEGER,
      day TEXT,
      created_at TEXT,
      UNIQUE(anon_id, target_type, target_id, day)
    );
  `)
  await _db.exec(`CREATE INDEX IF NOT EXISTS idx_likes_target ON likes_daily(target_type, target_id, day);`)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      password_hash TEXT NOT NULL,
      created_at TEXT
    );
  `)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      metadata TEXT,
      created_at TEXT
    );
  `)

  const userCols = await _db.all(`PRAGMA table_info(users)`)
  const userColNames = userCols.map(c => c.name)
  const expectedUserCols = ['id', 'metadata', 'created_at']
  const hasLegacyUserCols = userColNames.some(c => !expectedUserCols.includes(c))
  if (hasLegacyUserCols || !userColNames.includes('metadata')) {
    await _db.exec(`DROP TABLE IF EXISTS users`)
    await _db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        metadata TEXT,
        created_at TEXT
      );
    `)
  }

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS user_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anon_id TEXT,
      target_type TEXT,
      target_id INTEGER,
      created_at TEXT,
      UNIQUE(anon_id, target_type, target_id)
    );
  `)
  await _db.exec(`CREATE INDEX IF NOT EXISTS idx_user_likes_target ON user_likes(target_type, target_id);`)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anon_id TEXT,
      landmark_id INTEGER NOT NULL REFERENCES landmarks(id) ON DELETE CASCADE,
      created_at TEXT,
      UNIQUE(anon_id, landmark_id)
    );
  `)
  await _db.exec(`CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(anon_id, datetime(created_at));`)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anon_id TEXT,
      user_name TEXT,
      user_type TEXT,
      landmark_id INTEGER REFERENCES landmarks(id) ON DELETE SET NULL,
      parent_post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
      content TEXT,
      status TEXT DEFAULT 'approved',
      like_count INTEGER DEFAULT 0,
      created_at TEXT
    );
  `)
  await _db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(datetime(created_at));`)

  const postCols = await _db.all(`PRAGMA table_info(posts)`)
  if (!postCols.find(c => c.name === 'parent_post_id')) {
    await _db.exec(`ALTER TABLE posts ADD COLUMN parent_post_id INTEGER`)
  }
  if (!postCols.find(c => c.name === 'status')) {
    await _db.exec(`ALTER TABLE posts ADD COLUMN status TEXT DEFAULT 'approved'`)
  }
  if (!postCols.find(c => c.name === 'title')) {
    await _db.exec(`ALTER TABLE posts ADD COLUMN title TEXT`)
  }
  if (!postCols.find(c => c.name === 'summary')) {
    await _db.exec(`ALTER TABLE posts ADD COLUMN summary TEXT`)
  }
  if (!postCols.find(c => c.name === 'cover_mode')) {
    await _db.exec(`ALTER TABLE posts ADD COLUMN cover_mode TEXT DEFAULT 'manual'`)
  }
  if (!postCols.find(c => c.name === 'cover_image_count')) {
    await _db.exec(`ALTER TABLE posts ADD COLUMN cover_image_count INTEGER DEFAULT 1`)
  }

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS post_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      caption TEXT,
      created_at TEXT
    );
  `)
  const postImageCols = await _db.all(`PRAGMA table_info(post_images)`)
  if (!postImageCols.find(c => c.name === 'caption')) {
    await _db.exec(`ALTER TABLE post_images ADD COLUMN caption TEXT`)
  }
  await _db.exec(`CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id);`)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS post_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      tag_type TEXT DEFAULT 'normal',
      created_at TEXT
    );
  `)
  await _db.exec(`CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);`)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      anon_id TEXT,
      user_name TEXT,
      user_type TEXT,
      body TEXT,
      status TEXT DEFAULT 'approved',
      created_at TEXT
    );
  `)
  await _db.exec(`CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, datetime(created_at));`)

  const postCommentCols = await _db.all(`PRAGMA table_info(post_comments)`)
  if (!postCommentCols.find(c => c.name === 'status')) {
    await _db.exec(`ALTER TABLE post_comments ADD COLUMN status TEXT DEFAULT 'approved'`)
  }

  return _db
}

// Landmark operations
export async function listLandmarks() {
  const db = getDb()
  return db.all(`
    SELECT l.*, COALESCE(pc.photo_count, 0) AS photo_count
    FROM landmarks l
    LEFT JOIN (
      SELECT landmark_id, COUNT(1) AS photo_count
      FROM photos
      GROUP BY landmark_id
    ) pc ON pc.landmark_id = l.id
    ORDER BY datetime(l.created_at) DESC, l.id DESC
  `)
}

export async function getLandmark(id) {
  const db = getDb()
  return db.get(`SELECT * FROM landmarks WHERE id=?`, [id])
}

export async function createLandmark(payload) {
  const db = getDb()
  const { name, lat, lng, address, description, anime_shot, metadata } = payload
  const ts = now()
  const res = await db.run(
    `INSERT INTO landmarks (name, lat, lng, address, description, anime_shot, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, lat, lng, address, description, anime_shot, metadata || null, ts, ts]
  )
  return getLandmark(res.lastID)
}

export async function updateLandmark(id, payload) {
  const db = getDb()
  const { name, lat, lng, address, description, anime_shot, metadata } = payload
  const ts = now()
  await db.run(
    `UPDATE landmarks
     SET name=?, lat=?, lng=?, address=?, description=?, anime_shot=?, metadata=?, updated_at=?
     WHERE id=?`,
    [name, lat, lng, address, description, anime_shot, metadata || null, ts, id]
  )
  return getLandmark(id)
}

export async function deleteLandmark(id) {
  const db = getDb()
  await db.run(`DELETE FROM landmarks WHERE id=?`, [id])
}

// User operations
export async function listUsers() {
  const db = getDb()
  return db.all(`SELECT id, metadata, created_at FROM users ORDER BY datetime(created_at) DESC`)
}

export async function getUserById(id) {
  const db = getDb()
  return db.get(`SELECT * FROM users WHERE id=?`, [id])
}

export async function listUserFavorites(anonId) {
  const db = getDb()
  return db.all(`
    SELECT uf.id AS favorite_id, uf.created_at AS favorited_at, l.*
    FROM user_favorites uf
    JOIN landmarks l ON l.id = uf.landmark_id
    WHERE uf.anon_id=?
    ORDER BY datetime(uf.created_at) DESC, uf.id DESC
  `, [anonId])
}

export async function addUserFavorite(anonId, landmarkId) {
  const db = getDb()
  const ts = now()
  await db.run(
    `INSERT OR IGNORE INTO user_favorites (anon_id, landmark_id, created_at)
     VALUES (?, ?, ?)`
    , [anonId, landmarkId, ts]
  )
  return db.get(`SELECT * FROM landmarks WHERE id=?`, [landmarkId])
}

export async function removeUserFavorite(anonId, landmarkId) {
  const db = getDb()
  await db.run(`DELETE FROM user_favorites WHERE anon_id=? AND landmark_id=?`, [anonId, landmarkId])
}

export async function getUserByNickname(nickname) {
  const db = getDb()
  return db.get(`SELECT * FROM users WHERE id=?`, [nickname])
}

export async function createUser(payload) {
  const db = getDb()
  const { id, metadata } = payload
  const ts = now()
  await db.run(
    `INSERT INTO users (id, metadata, created_at) VALUES (?, ?, ?)`,
    [id, metadata || null, ts]
  )
  return getUserById(id)
}

export async function deleteUser(id) {
  const db = getDb()
  await db.run(`DELETE FROM users WHERE id=?`, [id])
}

export async function updateUserAvatar(id, avatar_path) {
  const db = getDb()
  const row = await getUserById(id)
  if (!row) return null
  let metadata = null
  try {
    metadata = JSON.parse(row.metadata || '{}')
  } catch {
    metadata = {}
  }
  metadata.avatar_path = avatar_path || ''
  await db.run(`UPDATE users SET metadata=? WHERE id=?`, [JSON.stringify(metadata), id])
  return getUserById(id)
}

// Photo operations
export async function addPhoto(payload) {
  const db = getDb()
  const { landmark_id, file_path, thumb_path, uploader_name, caption, anon_id, status } = payload
  const ts = now()
  const res = await db.run(
    `INSERT INTO photos (landmark_id, file_path, thumb_path, caption, uploader_name, anon_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [landmark_id, file_path, thumb_path, caption, uploader_name, anon_id, status || 'approved', ts]
  )
  return db.get(`SELECT * FROM photos WHERE id=?`, [res.lastID])
}

export async function listPhotosByLandmark(landmarkId, limit = 50) {
  const db = getDb()
  return db.all(
    `SELECT * FROM photos WHERE landmark_id=? AND status='approved'
     ORDER BY datetime(created_at) DESC, id DESC LIMIT ?`,
    [landmarkId, limit]
  )
}

export async function getPhoto(id) {
  const db = getDb()
  return db.get(`SELECT * FROM photos WHERE id=?`, [id])
}

export async function deletePhoto(id) {
  const db = getDb()
  await db.run(`DELETE FROM photos WHERE id=?`, [id])
}

export async function listAdminPhotos(limit = 100) {
  const db = getDb()
  return db.all(
    `SELECT p.*, l.name AS landmark_name
     FROM photos p
     LEFT JOIN landmarks l ON l.id = p.landmark_id
     ORDER BY datetime(p.created_at) DESC, p.id DESC LIMIT ?`,
    [limit]
  )
}

export async function likePhoto(photoId, anonId) {
  const db = getDb()
  const exists = await db.get(
    `SELECT id FROM user_likes WHERE anon_id=? AND target_type='photo' AND target_id=?`,
    [anonId, photoId]
  )
  if (exists) {
    await db.run(`DELETE FROM user_likes WHERE id=?`, [exists.id])
    await db.run(`UPDATE photos SET like_count = MAX(like_count - 1, 0) WHERE id=?`, [photoId])
    return { ok: true, liked: false }
  }

  await db.run(
    `INSERT INTO user_likes (anon_id, target_type, target_id, created_at)
     VALUES (?, 'photo', ?, ?)`,
    [anonId, photoId, now()]
  )
  await db.run(`UPDATE photos SET like_count = like_count + 1 WHERE id=?`, [photoId])
  return { ok: true, liked: true }
}

// Comment operations
export async function addComment(payload) {
  const db = getDb()
  const { photo_id, anon_id, user_name, body, status } = payload
  const ts = now()
  const res = await db.run(
    `INSERT INTO comments (photo_id, anon_id, user_name, body, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [photo_id, anon_id, user_name, body, status || 'public', ts]
  )
  return db.get(`SELECT * FROM comments WHERE id=?`, [res.lastID])
}

export async function getComment(id) {
  const db = getDb()
  return db.get(`SELECT * FROM comments WHERE id=?`, [id])
}

export async function deleteComment(id) {
  const db = getDb()
  await db.run(`DELETE FROM comments WHERE id=?`, [id])
}

export async function listComments(photoId, limit = 100) {
  const db = getDb()
  return db.all(
    `SELECT * FROM comments WHERE photo_id=? AND status='public'
     ORDER BY datetime(created_at) DESC, id DESC LIMIT ?`,
    [photoId, limit]
  )
}

export async function listAdminComments(limit = 120) {
  const db = getDb()
  return db.all(
    `SELECT c.*, p.landmark_id, l.name AS landmark_name
     FROM comments c
     LEFT JOIN photos p ON p.id = c.photo_id
     LEFT JOIN landmarks l ON l.id = p.landmark_id
     ORDER BY datetime(c.created_at) DESC, c.id DESC LIMIT ?`,
    [limit]
  )
}

export async function likeComment(commentId, anonId) {
  const db = getDb()
  const exists = await db.get(
    `SELECT id FROM user_likes WHERE anon_id=? AND target_type='comment' AND target_id=?`,
    [anonId, commentId]
  )
  if (exists) {
    await db.run(`DELETE FROM user_likes WHERE id=?`, [exists.id])
    await db.run(`UPDATE comments SET like_count = MAX(like_count - 1, 0) WHERE id=?`, [commentId])
    return { ok: true, liked: false }
  }

  await db.run(
    `INSERT INTO user_likes (anon_id, target_type, target_id, created_at)
     VALUES (?, 'comment', ?, ?)`,
    [anonId, commentId, now()]
  )
  await db.run(`UPDATE comments SET like_count = like_count + 1 WHERE id=?`, [commentId])
  return { ok: true, liked: true }
}

export async function likePost(postId, anonId) {
  const db = getDb()
  const exists = await db.get(
    `SELECT id FROM user_likes WHERE anon_id=? AND target_type='post' AND target_id=?`,
    [anonId, postId]
  )
  if (exists) {
    await db.run(`DELETE FROM user_likes WHERE id=?`, [exists.id])
    await db.run(`UPDATE posts SET like_count = MAX(like_count - 1, 0) WHERE id=?`, [postId])
    return { ok: true, liked: false }
  }

  await db.run(
    `INSERT INTO user_likes (anon_id, target_type, target_id, created_at)
     VALUES (?, 'post', ?, ?)` ,
    [anonId, postId, now()]
  )
  await db.run(`UPDATE posts SET like_count = like_count + 1 WHERE id=?`, [postId])
  return { ok: true, liked: true }
}

export async function listUserLikedPhotos(anonId, limit = 50) {
  const db = getDb()
  return db.all(
    `SELECT p.*
     FROM user_likes ul
     JOIN photos p ON p.id = ul.target_id
     WHERE ul.anon_id=? AND ul.target_type='photo'
     ORDER BY datetime(ul.created_at) DESC LIMIT ?`,
    [anonId, limit]
  )
}

export async function listUserPhotos(anonId, limit = 50) {
  const db = getDb()
  return db.all(
    `SELECT * FROM photos WHERE anon_id=?
     ORDER BY datetime(created_at) DESC, id DESC LIMIT ?`,
    [anonId, limit]
  )
}

export async function listUserComments(anonId, limit = 50) {
  const db = getDb()
  try {
    return await db.all(
      `SELECT c.*, p.landmark_id
       FROM comments c
       LEFT JOIN photos p ON p.id = c.photo_id
       WHERE c.anon_id=?
       ORDER BY datetime(created_at) DESC, id DESC LIMIT ?`,
      [anonId, limit]
    )
  } catch (err) {
    console.warn('listUserComments fallback:', err?.message || err)
    return db.all(
      `SELECT c.*, NULL AS landmark_id
       FROM comments c
       WHERE c.anon_id=?
       ORDER BY datetime(created_at) DESC, id DESC LIMIT ?`,
      [anonId, limit]
    )
  }
}

export async function createPost(payload) {
  const db = getDb()
  const {
    anon_id,
    user_name,
    user_type,
    landmark_id,
    parent_post_id,
    content,
    summary,
    title,
    status = 'approved',
    cover_mode = 'manual',
    cover_image_count = 1
  } = payload
  const ts = now()
  const res = await db.run(
    `INSERT INTO posts (anon_id, user_name, user_type, landmark_id, parent_post_id, content, summary, title, status, cover_mode, cover_image_count, like_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      anon_id,
      user_name,
      user_type,
      landmark_id ?? null,
      parent_post_id ?? null,
      content,
      summary || null,
      title || null,
      status,
      cover_mode || 'manual',
      Number.isFinite(Number(cover_image_count)) ? Number(cover_image_count) : 1,
      ts
    ]
  )
  return db.get(`SELECT * FROM posts WHERE id=?`, [res.lastID])
}

export async function addPostImages(postId, filePaths = [], captions = []) {
  const db = getDb()
  const ts = now()
  for (let i = 0; i < filePaths.length; i += 1) {
    const p = filePaths[i]
    const caption = String(captions[i] || '').trim() || null
    await db.run(
      `INSERT INTO post_images (post_id, file_path, caption, created_at) VALUES (?, ?, ?, ?)` ,
      [postId, p, caption, ts]
    )
  }
}

export async function addPostTags(postId, tags = []) {
  const db = getDb()
  const ts = now()
  for (const t of tags) {
    await db.run(
      `INSERT INTO post_tags (post_id, tag, tag_type, created_at) VALUES (?, ?, ?, ?)` ,
      [postId, t.tag, t.tag_type || 'normal', ts]
    )
  }
}

export async function listPosts({ limit = 50, sortBy = 'time', order = 'desc', adminOnly = false, status = 'approved', landmarkId = null } = {}) {
  const db = getDb()
  const dir = order === 'asc' ? 'ASC' : 'DESC'
  const col = sortBy === 'likes' ? 'like_count' : 'created_at'
  const where = []
  if (adminOnly) {
    where.push(`EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_type='admin')`)
  }
  if (status && status !== 'all') {
    where.push(`p.status = ?`)
  }
  if (Number.isFinite(landmarkId)) {
    where.push(`p.landmark_id = ?`)
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const params = []
  if (status && status !== 'all') params.push(status)
  if (Number.isFinite(landmarkId)) params.push(landmarkId)
  const posts = await db.all(
    `SELECT p.*, u.metadata AS user_metadata
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_name
     ${whereClause}
     ORDER BY ${col} ${dir}, p.id ${dir} LIMIT ?`,
    [...params, limit]
  )
  return attachPostRelations(posts)
}

export async function getPostWithRelations(id) {
  const db = getDb()
  const row = await db.get(
    `SELECT p.*, u.metadata AS user_metadata
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_name
     WHERE p.id=?`,
    [id]
  )
  if (!row) return null
  const list = await attachPostRelations([row])
  return list[0] || null
}

async function attachPostRelations(posts) {
  const db = getDb()
  const ids = posts.map(p => p.id)
  if (!ids.length) return []

  const placeholders = ids.map(() => '?').join(',')
  const images = await db.all(
    `SELECT post_id, file_path, caption FROM post_images WHERE post_id IN (${placeholders}) ORDER BY id ASC`,
    ids
  )
  const tags = await db.all(
    `SELECT post_id, tag, tag_type FROM post_tags WHERE post_id IN (${placeholders}) ORDER BY id ASC`,
    ids
  )

  const imageMap = new Map()
  for (const img of images) {
    if (!imageMap.has(img.post_id)) imageMap.set(img.post_id, [])
    imageMap.get(img.post_id).push(img)
  }
  const tagMap = new Map()
  for (const t of tags) {
    if (!tagMap.has(t.post_id)) tagMap.set(t.post_id, [])
    tagMap.get(t.post_id).push(t)
  }

  return posts.map(p => ({
    ...p,
    images: imageMap.get(p.id) || [],
    tags: tagMap.get(p.id) || []
  }))
}

export async function listUserLikedPosts(anonId, limit = 50) {
  const db = getDb()
  const rows = await db.all(
    `SELECT p.*
     FROM user_likes ul
     JOIN posts p ON p.id = ul.target_id
     WHERE ul.anon_id=? AND ul.target_type='post'
       AND p.status='approved'
     ORDER BY datetime(ul.created_at) DESC LIMIT ?`,
    [anonId, limit]
  )
  return attachPostRelations(rows)
}

export async function listUserPosts(anonId, limit = 50) {
  const db = getDb()
  const rows = await db.all(
    `SELECT * FROM posts WHERE anon_id=?
     ORDER BY datetime(created_at) DESC, id DESC LIMIT ?`,
    [anonId, limit]
  )
  return attachPostRelations(rows)
}

export async function listUserPostComments(anonId, limit = 100) {
  const db = getDb()
  const rows = await db.all(
    `SELECT pc.*, p.content AS post_content, p.created_at AS post_created_at,
            p.cover_mode AS post_cover_mode, p.cover_image_count AS post_cover_image_count
     FROM post_comments pc
     LEFT JOIN posts p ON p.id = pc.post_id
     WHERE pc.anon_id=?
     ORDER BY datetime(pc.created_at) DESC, pc.id DESC LIMIT ?`,
    [anonId, limit]
  )
  const postIds = Array.from(new Set(rows.map(r => r.post_id).filter(Boolean)))
  let postMeta = new Map()
  if (postIds.length) {
    const placeholders = postIds.map(() => '?').join(',')
    const images = await db.all(
      `SELECT post_id, file_path, caption FROM post_images WHERE post_id IN (${placeholders}) ORDER BY id ASC`,
      postIds
    )
    const tags = await db.all(
      `SELECT post_id, tag FROM post_tags WHERE post_id IN (${placeholders}) ORDER BY id ASC`,
      postIds
    )
    const imageMap = new Map()
    for (const img of images) {
      if (!imageMap.has(img.post_id)) imageMap.set(img.post_id, [])
      imageMap.get(img.post_id).push(img)
    }
    const tagMap = new Map()
    for (const t of tags) {
      if (!tagMap.has(t.post_id)) tagMap.set(t.post_id, [])
      tagMap.get(t.post_id).push(t)
    }
    for (const id of postIds) {
      postMeta.set(id, {
        images: imageMap.get(id) || [],
        tags: tagMap.get(id) || []
      })
    }
  }
  return rows.map(r => ({
    ...r,
    post_images: postMeta.get(r.post_id)?.images || [],
    post_tags: postMeta.get(r.post_id)?.tags || [],
    post_cover_mode: r.post_cover_mode || 'manual',
    post_cover_image_count: Number.isFinite(Number(r.post_cover_image_count)) ? Number(r.post_cover_image_count) : 0
  }))
}

export async function addPostComment(payload) {
  const db = getDb()
  const { post_id, anon_id, user_name, user_type, body, status = 'approved' } = payload
  const ts = now()
  const res = await db.run(
    `INSERT INTO post_comments (post_id, anon_id, user_name, user_type, body, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)` ,
    [post_id, anon_id, user_name, user_type, body, status, ts]
  )
  return db.get(`SELECT * FROM post_comments WHERE id=?`, [res.lastID])
}

export async function getPostById(id) {
  const db = getDb()
  return db.get(`SELECT * FROM posts WHERE id=?`, [id])
}

export async function listPostImages(postId) {
  const db = getDb()
  return db.all(`SELECT * FROM post_images WHERE post_id=? ORDER BY id ASC`, [postId])
}

export async function deletePostById(id) {
  const db = getDb()
  await db.run(`DELETE FROM posts WHERE id=?`, [id])
}

export async function getPostCommentById(id) {
  const db = getDb()
  return db.get(`SELECT * FROM post_comments WHERE id=?`, [id])
}

export async function deletePostCommentById(id) {
  const db = getDb()
  await db.run(`DELETE FROM post_comments WHERE id=?`, [id])
}

export async function listPostComments(postId, order = 'asc', limit = 200, status = 'approved') {
  const db = getDb()
  const dir = order === 'desc' ? 'DESC' : 'ASC'
  const statusClause = status && status !== 'all' ? 'AND pc.status=?' : ''
  const params = status && status !== 'all' ? [postId, status, limit] : [postId, limit]
  return db.all(
    `SELECT pc.*, u.metadata AS user_metadata
     FROM post_comments pc
     LEFT JOIN users u ON u.id = pc.user_name
     WHERE pc.post_id=? ${statusClause}
     ORDER BY datetime(pc.created_at) ${dir}, pc.id ${dir} LIMIT ?`,
    params
  )
}

export async function updatePostStatus(id, status) {
  const db = getDb()
  await db.run(`UPDATE posts SET status=? WHERE id=?`, [status, id])
  return db.get(`SELECT * FROM posts WHERE id=?`, [id])
}

export async function updatePostCommentStatus(id, status) {
  const db = getDb()
  await db.run(`UPDATE post_comments SET status=? WHERE id=?`, [status, id])
  return db.get(`SELECT * FROM post_comments WHERE id=?`, [id])
}

// Utility: reset likes (for testing)
export async function clearLikes() {
  const db = getDb()
  await db.exec(`DELETE FROM likes_daily`)
  await db.exec(`DELETE FROM user_likes`)
  await db.exec(`UPDATE photos SET like_count=0`)
  await db.exec(`UPDATE comments SET like_count=0`)
}
