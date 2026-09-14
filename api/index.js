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

// 2. RATE LIMITING
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
app.use("/hitung", limiter);

// Inisialisasi Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. SLA & HEALTH CHECK ENDPOINT (Diberikan rute ganda agar kompatibel penuh)
const healthHandler = (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: "Gemini MathSolver API",
  });
};

app.get("/api/health", healthHandler);
app.get("/health", healthHandler);

// 4. ENDPOINT HITUNG SOAL
const hitungHandler = async (req, res) => {
  const startTime = Date.now();

  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "Data gambar tidak valid." });
    }

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

    const duration = Date.now() - startTime;
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
};

app.post("/api/hitung", hitungHandler);
app.post("/hitung", hitungHandler);

export default app;
