import { useState } from 'react';
import { client, postSquared } from '@www/sdk';
import * as styles from './App.css';

// Configure SDK client base URL
client.setConfig({
  baseUrl: 'http://localhost:3000',
});

function App() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(input);
    if (isNaN(num)) return;

    setLoading(true);
    try {
      const response = await postSquared({
        body: { number: num },
      });

      if (response.data) {
        setResult(response.data.result);
      }
    } catch (error) {
      console.error('API error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 className={styles.title}>Squared Calculator</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a number"
          disabled={loading}
          style={{
            padding: '0.5rem',
            fontSize: '1rem',
            marginRight: '0.5rem'
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </form>
      {result !== null && (
        <p style={{ marginTop: '1rem', fontSize: '1.25rem' }}>
          {input}² = <span className={styles.result}>{result}</span>
        </p>
      )}
    </div>
  );
}

export default App;
