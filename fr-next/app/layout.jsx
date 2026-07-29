import './globals.css';

/* =====================================================================
   Root layout.

   The <body> renders `children` directly with no wrapper element. That is
   deliberate and load-bearing: platform.html styles `body.locked > nav.top`
   and four siblings of it, so anything between <body> and the page's own
   top-level elements would silently break the sign-in blur.

   Fonts stay as the same Google Fonts stylesheet the static pages used,
   declared here once rather than per page.
   ===================================================================== */
export const metadata = {
  title: 'FR Services — Fleet Rental',
  description: 'Vehicle, heavy equipment and towing rental across the Philippines.',
  icons: { icon: '/logo.png' }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }){
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
