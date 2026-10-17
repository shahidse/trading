/**
 * App Configuration & Network Endpoints
 * Supports dynamic server URL for connecting to local Next.js dev server or production deployment.
 */
import { Platform } from 'react-native'

// Default fallback endpoints:
// Android Emulator uses 10.0.2.2 to access host machine localhost.
// iOS Simulator uses localhost.
// Physical device can connect via LAN IP (e.g., http://10.211.232.112:3000)
export const PROD_API_URL = 'https://jade-pavlova-ba20a5.netlify.app'

export const getDefaultApiUrl = () => {
  return PROD_API_URL
}

export const STORAGE_KEYS = {
  API_BASE_URL: 'eth_signal_api_url',
}
