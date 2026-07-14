import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.traphousekitchen.app',
  appName: 'TrapHouse Kitchen',
  webDir: 'dist',
  server: {
    cleartext: false,
  },
};

export default config;
