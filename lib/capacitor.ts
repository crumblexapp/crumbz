import { Capacitor } from '@capacitor/core';

export function isNative() {
  return Capacitor.isNativePlatform();
}

export function platform() {
  return Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
}

export async function initCapacitor() {
  if (typeof window === 'undefined') return;
  if (!Capacitor.isNativePlatform()) return;

  const [{ StatusBar, Style }, { SplashScreen }, { Keyboard, KeyboardResize }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/keyboard'),
  ]);

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    }
  } catch {}

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    await Keyboard.setScroll({ isDisabled: false });
  } catch {}

  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {}
}

export async function initAppUrlHandler(onUrl: (url: string) => void) {
  if (typeof window === 'undefined') return;
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('appUrlOpen', (event) => {
      onUrl(event.url);
    });
  } catch {}
}

export async function initBackButtonHandler(onBack: () => void) {
  if (typeof window === 'undefined') return;
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        onBack();
      }
    });
  } catch {}
}
