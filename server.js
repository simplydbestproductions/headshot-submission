const express = require("express");
const nodemailer = require("nodemailer");
const multer = require("multer");
const fetch = require("node-fetch");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static(".")); // serves index.html

app.post("/submit", upload.array("photos", 6), async (req, res) => {
  const { name, email, phone, message } = req.body;
  const token = req.body["g-recaptcha-response"];

  // Verify reCAPTCHA
  const captchaVerify = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${process.env.RECAPTCHA_SECRET}&response=${token}`
  }).then(r => r.json());

  if (!captchaVerify.success) {
    return res.json({ message: "Captcha failed. Try again." });
  }

  // Email transporter
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // Attach uploaded files
  let attachments = req.files.map(file => ({
    filename: file.originalname,
    path: file.path
  }));

  let mailOptions = {
    from: process.env.EMAIL_USER,
    to: "simplydbestproductions@gmail.com",
    subject: `New Headshot Submission from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message || "N/A"}`,
    attachments: attachments
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "Submission successful! We'll be in touch." });
  } catch (err) {
    console.error(err);
    res.json({ message: "Error sending email. Please try again." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
