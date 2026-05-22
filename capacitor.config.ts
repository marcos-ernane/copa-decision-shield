import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.operador.precisao',
  appName: 'Operador de Precisão',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
