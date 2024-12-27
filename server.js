const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
require("dotenv").config(); // Load environment variables

// Configure Cloudinary using environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

// Middleware to parse JSON requests
app.use(express.json({ limit: "10mb" })); // Increase payload limit to 10MB

// Middleware to handle CORS dynamically
app.use((req, res, next) => {
    const allowedOrigins = [
        "https://checkbox-remind-968160.framer.app",
        "https://airboxr.com",
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    next();
});

// Proxy endpoint for Replicate
app.post("/proxy/replicate", async (req, res) => {
    try {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
                Prefer: "wait",
            },
            body: JSON.stringify(req.body),
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Proxy server error:", error);
        res.status(500).json({ error: error.message });
    }
});

// File upload endpoint
const upload = multer({ dest: "uploads/" });
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    try {
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "uploads",
            invalidate: true,
        });

        fs.unlinkSync(req.file.path); // Remove local file after upload

        console.log("File uploaded successfully to Cloudinary:", result.secure_url);

        // Schedule deletion after 1 minute
        setTimeout(async () => {
            try {
                await cloudinary.uploader.destroy(result.public_id);
                console.log("File deleted from Cloudinary:", result.public_id);
            } catch (error) {
                console.error("Error deleting file from Cloudinary:", error);
            }
        }, 60000); // 1 minute

        res.json({ fileUrl: result.secure_url });
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        res.status(500).send("Failed to upload file.");
    }
});

// Export the app for Vercel
module.exports = app;
