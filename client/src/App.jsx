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
    if (!parent1 || !parent2) return alert("Please upload both parents!");

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
          setError('AI failed — try different photos');
          setLoading(false);
        }
      } catch (err) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-blue-600">
          FaceAI
        </h1>
        <p className="text-2xl mb-12">Upload two parents → See your future baby in seconds</p>

        {!result ? (
          <>
            <div className="grid md:grid-cols-2 gap-10 max-w-3xl mx-auto mb-10">
              <div>
                <p className="text-xl font-semibold mb-4">Parent 1</p>
                <input type="file" accept="image/*" onChange={e => setParent1(e.target.files[0])}
                       className="block w-full text-sm text-gray-900 border rounded-lg cursor-pointer" />
                {parent1 && <img src={URL.createObjectURL(parent1)} className="mt-4 rounded-xl shadow-2xl mx-auto max-w-xs" />}
              </div>
              <div>
                <p className="text-xl font-semibold mb-4">Parent 2</p>
                <input type="file" accept="image/*" onChange={e => setParent2(e.target.files[0])}
                       className="block w-full text-sm text-gray-900 border rounded-lg cursor-pointer" />
                {parent2 && <img src={URL.createObjectURL(parent2)} className="mt-4 rounded-xl shadow-2xl mx-auto max-w-xs" />}
              </div>
            </div>

            <div className="mb-8">
              <select value={gender} onChange={e => setGender(e.target.value)}
                      className="px-8 py-4 rounded-lg text-lg mr-6 border">
                <option value="random">Random Gender</option>
                <option value="male">Boy</option>
                <option value="female">Girl</option>
              </select>

              <button onClick={handleGenerate} disabled={loading}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-16 py-5 rounded-xl text-xl font-bold hover:scale-105 transition disabled:opacity-50">
                {loading ? 'Creating your baby... (20–40s)' : 'Generate Baby 👶'}
              </button>
            </div>
          </>
        ) : null}

        {loading && <p className="text-3xl animate-pulse mt-20">AI is imagining your future child...</p>}
        {error && <p className="text-red-600 text-xl">{error}</p>}

        {result && (
          <div className="mt-16">
            <h2 className="text-5xl font-bold mb-10">Your Future Baby 👶</h2>
            <img src={result} alt="Future baby" className="rounded-3xl shadow-2xl mx-auto max-w-2xl border-8 border-white" />
            <button onClick={() => { setResult(null); setParent1(null); setParent2(null); }}
                    className="mt-10 bg-gray-800 text-white px-12 py-5 rounded-xl text-xl hover:bg-gray-900">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;