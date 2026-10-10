/** A sparse, slowly twinkling field of stars, far behind everything else (spec 7.8). */
import * as THREE from 'three'
import { PALETTE } from './palette'

const COUNT = 1500
const RADIUS = 50

export const createStars = (pixelRatio: number) => {
  const positions = new Float32Array(COUNT * 3)
  const sizes = new Float32Array(COUNT)
  const phases = new Float32Array(COUNT)
  for (let i = 0; i < COUNT; i++) {
    const u = Math.random() * 2 - 1
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(1 - u * u)
    positions.set([RADIUS * r * Math.cos(a), RADIUS * u, RADIUS * r * Math.sin(a)], i * 3)
    sizes[i] = 0.5 + Math.random()
    phases[i] = Math.random() * Math.PI * 2
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uColor: { value: new THREE.Color(PALETTE.star) }
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vTwinkle;
      void main() {
        vTwinkle = 0.6 + 0.4 * sin(uTime * (0.5 + fract(aPhase) * 0.9) + aPhase);
        gl_PointSize = aSize * uPixelRatio * 1.6;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vTwinkle);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })

  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return {
    object: points,
    update: (time: number) => {
      material.uniforms.uTime!.value = time
    },
    dispose: () => {
      geometry.dispose()
      material.dispose()
    }
  }
}
