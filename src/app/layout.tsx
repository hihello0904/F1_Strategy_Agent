import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'F1 Strategy Agent | AI-Powered Race Strategy',
  description: 'An AI-powered F1 race strategy assistant that generates optimal pit stop strategies using natural language processing.',
  keywords: ['F1', 'Formula 1', 'Race Strategy', 'AI', 'Pit Stop', 'Tire Strategy'],
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏎️</text></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

