import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AuthProvider } from '../commons/providers/auth/auth.provider';
import { PresenceProvider } from '../commons/providers/presence/presence.provider';
import { UserStatusProvider } from '../commons/providers/user-status/user-status.provider';
import { NextThemesProvider } from '../commons/providers/next-themes/next-themes.provider';
import { ModalProvider } from '../commons/providers/modal/modal.provider';
import { AuthGuard } from '../commons/providers/auth/auth.guard';
import { Layout } from '../commons/layout';

const pretendard = localFont({
  src: '../fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  weight: '100 900',
  display: 'swap',
  preload: false, // 폰트 preload 비활성화 (경고 방지)
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'ReadyGo',
  description: '게이머를 위한 매칭 플랫폼',
  icons: {
    icon: '/icons/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${pretendard.variable}  antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <PresenceProvider>
            <UserStatusProvider>
              <NextThemesProvider>
                <ModalProvider>
                  <AuthGuard>
                    <Layout>{children}</Layout>
                  </AuthGuard>
                </ModalProvider>
              </NextThemesProvider>
            </UserStatusProvider>
          </PresenceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
