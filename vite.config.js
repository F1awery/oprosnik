import { defineConfig } from 'vite';

export default defineConfig({
  // Относительные пути — сайт работает и в корне домена, и в подпапке
  base: './',
  server: {
    host: '0.0.0.0',
    // Позволяем превью-домену песочницы открывать dev-сервер
    allowedHosts: true,
  },
});
