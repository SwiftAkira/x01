/**
 * App Component
 * Main application component with routing configuration
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Lazy-loaded pages for code splitting
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/Auth/Login'));
const Register = lazy(() => import('@/pages/Auth/Register'));
const Map = lazy(() => import('@/pages/Map'));
const Party = lazy(() => import('@/pages/Party'));
const Profile = lazy(() => import('@/pages/Profile'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
            <Route path={ROUTES.MAP} element={<Map />} />
            <Route path={ROUTES.PARTY_CREATE} element={<Party />} />
            <Route path={ROUTES.PARTY_JOIN} element={<Party />} />
            <Route path={ROUTES.PROFILE} element={<Profile />} />
            <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
            <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
