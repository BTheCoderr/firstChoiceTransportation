#!/usr/bin/env node
// Quick check that Expo/Supabase env vars are set (run: node check-env.js)
const fs = require('fs');
const path = require('path');
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .filter((line) => /^\s*[A-Z_]+\s*=/.test(line) && !line.trimStart().startsWith('#'))
      .forEach((line) => {
        const i = line.indexOf('=');
        const key = line.slice(0, i).trim();
        const val = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = val;
      });
  }
} catch (_) {}
const u = process.env.EXPO_PUBLIC_SUPABASE_URL;
const k = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
console.log('URL set:', !!u);
console.log('Anon key set:', !!k);
