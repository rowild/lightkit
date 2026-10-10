import type * as THREE from 'three'
import type gsap from 'gsap'
import type { BowMode, SkyModel, SkySample } from '../skyGeometry'

/** A planet look. Both live inside the globe group and turn with it. */
export interface Planet {
  object: THREE.Object3D
  /** World-space unit vector towards the sun. */
  setSunDirection(direction: THREE.Vector3): void
  setOpacity(alpha: number): void
  update(time: number): void
  dispose(): void
}

/**
 * Something drawn in the place's own frame: the bow, the beads and the sun,
 * the labels. The scene drives every layer through the same calls, so adding
 * one is one entry in scene.ts's `layers`.
 */
export interface SkyLayer {
  object: THREE.Object3D
  /** Glide to a new day over `duration` seconds; 0 snaps. */
  setModel(model: SkyModel, duration: number): void
  setMode(mode: BowMode, duration: number): void
  setSun(sun: SkySample): void
  /** Whole-layer fade, for reduced-motion cross-fades. */
  setOpacity(alpha: number): void
  setResolution(width: number, height: number, pixelRatio: number): void
  /** Hide this layer's parts and add their entrances to the opening timeline. */
  intro(timeline: gsap.core.Timeline): void
  update(time: number): void
  dispose(): void
}
