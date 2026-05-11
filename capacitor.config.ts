import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';
import type { PresentationOption } from '@capacitor/push-notifications';

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
    backgroundColor: '#ffefce',
    scrollEnabled: true,
  },
  android: {
    backgroundColor: '#ffefce',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#ffefce',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      iosSpinnerStyle: 'small',
      launchFadeOutDuration: 0,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#ffefce',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'] satisfies PresentationOption[],
    },
  },
};

export default config;
