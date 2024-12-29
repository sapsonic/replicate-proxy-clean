export default async function handler(req, res) {
    const allowedOrigins = [
        "https://checkbox-remind-968160.framer.app",
        "https://airboxr.com",
        "https://www.airboxr.com",
        "http://localhost:3000",
    ];
    const origin = req.headers.origin || "";

    // Set CORS headers
    if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Credentials", "true");
    } else if (!origin) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow server-side requests
        console.log("CORS: No origin header, allowing all origins for server-side requests.");
    } else {
        console.log("CORS: Origin not allowed:", origin);
        return res.status(403).json({ error: "CORS policy violation" });
    }

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
        console.log("OPTIONS request handled");
        return res.status(204).end();
    }

    if (!process.env.REPLICATE_API_TOKEN) {
        console.error("Missing Replicate API Token");
        return res.status(500).json({ error: "Replicate API Token is not set" });
    }

    if (!req.body || !req.body.input || !req.body.version) {
        console.error("Invalid request body:", req.body);
        return res.status(400).json({ error: "Invalid request body" });
    }

    const replicateUrl = req.body.url || `https://api.replicate.com/v1/predictions`;

    try {
        // Log the payload and replicate URL
        console.log("Replicate API URL:", replicateUrl);
        console.log("Payload sent to Replicate API:", JSON.stringify(req.body, null, 2));

        // Make the API request
        const replicateResponse = await fetch(replicateUrl, {
            method: req.method,
            headers: {
                Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: req.method === "POST" ? JSON.stringify(req.body) : null,
            redirect: "follow",
        });

        const data = await replicateResponse.json();

        // Log response details
        console.log("Replicate API Response Status:", replicateResponse.status);
        console.log("Replicate API Response Body:", JSON.stringify(data, null, 2));

        // Send response back to client
        res.status(replicateResponse.status).json(data);
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
