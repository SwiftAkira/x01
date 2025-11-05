/**
 * PWA utilities for detecting and handling PWA-specific behavior
 */

/**
 * Check if the app is running in PWA mode (installed on home screen)
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check if running in standalone mode (iOS/Android)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  
  // Check iOS specific standalone mode
  const nav = window.navigator as Navigator & { standalone?: boolean }
  const isIOSStandalone = nav.standalone === true
  
  // Check Android specific
  const isAndroidPWA = document.referrer.includes('android-app://')
  
  return isStandalone || isIOSStandalone || isAndroidPWA
}

/**
 * Check if we're running on iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  
  const win = window as Window & { MSStream?: unknown }
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !win.MSStream
}

/**
 * Check if running on iOS in PWA mode
 */
export function isIOSPWA(): boolean {
  return isIOS() && isPWA()
}

/**
 * Force localStorage persistence - useful for iOS PWA
 */
export function ensureStoragePersistence(): void {
  if (typeof window === 'undefined') return
  
  try {
    // Test localStorage availability
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
  } catch (e) {
    console.warn('localStorage not available:', e)
  }
}
