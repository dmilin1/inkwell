import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dimitriemilinovich.inkwell',
  appName: 'inkwell',
  webDir: 'dist',
  backgroundColor: '#282b41',
  // server: {
  //   url: 'http://192.168.50.143:5173',
  //   cleartext: true
  // },
  plugins: {
    Keyboard: {
      resize: 'native',
    },
    SplashScreen: {
      launchAutoHide: false,
    },
    SystemBars: {
      // Android: inject --safe-area-inset-* CSS variables (used via --sat etc. in index.css).
      insetsHandling: 'css',
      // index.html uses viewport-fit=cover; hinting it avoids a layout jump on launch.
      initialViewportFitValueHint: 'cover',
    },
  },
  ios: {
    webContentsDebuggingEnabled: true
  },
  loggingBehavior: 'none',
};

export default config;
