import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://tablero-aea-san-rafael.luisfendyk.chatgpt.site'),
  title: 'Tablero AEA · Predimensionado eléctrico',
  description: 'Diseñador preliminar de tableros eléctricos para proyectos en San Rafael, Mendoza.',
  openGraph: {
    title: 'Tablero AEA',
    description: 'Predimensionado eléctrico · San Rafael',
    images: [{ url: 'https://tablero-aea-san-rafael.luisfendyk.chatgpt.site/og.png', width: 1200, height: 630, alt: 'Tablero AEA · Predimensionado eléctrico · San Rafael' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tablero AEA',
    description: 'Predimensionado eléctrico · San Rafael',
    images: ['https://tablero-aea-san-rafael.luisfendyk.chatgpt.site/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
