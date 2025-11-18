require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const { v2: cloudinary } = require('cloudinary');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// HARDCODED — KEEP YOUR VALUES HERE
cloudinary.config({
    cloud_name: 'dwckwnwib',
    api_key: '791958194947791',
    api_secret: ''  // Your full secret
});

console.log('Cloudinary config loaded:', cloudinary.config().cloud_name);

const upload = multer({ dest: 'uploads/' });

// Helper: Start prediction and poll until done
async function runPrediction(version, input) {
  try {
    const startRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version,
        input
      })
    });

    const startData = await startRes.json();
    console.log('Prediction started ID:', startData.id || 'FAILED - Check start response below');
    console.log('Start response status:', startRes.status);  // Expect 201

    if (startRes.status !== 201) {
      console.log('Start error details:', JSON.stringify(startData, null, 2));
      throw new Error(`Start failed with status ${startRes.status}: ${JSON.stringify(startData.error || startData)}`);
    }

    if (startData.error) {
      console.log('Start error:', JSON.stringify(startData.error, null, 2));
      throw new Error(JSON.stringify(startData.error));
    }

    if (!startData.id) {
      throw new Error('No ID returned - invalid version or credits');
    }

    // Poll until succeeded or failed
    while (true) {
      await new Promise(r => setTimeout(r, 2000));  // Poll every 2s
      const statusRes = await fetch(`https://api.replicate.com/v1/predictions/${startData.id}`, {
        headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` }
      });
      const statusData = await statusRes.json();

      console.log('Poll status:', statusData.status);

      if (statusData.status === 'succeeded') {
        return statusData.output;
      } else if (statusData.status === 'failed' || statusData.error) {
        throw new Error(`Prediction failed: ${statusData.error?.detail || statusData.status}`);
      }
      // Keep polling for 'starting' or 'processing'
    }
  } catch (err) {
    console.error('Prediction error:', err.message);
    throw err;
  }
}

app.post('/api/generate-baby', upload.fields([{ name: 'parent1' }, { name: 'parent2' }]), async (req, res) => {
  try {
    const uploadImage = async (file) => {
      const result = await cloudinary.uploader.upload(file.path, { folder: 'faceai' });
      return result.secure_url;
    };

    const parent1Url = await uploadImage(req.files.parent1[0]);
    const parent2Url = await uploadImage(req.files.parent2[0]);

    console.log('✅ Images uploaded:', parent1Url, parent2Url);

    // Single step: Generate baby (Stable Diffusion - LIVE VERIFIED HASH FROM REPLICATE.COM)
    const gender = req.body.gender || 'random';
    const genderText = gender === 'male' ? 'a baby boy' 
                 : gender === 'female' ? 'a baby girl' 
                 : 'a newborn baby';

    const babyPrompt = `Ultra-realistic portrait of ${genderText}, perfect genetic mix of the two parents, 
    beautiful symmetrical face, big expressive eyes, soft baby skin with natural glow, 
    cute chubby cheeks, tiny nose, adorable smile, delicate baby hair, 
    perfect head and shoulder proportions, visible chest, 
    studio soft lighting, shallow depth of field, sharp focus, 
    photorealistic, National Geographic style, 8k resolution, 
    highly detailed skin texture, natural mixed ethnicity, 
    any skin tone from very fair to very dark, 
    age 0–6 months, wearing simple white onesie, clean white background`;

    const babyOutput = await runPrediction("ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4", {
      prompt: babyPrompt,
      negative_prompt: "out of frame, cropped, half body, missing head, deformed, blurry, low quality, bad anatomy, extra limbs, watermark, text, old baby, child, toddler, cartoon, painting",
      num_outputs: 1,
      width: 768,           // taller canvas → no more cut-off heads
      height: 1024,
      num_inference_steps: 50,
      guidance_scale: 8.5
    });

    console.log('✅ Baby generated URL:', babyOutput[0]);
    res.json({ result: babyOutput[0] });  // Direct baby image URL to UI

  } catch (err) {
    console.error('❌ Full error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server LIVE on http://localhost:${PORT}`));