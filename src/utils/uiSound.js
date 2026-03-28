let _ctx = null
let _lastAt = 0
let _audio = null
let _audioBroken = false
const DEFAULT_URL = '/sfx/click.mp3'

function nowMs() { return Date.now() }

function ensureAudio() {
  if (_audio || _audioBroken) return
  try {
    _audio = new Audio(DEFAULT_URL)
    _audio.preload = 'auto'
    _audio.volume = 0.35
  } catch {
    _audioBroken = true
    _audio = null
  }
}

function ensureCtx() {
  if (_ctx) return _ctx
  try {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
  } catch {
    _ctx = null
  }
  return _ctx
}

function beepFallback() {
  const ctx = ensureCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  const t0 = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'triangle'
  osc.frequency.setValueAtTime(520, t0)
  osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.04)

  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(t0)
  osc.stop(t0 + 0.07)
}

async function tryPlayAudio() {
  ensureAudio()
  if (!_audio || _audioBroken) return false
  try {
    _audio.currentTime = 0
    await _audio.play()
    return true
  } catch {
    _audioBroken = true
    return false
  }
}

export function playUiClick() {
  const t = nowMs()
  if (t - _lastAt < 35) return
  _lastAt = t
  tryPlayAudio().then((ok) => {
    if (!ok) beepFallback()
  })
}

export function playClick() {
  playUiClick()
}

export function setUiClickSoundUrl(url) {
  try {
    const u = String(url || '').trim()
    if (!u) {
      _audio = null
      _audioBroken = true
      return
    }
    _audioBroken = false
    _audio = new Audio(u)
    _audio.preload = 'auto'
    _audio.volume = 0.35
  } catch {
    _audioBroken = true
    _audio = null
  }
}
