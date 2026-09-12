import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ ERROR: GEMINI_API_KEY tidak ditemukan di file .env!");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

app.use(express.json({ limit: "10mb" }));

// Arahkan static folder dan index.html ke folder public di luar (../public)
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

app.post("/api/hitung", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "Gambar tidak ditemukan" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
        "Selesaikan soal matematika yang ada di dalam gambar ini beserta langkah penyelesaiannya.",
      ],
    });

    res.json({ result: response.text });
  } catch (error) {
    console.error("Error Detail:", error);
    res.status(500).json({ error: error.message || "Gagal memproses gambar." });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
  });
}

// Bagian bawah tetap sama
export default app;
