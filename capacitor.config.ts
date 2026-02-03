
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.azular.app',
  appName: 'Azular',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // Permite que o Firebase Auth funcione corretamente em modo local no Android
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true
  }
};

export default config;
