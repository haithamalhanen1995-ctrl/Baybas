import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and CORS parser
  app.use(express.json());
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Load Firebase configuration
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) {
    console.error("Firebase config file not found at:", configPath);
    process.exit(1);
  }

  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Bypass License Cloud API is active" });
  });

  // GET handler for /api/verify to help developers check if the API is online
  app.get("/api/verify", (req, res) => {
    res.json({
      success: false,
      message: "The API is active! Please send an HTTP POST request with 'key' and 'hwid' to verify licenses. / الـ API يعمل بنجاح! يرجى إرسال طلب POST مع 'key' و 'hwid' للتحقق.",
      instructions: {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        example_body: {
          key: "BYPASS-VIP-XXXX-XXXX",
          hwid: "DEVICE-UNIQUE-ID"
        }
      }
    });
  });

  // REAL API Endpoint for external clients (C++, Python, Android APK)
  app.post("/api/verify", async (req: any, res: any) => {
    try {
      const { key, hwid } = req.body;

      if (!key) {
        return res.status(400).json({
          success: false,
          message: "License key is required / مفتاح الترخيص مطلوب"
        });
      }

      const keysCol = collection(db, "licenseKeys");
      const q = query(keysCol, where("key", "==", key.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return res.status(404).json({
          success: false,
          message: "License key not found / مفتاح الترخيص غير موجود"
        });
      }

      const keyDoc = querySnapshot.docs[0];
      const keyData = keyDoc.data();

      // Check Ban Status
      const isBanned = keyData.notes?.includes("🛑 [محظور]");
      if (isBanned) {
        return res.status(403).json({
          success: false,
          message: "License is banned / تم حظر هذا الترخيص وإيقافه فورياً"
        });
      }

      // Check Expiration Status
      if (keyData.expiresAt && keyData.expiresAt !== "بدون انتهاء") {
        const expiryStr = keyData.expiresAt.replace(" ", "T");
        const expiryDate = new Date(expiryStr);
        if (!isNaN(expiryDate.getTime()) && expiryDate.getTime() < Date.now()) {
          if (keyData.status !== "expired") {
            await updateDoc(doc(db, "licenseKeys", keyDoc.id), { status: "expired" });
          }
          return res.status(403).json({
            success: false,
            message: "License key has expired / انتهت صلاحية هذا الاشتراك"
          });
        }
      }

      // HWID Logic
      if (keyData.hwid) {
        // Check locked status
        if (hwid && keyData.hwid !== hwid) {
          return res.status(403).json({
            success: false,
            message: "License locked to another device / هذا المفتاح مستخدم بالفعل على جهاز آخر"
          });
        }
      } else {
        // Link device HWID on first activation
        const activeDate = new Date().toISOString().replace("T", " ").substring(0, 16);
        let expiresAt = keyData.expiresAt;
        const type = keyData.type;

        if (!expiresAt || expiresAt === "بدون انتهاء" && type !== "lifetime") {
          let duration = 24 * 3600 * 1000; // 24h
          if (type === "7d") duration = 7 * 24 * 3600 * 1000;
          if (type === "30d") duration = 30 * 24 * 3600 * 1000;

          if (type !== "lifetime") {
            expiresAt = new Date(Date.now() + duration).toISOString().replace("T", " ").substring(0, 16);
          } else {
            expiresAt = "بدون انتهاء";
          }
        }

        const clientHwid = hwid || "DEVICE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        await updateDoc(doc(db, "licenseKeys", keyDoc.id), {
          hwid: clientHwid,
          status: "active",
          activatedAt: activeDate,
          expiresAt: expiresAt
        });

        keyData.hwid = clientHwid;
        keyData.status = "active";
        keyData.activatedAt = activeDate;
        keyData.expiresAt = expiresAt;
      }

      // Fetch general bypass configuration
      const configDocRef = doc(db, "bypassConfig", "global");
      const configSnap = await getDoc(configDocRef);
      const configData = configSnap.exists() ? configSnap.data() : {};

      return res.json({
        success: true,
        message: "License validated successfully / تم التحقق من الترخيص بنجاح",
        key: {
          id: keyDoc.id,
          key: keyData.key,
          type: keyData.type,
          status: keyData.status,
          hwid: keyData.hwid,
          username: keyData.username,
          expiresAt: keyData.expiresAt,
          isLocked: keyData.isLocked ?? true
        },
        bypassConfig: configData
      });

    } catch (error: any) {
      console.error("API validation error:", error);
      return res.status(500).json({
        success: false,
        message: "Server internal error / خطأ داخلي في الخادم",
        error: error.message || error
      });
    }
  });

  // Serve Frontend
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bypass Cloud Server running on http://localhost:${PORT}`);
  });
}

startServer();
