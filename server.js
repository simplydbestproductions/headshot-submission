const express = require('express');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Sanitize filename
    const originalname = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, Date.now() + '-' + originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Email configuration - using environment variables for security
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'simplydbestproductions@gmail.com',
    pass: process.env.EMAIL_PASS || 'your_app_password_here'
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/submit-headshots', upload.array('headshots', 6), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // Prepare email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'simplydbestproductions@gmail.com',
      to: 'simplydbestproductions@gmail.com',
      subject: 'New Headshot Submission',
      html: `
        <h2>New Headshot Submission</h2>
        <p>You have received ${req.files.length} new headshot(s).</p>
        <p>Submission time: ${new Date().toLocaleString()}</p>
      `,
      attachments: req.files.map(file => ({
        filename: file.originalname,
        path: file.path
      }))
    };

    // Send email
    await transporter.sendMail(mailOptions);
    
    // Clean up uploaded files
    req.files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    res.json({ success: true, message: 'Headshots submitted successfully' });
  } catch (error) {
    console.error('Error processing submission:', error);
    
    // Clean up files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({ success: false, message: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ success: false, message: error.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
