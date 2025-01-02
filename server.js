import express from "express";
import multer from "multer";
import cors_proxy from "cors-anywhere";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config(); // Load environment variables

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
app.use(cors);

// Middleware
app.use(express.json({ limit: "10mb" }));

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
        return res.status(204).end();
    }

    next();
});

app.options("/cors-anywhere/*", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.status(204).end(); // Send a "No Content" response
});

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Proxy Endpoint for Replicate
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
        console.error("Error in proxy/replicate:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// File Upload Endpoint
const upload = multer({ storage: multer.memoryStorage() });
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    try {
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "uploads", invalidate: true },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        console.log("File uploaded:", result.secure_url);
        res.json({ fileUrl: result.secure_url });
    } catch (error) {
        console.error("Upload error:", error.message);
        res.status(500).send("Upload failed.");
    }
});

// CORS Anywhere Proxy
const proxy = cors_proxy.createServer({
    originWhitelist: [], // Allow all origins
    requireHeader: ["origin", "x-requested-with"],
    removeHeaders: ["cookie", "cookie2"],
    redirectSameOrigin: false, // Ensure redirects are not attempted
});

// Proxy handler
app.use("/cors-anywhere/*", (req, res) => {
    const fullPath = req.params[0] || ""; // Safely access params[0]
    let targetUrl;

    try {
        // Normalize and validate the target URL
        targetUrl = new URL(
            fullPath.startsWith("http") ? fullPath : `https://${fullPath}`
        );
    } catch (error) {
        console.error("Malformed target URL:", fullPath);
        return res.status(400).send("Malformed target URL");
    }

    // Remove any duplicate protocols in the URL
    const sanitizedUrl = targetUrl.href.replace(/https?:\/+/g, "https://");

    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    console.log(`[CORS Proxy] Full Path: ${fullPath}`);
    console.log(`[CORS Proxy] Target URL: ${sanitizedUrl}`);

    // Proxy logic (adjust based on your requirements)
    res.send(`Proxying to ${sanitizedUrl}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

export default app;
