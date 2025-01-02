export default async function handler(req, res) {
    const allowedOrigins = [
        "https://checkbox-remind-968160.framer.app",
        "https://airboxr.com",
        "https://www.airboxr.com",
        "http://localhost:3000",
        "https://modern-store-325890.framer.app"
    ];

    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Credentials", "true");
    } else if (!origin) {
        res.setHeader("Access-Control-Allow-Origin", "*");
    } else {
        return res.status(403).json({ error: "Forbidden origin" });
    }

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    const replicateUrl = req.body.url || "https://api.replicate.com/v1/predictions";

    try {
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

        res.setHeader("Access-Control-Allow-Origin", origin || "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Credentials", "true");

        res.status(replicateResponse.status).json(data);
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
