import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dimitriemilinovich.inkwell',
  appName: 'inkwell',
  webDir: 'dist',
  backgroundColor: '#282b41',
  bundledWebRuntime: false,
  server: {
    url: 'http://192.168.50.143:5173',
    cleartext: true
  },
  plugins: {
    Keyboard: {
      resize: 'native',
    },
    SplashScreen: {
      launchAutoHide: false,
    },
  },
  ios: {
    webContentsDebuggingEnabled: true
  },
  loggingBehavior: 'none',
};

export default config;
