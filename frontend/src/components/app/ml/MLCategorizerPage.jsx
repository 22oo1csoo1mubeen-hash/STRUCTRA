import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { classifyExpense, fetchMLModelInfo } from '../../../api/ml';

const PRESET_SAMPLES = [
  { label: '☕ Starbucks', vendor: 'Starbucks Coffee', items: 'Iced Caramel Macchiato & Croissant' },
  { label: '☁️ AWS Cloud', vendor: 'AWS Amazon Web Services', items: 'EC2 Instance Billing & S3 Storage' },
  { label: '🚕 Uber Ride', vendor: 'Uber', items: 'Trip Fare Downtown Ride to Airport' },
  { label: '💊 CVS Pharmacy', vendor: 'CVS Pharmacy', items: 'Prescription Medication & Pain Reliever' },
  { label: '⚖️ Deloitte Audit', vendor: 'Deloitte', items: 'Corporate Financial Tax Compliance Audit' },
  { label: '🎬 AMC Cinema', vendor: 'AMC Theatres', items: 'IMAX Cinema Movie Pass & Large Popcorn' },
  { label: '🛠️ Home Depot', vendor: 'Home Depot', items: 'DeWalt Cordless Drill & Paint Can' },
  { label: '🛒 Whole Foods', vendor: 'Whole Foods Market', items: 'Organic Fresh Salmon & Sourdough Bread' },
];

export default function MLCategorizerPage() {
  const [vendorName, setVendorName] = useState('Starbucks Coffee');
  const [itemsText, setItemsText] = useState('Iced Caramel Macchiato');
  const [prediction, setPrediction] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch model metadata on mount
  useEffect(() => {
    fetchMLModelInfo()
      .then((info) => setModelInfo(info))
      .catch((err) => console.error('Failed to load ML info:', err));
  }, []);

  // Run ML inference whenever vendor or items change
  useEffect(() => {
    if (!vendorName.trim() && !itemsText.trim()) {
      setPrediction(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await classifyExpense(vendorName, itemsText);
        setPrediction(res);
      } catch (err) {
        setError(err.message || 'ML Prediction Error');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [vendorName, itemsText]);

  const handleSelectPreset = (sample) => {
    setVendorName(sample.vendor);
    setItemsText(sample.items);
  };

  return (
    <div
      style={{
        padding: '32px 40px',
        maxWidth: 1200,
        margin: '0 auto',
        color: '#ffffff',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(249, 115, 22, 0.4)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
              </svg>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              ML Expense Categorizer
            </h1>
          </div>
          <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.65)', fontSize: 14 }}>
            Trained Machine Learning Model powered by <strong>10,000 Dataset Samples</strong> across <strong>15 Categories</strong>
          </p>
        </div>

        {/* Model Badge */}
        {modelInfo && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              padding: '10px 16px',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', fontSize: 11 }}>MODEL ALGORITHM</span>
              <strong style={{ color: '#ffb347' }}>{modelInfo.model_type}</strong>
            </div>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', fontSize: 11 }}>DATASET SIZE</span>
              <strong style={{ color: '#38bdf8' }}>{modelInfo.total_training_samples.toLocaleString()} Rows</strong>
            </div>
          </div>
        )}
      </motion.div>

      {/* Preset Chips */}
      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 10 }}>
          PRESET TEST SAMPLES
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESET_SAMPLES.map((sample, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(249, 115, 22, 0.25)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectPreset(sample)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 20,
                padding: '7px 14px',
                color: '#fff',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {sample.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left Column: Interactive Input */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 18, color: '#f97316' }}>
            Input Receipt Text
          </h2>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 6 }}>
              Vendor / Merchant Name
            </label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g. Starbucks, AWS, Uber..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 6 }}>
              Line Items / Description
            </label>
            <textarea
              rows={4}
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              placeholder="e.g. Iced Caramel Macchiato, Double Espresso..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </motion.div>

        {/* Right Column: ML Prediction & Probabilities */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 18, color: '#38bdf8' }}>
            ML Classification Result
          </h2>

          <AnimatePresence mode="wait">
            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Running ML Inference...
              </div>
            ) : error ? (
              <div style={{ color: '#ef4444', padding: 20 }}>{error}</div>
            ) : prediction ? (
              <motion.div
                key={prediction.predicted_category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Predicted Category Card */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(234, 88, 12, 0.08) 100%)',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    marginBottom: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 12, textTransform: 'uppercase', color: '#ffb347', letterSpacing: '0.05em' }}>
                      PREDICTED CATEGORY
                    </span>
                    <h3 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 0 0', color: '#ffffff' }}>
                      {prediction.predicted_category}
                    </h3>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', display: 'block' }}>CONFIDENCE</span>
                    <strong style={{ fontSize: 20, color: '#4ade80' }}>
                      {(prediction.confidence_score * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>

                {/* Probability Distribution */}
                <div>
                  <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 12px 0' }}>
                    Top Probability Distribution
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {prediction.top_probabilities.map((item, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ color: i === 0 ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                            {item.category}
                          </span>
                          <span style={{ color: i === 0 ? '#ffb347' : 'rgba(255,255,255,0.5)', fontWeight: i === 0 ? 600 : 400 }}>
                            {(item.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.probability * 100}%` }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                            style={{
                              height: '100%',
                              background: i === 0 ? 'linear-gradient(90deg, #f97316, #ffb347)' : 'rgba(255,255,255,0.3)',
                              borderRadius: 3,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>
                Enter text above to perform ML classification
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
