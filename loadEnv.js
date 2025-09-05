const fs = require('fs');
const path = require('path');

function loadEnv(fallback = {}) {
  const envPath = path.resolve(__dirname, '.env');

  // Load from .env file if it exists
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('📦 Loaded .env file');
  } else {
    console.warn('⚠️ .env file not found, falling back to shell variables');
  }

  // Apply fallback values if missing
  const requiredVars = ['EMAIL_USER', 'EMAIL_PASS'];
  requiredVars.forEach((key) => {
    if (!process.env[key] && fallback[key]) {
      process.env[key] = fallback[key];
      console.log(`🔁 Injected fallback for ${key}`);
    }
  });

  // Final check
  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error('❌ Missing required env vars:', missing);
    process.exit(1);
  }

  return {
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS
  };
}

module.exports = loadEnv;
