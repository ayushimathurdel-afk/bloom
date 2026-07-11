import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { DataProvider } from '@/components/data-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { ServiceWorkerRegister } from '@/components/service-worker-register'
import { Toaster } from '@/components/ui/sonner'

const themeInitScript = `(function(){try{var m=localStorage.getItem('bloom-theme')||'system';var a=localStorage.getItem('bloom-accent')||'mauve';var c=localStorage.getItem('bloom-corner')||'rounded';if(localStorage.getItem('bloom-accent-random')==='1'){var L=['mauve','lilac','plum','rose','maroon','clay','amber','sage','teal','blue','slate','mono'];var dt=new Date();var s=dt.getFullYear()+'-'+(dt.getMonth()+1)+'-'+dt.getDate();var h=0;for(var i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))>>>0;}a=L[h%L.length];}var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;if(d)r.classList.add('dark');r.setAttribute('data-accent',a);r.setAttribute('data-corner',c);}catch(e){}})();`

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bloom — Workout Tracker',
  description:
    'A simple, private gym workout logger and tracker for women. Log sets, reps and weights, store exercise demo videos, and track progress — all stored privately on your device.',
  generator: 'v0.app',
  applicationName: 'Bloom',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bloom',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon-192.png', type: 'image/png' }],
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf7f5' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1820' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} bg-background`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <DataProvider>{children}</DataProvider>
        </ThemeProvider>
        <Toaster position="top-center" />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
