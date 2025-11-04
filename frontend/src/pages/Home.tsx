/**
 * Home/Landing Page
 */

import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
      <h1 style={{ marginTop: 'var(--spacing-3xl)', marginBottom: 'var(--spacing-md)' }}>
        Welcome to SpeedLink
      </h1>
      <p style={{ fontSize: 'var(--font-size-h3)', marginBottom: 'var(--spacing-xl)' }}>
        Real-time group navigation and speed camera alerts
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', maxWidth: '300px', margin: '0 auto' }}>
        <button
          onClick={() => navigate(ROUTES.MAP)}
          style={{
            padding: 'var(--spacing-md)',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-bg)',
            fontWeight: 'var(--font-weight-bold)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--font-size-body)',
          }}
        >
          Open Map
        </button>

        <button
          onClick={() => navigate(ROUTES.LOGIN)}
          style={{
            padding: 'var(--spacing-md)',
            backgroundColor: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            fontWeight: 'var(--font-weight-semibold)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-body)',
          }}
        >
          Log In
        </button>
      </div>
    </div>
  );
}
