'use client';

import { useState } from 'react';
import { createParty } from '@/lib/services/partyService';
import type { Party } from '@/lib/types';

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (party: Party, code: string) => void;
}

export default function CreatePartyModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePartyModalProps) {
  const [partyName, setPartyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createParty({ name: partyName || undefined });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.data) {
      onSuccess(result.data.party, result.data.party_code);
      setPartyName('');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md">
        <div className="card animate-scale-in">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Create Party
            </h2>
            <p className="text-sm text-muted">
              Generate a 6-digit code to share with your crew
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="partyName"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                Party Name (Optional)
              </label>
              <input
                type="text"
                id="partyName"
                className="input"
                placeholder="Friday Night Ride"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                maxLength={50}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-(--danger)/10 border border-(--danger)/20">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all bg-card border border-border text-foreground hover:border-muted"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Party'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
