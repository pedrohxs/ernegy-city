/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  // ernegy-city/ é um clone local do repositório upstream: fora dos testes deste projeto.
  test: { exclude: ['**/node_modules/**', '**/dist/**', 'ernegy-city/**'] },
  build: {
    rollupOptions: {
      output: {
        // Separa vendors: melhora cache e reduz o chunk inicial da aplicação.
        manualChunks: {
          react: ['react', 'react-dom', 'zustand'],
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          postfx: ['@react-three/postprocessing', 'postprocessing'],
        },
      },
    },
  },
})
