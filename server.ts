import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload size for transmitting base64 images
app.use(express.json({ limit: "15mb" }));

// Initialize Gemini SDK with telemetry and fallback
const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Appwrite Database Schema Deploy and Seed Endpoint
app.post("/api/appwrite/init", async (req, res) => {
  try {
    const { endpoint, projectId, apiKey, databaseId } = req.body;
    if (!endpoint || !projectId || !apiKey || !databaseId) {
      return res.status(400).json({ error: "Missing required configuration fields. Endpoint, Project ID, API Key, and Database ID are all required." });
    }

    const { initializeAppwriteInfra } = require("./src/appwriteInit");
    const result = await initializeAppwriteInfra({
      endpoint,
      projectId,
      apiKey,
      databaseId
    });

    return res.json(result);
  } catch (err: any) {
    console.error("Initialization error:", err);
    return res.status(500).json({ error: err.message || "Failed to initialize Appwrite setup sequence." });
  }
});

// Appwrite client request proxy to bypass CORS sandbox restrictions
app.all("/api/appwrite/*", async (req, res) => {
  try {
    let appwriteEndpoint = process.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
    // Safeguard to prevent self-referencing loop if the env var is set to a relative or proxy path
    if (
      !appwriteEndpoint.startsWith("http") ||
      appwriteEndpoint.includes("/api/appwrite") ||
      appwriteEndpoint.includes("localhost") ||
      appwriteEndpoint.includes("127.0.0.1")
    ) {
      appwriteEndpoint = "https://cloud.appwrite.io/v1";
    }

    // Strip "/api/appwrite" from the beginning of the URL path but keep the query/subpaths
    const pathWithParams = req.originalUrl.replace(/^\/api\/appwrite/, "");
    const targetUrl = `${appwriteEndpoint.endsWith("/") ? appwriteEndpoint.slice(0, -1) : appwriteEndpoint}${pathWithParams}`;

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const lowerKey = key.toLowerCase();
      // Skip hop-by-hop/restricted headers that Node client handles natively or throws on
      if ([
        "connection",
        "keep-alive",
        "host",
        "transfer-encoding",
        "content-length",
        "upgrade",
        "origin",
        "referer",
        "accept-encoding"
      ].includes(lowerKey)) {
        continue;
      }

      // Skip proxy forwarding headers to prevent infinite redirect loops and protocol mismatches
      if (
        lowerKey.startsWith("x-forwarded-") ||
        lowerKey.startsWith("x-cloud-") ||
        ["x-real-ip", "via", "forwarded"].includes(lowerKey)
      ) {
        continue;
      }

      if (typeof value === "string") {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value.join(", ");
      }
    }

    let body: any = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("application/json") && req.body && Object.keys(req.body).length > 0) {
        body = JSON.stringify(req.body);
      } else {
        body = req.body ? JSON.stringify(req.body) : undefined;
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual"
    });

    res.status(response.status);

    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!["content-encoding", "transfer-encoding", "access-control-allow-origin"].includes(lowerKey)) {
        res.setHeader(key, value);
      }
    });

    const bodyBuffer = await response.arrayBuffer();
    res.send(Buffer.from(bodyBuffer));
  } catch (err: any) {
    console.error("Appwrite Proxy Route Error:", err);
    res.status(500).json({ error: "Appwrite proxy connection failed: " + (err.message || String(err)) });
  }
});

// Image creation and editing API route
app.post("/api/gemini/generate-image", async (req, res) => {
  try {
    const { prompt, base64Image, mimeType } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (!ai) {
      return res.status(500).json({
        error: "Gemini API is not configured. Please add GEMINI_API_KEY to your settings.",
      });
    }

    // Structure inputs according to instructions
    const parts: any[] = [];
    
    if (base64Image) {
      // Strip out metadata if present (e.g. "data:image/png;base64,")
      const pureBase64 = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
      const parsedMimeType = mimeType || (base64Image.includes(";") ? base64Image.split(";")[0].split(":")[1] : "image/png");
      
      parts.push({
        inlineData: {
          data: pureBase64,
          mimeType: parsedMimeType,
        },
      });
    }

    parts.push({ text: prompt });

    // Try using gemini-3.1-flash-image-preview requested by user, with fallback to gemini-2.5-flash-image
    const targetModel = "gemini-3.1-flash-image-preview";
    const backupModel = "gemini-2.5-flash-image";

    let response;
    try {
      response = await ai.models.generateContent({
        model: targetModel,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K",
          },
        },
      });
    } catch (err: any) {
      console.warn(`Failed with ${targetModel}, retrying with ${backupModel}. Error:`, err.message);
      response = await ai.models.generateContent({
        model: backupModel,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K",
          },
        },
      });
    }

    if (!response || !response.candidates || response.candidates.length === 0) {
      throw new Error("No image generated from model candidates");
    }

    let generatedImageUrl = "";
    const returnedParts = response.candidates[0].content?.parts || [];

    for (const part of returnedParts) {
      if (part.inlineData) {
        const base64Data = part.inlineData.data;
        const returnMime = part.inlineData.mimeType || "image/png";
        generatedImageUrl = `data:${returnMime};base64,${base64Data}`;
        break;
      }
    }

    if (!generatedImageUrl) {
      throw new Error("No image part returned in response");
    }

    return res.json({ imageUrl: generatedImageUrl });

  } catch (error: any) {
    console.error("Gemini Image API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process image generation workflow." });
  }
});

// Start listening and serve frontend
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support Express v4 / v5 catch-all
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();
