/**
 * 404 Not Found Page
 */

import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', paddingTop: 'var(--spacing-3xl)' }}>
      <h1 style={{ fontSize: '72px', marginBottom: 'var(--spacing-md)' }}>404</h1>
      <h2>Page Not Found</h2>
      <p className="text-secondary" style={{ marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
        The page you're looking for doesn't exist.
      </p>

      <button
        onClick={() => navigate(ROUTES.HOME)}
        style={{
          padding: 'var(--spacing-md) var(--spacing-xl)',
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-bg)',
          fontWeight: 'var(--font-weight-bold)',
          borderRadius: 'var(--radius-lg)',
          fontSize: 'var(--font-size-body)',
        }}
      >
        Go Home
      </button>
    </div>
  );
}
