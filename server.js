const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();

// Configure Multer (adjust as needed)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    // Create a unique filename
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit per file
  },
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
}).fields([
  { name: 'photo1', maxCount: 1 },
  { name: 'photo2', maxCount: 1 },
  { name: 'photo3', maxCount: 1 },
  { name: 'photo4', maxCount: 1 },
  { name: 'photo5', maxCount: 1 },
  { name: 'photo6', maxCount: 1 }
]);

// Your submit route
app.post('/submit', (req, res, next) => {
  upload(req, res, function (err) {
    if (err) {
      // Handle Multer errors
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }
    
    // Files are successfully uploaded
    try {
      // Extract the uploaded files
      const photo1 = req.files['photo1'] ? req.files['photo1'][0] : null;
      const photo2 = req.files['photo2'] ? req.files['photo2'][0] : null;
      const photo3 = req.files['photo3'] ? req.files['photo3'][0] : null;
      const photo4 = req.files['photo4'] ? req.files['photo4'][0] : null;
      const photo5 = req.files['photo5'] ? req.files['photo5'][0] : null;
      const photo6 = req.files['photo6'] ? req.files['photo6'][0] : null;
      
      // Create an array of uploaded files (excluding empty ones)
      const uploadedFiles = [photo1, photo2, photo3, photo4, photo5, photo6].filter(file => file !== null);
      
      // Process other form data
      const { name, email, phone, message } = req.body;
      
      // Verify reCAPTCHA if needed
      // ... your reCAPTCHA verification code
      
      // Process the files and form data
      // ... your existing processing logic
      
      // Send success response
      res.json({ 
        success: true, 
        message: 'Submission successful!',
        files: uploadedFiles.map(file => file.filename)
      });
      
    } catch (error) {
      console.error('Processing error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'An error occurred during processing.' 
      });
    }
  });
});