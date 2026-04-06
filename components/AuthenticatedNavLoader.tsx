'use client';

import dynamic from 'next/dynamic';

const AuthenticatedNav = dynamic(() => import('@/components/AuthenticatedNav'), {
  ssr: false,
});

export default function AuthenticatedNavLoader() {
  return <AuthenticatedNav />;
}
