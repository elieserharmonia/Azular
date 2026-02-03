
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.azular.app',
  appName: 'Azular',
  webDir: 'dist',
  server: {
    // Importante para garantir que o Firebase Auth consiga realizar 
    // redirecionamentos e chamadas HTTPS corretamente de dentro do WebView
    androidScheme: 'https'
  }
};

export default config;
