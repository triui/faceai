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
    api_secret: 'Dz0a8vrjTvpRdsWb3BPd0Xc8V94'  // Your full secret
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
      const timestamp = Math.round(new Date().getTime() / 1000);  // Manual timestamp (fixes signature)
      const result = await cloudinary.uploader.upload(file.path, { 
        folder: 'faceai',
        timestamp: timestamp  // Explicit timestamp for signing
      });
      return result.secure_url;
    };

    const parent1Url = await uploadImage(req.files.parent1[0]);
    const parent2Url = await uploadImage(req.files.parent2[0]);

    console.log('✅ Images uploaded:', parent1Url, parent2Url);

    // Step 1: Detailed description of parent1 (your hash)
    const parent1Desc = await runPrediction("cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2", {
      image: parent1Url,
      prompt: "Analyze the face in detail: ethnicity/race (e.g., Caucasian, Asian, African, Latino, mixed), skin tone (fair/light/medium/olive/dark/ebony), face shape (oval/round/square/heart/diamond), age estimate (e.g., 25-35), hair color and style (blonde straight, black curly), eye color and shape (blue almond, brown round), nose shape (wide/narrow), lip shape (full/thin), distinctive features (freckles, wrinkles, glasses)."
    });
    console.log('Parent 1 description:', parent1Desc);

    // Step 2: Detailed description of parent2 (same hash)
    const parent2Desc = await runPrediction("cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2", {
      image: parent2Url,
      prompt: "Analyze the face in detail: ethnicity/race (e.g., Caucasian, Asian, African, Latino, mixed), skin tone (fair/light/medium/olive/dark/ebony), face shape (oval/round/square/heart/diamond), age estimate (e.g., 25-35), hair color and style (blonde straight, black curly), eye color and shape (blue almond, brown round), nose shape (wide/narrow), lip shape (full/thin), distinctive features (freckles, wrinkles, glasses)."
    });
    console.log('Parent 2 description:', parent2Desc);

    // Step 3: Generate blended baby (your SD hash)
    const gender = req.body.gender || 'random';
    const genderText = gender === 'male' ? 'baby boy' : gender === 'female' ? 'baby girl' : 'newborn baby';
// const babyPrompt = `
// (photorealistic raw photo:1.3), portrait of a ${genderText},
// a genetically accurate blend of ${parent1Desc} and ${parent2Desc},
// all features must be a **true 50/50 averaged combination** of both parents,
// no single parent's features should dominate.

// Skin tone: a realistic median mixture of both parents' tones,
// not extremely light, not extremely dark — a smooth blended tone.

// Hair: Baby hair color and texture must be a **soft mixed blend**
// derived from *both* parents' hair colors (no fully blonde, no single-parent dominance),
// with natural baby-fuzz texture.

// Eyes: Eye color must reflect a **combined genetic mix from both parents**,
// avoid bright blue, bright green, or any color unless *both parents share it*.
// Use a natural blended shade between both parents' eye colors.

// Face: rounded baby cheeks, tiny nose averaged from parents,
// balanced mix of jawline, mouth shape, eyelid type from each parent.

// Lighting: professional soft studio lighting, neutral white background,
// full head and shoulders visible, centered composition, sharp focus,
// age ~3 months, realistic pores, natural soft glow.
// `;

const babyPrompt = `(photorealistic raw photo:1.3), portrait of a ${genderText}, 
blend of half white frekle skin with orange hair and half african with dark skin curl hair,
 Lighting: professional soft studio lighting, neutral white background,
 ace: rounded baby cheeks, tiny nose averaged from parents`; //this is a static text generated to verify two known photos uploaded

const babyOutput = await runPrediction(
  "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4",
  {
    prompt: babyPrompt,
    negative_prompt: `fully dark skin, fully white skin,
      fully blonde hair, extremely light eyes, blue eyes, green eyes,
      features from only one parent, incorrect ethnicity preset,
      cartoon, illustration, deformed, distorted, low quality,
      adult, toddler, old child, artifacts, watermark, text,
      out of frame, cropped, half body, missing head, deformed, blurry,
    `,
    num_outputs: 1,
    width: 512,
    height: 768,
    num_inference_steps: 60,
    guidance_scale: 10
  }
);


    console.log('✅ Blended baby generated URL:', babyOutput[0]);
    res.json({ result: babyOutput[0] });

  } catch (err) {
    console.error('❌ Full error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server LIVE on http://localhost:${PORT}`));