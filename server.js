import express from "express";
import multer from "multer";
import cors_proxy from "cors-anywhere";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

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

app.options("*", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(204).end();
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
});

app.use("/cors-anywhere/*", (req, res) => {
    const fullPath = req.params[0] || "";
    let targetUrl;

    try {
        if (fullPath.startsWith("http://") || fullPath.startsWith("https://")) {
            targetUrl = fullPath;
        } else {
            targetUrl = `https://${fullPath}`;
        }

        new URL(targetUrl);
    } catch (error) {
        console.error("[CORS Proxy] Invalid URL:", targetUrl);
        return res.status(400).send("Invalid target URL");
    }

    console.log(`[CORS Proxy] Full Path: ${fullPath}`);
    console.log(`[CORS Proxy] Target URL: ${targetUrl}`);
	console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
	console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
	console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET);
    
    req.url = `/${targetUrl}`; // Update request URL to include the target
    proxy.emit("request", req, res);
});



const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
