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
  console.error(
    "❌ ERROR: GEMINI_API_KEY tidak ditemukan di environment variable!",
  );
}

const ai = new GoogleGenAI({ apiKey: apiKey });

app.use(express.json({ limit: "10mb" }));

// Arahkan file statis ke folder public di luar folder api
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
        "Selesaikan soal matematika di gambar ini. Berikan jawaban dalam format catat-tangan yang sangat rapi, simpel, dan menarik. DILARANG menggunakan tanda markdown berlebihan seperti # atau *. Format penulisan harus persis seperti ini:\n\n📝 SOAL:\n[tulis soal]\n\n✏️ LANGKAH:\n1. [langkah 1]\n2. [langkah 2]\n\n📌 HASIL AKHIR:\n[hasil akhir]",
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

export default app;
