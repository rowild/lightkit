/** Small canvas-drawn sprite textures: a soft glow, the sun's rays, a ring. */
import * as THREE from 'three'

const draw = (size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void) => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  paint(canvas.getContext('2d')!, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** White at the centre, falling off softly to nothing at the edge. */
export const glowTexture = () =>
  draw(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.16, 'rgba(255,255,255,0.8)')
    g.addColorStop(0.42, 'rgba(255,255,255,0.2)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })

/** Sixteen thin spokes, alternately long and short. */
export const raysTexture = () =>
  draw(256, (ctx, s) => {
    ctx.translate(s / 2, s / 2)
    for (let i = 0; i < 16; i++) {
      ctx.rotate((Math.PI * 2) / 16)
      const length = s * (i % 2 ? 0.3 : 0.48)
      const g = ctx.createLinearGradient(0, 0, length, 0)
      g.addColorStop(0, 'rgba(255,255,255,0.9)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(0, -1.5)
      ctx.lineTo(length, 0)
      ctx.lineTo(0, 1.5)
      ctx.closePath()
      ctx.fill()
    }
  })

/** A thin circle: where the sun is while it is below the horizon. */
export const ringTexture = () =>
  draw(128, (ctx, s) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth = s * 0.05
    ctx.beginPath()
    ctx.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2)
    ctx.stroke()
  })
