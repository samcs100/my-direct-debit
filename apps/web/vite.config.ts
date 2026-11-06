import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
const helper = `http://127.0.0.1:${process.env.HELPER_PORT || 8787}`;
const proxy = {'/api':helper,'/healthz':helper};
export default defineConfig({root: resolve('apps/web'), plugins:[react()], server:{host:'127.0.0.1',port:5173,proxy}, preview:{host:'127.0.0.1',port:4173,proxy,headers:{'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'}}, build:{outDir:resolve('dist'),emptyOutDir:true}});
