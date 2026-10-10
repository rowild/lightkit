/**
 * `v-tooltip="'Save the visible map'"` - a floating label that says what a
 * button does.
 *
 * Why not the native `title` attribute, which this replaces everywhere it is
 * used: the browser draws it in the operating system's font after a delay it
 * owns, it cannot be styled, and **it never appears on a touch screen at all**.
 * This app is used on a phone in a field, so the one place a native tooltip is
 * useless is the place the explanation is needed most.
 *
 * One shared element for the whole app, created on first use and moved around.
 * A node per button would be twenty nodes doing nothing most of the time, and
 * each would have to escape whatever `overflow: hidden` its parent has - the
 * map crops its own chrome, which is exactly where these labels live.
 *
 * Positioning is `fixed` against the viewport: above the button when there is
 * room, flipped below when there is not, and clamped so it can never hang off
 * a screen edge.
 */

const SHOW_DELAY_MS = 200
const LONG_PRESS_MS = 450
const TOUCH_LINGER_MS = 2000
const EDGE_GAP_PX = 8

type Cleanup = () => void

const cleanups = new WeakMap<HTMLElement, Cleanup>()

let tip: HTMLElement | null = null
let owner: HTMLElement | null = null

const getTip = () => {
  if (tip) return tip
  tip = document.createElement('div')
  tip.className = 'lk-tooltip'
  tip.setAttribute('role', 'tooltip')
  // Never a drop target for the pointer: a tooltip that can be hovered can
  // steal the leave event from the button it describes and stick forever.
  tip.setAttribute('aria-hidden', 'true')
  document.body.appendChild(tip)
  return tip
}

const place = (target: HTMLElement) => {
  const el = getTip()
  const anchor = target.getBoundingClientRect()
  const box = el.getBoundingClientRect()

  const above = anchor.top - box.height - EDGE_GAP_PX
  const below = anchor.bottom + EDGE_GAP_PX
  const top = above >= EDGE_GAP_PX ? above : below

  const centred = anchor.left + anchor.width / 2 - box.width / 2
  const maxLeft = window.innerWidth - box.width - EDGE_GAP_PX
  const left = Math.min(Math.max(centred, EDGE_GAP_PX), Math.max(EDGE_GAP_PX, maxLeft))

  el.style.top = `${Math.round(top)}px`
  el.style.left = `${Math.round(left)}px`
}

const hide = () => {
  owner = null
  if (tip) tip.classList.remove('is-visible')
  window.removeEventListener('scroll', hide, true)
  window.removeEventListener('resize', hide)
}

const show = (target: HTMLElement, text: string) => {
  if (!text) return
  const el = getTip()
  owner = target
  el.textContent = text
  // Measured before it is shown, so the first frame is already in the right
  // place rather than sliding into it.
  el.classList.remove('is-visible')
  place(target)
  el.classList.add('is-visible')
  // A tooltip pinned to a viewport position is wrong the moment anything
  // moves under it, and the map scrolls its own container.
  window.addEventListener('scroll', hide, true)
  window.addEventListener('resize', hide)
}

const attach = (el: HTMLElement, text: () => string) => {
  let showTimer: ReturnType<typeof setTimeout> | null = null
  let pressTimer: ReturnType<typeof setTimeout> | null = null
  let lingerTimer: ReturnType<typeof setTimeout> | null = null
  let longPressed = false

  const clearTimers = () => {
    if (showTimer) { clearTimeout(showTimer); showTimer = null }
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null }
    if (lingerTimer) { clearTimeout(lingerTimer); lingerTimer = null }
  }

  const hideMine = () => {
    clearTimers()
    if (owner === el) hide()
  }

  const onEnter = () => {
    clearTimers()
    showTimer = setTimeout(() => show(el, text()), SHOW_DELAY_MS)
  }

  // Keyboard focus shows it at once. Someone tabbing has already decided they
  // want to know, and there is no pointer to "rest" for a delay. Programmatic
  // focus after a click (a dialog focusing its close button) must not pop it.
  const onFocus = () => {
    if (!el.matches(':focus-visible')) return
    clearTimers()
    show(el, text())
  }

  const onTouchStart = () => {
    clearTimers()
    longPressed = false
    pressTimer = setTimeout(() => {
      longPressed = true
      show(el, text())
      lingerTimer = setTimeout(hideMine, TOUCH_LINGER_MS)
    }, LONG_PRESS_MS)
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null }
    if (!longPressed) return
    // The press was a question, not a command: swallow the click the browser
    // would synthesise so asking what a button does never also presses it.
    e.preventDefault()
    longPressed = false
  }

  // A finger that moves is panning the map, not asking a question.
  const onTouchMove = () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null }
  }

  el.addEventListener('mouseenter', onEnter)
  el.addEventListener('mouseleave', hideMine)
  el.addEventListener('focus', onFocus)
  el.addEventListener('blur', hideMine)
  el.addEventListener('click', hideMine)
  el.addEventListener('touchstart', onTouchStart, { passive: true })
  el.addEventListener('touchend', onTouchEnd)
  el.addEventListener('touchmove', onTouchMove, { passive: true })
  el.addEventListener('touchcancel', hideMine)

  return () => {
    hideMine()
    el.removeEventListener('mouseenter', onEnter)
    el.removeEventListener('mouseleave', hideMine)
    el.removeEventListener('focus', onFocus)
    el.removeEventListener('blur', hideMine)
    el.removeEventListener('click', hideMine)
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchend', onTouchEnd)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchcancel', hideMine)
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  // Registered on the server too, even though every hook below is client-only:
  // a directive missing during SSR makes Vue warn on every render that used it.
  nuxtApp.vueApp.directive('tooltip', {
    mounted(el: HTMLElement, binding) {
      let current = String(binding.value ?? '')
      cleanups.set(el, attach(el, () => current))
      // Keep the label in step when the binding is reactive, without tearing
      // the listeners down and building them again on every keystroke.
      ;(el as any).__lkTooltipSet = (value: string) => { current = value }
    },
    updated(el: HTMLElement, binding) {
      const set = (el as any).__lkTooltipSet as ((v: string) => void) | undefined
      const value = String(binding.value ?? '')
      set?.(value)
      if (owner === el) show(el, value)
    },
    beforeUnmount(el: HTMLElement) {
      cleanups.get(el)?.()
      cleanups.delete(el)
      delete (el as any).__lkTooltipSet
    }
  })
})
