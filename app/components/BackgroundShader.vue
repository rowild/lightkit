<template>
  <div class="fixed inset-0 -z-50 overflow-hidden pointer-events-none transition-opacity duration-1000">
    <canvas ref="canvasRef" class="w-full h-full block"></canvas>
    <!-- Fallback animated CSS background in case WebGL fails -->
    <div
      v-if="webglFailed"
      class="absolute inset-0 transition-all duration-1000"
      :class="isDark ? 'bg-gradient-dark' : 'bg-gradient-light'"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  isDark: boolean
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const webglFailed = ref(false)

let gl: WebGLRenderingContext | null = null
let animationFrameId: number | null = null
let program: WebGLProgram | null = null
let startTime = 0

// Uniform locations
let timeLoc: WebGLUniformLocation | null = null
let resLoc: WebGLUniformLocation | null = null
let darkLoc: WebGLUniformLocation | null = null

const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragmentShaderSource = `
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_dark; // 1.0 for dark mode, 0.0 for light mode

  void main() {
    // Standardized coordinates [0, 1]
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // Slow wave calculations for fluid, organic motion
    float wave1 = sin(uv.x * 2.0 + u_time * 0.04) * 0.5 + 0.5;
    float wave2 = cos(uv.y * 2.5 - u_time * 0.03) * 0.5 + 0.5;
    
    // Diagonal distortion waves
    float dist = sin((uv.x + uv.y) * 1.5 + u_time * 0.05) * 0.5 + 0.5;
    
    float mixVal = (wave1 + wave2 + dist) / 3.0;

    // Dark Mode Palette (slate charcoal, steel blue, deep slate petrol)
    vec3 darkCharcoal = vec3(0.031, 0.047, 0.063); // #080c10
    vec3 darkBlueGrey = vec3(0.094, 0.137, 0.188); // #182330
    vec3 darkPetrolGrey = vec3(0.047, 0.082, 0.125); // #0c1520
    
    // Light Mode Palette (light mint-grey, white, soft petrol-grey)
    vec3 lightGrey = vec3(0.953, 0.965, 0.961);   // #f3f6f5
    vec3 lightPetrol = vec3(0.863, 0.922, 0.922); // #d9eaea
    vec3 lightGreen = vec3(0.878, 0.929, 0.910);  // #e0ede8

    // Morph the internal colors of the palettes
    vec3 darkColor = mix(darkCharcoal, mix(darkBlueGrey, darkPetrolGrey, mixVal), mixVal);
    vec3 lightColor = mix(lightGrey, mix(lightGreen, lightPetrol, mixVal), mixVal);

    // Cross-fade between light and dark palettes
    vec3 finalColor = mix(lightColor, darkColor, u_dark);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

const initWebGL = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
  if (!gl) {
    console.warn('WebGL not supported, falling back to CSS gradients')
    webglFailed.value = true
    return
  }

  // Create & compile shaders
  const vs = compileShader(gl.VERTEX_SHADER, vertexShaderSource)
  const fs = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource)
  if (!vs || !fs) {
    webglFailed.value = true
    return
  }

  // Create program and link
  program = gl.createProgram()
  if (!program) {
    webglFailed.value = true
    return
  }
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('WebGL Program Linking Failed:', gl.getProgramInfoLog(program))
    webglFailed.value = true
    return
  }

  gl.useProgram(program)

  // Set up vertices (a quad that covers the screen)
  const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ])

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

  const posAttr = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(posAttr)
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0)

  // Locate uniforms
  timeLoc = gl.getUniformLocation(program, 'u_time')
  resLoc = gl.getUniformLocation(program, 'u_resolution')
  darkLoc = gl.getUniformLocation(program, 'u_dark')

  // Set initial dimensions
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  startTime = performance.now()
  animate()
}

const compileShader = (type: number, source: string): WebGLShader | null => {
  if (!gl) return null
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader Compilation Error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

const resizeCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas || !gl) return

  // Resize canvas display size to match physical size
  const width = window.innerWidth
  const height = window.innerHeight
  
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)
  }
}

const animate = () => {
  if (!gl || !canvasRef.value) return

  const elapsedSeconds = (performance.now() - startTime) / 1000

  // Pass uniforms
  if (timeLoc) gl.uniform1f(timeLoc, elapsedSeconds)
  if (resLoc) gl.uniform2f(resLoc, canvasRef.value.width, canvasRef.value.height)
  if (darkLoc) gl.uniform1f(darkLoc, props.isDark ? 1.0 : 0.0)

  gl.drawArrays(gl.TRIANGLES, 0, 6)

  animationFrameId = requestAnimationFrame(animate)
}

// Watch theme changes to immediately redraw shader frame
watch(() => props.isDark, (newVal) => {
  if (gl && darkLoc) {
    gl.uniform1f(darkLoc, newVal ? 1.0 : 0.0)
  }
})

onMounted(() => {
  initWebGL()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style scoped>
/* Fallback styles for older devices/environments where WebGL is unsupported */
.bg-gradient-dark {
  background: linear-gradient(135deg, #080c10 0%, #182330 50%, #0c1520 100%);
  background-size: 200% 200%;
  animation: moveGradient 15s ease infinite;
}

.bg-gradient-light {
  background: linear-gradient(135deg, #f3f6f5 0%, #e0ede8 50%, #d9eaea 100%);
  background-size: 200% 200%;
  animation: moveGradient 15s ease infinite;
}

@keyframes moveGradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
