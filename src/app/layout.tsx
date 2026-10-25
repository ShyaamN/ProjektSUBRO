import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProjektSUBRO — Claims to capital',
  description: 'Evaluate denied claims, manage clinic offers, and track evidence-led recovery.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
