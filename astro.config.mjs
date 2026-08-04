import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://purikencanapermai2.com',

  integrations: [vue(), sitemap()],

  image: {
    // Astro pakai Sharp di balik layar buat resize/convert gambar saat build.
    service: { entrypoint: 'astro/assets/services/sharp' },
    // Wajib di-whitelist supaya Astro MAU download & optimize gambar dari
    // Google Drive - tanpa ini, <Image src="https://drive.google.com/..."/>
    // akan ditolak demi keamanan (default-nya semua domain luar diblokir).
    domains: ['drive.google.com']
  }
});
