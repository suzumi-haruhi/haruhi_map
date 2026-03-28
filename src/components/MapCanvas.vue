<template>
  <div class="map-shell">
    <div ref="mapEl" class="leaflet-map"></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import pinUrl from '../assets/pin.webp'

// 显示范围限制：北纬 20~46，东经 122~154
const bounds = {
  latMin: 20,
  latMax: 46,
  lngMin: 122,
  lngMax: 154
}

// 自定义图标（使用 assets/pin.webp）；保留阴影可选
const shadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href

// base sizes (visual target size on screen)
const BASE_PIN_SIZE = [56, 56]
const BASE_ACTIVE_SIZE = [68, 68]
const BASE_PIN_ANCHOR = [28, 52]
const BASE_ACTIVE_ANCHOR = [34, 64]
const BASE_POPUP_ANCHOR = [0, -44]

let pinIcon = null
let pinIconActive = null
let baseZoom = null

function createIconsForScale(invScale = 1) {
  // invScale = 1 / mapScale -> multiply base sizes by invScale so that
  // after Leaflet's layer transforms the visual size remains ~BASE_*.
  const clamp = (v) => Math.max(8, Math.round(v))
  const iconSize = [ clamp(BASE_PIN_SIZE[0] * invScale), clamp(BASE_PIN_SIZE[1] * invScale) ]
  const iconAnchor = [ clamp(BASE_PIN_ANCHOR[0] * invScale), clamp(BASE_PIN_ANCHOR[1] * invScale) ]
  const activeSize = [ clamp(BASE_ACTIVE_SIZE[0] * invScale), clamp(BASE_ACTIVE_SIZE[1] * invScale) ]
  const activeAnchor = [ clamp(BASE_ACTIVE_ANCHOR[0] * invScale), clamp(BASE_ACTIVE_ANCHOR[1] * invScale) ]

  pinIcon = L.icon({
    iconUrl: pinUrl,
    iconSize,
    iconAnchor,
    popupAnchor: BASE_POPUP_ANCHOR.map(v => Math.round(v * invScale)),
    shadowUrl,
    shadowSize: [ clamp(68 * invScale), clamp(50 * invScale) ],
    shadowAnchor: [ clamp(34 * invScale), clamp(45 * invScale) ]
  })

  pinIconActive = L.icon({
    iconUrl: pinUrl,
    iconSize: activeSize,
    iconAnchor: activeAnchor,
    popupAnchor: [ Math.round(0 * invScale), Math.round(-52 * invScale) ],
    shadowUrl,
    shadowSize: [ clamp(82 * invScale), clamp(60 * invScale) ],
    shadowAnchor: [ clamp(41 * invScale), clamp(52 * invScale) ]
  })
}

const props = defineProps({
  markers: { type: Array, default: () => [] },
  selectedId: { type: [Number, String], default: null },
  focusId: { type: [Number, String], default: null },
  focusTick: { type: Number, default: 0 },
  resizeTick: { type: Number, default: 0 }
})
const emit = defineEmits(['select'])

const mapEl = ref(null)
let map = null
let markersLayer = null
let markerMap = new Map()
let activeMarkerId = null
let mapReady = false

function createMap() {
  map = L.map(mapEl.value, {
    zoomControl: true,
    worldCopyJump: true,
    attributionControl: false,
    maxBounds: [[bounds.latMin, bounds.lngMin], [bounds.latMax, bounds.lngMax]],
    maxBoundsViscosity: 0.8
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18
  }).addTo(map)
  markersLayer = L.layerGroup().addTo(map)
  // record base zoom and initialize icons so they appear stable across zooms
  baseZoom = map.getZoom()
  // initial invScale is 1 (no compensation)
  createIconsForScale(1)
  // when map zooms, update icon sizes to counter the transform scaling
  map.on('zoom', () => {
    try {
      const s = map.getZoomScale(map.getZoom(), baseZoom)
      const inv = s ? 1 / s : 1
      createIconsForScale(inv)
      // update existing markers to the new icons
      for (const [id, marker] of markerMap) {
        if (id === activeMarkerId) marker.setIcon(pinIconActive)
        else marker.setIcon(pinIcon)
      }
    } catch (e) {
      console.warn('[MapCanvas] update icon size on zoom failed', e)
    }
  })
  // Ensure map size is valid after creation (prevent NaN during initial frame)
  requestAnimationFrame(() => safeInvalidateSize())
  map.whenReady(() => {
    mapReady = true
    safeInvalidateSize()
    // Replace default Leaflet zoom control anchors with non-navigating buttons
    try {
      setTimeout(() => {
        const container = map.getContainer()
        if (!container) return
        const zoomEl = container.querySelector('.leaflet-control-zoom')
        if (!zoomEl) return
        // build a replacement control element
        const wrapper = document.createElement('div')
        wrapper.className = zoomEl.className
        // create zoom in button
        const btnIn = document.createElement('button')
        btnIn.type = 'button'
        btnIn.className = 'leaflet-control-zoom-in'
        btnIn.setAttribute('aria-label', '放大')
        btnIn.innerHTML = zoomEl.querySelector('.leaflet-control-zoom-in')?.innerHTML || '+'
        btnIn.addEventListener('click', (ev) => { try { ev.stopPropagation(); ev.preventDefault(); map.zoomIn(); btnIn.blur(); } catch (e) {} })
        // create zoom out button
        const btnOut = document.createElement('button')
        btnOut.type = 'button'
        btnOut.className = 'leaflet-control-zoom-out'
        btnOut.setAttribute('aria-label', '缩小')
        btnOut.innerHTML = zoomEl.querySelector('.leaflet-control-zoom-out')?.innerHTML || '-'
        btnOut.addEventListener('click', (ev) => { try { ev.stopPropagation(); ev.preventDefault(); map.zoomOut(); btnOut.blur(); } catch (e) {} })
        wrapper.appendChild(btnIn)
        wrapper.appendChild(btnOut)
        zoomEl.parentNode.replaceChild(wrapper, zoomEl)
      }, 0)
    } catch (e) { console.warn('[MapCanvas] replace zoom control failed', e) }
  })
}

