<template>
  <div class="app-shell" ref="appShell">
    <header class="top-header" ref="topHeader" :class="{ 'admin-header': isAdminRoute }">
      <nav class="top-nav">
        <RouterLink to="/" class="nav-link">地图</RouterLink>
        <RouterLink to="/landmarks" class="nav-link">圣地列表</RouterLink>
        <RouterLink to="/user" class="nav-link">我的信息</RouterLink>
        <RouterLink to="/admin" class="nav-link">管理员界面</RouterLink>
        <button class="nav-link ghost" type="button" @click="goMainSite">返回主站</button>
      </nav>
    </header>
    <main class="main-body">
      <RouterView v-if="user || isAdminRoute" v-slot="{ Component }">
        <div class="route-view">
          <Transition name="route-slide" mode="out-in">
            <component :is="Component" />
          </Transition>
        </div>
      </RouterView>
    </main>

    <div v-if="ready && !user && !isAdminRoute" class="login-overlay">
      <section class="card login-card" @click.stop>
        <div class="section-title">登录</div>
        <div class="muted">正式用户请联系管理员获取 ID。</div>
        <div class="grid" style="grid-template-columns: 1fr; margin-top:12px; gap:10px;">
          <input class="input" placeholder="ID" v-model="formalId" />
          <input class="input" type="password" placeholder="密码" v-model="formalPwd" />
          <button class="btn primary" :disabled="!canLogin" @click="handleLogin">登录</button>
          <input class="input" placeholder="匿名昵称" v-model="anonNickname" />
          <button class="btn ghost" :disabled="!canAnonLogin" @click="handleAnonymous">匿名登录</button>
        </div>
        <div v-if="error" class="muted" style="color:#ff9b9b; margin-top:6px;">{{ error }}</div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserStore } from './stores/userStore.js'

const userStore = useUserStore()
const { user, ready, error } = storeToRefs(userStore)
const route = useRoute()

const formalId = ref('')
const formalPwd = ref('')
const anonNickname = ref('')
const appShell = ref(null)
const topHeader = ref(null)
let modalObserver = null
let headerWheelHandler = null
const goMainSite = () => {
  window.location.href = 'https://haruyuki.cn'
}

const canLogin = computed(() => String(formalId.value || '').trim() && String(formalPwd.value || '').trim())
const canAnonLogin = computed(() => String(anonNickname.value || '').trim())
const isAdminRoute = computed(() => route.name === 'admin')

async function handleLogin() {
  if (!canLogin.value) return
  try {
    await userStore.login(formalId.value.trim(), formalPwd.value)
  } catch (err) {
    alert(err?.message || '登录失败')
  }
}

async function handleAnonymous() {
  const nickname = String(anonNickname.value || '').trim()
  if (!nickname) return
  try {
    await userStore.anonymousLogin(nickname.trim())
  } catch (err) {
    alert(err?.message || '匿名登录失败')
  }
}

function handleSessionInvalidated() {
  userStore.init()
}

onMounted(() => {
  window.addEventListener('haruhi:session-invalidated', handleSessionInvalidated)
  userStore.init()
  if (appShell.value) {
    const updateModalState = () => {
      const hasModal = !!appShell.value.querySelector('.modal-overlay, .post-modal-wrap, .login-overlay')
      document.body.classList.toggle('modal-open', hasModal)
    }
    modalObserver = new MutationObserver(updateModalState)
    modalObserver.observe(appShell.value, { childList: true, subtree: true, attributes: true })
    updateModalState()
  }

  // Prevent focus-from-click for specific controls that cause browser auto-scroll (narrow scope)
  const focusHandler = (e) => {
    try {
      const el = e.target
      if (!el || !el.closest) return
      // Only blur if the focused element is a Leaflet control element or an anchor that would navigate to '#'
      const isLeafletControl = !!el.closest('.leaflet-control')
      const isHashAnchor = (el.tagName === 'A' && (el.getAttribute('href') === '#' || el.getAttribute('href') === ''))
      if (isLeafletControl || isHashAnchor) {
        // blur asynchronously so click still fires
        setTimeout(() => { try { el.blur() } catch (err) {} }, 0)
      }
    } catch (err) {}
  }
  document.addEventListener('focusin', focusHandler, true)

  // Prevent header from responding to wheel/scroll: stop wheel events on header
  if (topHeader.value) {
    headerWheelHandler = (e) => { e.stopPropagation(); e.preventDefault(); }
    topHeader.value.addEventListener('wheel', headerWheelHandler, { passive: false })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('haruhi:session-invalidated', handleSessionInvalidated)
  if (modalObserver) modalObserver.disconnect()
  document.body.classList.remove('modal-open')
  try {
    if (topHeader.value && headerWheelHandler) topHeader.value.removeEventListener('wheel', headerWheelHandler)
  } catch {}
  try { document.removeEventListener('focusin', focusHandler, true) } catch {}
})
</script>

<style scoped>
.top-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 36px;
  display: flex;
  align-items: center;
  background: var(--card);
  z-index: 3000;
  padding: 0 6px;
}
.top-nav {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0;
}
.top-nav > .nav-link {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0;
  box-sizing: border-box;
}
.main-body {
  padding-top: 36px; /* make space for fixed header */
  height: calc(100vh - 36px);
  overflow: auto;
}
</style>
