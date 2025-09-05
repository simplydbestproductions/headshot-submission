const fs = require('fs');
const dotenv = require('dotenv');
const envPath = require('path').resolve(__dirname, '.env');

console.log('🔍 Checking .env at:', envPath);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ .env file loaded');
} else {
  console.log('❌ .env file not found at expected path');
}
const loadEnv = require('./loadEnv');
const nodemailer = require('nodemailer');

const { EMAIL_USER, EMAIL_PASS } = loadEnv({
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

transporter.sendMail({
  from: `"SDBP Diagnostic" <${EMAIL_USER}>`,
  to: EMAIL_USER,
  subject: '✅ SDBP Email Transport Test',
  text: 'This confirms your Gmail transport is working via Nodemailer.'
}, (err, info) => {
  if (err) console.error('❌ Email Error:', err);
  else console.log('✅ Email Sent:', info.response);
});
