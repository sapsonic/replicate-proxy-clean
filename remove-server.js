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

// Middleware
app.use(express.json({ limit: "10mb" }));

const allowedOrigins = [
    "https://checkbox-remind-968160.framer.app",
    "https://airboxr.com",
    "https://www.airboxr.com",
    "http://localhost:3000",
    "https://modern-store-325890.framer.app",
    "https://project-bf0bajzquvvkcxngr45s.framercanvas.com",
];

app.use(cors());

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get("/ping", (req, res) => {
    return res.send("pong");
});

// Proxy Endpoint for Replicate
app.get("/proxy/replicate", async (req, res) => {
    try {
        console.log("query", req.query);
        const version = req.query.version;
        const image = req.query.input?.image;
        if (!version || !image) {
            return res.status(400).json({
                error: "Missing required query parameters. 'version' and 'input[image]' are required.",
            });
        }

        const payload = {
            version,
            input: { image },
        };

        const response = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
                Prefer: "wait",
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Error in proxy/replicate:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Export the app
export default app;
