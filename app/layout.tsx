import type { Metadata } from 'next'
import { Montserrat, Roboto } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-montserrat',
})

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-roboto',
})

import Script from 'next/script'

import { Toaster } from "@/components/ui/sonner"
import { Analytics } from '@vercel/analytics/next'
import LoadingTransition from "@/components/loading-transition"
import OfflineDetector from "@/components/offline-detector"
import { ThemeColorManager } from "@/components/theme-color-manager"
import "./suppress-dev-logs"

export const metadata: Metadata = {
  title: 'PredictSales - CRM Intuitivo',
  description: 'PredictSales - CRM Intuitivo',
  generator: 'PredictSales',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/predict-icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/predict-icon.png" />
        <link rel="manifest" href="/manifest.json?v=4" />

        {/* PWA Meta Tags - Android Status Bar & Navigation Bar */}
        <meta name="theme-color" content="#F8FAFC" id="theme-color-meta" />
        <meta name="theme-color" content="#24292E" media="(prefers-color-scheme: dark)" />
        <meta name="msapplication-navbutton-color" content="#24292E" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS Specific Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PredictSales" />

        {/* Application Name */}
        <meta name="application-name" content="PredictSales" />

        {/* Disable auto phone number detection */}
        <meta name="format-detection" content="telephone=no" />

        {/* Viewport optimizations for PWA */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />

        {/* Preconnect and DNS Prefetch */}
        <link rel="preconnect" href="https://api.sandbox.sankhya.com.br" />
        <link rel="dns-prefetch" href="https://api.sandbox.sankhya.com.br" />

        {/* Preload critical resources */}
        <link rel="preload" href="/anigif.gif" as="image" />
        <link rel="preload" href="/logo-horizontal.png" as="image" />
      </head>
      <body className={`${montserrat.variable} ${roboto.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <ThemeColorManager />
          <LoadingTransition />
          <OfflineDetector />
          {children}
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}