import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon */}
        <link rel="icon" href="/christunifavcion.png" />
        <link rel="apple-touch-icon" href="/christunifavcion.png" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#254a9a" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="GATED" />
        
        {/* Improved PWA Compatibility */}
        <meta name="application-name" content="GATED" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#254a9a" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* SEO */}
        <meta name="description" content="Secure, efficient entry management for Christ University events and campus access. Register for events, download QR codes, and manage campus entry seamlessly." />
        <meta name="keywords" content="Christ University, Gated Access, QR Code, Campus Entry, Event Management, Security" />
        
        {/* Open Graph / Social Media */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Christ University Gated Access Management" />
        <meta property="og:description" content="Secure, efficient entry management for Christ University events and campus access" />
        <meta property="og:image" content="/christunilogo.png" />
        
        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/icon-512x512.png" />
        
        {/* Additional Icons */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
