export default async function handler(req, res) {
    console.log("Replicate API Key:", process.env.REPLICATE_API_TOKEN);
    console.log("Request origin:", req.headers.origin);
    console.log("Incoming request body:", req.body);

    const allowedOrigins = [
        "https://checkbox-remind-968160.framer.app",
        "https://airboxr.com",
        "http://localhost:3000"
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

    try {
        const replicateUrl = req.body.url || "https://api.replicate.com/v1/predictions";
        const replicateResponse = await fetch(replicateUrl, {
            method: req.method,
            headers: {
                Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(req.body.input || {}),
        });

        const data = await replicateResponse.json();
        res.status(replicateResponse.status).json(data);
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}