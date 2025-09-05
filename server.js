require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
['EMAIL_USER', 'EMAIL_PASS', 'RECAPTCHA_SECRET_KEY'].forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env variable: ${key}`);
    process.exit(1);
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Logger with timestamp + optional email
const log = (stage, data, email = null) => {
  const ts = new Date().toISOString();
  console.log(`🔧 [${stage}] @ ${ts} ${email ? `(${email})` : ''}`, data);
};

// Multer config for up to 6 headshots
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${suffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Invalid file type'), false);
  }
}).fields([...Array(6)].map((_, i) => ({ name: `photo${i + 1}`, maxCount: 1 })));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting (30 minutes)
app.use('/submit', rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 10,
  message: 'Too many submissions. Please wait before trying again.'
}));

// Email transport setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
transporter.verify((err, success) => {
  log(err ? 'Email Transport Error' : 'Email Transport Ready', err || success);
});

// Route: Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route: Handle form submission
app.post('/submit', (req, res) => {
  upload(req, res, async err => {
    if (err) {
      log('Upload Error', err.message, req.body?.email);
      return res.status(400).json({ success: false, message: 'Submission failed. Please check your files and try again.' });
    }

    const { name, email, phone, message, 'g-recaptcha-response': recaptcha } = req.body;

    if (!recaptcha) {
      log('Missing reCAPTCHA', {}, email);
      return res.status(400).json({ success: false, message: 'Submission failed. Please try again later.' });
    }

    // Verify reCAPTCHA
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptcha}`;
    try {
      const recaptchaRes = await fetch(verifyURL, { method: 'POST' });
      const recaptchaData = await recaptchaRes.json();
      if (!recaptchaData.success) {
        log('reCAPTCHA Failed', recaptchaData, email);
        return res.status(400).json({ success: false, message: 'Submission failed. Please try again later.' });
      }
    } catch (error) {
      log('reCAPTCHA Error', error.message, email);
      return res.status(500).json({ success: false, message: 'Submission failed. Please try again later.' });
    }

    // Collect uploaded files
    const files = Object.values(req.files || {}).map(arr => arr[0]);
    if (!files.length) {
      return res.status(400).json({ success: false, message: 'Please upload at least one headshot.' });
    }

    // Prepare email
    const attachments = files.map(f => ({
      filename: f.originalname,
      path: f.path
    }));

    const mailOptions = {
      from: `"Headshot Submission" <${process.env.EMAIL_USER}>`,
      to: 'simplydbestproductions@gmail.com',
      subject: `Headshot Submission: ${name || 'Unknown'} (${email || 'No email'})`,
      text: `Name: ${name || 'N/A'}\nEmail: ${email || 'N/A'}\nPhone: ${phone || 'N/A'}\nMessage: ${message || 'N/A'}\nFiles: ${files.length}`,
      attachments
    };

    try {
      await transporter.sendMail(mailOptions);
      log('Email Sent', { to: mailOptions.to, attachments: attachments.length }, email);

      // Clean up uploaded files
      attachments.forEach(att => {
        fs.unlink(att.path, err => {
          if (err) log('File Cleanup Error', err.message, email);
        });
      });

      res.json({ success: true, message: 'Submission successful! Thank you.' });
    } catch (error) {
      log('Email Dispatch Error', error.message, email);
      res.status(500).json({ success: false, message: 'Submission failed. Please try again later.' });
    }
  });
});

// Fallback route
app.use((req, res) => {
  res.status(404).send('Route not found.');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  log('Server Started', `Listening on port ${PORT}`);
});
