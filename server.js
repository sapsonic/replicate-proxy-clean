const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
require("dotenv").config(); // Load environment variables

const PORT = 3000;

// Log loaded environment variables (for debugging; remove this in production)
console.log("Loaded API Key for Replicate:", process.env.REPLICATE_API_TOKEN);
console.log("Loaded Cloudinary Config:", {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
});

// Configure Cloudinary using environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

// Middleware to parse JSON requests
app.use(express.json({ limit: "10mb" })); // Increase payload limit to 10MB

// Middleware to handle CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://checkbox-remind-968160.framer.app");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});

// Set up Multer for file uploads
const upload = multer({ dest: "uploads/" });

// Proxy endpoint for Replicate
app.post("/proxy/replicate", async (req, res) => {
    try {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`, // Use token from .env
                "Content-Type": "application/json",
                "Prefer": "wait",
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
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "uploads",
            invalidate: true, // Ensure cached versions are invalidated
        });

        // Remove the local file after upload
        fs.unlinkSync(req.file.path);

        console.log("File uploaded successfully to Cloudinary:", result.secure_url);

        // Schedule deletion after 1 minute
        setTimeout(async () => {
            try {
                await cloudinary.uploader.destroy(result.public_id);
                console.log("File deleted from Cloudinary:", result.public_id);
            } catch (error) {
                console.error("Error deleting file from Cloudinary:", error);
            }
        }, 60000); // 1 minute in milliseconds

        // Respond with the public URL
        res.json({ fileUrl: result.secure_url });
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        res.status(500).send("Failed to upload file.");
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
