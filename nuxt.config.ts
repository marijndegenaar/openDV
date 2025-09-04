import { repositoryName } from "./slicemachine.config.json";
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // ssr: false,
  devtools: { enabled: true },

  app: {
    head: {
      title: 'OPEN DV',
      charset: 'utf-8',
      viewport: 'width=device-width, minimal-ui initial-scale=1, user-scalable=no',
      link: [
        { rel: 'icon', type: 'image/png', href: '/fav.png' },
        { rel: 'shortcut icon', href: '/fav.png' },
        { rel: 'apple-touch-icon', href: '/fav.png' }
      ],
      meta: [
        { hid: 'description', name: 'description', content: 'Simone Bozzelli is an Italian film and music video director. Based in Rome, Italy' },
        { hid: 'keywords', name: 'keywords', content: '' }
      ],
    },
    pageTransition: { name: 'page', mode: 'default' }
  },

  modules: ['@nuxtjs/prismic', '@nuxtjs/tailwindcss', '@formkit/auto-animate/nuxt', '@nuxt/image', 'vue3-carousel-nuxt'],

  image: {
    // dir: '~/assets/images/graphic_design', // Your image folder
    quality: 70, // default: 70
    format: ['webp', 'avif', 'jpeg'],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
  },
  
  prismic: {
      endpoint: process.env.PRISMIC_REPOSITORY_NAME || "opendv",
      accessToken: process.env.PRISMIC_ACCESS_TOKEN,
      toolbar: false,
      preview: false,
    },

  css: [
      "@/assets/fonts/fonts.css",
      "@/assets/sass/main.sass"
  ],

  router: {
  },

  // routeRules: {
  //   '/': { redirect: '/projects' },
  // },

  nitro: {
    experimental: {
      wasm: true
    }
  },

  compatibilityDate: '2025-03-18',
})