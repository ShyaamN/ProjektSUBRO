import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProjektSUBRO — Claims to capital',
  description: 'A synthetic underwriting and bounded autonomous claims recovery demonstration.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
