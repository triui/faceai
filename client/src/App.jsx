import { useState } from 'react';
import axios from 'axios';

function App() {
  const [parent1, setParent1] = useState(null);
  const [parent2, setParent2] = useState(null);
  const [gender, setGender] = useState('random');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!parent1 || !parent2) return alert("Upload both parents!");

    setLoading(true);
    setResult(null);
    setError('');

    const formData = new FormData();
    formData.append('parent1', parent1);
    formData.append('parent2', parent2);
    formData.append('gender', gender);

    try {
      const res = await axios.post('/api/generate-baby', formData);
      pollResult(res.data.predictionId);
    } catch (err) {
      setError('Upload failed');
      setLoading(false);
    }
  };

  const pollResult = async (id) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/status/${id}`);
        if (res.data.status === 'succeeded') {
          clearInterval(interval);
          setResult(res.data.output[0]);
          setLoading(false);
        } else if (res.data.status === 'failed') {
          clearInterval(interval);
          setError('Try different photos');
          setLoading(false);
        }
      } catch (err) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 p-4">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-6xl font-bold mt-10 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600">
          FaceAI
        </h1>
        <p className="text-2xl mb-12 text-gray-700">See your future baby in seconds 👶</p>

        {!result && (
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div>
              <p className="text-xl font-bold mb-4">Parent 1</p>
              <input type="file" accept="image/*" onChange={e => setParent1(e.target.files[0])} className="block w-full" />
              {parent1 && <img src={URL.createObjectURL(parent1)} className="mt-6 rounded-2xl shadow-2xl max-w-sm mx-auto" alt="Parent 1" />}
            </div>
            <div>
              <p className="text-xl font-bold mb-4">Parent 2</p>
              <input type="file" accept="image/*" onChange={e => setParent2(e.target.files[0])} className="block w-full" />
              {parent2 && <img src={URL.createObjectURL(parent2)} className="mt-6 rounded-2xl shadow-2xl max-w-sm mx-auto" alt="Parent 2" />}
            </div>
          </div>
        )}

        {!result && (
          <div className="mt-12">
            <select value={gender} onChange={e => setGender(e.target.value)} className="px-8 py-4 rounded-xl text-lg mr-6 border-2">
              <option value="random">Random</option>
              <option value="male">Boy</option>
              <option value="female">Girl</option>
            </select>
            <button onClick={handleGenerate} disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-16 py-5 rounded-xl text-2xl font-bold hover:scale-105 transition disabled:opacity-50">
              {loading ? 'Creating magic... (20–40s)' : 'Generate Baby'}
            </button>
          </div>
        )}

        {loading && <p className="text-4xl mt-20 animate-pulse">AI is imagining your child...</p>}
        {error && <p className="text-red-600 text-xl mt-10">{error}</p>}

        {result && (
          <div className="mt-20">
            <h2 className="text-5xl font-bold mb-10">Your Future Baby 👶</h2>
            <img src={result} alt="Future baby" className="rounded-3xl shadow-2xl mx-auto max-w-2xl border-8 border-white" />
            <button onClick={() => { setResult(null); setParent1(null); setParent2(null); setGender('random'); }}
              className="mt-12 bg-gray-800 text-white px-12 py-5 rounded-xl text-xl hover:bg-gray-900">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;