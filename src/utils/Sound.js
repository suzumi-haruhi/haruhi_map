import { playUiClick } from './uiSound.js'

// 兼容旧接口：playClick / playTap / playSelect 全部映射到统一的 UI 点击音
export function playClick() { playUiClick() }
export function playTap() { playUiClick() }
export function playSelect() { playUiClick() }
