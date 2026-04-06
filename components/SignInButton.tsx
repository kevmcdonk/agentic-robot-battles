'use client';

import { signIn, getProviders } from 'next-auth/react';
import { useEffect, useState } from 'react';

type Provider = { id: string; name: string };

const providerIcons: Record<string, React.ReactNode> = {
  'azure-ad': (
    <svg viewBox="0 0 23 23" className="w-6 h-6" aria-hidden="true">
      <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
      <path fill="#f35325" d="M1 1h10v10H1z"/>
      <path fill="#81bc06" d="M12 1h10v10H12z"/>
      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
      <path fill="#ffba08" d="M12 12h10v10H12z"/>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#1877F2]" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
};

const providerLabels: Record<string, string> = {
  'azure-ad': 'Microsoft',
  github: 'GitHub',
  facebook: 'Facebook',
};

export default function SignInButton() {
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    getProviders().then((p) => {
      if (p) {
        setProviders(Object.values(p));
      }
    });
  }, []);

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => signIn(provider.id, { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#2a2a2a] border border-[#FFD700] text-[#FFD700] font-bold text-lg uppercase tracking-widest rounded hover:bg-[#FFD700] hover:text-[#1a1a1a] active:scale-95 transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-[#FFD700]/50"
          aria-label={`Sign in with ${providerLabels[provider.id] ?? provider.name}`}
        >
          {providerIcons[provider.id] ?? null}
          Sign in with {providerLabels[provider.id] ?? provider.name}
        </button>
      ))}
    </div>
  );
}
