import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.crumbz.app',
  appName: 'Crumbz',
  webDir: 'out',
  server: {
    url: 'https://app.crumbz.pl',
    cleartext: false,
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#fb8803',
    scrollEnabled: true,
  },
  android: {
    backgroundColor: '#fb8803',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#fb8803',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      iosSpinnerStyle: 'small',
      launchFadeOutDuration: 300,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#fb8803',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
