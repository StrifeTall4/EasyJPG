const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const port = 3000;

// Configure Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// Configure Multer to handle multiple file uploads
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit
}).array('files', 10); // 'files' is the field name, 10 is the max number of files

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Handle file upload and conversion
app.post('/upload', (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).send(`Multer error: ${err.message}`);
        } else if (err) {
            return res.status(500).send(`Server error: ${err.message}`);
        }

        const convertedFiles = [];
        for (const file of req.files) {
            const outputFilename = `${file.filename.split('.')[0]}.jpg`;
            const outputPath = path.join('uploads', outputFilename);

            try {
                // Use ImageMagick to convert HEIC to JPG
                await new Promise((resolve, reject) => {
                    exec(`magick convert ${file.path} ${outputPath}`, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`Error converting file: ${stderr}`);
                            reject(error);
                        } else {
                            console.log(`File converted: ${stdout}`);
                            resolve();
                        }
                    });
                });

                convertedFiles.push({
                    filename: outputFilename,
                    originalname: file.originalname.replace(/\.[^/.]+$/, ".jpg")
                });

                // Optionally, delete the original HEIC file
                fs.unlinkSync(file.path);
            } catch (error) {
                return res.status(500).send(`Error converting file: ${error.message}`);
            }
        }

        res.json({ files: convertedFiles });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});