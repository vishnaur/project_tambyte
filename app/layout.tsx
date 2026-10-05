import React from 'react';
import '../src/index.css';

export const metadata = {
  title: 'Tambyte - Campus Study & Tambay Map',
  description: 'Interactive campus map helping students find study and tambay spots.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
