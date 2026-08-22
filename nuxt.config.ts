import os from 'os'
process.env.TMPDIR = '/tmp'
process.env.TEMP = '/tmp'
process.env.TMP = '/tmp'
os.tmpdir = () => '/tmp'

import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  future: {
    compatibilityVersion: 4,
  },

  devtools: { enabled: true },

  devServer: {
    port: 4000
  },

  css: [
    'ol/ol.css',
    '~/assets/css/main.css'
  ],

  vite: {
    plugins: [
      tailwindcss()
    ],
    optimizeDeps: {
      include: [
        '@lucide/vue',
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'gsap',
        'gsap/SplitText',
        'ol',
        'suncalc'
      ]
    }
  },

  app: {
    head: {
      title: 'LightKit // Golden hour, blue hour and exposure tools',
      bodyAttrs: {
        class: 'js-loading'
      },
      meta: [
        { name: 'description', content: 'LightKit plans golden hour, blue hour, weather and exposure for drone pilots, photographers and filmmakers.' },
        { name: 'color-scheme', content: 'light dark' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'apple-touch-icon', href: '/icon-192.png' },
        // Both faces are self-hosted; @font-face lives in main.css. Only the
        // latin subsets are preloaded - they cover the whole interface, and the
        // other two are fetched on demand for accented place names.
        //
        // Plex is preloaded first: it sets every paragraph, label and form
        // control, so it is the one whose absence is felt.
        {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: '/fonts/ibm-plex-sans-latin.woff2',
          crossorigin: 'anonymous'
        },
        {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: '/fonts/josefin-sans-latin.woff2',
          crossorigin: 'anonymous'
        }
      ],
      script: [
        {
          // Resolve the theme before first paint so light-mode users never see a
          // dark flash. Mirrors the logic in app.vue's onMounted.
          innerHTML: `(function(){try{var m=localStorage.getItem('color-theme')||'auto';var d=m==='dark'||(m==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light')}catch(e){document.documentElement.setAttribute('data-theme','dark')}})()`,
          tagPosition: 'head'
        }
      ]
    }
  },

  nitro: {
    preset: 'cloudflare_module',

    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    }
  },

  modules: ['nitro-cloudflare-dev']
})
