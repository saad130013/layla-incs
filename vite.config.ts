import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to bypass missing Node.js type definitions and access cwd()
  // تحميل متغيرات البيئة من النظام (Vercel) أو ملف .env
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // حقن متغيرات البيئة لتعمل داخل المتصفح (مهم لـ Gemini API)
      'process.env': env
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  };
});
