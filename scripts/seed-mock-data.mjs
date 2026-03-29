import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb, getDb } from '../server/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const serverDir = path.join(rootDir, 'server')
const uploadsDir = path.join(serverDir, 'uploads')
const defaultDbPath = process.env.DB_PATH || path.join(serverDir, 'data', 'map.sqlite')

const MOCK_PREFIX = '测试·'
const MOCK_PASSWORD = 'mock123456'
const MOCK_FILE_ROOT = 'mock'
const MOCK_ANON_USERS = [
  { anonId: 'mock:anon:rin', userName: `${MOCK_PREFIX}游客Rin` },
  { anonId: 'mock:anon:sora', userName: `${MOCK_PREFIX}游客Sora` },
  { anonId: 'mock:anon:nozomi', userName: `${MOCK_PREFIX}游客Nozomi` }
]

const MOCK_USERS = [
  { id: 'mock_akari', avatarAsset: 'src/assets/yuki_search.webp' },
  { id: 'mock_yuki', avatarAsset: 'src/assets/yuki_upload.webp' },
  { id: 'mock_kyon', avatarAsset: 'src/assets/community_button.webp' },
  { id: 'mock_mikuru', avatarAsset: 'src/assets/konata_up.webp' }
]

const ASSET_SPECS = [
  { key: 'avatarAkari', src: 'src/assets/yuki_search.webp', dest: 'avatars/mock-akari.webp' },
  { key: 'avatarYuki', src: 'src/assets/yuki_upload.webp', dest: 'avatars/mock-yuki.webp' },
  { key: 'avatarKyon', src: 'src/assets/community_button.webp', dest: 'avatars/mock-kyon.webp' },
  { key: 'avatarMikuru', src: 'src/assets/konata_up.webp', dest: 'avatars/mock-mikuru.webp' },
  { key: 'shotKitashirakawa', src: 'src/assets/back.webp', dest: 'landmarks/kitashirakawa-shot.webp' },
  { key: 'shotKamogawa', src: 'src/assets/sos_info.webp', dest: 'landmarks/kamogawa-shot.webp' },
  { key: 'shotUji', src: 'src/assets/yuki_upload.webp', dest: 'landmarks/uji-shot.webp' },
  { key: 'shotKyotoStation', src: 'src/assets/community_button.webp', dest: 'landmarks/kyoto-station-shot.webp' },
  { key: 'shotToyosato', src: 'src/assets/haruhi_like.webp', dest: 'landmarks/toyosato-shot.webp' },
  { key: 'shotFushimi', src: 'src/assets/back.webp', dest: 'landmarks/fushimi-shot.webp' },
  { key: 'photoA', src: 'src/assets/back.webp', dest: 'photos/mock-photo-a.webp' },
  { key: 'photoB', src: 'src/assets/sos_info.webp', dest: 'photos/mock-photo-b.webp' },
  { key: 'photoC', src: 'src/assets/yuki_search.webp', dest: 'photos/mock-photo-c.webp' },
  { key: 'photoD', src: 'src/assets/yuki_upload.webp', dest: 'photos/mock-photo-d.webp' },
  { key: 'photoE', src: 'src/assets/community_button.webp', dest: 'photos/mock-photo-e.webp' },
  { key: 'photoF', src: 'src/assets/haruhi_like.webp', dest: 'photos/mock-photo-f.webp' },
  { key: 'postA', src: 'src/assets/back.webp', dest: 'posts/mock-post-a.webp' },
  { key: 'postB', src: 'src/assets/yuki_upload.webp', dest: 'posts/mock-post-b.webp' },
  { key: 'postC', src: 'src/assets/community_button.webp', dest: 'posts/mock-post-c.webp' },
  { key: 'postD', src: 'src/assets/sos_info.webp', dest: 'posts/mock-post-d.webp' }
]

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password || '')).digest('hex')
}

function parseArgs(argv) {
  const args = { dbPath: defaultDbPath }
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i]
    if (value === '--db' && argv[i + 1]) {
      args.dbPath = path.resolve(argv[i + 1])
      i += 1
    }
  }
  return args
}

