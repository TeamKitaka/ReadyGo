'use client';

import { Home } from '@/components/home';
import { LandingPage } from '@/components/landing/landingPage';
import { useAuth } from '@/commons/providers/auth/auth.provider';

export default function HomePage() {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) {
    return <Home />;
  }

  return <LandingPage />;
}
