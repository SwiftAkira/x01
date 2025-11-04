/**
 * Main Layout Component
 * Wrapper for all pages with bottom navigation
 */

import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: showNav ? '60px' : '0' }}>
      <main>{children}</main>
      {showNav && <BottomNav />}
    </div>
  );
}
