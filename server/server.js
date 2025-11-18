console.log("1 — CWD:", process.cwd());
console.log("2 — DIRNAME:", __dirname);
console.log("3 — BEFORE CONFIG:", process.env.REPLICATE_API_TOKEN);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

console.log("4 — AFTER CONFIG:", process.env.REPLICATE_API_TOKEN);
console.log("ENV TEST:", process.env.REPLICATE_API_TOKEN);

// --------------------
// IMPORTS (CommonJS)
// --------------------
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fetch = require("node-fetch");

const app = express();

// --------------------
// MIDDLEWARE
// --------------------
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const upload = multer({ dest: "uploads/" });

// --------------------
// BABY GENERATION ENDPOINT
// --------------------
app.post(
  "/api/generate-baby",
  upload.fields([{ name: "parent1" }, { name: "parent2" }]),
  async (req, res) => {
    try {
      const host = req.headers.host;
      const parent1Url = `https://${host}/uploads/${req.files.parent1[0].filename}`;
      const parent2Url = `https://${host}/uploads/${req.files.parent2[0].filename}`;

      console.log("ENV TEST 2:", process.env.REPLICATE_API_TOKEN);

      const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "9ed22e1d6dbb19c9e4a2d4e8d1c6e82e0699d6c1f94d9c20b3c5a2d4d0b9e8f7",
          input: {
            image_a: parent1Url,
            image_b: parent2Url,
            gender: req.body.gender || "random",
          },
        }),
      });

      const data = await replicateRes.json();
      if (data.error) throw new Error(data.error);

      res.json({ predictionId: data.id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// --------------------
// STATUS ENDPOINT
// --------------------
console.log("ENV TEST 3:", process.env.REPLICATE_API_TOKEN);

app.get("/api/status/:id", async (req, res) => {
  try {
    console.log("ENV TEST 4:", process.env.REPLICATE_API_TOKEN);

    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${req.params.id}`,
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// SERVER START
// --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
