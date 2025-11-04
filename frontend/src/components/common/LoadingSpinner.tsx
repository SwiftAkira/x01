/**
 * Loading Spinner Component
 */

export default function LoadingSpinner() {
  return (
    <div className="loading">
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--color-border)',
          borderTop: '4px solid var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
