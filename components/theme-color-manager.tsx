
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function ThemeColorManager() {
  const pathname = usePathname()

  useEffect(() => {
    const updateThemeColor = () => {
      const isAuthPage = window.location.pathname === '/' || window.location.pathname === '/register'
      const themeColor = isAuthPage ? "#FFFFFF" : "#24292E"
      
      // Update theme-color meta tag
      let metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeColor)
      }

      // Update apple-mobile-web-app-status-bar-style
      const metaAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      if (metaAppleStatus) {
        metaAppleStatus.setAttribute('content', isAuthPage ? "default" : "black-translucent")
      }
      
      // Update msapplication-navbutton-color
      const navbarMeta = document.querySelector('meta[name="msapplication-navbutton-color"]')
      if (navbarMeta) {
        navbarMeta.setAttribute('content', themeColor)
      }

      // Force background color for standalone mode to ensure navigation bar adapts
      if (window.matchMedia('(display-mode: standalone)').matches) {
        document.documentElement.style.backgroundColor = themeColor
        document.body.style.backgroundColor = themeColor
      }
    }

    updateThemeColor()
    
    // Mutation observer to detect SPA navigation
    const observer = new MutationObserver(updateThemeColor)
    const titleElement = document.querySelector('title')
    if (titleElement) {
      observer.observe(titleElement, { subtree: true, characterData: true, childList: true })
    }

    return () => observer.disconnect()
  }, [pathname])

  return null
}