function normalizeRelPath(p) {
  return String(p).replace(/\\/g, '/')
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function copyMockAsset(srcRelativePath, destRelativePath) {
  const source = path.join(rootDir, srcRelativePath)
  const destination = path.join(uploadsDir, MOCK_FILE_ROOT, destRelativePath)
  ensureDir(path.dirname(destination))
  fs.copyFileSync(source, destination)
  return normalizeRelPath(path.relative(uploadsDir, destination))
}

function timestamp(hoursAgo) {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
}

function quoteSql(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function createMockCatalog(files) {
  const resolve = (key) => files[key]

  return {
    users: MOCK_USERS.map((user, index) => ({
      ...user,
      anonId: `user:${user.id}`,
      createdAt: timestamp(120 - index * 2),
      avatarPath: resolve(
        user.id === 'mock_akari'
          ? 'avatarAkari'
          : user.id === 'mock_yuki'
            ? 'avatarYuki'
            : user.id === 'mock_kyon'
              ? 'avatarKyon'
              : 'avatarMikuru'
      )
    })),
    landmarks: [
      {
        key: 'kitashirakawa',
        name: `${MOCK_PREFIX}北白川商店街`,
        lat: 35.0304,
        lng: 135.7851,
        address: '京都府京都市左京区北白川追分町附近',
        description: '测试用地标：用于验证地图跳转、地标详情、相关帖子与筛选联动。',
        alias: '坂道入口',
        animeSource: '凉宫春日的忧郁',
        shots: [resolve('shotKitashirakawa')],
        createdAt: timestamp(96)
      },
      {
        key: 'kamogawa',
        name: `${MOCK_PREFIX}鸭川三角洲`,
        lat: 35.0308,
        lng: 135.7726,
        address: '京都府京都市左京区下鸭宫河町',
        description: '测试用地标：用于验证搜索、图片墙和帖子联动。',
        alias: '跳石',
        animeSource: '日常巡礼',
        shots: [resolve('shotKamogawa')],
        createdAt: timestamp(92)
      },
      {
        key: 'uji',
        name: `${MOCK_PREFIX}宇治桥东岸`,
        lat: 34.8895,
        lng: 135.8077,
        address: '京都府宇治市宇治东内',
        description: '测试用地标：用于验证详情页照片加载和地图 flyTo。',
        alias: '宇治川边',
        animeSource: '吹响！上低音号',
        shots: [resolve('shotUji')],
        createdAt: timestamp(88)
      },
      {
        key: 'kyoto-station',
        name: `${MOCK_PREFIX}京都站前广场`,
        lat: 34.9855,
        lng: 135.7586,
        address: '京都府京都市下京区东盐小路町',
        description: '测试用地标：用于验证地图首页搜索与帖子卡片跳转。',
        alias: '车站南口',
        animeSource: '京都车站场景',
        shots: [resolve('shotKyotoStation')],
        createdAt: timestamp(84)
      },
      {
        key: 'toyosato',
        name: `${MOCK_PREFIX}丰乡小学校旧校舍群`,
        lat: 35.2029,
        lng: 136.2307,
        address: '滋贺县犬上郡丰乡町石畑',
        description: '测试用地标：用于验证地标列表页搜索与详情。',
        alias: '旧校舍',
        animeSource: '轻音少女',
        shots: [resolve('shotToyosato')],
        createdAt: timestamp(80)
      },
      {
        key: 'fushimi',
        name: `${MOCK_PREFIX}伏见稻荷参道`,
        lat: 34.9671,
        lng: 135.7727,
        address: '京都府京都市伏见区深草薮之内町',
        description: '测试用地标：用于验证多标签筛选和多图帖子。',
        alias: '千本鸟居入口',
        animeSource: '京都观光场景',
        shots: [resolve('shotFushimi')],
        createdAt: timestamp(76)
      }
    ],
    photos: [
      { landmarkKey: 'kitashirakawa', filePath: resolve('photoA'), caption: '阴天时的街角立面，适合测试照片墙首图。', uploaderName: 'mock_akari', anonId: 'user:mock_akari', status: 'approved', createdAt: timestamp(70) },
      { landmarkKey: 'kitashirakawa', filePath: resolve('photoC'), caption: '从坡道下方向上拍，适合测试评论和点赞。', uploaderName: `${MOCK_PREFIX}游客Rin`, anonId: 'mock:anon:rin', status: 'approved', createdAt: timestamp(68) },
      { landmarkKey: 'kamogawa', filePath: resolve('photoB'), caption: '石头区域近景，便于测试缩略图比例。', uploaderName: 'mock_yuki', anonId: 'user:mock_yuki', status: 'approved', createdAt: timestamp(66) },
      { landmarkKey: 'kamogawa', filePath: resolve('photoD'), caption: '河道远景，便于测试不同构图。', uploaderName: `${MOCK_PREFIX}游客Sora`, anonId: 'mock:anon:sora', status: 'approved', createdAt: timestamp(64) },
      { landmarkKey: 'uji', filePath: resolve('photoE'), caption: '桥头取景，适合测试图片查看器。', uploaderName: 'mock_kyon', anonId: 'user:mock_kyon', status: 'approved', createdAt: timestamp(62) },
      { landmarkKey: 'uji', filePath: resolve('photoF'), caption: '河岸步道角度，适合测试点赞统计。', uploaderName: `${MOCK_PREFIX}游客Nozomi`, anonId: 'mock:anon:nozomi', status: 'approved', createdAt: timestamp(60) },
      { landmarkKey: 'kyoto-station', filePath: resolve('photoA'), caption: '站前广场广角测试图。', uploaderName: 'mock_mikuru', anonId: 'user:mock_mikuru', status: 'approved', createdAt: timestamp(58) },
      { landmarkKey: 'toyosato', filePath: resolve('photoB'), caption: '旧校舍走廊测试图。', uploaderName: 'mock_akari', anonId: 'user:mock_akari', status: 'approved', createdAt: timestamp(56) },
      { landmarkKey: 'fushimi', filePath: resolve('photoD'), caption: '参道入口测试图。', uploaderName: 'mock_yuki', anonId: 'user:mock_yuki', status: 'approved', createdAt: timestamp(54) }
    ],
    photoComments: [
      { photoIndex: 0, anonId: 'mock:anon:rin', userName: `${MOCK_PREFIX}游客Rin`, body: '这张角度很适合测试图片评论区折叠。', status: 'public', createdAt: timestamp(52) },
      { photoIndex: 0, anonId: 'user:mock_yuki', userName: 'mock_yuki', body: '我这边能稳定复现点赞状态切换。', status: 'public', createdAt: timestamp(51) },
      { photoIndex: 2, anonId: 'user:mock_kyon', userName: 'mock_kyon', body: '石头区域和标签筛选能一起联动。', status: 'public', createdAt: timestamp(50) },
      { photoIndex: 4, anonId: 'mock:anon:nozomi', userName: `${MOCK_PREFIX}游客Nozomi`, body: '这里也适合测试弹窗中的图片查看。', status: 'public', createdAt: timestamp(49) }
    ],
    posts: [
      {
        key: 'post-kitashirakawa',
        anonId: 'user:mock_akari',
        userName: 'mock_akari',
        userType: 'formal',
        landmarkKey: 'kitashirakawa',
        title: `${MOCK_PREFIX}北白川商店街雨后巡礼`,
        summary: '测试首页卡片摘要、点赞和标签点击行为。',
        content: '这是一条测试帖子，用于验证首页卡片、帖子详情、标签筛选和返回滚动位置。内容故意稍长一些，方便测试多行展示和摘要截断。',
        status: 'approved',
        images: [{ filePath: resolve('postA'), caption: '雨后街角构图' }],
        tags: [{ tag: `${MOCK_PREFIX}北白川商店街`, tagType: 'landmark' }, { tag: '巡礼', tagType: 'normal' }, { tag: '构图参考', tagType: 'normal' }],
        createdAt: timestamp(46)
      },
      {
        key: 'post-kamogawa',
        anonId: 'user:mock_yuki',
        userName: 'mock_yuki',
        userType: 'formal',
        landmarkKey: 'kamogawa',
        title: `${MOCK_PREFIX}鸭川跳石最佳机位`,
        summary: '测试地图左侧社区面板与地标筛选联动。',
        content: '测试帖子二：用于覆盖地标筛选、帖子跳转、帖子详情和相关帖子按钮。这里保留几段自然语言，方便人工验收列表密度。',
        status: 'approved',
        images: [{ filePath: resolve('postB'), caption: '跳石远景' }],
        tags: [{ tag: `${MOCK_PREFIX}鸭川三角洲`, tagType: 'landmark' }, { tag: '巡礼', tagType: 'normal' }, { tag: '步行路线', tagType: 'normal' }],
        createdAt: timestamp(42)
      },
      {
        key: 'post-uji',
        anonId: 'mock:anon:rin',
        userName: `${MOCK_PREFIX}游客Rin`,
        userType: 'anon',
        landmarkKey: 'uji',
        title: `${MOCK_PREFIX}宇治桥东岸黄昏复拍`,
        summary: '测试匿名用户帖子、详情页多按钮和地图 flyTo。',
        content: '测试帖子三：匿名用户发布，用于校验匿名用户展示、图片查看和评论输入区。',
        status: 'approved',
        images: [{ filePath: resolve('postC'), caption: '桥面与河岸' }],
        tags: [{ tag: `${MOCK_PREFIX}宇治桥东岸`, tagType: 'landmark' }, { tag: '黄昏', tagType: 'normal' }],
        createdAt: timestamp(38)
      },
      {
        key: 'post-admin',
        anonId: 'user:mock_mikuru',
        userName: 'mock_mikuru',
        userType: 'formal',
        landmarkKey: 'kyoto-station',
        title: `${MOCK_PREFIX}管理员测试公告`,
        summary: '测试管理员标签、筛选和管理员视图。',
        content: '这是一条管理员标签帖子，用于验证“只看管理员”筛选以及帖子状态管理视图。',
        status: 'approved',
        images: [{ filePath: resolve('postD'), caption: '公告配图' }],
        tags: [{ tag: `${MOCK_PREFIX}京都站前广场`, tagType: 'landmark' }, { tag: '公告', tagType: 'normal' }, { tag: '管理员', tagType: 'admin' }],
        createdAt: timestamp(34)
      },
      {
        key: 'post-reply',
        anonId: 'user:mock_kyon',
        userName: 'mock_kyon',
        userType: 'formal',
        landmarkKey: 'kamogawa',
        parentKey: 'post-kamogawa',
        title: `${MOCK_PREFIX}鸭川补充路线说明`,
        summary: '测试 parent_post_id 相关逻辑。',
        content: '这是一条挂在主贴下面的测试补充内容，用于验证父贴关系和详情页展示。',
        status: 'approved',
        images: [],
        tags: [{ tag: `${MOCK_PREFIX}鸭川三角洲`, tagType: 'landmark' }, { tag: '补充', tagType: 'normal' }],
        createdAt: timestamp(30)
      },
      {
        key: 'post-fushimi',
        anonId: 'mock:anon:sora',
        userName: `${MOCK_PREFIX}游客Sora`,
        userType: 'anon',
        landmarkKey: 'fushimi',
        title: `${MOCK_PREFIX}伏见稻荷参道晨间路线`,
        summary: '测试多标签和多图片帖子。',
        content: '测试帖子六：包含两张配图，用于验证帖子详情中的图片切换和卡片封面选择。',
        status: 'approved',
        images: [
          { filePath: resolve('postA'), caption: '参道入口' },
          { filePath: resolve('postB'), caption: '晨间光线' }
        ],
        tags: [{ tag: `${MOCK_PREFIX}伏见稻荷参道`, tagType: 'landmark' }, { tag: '晨拍', tagType: 'normal' }, { tag: '路线', tagType: 'normal' }],
        createdAt: timestamp(26)
      },
      {
        key: 'post-auto-cover-2',
        anonId: 'user:mock_kyon',
        userName: 'mock_kyon',
        userType: 'formal',
        landmarkKey: 'kyoto-station',
        title: `${MOCK_PREFIX}自动双栏封面样例`,
        summary: '测试未设置头图时由正文前两张图组成双栏封面。',
        content: '这是一条专门测试自动双栏封面的帖子。正文里的前两张图会被提取为封面，正文区不再重复展示它们。',
        status: 'approved',
        coverMode: 'auto',
        coverImageCount: 2,
        images: [
          { filePath: resolve('postB'), caption: '站前广场右侧' },
          { filePath: resolve('postC'), caption: '站前导视牌' }
        ],
        tags: [{ tag: `${MOCK_PREFIX}京都站前广场`, tagType: 'landmark' }, { tag: '自动封面', tagType: 'normal' }, { tag: '双栏', tagType: 'normal' }],
        createdAt: timestamp(24)
      },
      {
        key: 'post-auto-cover-3',
        anonId: 'user:mock_mikuru',
        userName: 'mock_mikuru',
        userType: 'formal',
        landmarkKey: 'fushimi',
        title: `${MOCK_PREFIX}自动三栏封面样例`,
        summary: '测试未设置头图时由正文前三张图组成三栏封面。',
        content: '这是一条专门测试自动三栏封面的帖子。前三张正文图会并排作为封面，第四张图片会继续保留在正文图片区里。',
        status: 'approved',
        coverMode: 'auto',
        coverImageCount: 3,
        images: [
          { filePath: resolve('postA'), caption: '参道入口近景' },
          { filePath: resolve('postB'), caption: '参道入口中景' },
          { filePath: resolve('postC'), caption: '参道入口远景' },
          { filePath: resolve('postD'), caption: '第四张仍应留在正文' }
        ],
        tags: [{ tag: `${MOCK_PREFIX}伏见稻荷参道`, tagType: 'landmark' }, { tag: '自动封面', tagType: 'normal' }, { tag: '三栏', tagType: 'normal' }],
        createdAt: timestamp(23)
      },
      {
        key: 'post-pending',
        anonId: 'user:mock_mikuru',
        userName: 'mock_mikuru',
        userType: 'formal',
        landmarkKey: 'toyosato',
        title: `${MOCK_PREFIX}待审核帖子样例`,
        summary: '测试管理员界面的待审核状态过滤。',
        content: '这是一条 pending 状态的测试帖子，正常首页不会展示，但管理员界面可用于验收审核流程。',
        status: 'pending',
        images: [{ filePath: resolve('postC'), caption: '待审核内容封面' }],
        tags: [{ tag: `${MOCK_PREFIX}丰乡小学校旧校舍群`, tagType: 'landmark' }, { tag: '待审核', tagType: 'normal' }],
        createdAt: timestamp(22)
      }
    ],
    postComments: [
      { postKey: 'post-kitashirakawa', anonId: 'user:mock_yuki', userName: 'mock_yuki', userType: 'formal', body: '这条帖子很适合测试卡片摘要长度。', status: 'approved', createdAt: timestamp(20) },
      { postKey: 'post-kitashirakawa', anonId: 'mock:anon:nozomi', userName: `${MOCK_PREFIX}游客Nozomi`, userType: 'anon', body: '评论区也能用来测滚动和排序。', status: 'approved', createdAt: timestamp(19) },
      { postKey: 'post-kamogawa', anonId: 'user:mock_akari', userName: 'mock_akari', userType: 'formal', body: '这里的标签筛选配合地图跳转很方便。', status: 'approved', createdAt: timestamp(18) },
      { postKey: 'post-pending', anonId: 'user:mock_kyon', userName: 'mock_kyon', userType: 'formal', body: '这是一条待审核评论，用于后台测试。', status: 'pending', createdAt: timestamp(17) }
    ],
    favorites: [
      { anonId: 'user:mock_akari', landmarkKey: 'kitashirakawa', createdAt: timestamp(16) },
      { anonId: 'user:mock_akari', landmarkKey: 'uji', createdAt: timestamp(15) },
      { anonId: 'user:mock_yuki', landmarkKey: 'kamogawa', createdAt: timestamp(14) }
    ],
    likes: {
      posts: [
        { anonId: 'user:mock_yuki', postKey: 'post-kitashirakawa', createdAt: timestamp(13) },
        { anonId: 'user:mock_kyon', postKey: 'post-kitashirakawa', createdAt: timestamp(12) },
        { anonId: 'user:mock_akari', postKey: 'post-kamogawa', createdAt: timestamp(11) },
        { anonId: 'mock:anon:sora', postKey: 'post-uji', createdAt: timestamp(10) },
        { anonId: 'user:mock_mikuru', postKey: 'post-admin', createdAt: timestamp(9) }
      ],
      photos: [
        { anonId: 'user:mock_yuki', photoIndex: 0, createdAt: timestamp(8) },
        { anonId: 'user:mock_kyon', photoIndex: 0, createdAt: timestamp(7) },
        { anonId: 'user:mock_akari', photoIndex: 2, createdAt: timestamp(6) },
        { anonId: 'mock:anon:nozomi', photoIndex: 4, createdAt: timestamp(5) }
      ],
      comments: [
        { anonId: 'user:mock_akari', commentIndex: 0, createdAt: timestamp(4) },
        { anonId: 'user:mock_mikuru', commentIndex: 0, createdAt: timestamp(3) },
        { anonId: 'user:mock_yuki', commentIndex: 2, createdAt: timestamp(2) }
      ]
    }
  }
}

function makeInClause(ids) {
  return ids.length ? ids.map(id => Number(id)).join(',') : ''
}

async function selectIds(db, sql, params = []) {
  const rows = await db.all(sql, params)
  return rows.map(row => Number(row.id)).filter(Number.isFinite)
}

async function cleanupMockData(db) {
  const mockUserIds = MOCK_USERS.map(user => user.id)
  const mockFormalAnonIds = mockUserIds.map(id => `user:${id}`)
  const mockAnonIds = MOCK_ANON_USERS.map(user => user.anonId)
  const allMockAnonIds = [...mockFormalAnonIds, ...mockAnonIds]

  const landmarkIds = await selectIds(db, `SELECT id FROM landmarks WHERE name LIKE ?`, [`${MOCK_PREFIX}%`])
  const postIds = await selectIds(
    db,
    `SELECT id FROM posts WHERE title LIKE ? OR anon_id IN (${allMockAnonIds.map(quoteSql).join(',')}) OR user_name IN (${mockUserIds.map(quoteSql).join(',')})`,
    [`${MOCK_PREFIX}%`]
  )

  const photoWhere = [
    `anon_id IN (${allMockAnonIds.map(quoteSql).join(',')})`,
    `uploader_name IN (${MOCK_ANON_USERS.map(user => quoteSql(user.userName)).concat(mockUserIds.map(quoteSql)).join(',')})`
  ]
  if (landmarkIds.length) photoWhere.push(`landmark_id IN (${makeInClause(landmarkIds)})`)
  const photoIds = await selectIds(db, `SELECT id FROM photos WHERE ${photoWhere.join(' OR ')}`)

  const commentWhere = [`anon_id IN (${allMockAnonIds.map(quoteSql).join(',')})`]
  if (photoIds.length) commentWhere.push(`photo_id IN (${makeInClause(photoIds)})`)
  const commentIds = await selectIds(db, `SELECT id FROM comments WHERE ${commentWhere.join(' OR ')}`)

  const postCommentWhere = [`anon_id IN (${allMockAnonIds.map(quoteSql).join(',')})`]
  if (postIds.length) postCommentWhere.push(`post_id IN (${makeInClause(postIds)})`)
  const postCommentIds = await selectIds(db, `SELECT id FROM post_comments WHERE ${postCommentWhere.join(' OR ')}`)

  const likeClauses = [
    `anon_id IN (${allMockAnonIds.map(quoteSql).join(',')})`
  ]
  if (postIds.length) likeClauses.push(`(target_type='post' AND target_id IN (${makeInClause(postIds)}))`)
  if (photoIds.length) likeClauses.push(`(target_type='photo' AND target_id IN (${makeInClause(photoIds)}))`)
  if (commentIds.length) likeClauses.push(`(target_type='comment' AND target_id IN (${makeInClause(commentIds)}))`)

  await db.exec('BEGIN')
  try {
    await db.run(`DELETE FROM likes_daily WHERE ${likeClauses.join(' OR ')}`)
    await db.run(`DELETE FROM user_likes WHERE ${likeClauses.join(' OR ')}`)

    const favoriteClauses = [`anon_id IN (${mockFormalAnonIds.map(quoteSql).join(',')})`]
    if (landmarkIds.length) favoriteClauses.push(`landmark_id IN (${makeInClause(landmarkIds)})`)
    await db.run(`DELETE FROM user_favorites WHERE ${favoriteClauses.join(' OR ')}`)

    if (postCommentIds.length) {
      await db.run(`DELETE FROM post_comments WHERE id IN (${makeInClause(postCommentIds)})`)
    }
    if (commentIds.length) {
      await db.run(`DELETE FROM comments WHERE id IN (${makeInClause(commentIds)})`)
    }
    if (postIds.length) {
      await db.run(`DELETE FROM posts WHERE id IN (${makeInClause(postIds)})`)
    }
    if (photoIds.length) {
      await db.run(`DELETE FROM photos WHERE id IN (${makeInClause(photoIds)})`)
    }
    if (landmarkIds.length) {
      await db.run(`DELETE FROM landmarks WHERE id IN (${makeInClause(landmarkIds)})`)
    }

    await db.run(`DELETE FROM users WHERE id IN (${mockUserIds.map(quoteSql).join(',')})`)
    await db.exec('COMMIT')
  } catch (error) {
    await db.exec('ROLLBACK')
    throw error
  }

  fs.rmSync(path.join(uploadsDir, MOCK_FILE_ROOT), { recursive: true, force: true })
}

async function insertUser(db, user) {
  const metadata = {
    id: user.id,
    password_hash: hashPassword(MOCK_PASSWORD),
    avatar_path: user.avatarPath
  }
  await db.run(
    `INSERT INTO users (id, metadata, created_at) VALUES (?, ?, ?)`,
    [user.id, JSON.stringify(metadata), user.createdAt]
  )
}

async function insertLandmark(db, landmark) {
  const metadata = {
    name: landmark.name,
    lat: landmark.lat,
    lng: landmark.lng,
    address: landmark.address,
    description: landmark.description,
    alias: landmark.alias,
    anime_source: landmark.animeSource,
    anime_shots: landmark.shots
  }
  const result = await db.run(
    `INSERT INTO landmarks (name, lat, lng, address, description, anime_shot, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      landmark.name,
      landmark.lat,
      landmark.lng,
      landmark.address,
      landmark.description,
      landmark.shots[0] || null,
      JSON.stringify(metadata),
      landmark.createdAt,
      landmark.createdAt
    ]
  )
  return result.lastID
}

async function insertPhoto(db, photo, landmarkId) {
  const result = await db.run(
    `INSERT INTO photos (landmark_id, file_path, thumb_path, caption, uploader_name, anon_id, like_count, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [landmarkId, photo.filePath, photo.filePath, photo.caption, photo.uploaderName, photo.anonId, photo.status, photo.createdAt]
  )
  return result.lastID
}

async function insertPhotoComment(db, comment, photoId) {
  const result = await db.run(
    `INSERT INTO comments (photo_id, anon_id, user_name, body, like_count, status, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [photoId, comment.anonId, comment.userName, comment.body, comment.status, comment.createdAt]
  )
  return result.lastID
}

async function insertPost(db, post, landmarkId, parentPostId) {
  const imageCount = Array.isArray(post.images) ? post.images.length : 0
  const coverMode = post.coverMode === 'auto' && imageCount ? 'auto' : 'manual'
  const coverImageCount = imageCount
    ? (coverMode === 'auto'
        ? Math.max(1, Math.min(3, Number(post.coverImageCount) || imageCount))
        : 1)
    : 0
  const result = await db.run(
    `INSERT INTO posts (anon_id, user_name, user_type, landmark_id, parent_post_id, content, summary, title, status, cover_mode, cover_image_count, like_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      post.anonId,
      post.userName,
      post.userType,
      landmarkId ?? null,
      parentPostId ?? null,
      post.content,
      post.summary,
      post.title,
      post.status,
      coverMode,
      coverImageCount,
      post.createdAt
    ]
  )
  return result.lastID
}

async function insertPostImages(db, postId, images, createdAt) {
  for (const image of images) {
    await db.run(
      `INSERT INTO post_images (post_id, file_path, caption, created_at) VALUES (?, ?, ?, ?)`,
      [postId, image.filePath, image.caption || null, createdAt]
    )
  }
}

async function insertPostTags(db, postId, tags, createdAt) {
  for (const tag of tags) {
    await db.run(
      `INSERT INTO post_tags (post_id, tag, tag_type, created_at) VALUES (?, ?, ?, ?)`,
      [postId, tag.tag, tag.tagType || 'normal', createdAt]
    )
  }
}

async function insertPostComment(db, comment, postId) {
  await db.run(
    `INSERT INTO post_comments (post_id, anon_id, user_name, user_type, body, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [postId, comment.anonId, comment.userName, comment.userType, comment.body, comment.status, comment.createdAt]
  )
}

async function addLike(db, { table, targetType, targetId, anonId, createdAt }) {
  await db.run(
    `INSERT INTO user_likes (anon_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)`,
    [anonId, targetType, targetId, createdAt]
  )
  await db.run(`UPDATE ${table} SET like_count = like_count + 1 WHERE id = ?`, [targetId])
}

async function addFavorite(db, favorite, landmarkId) {
  await db.run(
    `INSERT INTO user_favorites (anon_id, landmark_id, created_at) VALUES (?, ?, ?)`,
    [favorite.anonId, landmarkId, favorite.createdAt]
  )
}

async function seedMockData(db, catalog) {
  const landmarkIds = new Map()
  const photoIds = []
  const commentIds = []
  const postIds = new Map()

  for (const user of catalog.users) {
    await insertUser(db, user)
  }

  for (const landmark of catalog.landmarks) {
    const id = await insertLandmark(db, landmark)
    landmarkIds.set(landmark.key, id)
  }

  for (const photo of catalog.photos) {
    const id = await insertPhoto(db, photo, landmarkIds.get(photo.landmarkKey))
    photoIds.push(id)
  }

  for (const photoComment of catalog.photoComments) {
    const id = await insertPhotoComment(db, photoComment, photoIds[photoComment.photoIndex])
    commentIds.push(id)
  }

  for (const post of catalog.posts) {
    const landmarkId = post.landmarkKey ? landmarkIds.get(post.landmarkKey) : null
    const parentPostId = post.parentKey ? postIds.get(post.parentKey) : null
    const id = await insertPost(db, post, landmarkId, parentPostId)
    postIds.set(post.key, id)
    await insertPostImages(db, id, post.images, post.createdAt)
    await insertPostTags(db, id, post.tags, post.createdAt)
  }

  for (const postComment of catalog.postComments) {
    await insertPostComment(db, postComment, postIds.get(postComment.postKey))
  }

  for (const favorite of catalog.favorites) {
    await addFavorite(db, favorite, landmarkIds.get(favorite.landmarkKey))
  }

  for (const like of catalog.likes.posts) {
    await addLike(db, {
      table: 'posts',
      targetType: 'post',
      targetId: postIds.get(like.postKey),
      anonId: like.anonId,
      createdAt: like.createdAt
    })
  }
  for (const like of catalog.likes.photos) {
    await addLike(db, {
      table: 'photos',
      targetType: 'photo',
      targetId: photoIds[like.photoIndex],
      anonId: like.anonId,
      createdAt: like.createdAt
    })
  }
  for (const like of catalog.likes.comments) {
    await addLike(db, {
      table: 'comments',
      targetType: 'comment',
      targetId: commentIds[like.commentIndex],
      anonId: like.anonId,
      createdAt: like.createdAt
    })
  }

  return {
    users: catalog.users.length,
    landmarks: catalog.landmarks.length,
    photos: catalog.photos.length,
    photoComments: catalog.photoComments.length,
    posts: catalog.posts.length,
    postComments: catalog.postComments.length,
    favorites: catalog.favorites.length,
    likes: catalog.likes.posts.length + catalog.likes.photos.length + catalog.likes.comments.length
  }
}

async function main() {
  const { dbPath } = parseArgs(process.argv.slice(2))
  ensureDir(path.dirname(dbPath))
  ensureDir(uploadsDir)
  await initDb(dbPath)
  const db = getDb()

  try {
    await cleanupMockData(db)

    const copiedFiles = {}
    for (const asset of ASSET_SPECS) {
      copiedFiles[asset.key] = copyMockAsset(asset.src, asset.dest)
    }

    const catalog = createMockCatalog(copiedFiles)

    await db.exec('BEGIN')
    let stats = null
    try {
      stats = await seedMockData(db, catalog)
      await db.exec('COMMIT')
    } catch (error) {
      await db.exec('ROLLBACK')
      throw error
    }

    console.log(`[mock-seed] database: ${dbPath}`)
    console.log(`[mock-seed] users=${stats.users} landmarks=${stats.landmarks} photos=${stats.photos} photoComments=${stats.photoComments} posts=${stats.posts} postComments=${stats.postComments} favorites=${stats.favorites} likes=${stats.likes}`)
    console.log(`[mock-seed] login password for all formal test users: ${MOCK_PASSWORD}`)
    for (const user of catalog.users) {
      console.log(`[mock-seed] user=${user.id}`)
    }
  } finally {
    await db.close()
  }
}

main().catch(error => {
  console.error('[mock-seed] failed:', error?.stack || error)
  process.exit(1)
})
