/**
 * Root Layout
 */
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/lib/query-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'School Management System',
  description: 'Comprehensive school management solution for students, teachers, and administrators',
  keywords: ['school', 'management', 'education', 'students', 'teachers'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          {children}
          <Toaster 
            position="top-right" 
            richColors 
            closeButton 
            duration={4000}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
