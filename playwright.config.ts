import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./apps/web/e2e', timeout:30000, fullyParallel:false,
 use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium',launchOptions:{executablePath:process.env.PLAYWRIGHT_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'},trace:'retain-on-failure'},
 webServer:[{command:'npm run dev:helper',url:'http://127.0.0.1:8787/healthz',reuseExistingServer:false,timeout:60000},{command:'npm run preview',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:60000}],
});

