import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";

const app = express();

// 1. SECURITY MONITORING: Security Headers & CORS
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 2. SECURITY & USAGE MONITORING: Rate Limiting (Maks 15 request/menit per IP)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Terlalu banyak permintaan dari IP ini. Silakan coba lagi nanti (Rate limit reached).",
  },
});
app.use("/api/hitung", limiter);

// Inisialisasi Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. SLA & HEALTH CHECK ENDPOINT (Diakses oleh UptimeRobot / Ping monitor)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: "Gemini MathSolver API",
  });
});

// Endpoint utama hitung soal
app.post("/api/hitung", async (req, res) => {
  const startTime = Date.now(); // PERFORMANCE MONITORING: Start timer

  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "Data gambar tidak valid." });
    }

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType,
              },
            },
            {
              text: "Selesaikan soal matematika pada gambar ini. Berikan jawaban yang tepat, singkat, rapi, dan sertakan langkah-langkah penyelesaiannya secara jelas.",
            },
          ],
        },
      ],
    });

    const duration = Date.now() - startTime; // PERFORMANCE MONITORING: Hitung durasi

    // USAGE & PERFORMANCE LOGGING (Tercatat otomatis di Vercel Logs)
    console.log(
      `[USAGE & PERF LOG] Status: 200 | Latency: ${duration}ms | Timestamp: ${new Date().toISOString()}`,
    );

    return res.status(200).json({
      result: response.text,
      performance: {
        latencyMs: duration,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[ERROR LOG] Status: 500 | Latency: ${duration}ms | Error: ${error.message}`,
    );

    return res.status(500).json({
      error: "Gagal memproses gambar matematika.",
      details: error.message,
    });
  }
});

export default app;
