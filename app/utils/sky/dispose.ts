import type * as THREE from 'three'

/**
 * Free every geometry and material under `root`. Sprites keep their geometry:
 * Three.js shares one quad between all of them.
 */
export const disposeTree = (root: THREE.Object3D) => {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (mesh.geometry && !(object as THREE.Sprite).isSprite) mesh.geometry.dispose()
    const material = mesh.material
    if (!material) return
    for (const m of Array.isArray(material) ? material : [material]) m.dispose()
  })
}
