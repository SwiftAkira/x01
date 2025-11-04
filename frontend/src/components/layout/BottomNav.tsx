/**
 * Bottom Navigation Component
 * Fixed bottom navigation for mobile-first experience
 */

import { NavLink } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

export default function BottomNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: 'var(--color-bg-card)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <NavLink
        to={ROUTES.MAP}
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          height: '100%',
          color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-small)',
          transition: 'color var(--transition-fast)',
        })}
      >
        <span style={{ fontSize: '20px', marginBottom: '4px' }}>🗺️</span>
        <span>Map</span>
      </NavLink>

      <NavLink
        to={ROUTES.PARTY_CREATE}
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          height: '100%',
          color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-small)',
          transition: 'color var(--transition-fast)',
        })}
      >
        <span style={{ fontSize: '20px', marginBottom: '4px' }}>👥</span>
        <span>Party</span>
      </NavLink>

      <NavLink
        to={ROUTES.PROFILE}
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          height: '100%',
          color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-small)',
          transition: 'color var(--transition-fast)',
        })}
      >
        <span style={{ fontSize: '20px', marginBottom: '4px' }}>👤</span>
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}
