import {VitePWA} from 'vite-plugin-pwa'
import {defineConfig} from 'vite'

export default defineConfig({
    base: './',
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,ttf}'],
        },
        includeAssets: ['app-icon.svg', 'main.css', 'responsive.css', 'Raleway-VariableFont_wght.ttf', 'app-icon.png', 'restaurant-icon.png', 'restaurant-icon-highlight.png', 'app-icon.svg', 'foliage.jpg'],
        manifest: {
          name: 'Student Restaurants PWA',
          short_name: 'Student Restaurants',
          description: 'Student Restaurant Progressive Web App',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-256x256.png',
              sizes: '256x256',
              type: 'image/png',
            },
            {
              src: 'icons/icon-384x384.png',
              sizes: '384x384',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
  });
