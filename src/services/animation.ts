import gsap from 'gsap'
import confetti from 'canvas-confetti'

export const animationService = {
  /**
   * 触发低开销、局部精准的打勾微撒花反馈
   * @param origin 触发源屏幕物理坐标 (e.clientX, e.clientY)
   */
  triggerCheckConfetti(origin?: { x: number; y: number }) {
    if (typeof window === 'undefined') return

    // 默认或指定坐标归一化
    const x = origin ? origin.x / window.innerWidth : 0.5
    const y = origin ? origin.y / window.innerHeight : 0.5

    // 精准克制轻量微粒子 (减少 60% 粒子开销，缩短生命周期，彻底杜绝帧率卡顿)
    confetti({
      particleCount: 22,
      spread: 52,
      startVelocity: 18,
      ticks: 75,
      decay: 0.92,
      gravity: 0.95,
      scalar: 0.65,
      origin: { x, y },
      colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8'],
      disableForReducedMotion: true,
    })
  },

  /**
   * 勾选圆形复选框弹性微弹跳动效 (GSAP)
   */
  bounceCheckButton(el: HTMLElement) {
    if (!el) return
    gsap.killTweensOf(el)
    return gsap.timeline()
      .to(el, { scale: 0.78, duration: 0.08, ease: 'power1.in' })
      .to(el, { scale: 1.2, duration: 0.18, ease: 'back.out(3.5)' })
      .to(el, { scale: 1, duration: 0.12, ease: 'power2.out' })
  },

  /**
   * 勾选图标弹出动效 (GSAP)
   */
  popCheckIcon(el: HTMLElement) {
    if (!el) return
    gsap.killTweensOf(el)
    return gsap.fromTo(
      el,
      { scale: 0, rotation: -25, autoAlpha: 0 },
      { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.22, ease: 'back.out(2.5)' }
    )
  },

  /**
   * 待办卡片完成时的平滑滑动淡出离开 (GSAP)
   */
  fadeTaskCard(el: HTMLElement, onComplete?: () => void) {
    if (!el) {
      onComplete?.()
      return
    }
    gsap.killTweensOf(el)
    return gsap.to(el, {
      x: 10,
      autoAlpha: 0,
      duration: 0.22,
      ease: 'power2.inOut',
      onComplete,
    })
  },
}
