import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { DEFAULT_CONTENT } from './(public)/_content/copy';
import './globals.css';

// Self-hosted from the @fontsource packages: no runtime request to a font CDN,
// and the build works offline.
const chakraPetch = localFont({
  variable: '--font-chakra-petch',
  display: 'swap',
  src: [
    { path: './fonts/chakra-petch-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/chakra-petch-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/chakra-petch-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
});

const jetBrainsMono = localFont({
  variable: '--font-jetbrains-mono',
  display: 'swap',
  src: [
    { path: './fonts/jetbrains-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/jetbrains-mono-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
});

/**
 * Fallback for every route that does not set its own — `/` overrides it with
 * whatever copy is live, so the one hardcoded pair in the repo lives in
 * `copy.ts` and nowhere else.
 */
export const metadata: Metadata = {
  // Card images are declared as absolute paths; without this the crawler gets
  // "/og.jpg" and has nothing to resolve it against.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://scroll-3d.rahmanef.com'),
  title: DEFAULT_CONTENT.title,
  description: DEFAULT_CONTENT.description,
};

export const viewport: Viewport = {
  themeColor: '#04060c',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${chakraPetch.variable} ${jetBrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
