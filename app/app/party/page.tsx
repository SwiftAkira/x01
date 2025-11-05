'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentParty, leaveParty } from '@/lib/services/partyService';
import type { PartyWithMembers } from '@/lib/types';
import CreatePartyModal from './CreatePartyModal';
import JoinPartyModal from './JoinPartyModal';
import PartyMemberList from './PartyMemberList';

export default function PartyPage() {
  const router = useRouter();
  const [currentParty, setCurrentParty] = useState<PartyWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const checkAuth = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }
  };

  const loadCurrentParty = async () => {
    const result = await getCurrentParty();
    if (result.data) {
      setCurrentParty(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
    loadCurrentParty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time subscription for party member changes
  useEffect(() => {
    if (!currentParty?.id) return;

    const supabase = createClient();

    // Subscribe to changes in party_members table for this party
    const channel = supabase
      .channel(`party-${currentParty.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Someone joined
          schema: 'public',
          table: 'party_members',
          filter: `party_id=eq.${currentParty.id}`,
        },
        (payload) => {
          console.log('🎉 New member joined:', payload);
          loadCurrentParty();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE', // Someone left
          schema: 'public',
          table: 'party_members',
          filter: `party_id=eq.${currentParty.id}`,
        },
        (payload) => {
          console.log('👋 Member left:', payload);
          loadCurrentParty();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Member status updated
          schema: 'public',
          table: 'party_members',
          filter: `party_id=eq.${currentParty.id}`,
        },
        (payload) => {
          console.log('🔄 Member updated:', payload);
          loadCurrentParty();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentParty?.id]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    loadCurrentParty();
  };

  const handleJoinSuccess = () => {
    setShowJoinModal(false);
    loadCurrentParty();
  };

  const handleLeaveParty = async () => {
    if (!currentParty) return;

    const result = await leaveParty(currentParty.id);
    if (!result.error) {
      setCurrentParty(null);
      setShowLeaveConfirm(false);
    }
  };

  const copyPartyCode = () => {
    if (currentParty?.party_code) {
      navigator.clipboard.writeText(currentParty.party_code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Party</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-lg font-semibold transition-all bg-card border border-border text-foreground hover:border-muted"
          >
            Dashboard
          </button>
        </div>

        {/* Current Party or Join/Create Options */}
        {currentParty ? (
          <>
            {/* Party Info Card */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {currentParty.name || 'Unnamed Party'}
                  </h2>
                  <p className="text-sm text-muted">
                    {currentParty.member_count} members active
                  </p>
                </div>
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="px-4 py-2 rounded-lg font-semibold transition-all bg-(--danger)/10 border border-(--danger)/20 text-danger hover:bg-(--danger)/20"
                >
                  Leave
                </button>
              </div>

              {/* Party Code */}
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs text-muted mb-2">
                  Party Code
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-primary tracking-widest">
                    {currentParty.party_code}
                  </span>
                  <button
                    onClick={copyPartyCode}
                    className="px-4 py-2 rounded-lg font-semibold transition-all bg-primary text-black hover:bg-(--primary-hover)"
                  >
                    {copySuccess ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-muted mt-2">
                  Share this code with friends to join your party
                </p>
              </div>
            </div>

            {/* Party Members */}
            <PartyMemberList partyId={currentParty.id} />
          </>
        ) : (
          /* No Party - Show Join/Create Options */
          <div className="space-y-4">
            <div className="card text-center py-8">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Not in a party
              </h2>
              <p className="text-sm text-muted mb-6">
                Create a new party or join an existing one
              </p>

              <div className="flex gap-4 max-w-md mx-auto">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 btn-primary"
                >
                  Create Party
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all bg-card border border-border text-foreground hover:border-primary"
                >
                  Join Party
                </button>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <div className="text-4xl mb-3">🚀</div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Real-Time Tracking
                </h3>
                <p className="text-sm text-muted">
                  See your crew&apos;s live location with ultra-low latency updates
                </p>
              </div>
              <div className="card">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  6-Digit Codes
                </h3>
                <p className="text-sm text-muted">
                  Simple codes make joining parties quick and easy
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leave Confirmation Modal */}
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowLeaveConfirm(false)}
            />
            <div className="relative w-full max-w-md">
              <div className="card animate-scale-in">
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Leave Party?
                </h3>
                <p className="text-sm text-muted mb-6">
                  Are you sure you want to leave this party? You&apos;ll need the code
                  to rejoin.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all bg-card border border-border text-foreground hover:border-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLeaveParty}
                    className="flex-1 btn-danger"
                  >
                    Leave Party
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreatePartyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
      <JoinPartyModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={handleJoinSuccess}
      />

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