function safeInvalidateSize() {
  try {
    if (!map || !mapEl.value) return
    const w = mapEl.value.clientWidth
    const h = mapEl.value.clientHeight
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return
    map.invalidateSize()
  } catch (e) {
    console.warn('[MapCanvas] safeInvalidateSize failed', e)
  }
}

function refreshMarkers() {
  if (!map || !markersLayer) return
  markersLayer.clearLayers()
  markerMap.clear()
  activeMarkerId = null
  const latlngs = []

  props.markers.forEach(m => {
    const lat = Number(m.lat)
    const lng = Number(m.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const marker = L.marker([lat, lng], { icon: pinIcon })
    marker.on('click', () => {
      setActiveMarker(m.id)
      emit('select', m.id)
    })
    marker.addTo(markersLayer)
    markerMap.set(m.id, marker)
    latlngs.push([lat, lng])
  })

  if (latlngs.length) {
    try {
      map.fitBounds(latlngs, { padding: [24, 24] })
    } catch (e) {
      console.warn('[MapCanvas] fitBounds failed', e)
    }
  } else {
    map.setView([35.0, 139.0], 5) // 默认落在范围内
  }
}

function focusSelected() {
  if (!map) return
  const hit = props.markers.find(m => m.id === props.selectedId)
  if (!hit) return
  const lat = Number(hit.lat)
  const lng = Number(hit.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    // guard: only call flyTo with valid numeric coordinates
    try {
      // only fly when map is ready and has a valid size; otherwise retry a few times
      const attemptFly = (tries = 0) => {
        const size = map.getSize && map.getSize()
        const hasSize = size && Number.isFinite(size.x) && Number.isFinite(size.y) && size.x > 0 && size.y > 0
        if (mapReady && hasSize) {
          try { map.flyTo([lat, lng], 15, { duration: 0.6 }) } catch (e) { console.warn('[MapCanvas] flyTo failed', e) }
        } else if (tries < 6) {
          // retry after a short delay (total ~6 * 100ms = 600ms)
          setTimeout(() => attemptFly(tries + 1), 100)
        } else {
          console.warn('[MapCanvas] aborting flyTo: map not ready or has no size')
        }
      }
      attemptFly()
    } catch (e) {
      // swallow errors to avoid breaking navigation flow
      console.warn('[MapCanvas] flyTo failed', e)
    }
  }
}

function focusById(id) {
  if (!map || !id) return
  const hit = props.markers.find(m => m.id === id)
  if (!hit) return
  const lat = Number(hit.lat)
  const lng = Number(hit.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    try {
      const attemptFly = (tries = 0) => {
        const size = map.getSize && map.getSize()
        const hasSize = size && Number.isFinite(size.x) && Number.isFinite(size.y) && size.x > 0 && size.y > 0
        if (mapReady && hasSize) {
          try { map.flyTo([lat, lng], 15, { duration: 0.6 }) } catch (e) { console.warn('[MapCanvas] flyTo failed', e) }
        } else if (tries < 6) {
          setTimeout(() => attemptFly(tries + 1), 100)
        } else {
          console.warn('[MapCanvas] aborting flyTo: map not ready or has no size')
        }
      }
      attemptFly()
    } catch (e) { console.warn('[MapCanvas] flyTo failed', e) }
  }
}

function setActiveMarker(id) {
  if (!markerMap.size) return
  if (activeMarkerId && markerMap.has(activeMarkerId)) {
    markerMap.get(activeMarkerId).setIcon(pinIcon)
  }
  if (id && markerMap.has(id)) {
    markerMap.get(id).setIcon(pinIconActive)
    activeMarkerId = id
  } else {
    activeMarkerId = null
  }
}

onMounted(() => {
  createMap()
  refreshMarkers()
  focusSelected()
})

watch(() => props.markers, () => refreshMarkers(), { deep: true })
// when markers or selectedId change concurrently, defer focusing slightly to avoid NaN during reflow
watch(() => props.selectedId, () => {
  // use next tick to allow markers layer to be refreshed first
  setTimeout(() => focusSelected(), 50)
})
watch(() => props.focusTick, () => focusById(props.focusId))
watch(() => props.resizeTick, () => {
  if (!map) return
  requestAnimationFrame(() => {
    safeInvalidateSize()
  })
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.map-shell { position: relative; width: 100%; height: 100%; overflow: hidden; }
.leaflet-map { width: 100%; height: 100%; }
</style>
