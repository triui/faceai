require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const { v2: cloudinary } = require('cloudinary');

const app = express();
app.use(cors());
app.use(express.json());

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_URL.split('@')[1].split('/')[0],
  api_key: process.env.CLOUDINARY_URL.split('//')[1].split(':')[0],
  api_secret: process.env.CLOUDINARY_URL.split(':')[1].split('@')[0]
});

const upload = multer({ dest: 'uploads/' });

app.post('/api/generate-baby', upload.fields([{ name: 'parent1' }, { name: 'parent2' }]), async (req, res) => {
  try {
    // Upload both images to Cloudinary
    const uploadImage = async (file) => {
      const result = await cloudinary.uploader.upload(file.path, { folder: 'faceai' });
      return result.secure_url;
    };

    const parent1Url = await uploadImage(req.files.parent1[0]);
    const parent2Url = await uploadImage(req.files.parent2[0]);

    console.log('Images uploaded:', parent1Url, parent2Url);

    const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "9ed22e1d6dbb19c9e4a2d4e8d1c6e82e0699d6c1f94d9c20b3c5a2d4d0b9e8f7",
        input: {
          image_a: parent1Url,
          image_b: parent2Url,
          gender: req.body.gender || "random"
        }
      })
    });

    const data = await replicateRes.json();
    if (data.error) throw new Error(data.error.detail || data.error);
    
    res.json({ predictionId: data.id });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Poll endpoint stays the same
app.get('/api/status/:id', async (req, res) => {
  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${req.params.id}`, {
      headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ready on port ${PORT}`));