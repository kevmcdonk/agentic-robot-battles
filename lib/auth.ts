import { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import GitHubProvider from 'next-auth/providers/github';
import FacebookProvider from 'next-auth/providers/facebook';

function getAdminEmails(): string[] {
  const allowlist = process.env.ADMIN_EMAIL_ALLOWLIST ?? '';
  return allowlist
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function buildProviders() {
  const providers = [];

  // Azure AD / Microsoft — use "common" tenant for personal + org accounts
  if (process.env.AZURE_AD_CLIENT_ID) {
    providers.push(
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? '',
        tenantId: process.env.AZURE_AD_TENANT_ID || 'common',
      }),
    );
  }

  if (process.env.GITHUB_CLIENT_ID) {
    providers.push(
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      }),
    );
  }

  if (process.env.FACEBOOK_CLIENT_ID) {
    providers.push(
      FacebookProvider({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? '',
      }),
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        // Build a stable user ID from the provider + provider account id
        const providerAccountId = account.providerAccountId;
        token.userId = `${account.provider}:${providerAccountId}`;

        // Resolve email from profile or account
        const email =
          (profile as Record<string, unknown>)?.email as string | undefined
          ?? token.email
          ?? '';
        token.email = email;

        const adminEmails = getAdminEmails();
        token.roles = adminEmails.includes(email.toLowerCase()) ? ['admin'] : [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.userId as string ?? token.sub ?? '';
        (session.user as Record<string, unknown>).roles = token.roles as string[] ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
};
