import { useState } from 'react';
import { motion } from 'framer-motion';

interface ManualEntryProps {
  onVerify: (visitorId: string) => void;
}

export default function ManualEntry({ onVerify }: ManualEntryProps) {
  const [manualId, setManualId] = useState('');

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = manualId.trim();
    if (trimmedId) {
      onVerify(trimmedId);
      setManualId('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center space-x-3 mb-4">
        <svg className="w-6 h-6 text-tertiary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <h3 className="text-lg md:text-xl font-semibold text-gray-800">
          Manual Entry
        </h3>
      </div>
      <form onSubmit={handleManualSubmit} className="space-y-4">
        <div>
          <label className="label">Enter Visitor ID</label>
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Paste or type visitor ID"
            className="input-field"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-tertiary-600 hover:bg-tertiary-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Verify Access</span>
        </button>
      </form>
    </motion.div>
  );
}
