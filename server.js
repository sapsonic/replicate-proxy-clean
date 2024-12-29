import express from "express";
import multer from "multer";
import cors_proxy from "cors-anywhere";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

// Configure Cloudinary using environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

// Middleware to parse JSON requests
app.use(express.json({ limit: "10mb" }));

// Middleware to handle CORS dynamically
app.use((req, res, next) => {
    const allowedOrigins = [
        "https://checkbox-remind-968160.framer.app",
        "https://airboxr.com",
        "http://localhost:8080",
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        console.log("OPTIONS request received, responding with 204.");
        return res.status(204).end();
    }

    next();
});

// Handle preflight requests explicitly
app.options("*", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(204).end();
});

// Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method !== "GET") {
        console.log("Body:", req.body);
    }
    next();
});

// Proxy endpoint for Replicate
app.post("/proxy/replicate", async (req, res) => {
    try {
        console.log("Forwarding request to Replicate API...");
        const response = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
                Prefer: "wait",
            },
            body: JSON.stringify(req.body),
        });

        console.log(`Replicate API Response Status: ${response.status}`);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Proxy server error:", error);
        res.status(500).json({ error: error.message });
    }
});

// File upload endpoint with memoryStorage
const upload = multer({ storage: multer.memoryStorage() });
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    try {
        const result = await cloudinary.uploader.upload_stream(
            { folder: "uploads", invalidate: true },
            (error, result) => {
                if (error) {
                    throw error;
                }

                console.log("File uploaded successfully to Cloudinary:", result.secure_url);
                res.json({ fileUrl: result.secure_url });
            }
        );

        const stream = req.file.buffer; // Use the in-memory file buffer
        result.end(stream);
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        res.status(500).send("Failed to upload file.");
    }
});

// Start server locally
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


// CORS Anywhere setup
// CORS Anywhere setup
app.use("/cors-anywhere/*", (req, res) => {
    const fullPath = req.params[0] || ""; // Capture everything after '/cors-anywhere/'

    let targetUrl;
    try {
        if (fullPath.startsWith("http://") || fullPath.startsWith("https://")) {
            targetUrl = fullPath;
        } else {
            targetUrl = `https://${fullPath}`;
        }

        // Validate URL structure
        new URL(targetUrl);
    } catch (error) {
        console.error("[CORS Proxy] Invalid Target URL:", targetUrl);
        return res.status(400).send("Invalid target URL");
    }

    // Log paths for debugging
    console.log(`[CORS Proxy] Full Path: ${fullPath}`);
    console.log(`[CORS Proxy] Target URL: ${targetUrl}`);

    // Forward the request to the target URL
    cors_proxy.emit("request", req, res, { target: targetUrl });
});



// Export the app for Vercel
export default app;
