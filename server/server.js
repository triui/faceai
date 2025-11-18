require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const upload = multer({ dest: 'uploads/' });

app.post('/api/generate-baby', upload.fields([{ name: 'parent1' }, { name: 'parent2' }]), async (req, res) => {
  try {
    const parent1 = `https://${req.headers.host}/${req.files.parent1[0].filename}`;
    const parent2 = `https://${req.headers.host}/${req.files.parent2[0].filename}`;

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "9ed22e1d6dbb19c9e4a2d4e8d1c6e82e0699d6c1f94d9c20b3c5a2d4d0b9e8f7", // fofr/face-to-baby (works perfectly Nov 2025)
        input: {
          image_a: parent1,
          image_b: parent2,
          gender: req.body.gender || "random"
        }
      })
    });

    const data = await response.json();
    res.json({ predictionId: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/status/:id', async (req, res) => {
  const response = await fetch(`https://api.replicate.com/v1/predictions/${req.params.id}`, {
    headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` }
  });
  const data = await response.json();
  res.json(data);
});

app.listen(process.env.PORT || 5000, () => console.log('Server running'));