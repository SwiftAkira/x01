/**
 * LocationControls Component
 * UI controls for location sharing, connection status, and GPS accuracy
 */

import { useParty } from '@/contexts/PartyContext';
import { useAuth } from '@/contexts/AuthContext';

interface LocationControlsProps {
  className?: string;
}

export default function LocationControls({ className = '' }: LocationControlsProps) {
  const {
    isLocationSharing,
    locationError,
    currentUserLocation,
    startLocationSharing,
    stopLocationSharing,
    isConnected,
  } = useParty();
  const { user } = useAuth();

  if (!user) return null;

  const handleToggleLocationSharing = async () => {
    if (isLocationSharing) {
      stopLocationSharing();
    } else {
      await startLocationSharing();
    }
  };

  const getAccuracyLevel = (accuracy: number): { text: string; color: string } => {
    if (accuracy <= 10) return { text: 'Excellent', color: '#52C41A' };
    if (accuracy <= 20) return { text: 'Good', color: '#73D13D' };
    if (accuracy <= 50) return { text: 'Fair', color: '#FFA940' };
    return { text: 'Poor', color: '#FF4D4F' };
  };

  const accuracy = currentUserLocation?.accuracy || 0;
  const accuracyLevel = getAccuracyLevel(accuracy);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        zIndex: 10,
        minWidth: '280px',
      }}
    >
      {/* Connection Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isConnected ? '#52C41A' : '#FF4D4F',
            boxShadow: `0 0 8px ${isConnected ? '#52C41A' : '#FF4D4F'}`,
          }}
        />
        <span style={{ color: 'white', fontSize: '12px', fontWeight: '500' }}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Location Sharing Toggle */}
      <button
        onClick={handleToggleLocationSharing}
        disabled={!isConnected}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: isLocationSharing
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #434343 0%, #000000 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: isConnected ? 'pointer' : 'not-allowed',
          opacity: isConnected ? 1 : 0.5,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
        onMouseEnter={(e) => {
          if (isConnected) {
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <span style={{ fontSize: '16px' }}>
          {isLocationSharing ? '📍' : '📍'}
        </span>
        {isLocationSharing ? 'Sharing Location' : 'Start Sharing Location'}
      </button>

      {/* GPS Accuracy Indicator */}
      {isLocationSharing && currentUserLocation && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>📡</span>
            <span style={{ color: 'white', fontSize: '12px' }}>GPS Accuracy:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: accuracyLevel.color, fontSize: '12px', fontWeight: '600' }}>
              {accuracyLevel.text}
            </span>
            <span style={{ color: '#999', fontSize: '11px' }}>
              (±{Math.round(accuracy)}m)
            </span>
          </div>
        </div>
      )}

      {/* Speed Indicator */}
      {isLocationSharing && currentUserLocation && currentUserLocation.speed !== null && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>🏃</span>
            <span style={{ color: 'white', fontSize: '12px' }}>Current Speed:</span>
          </div>
          <span style={{ color: '#4ECDC4', fontSize: '14px', fontWeight: '600' }}>
            {Math.round(currentUserLocation.speed * 3.6)} km/h
          </span>
        </div>
      )}

      {/* Location Error */}
      {locationError && (
        <div
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'rgba(255, 77, 79, 0.2)',
            border: '1px solid #FF4D4F',
            borderRadius: '6px',
            color: '#FF4D4F',
            fontSize: '11px',
            textAlign: 'center',
          }}
        >
          {locationError}
        </div>
      )}

      {/* Info Message */}
      {!isLocationSharing && !locationError && (
        <p
          style={{
            margin: 0,
            color: '#999',
            fontSize: '11px',
            textAlign: 'center',
            lineHeight: '1.4',
          }}
        >
          Enable location sharing to see your position and share it with party members
        </p>
      )}
    </div>
  );
}
