export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function platform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require('@capacitor/core');
    return Capacitor.getPlatform();
  } catch {
    return 'web';
  }
}

export async function initCapacitor() {
  if (typeof window === 'undefined') return;

  const { Capacitor } = await import('@capacitor/core');
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

/**
 * Opens Google OAuth in SFSafariViewController (iOS) or Chrome Custom Tabs (Android).
 * Returns the OAuth URL so the caller can open it — the actual redirect is handled
 * by the appUrlOpen listener wired up in providers.tsx.
 */
export async function nativeGoogleSignInUrl(supabaseUrl: string, redirectTo: string): Promise<string | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    // We need just the OAuth URL — use a minimal client scoped only for this call.
    const anonKey = (typeof window !== 'undefined'
      ? (window as Window & { __SUPABASE_ANON_KEY__?: string }).__SUPABASE_ANON_KEY__
      : undefined) ?? '';

    const client = createClient(supabaseUrl, anonKey);
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error || !data.url) return null;
    return data.url;
  } catch {
    return null;
  }
}

/**
 * Called when the app receives a crumbz:// deep link after OAuth.
 * Exchanges the code for a session and dispatches 'crumbz-native-auth'.
 */
export async function handleNativeAuthCallback(url: string) {
  if (typeof window === 'undefined') return;

  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch {}

  try {
    const { supabaseBrowser } = await import('@/lib/supabase/client');

    if (url.includes('code=')) {
      const { data, error } = await supabaseBrowser.auth.exchangeCodeForSession(url);
      if (error || !data.session) return;
      window.dispatchEvent(new CustomEvent('crumbz-native-auth', { detail: { session: data.session } }));
    } else if (url.includes('access_token=')) {
      const hash = url.split('#')[1] ?? '';
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token') ?? '';
      const refresh_token = params.get('refresh_token') ?? '';
      if (!access_token) return;
      const { data, error } = await supabaseBrowser.auth.setSession({ access_token, refresh_token });
      if (error || !data.session) return;
      window.dispatchEvent(new CustomEvent('crumbz-native-auth', { detail: { session: data.session } }));
    }
  } catch {}
}

export async function initBackButtonHandler(onBack: () => void) {
  if (typeof window === 'undefined') return;

  const { Capacitor } = await import('@capacitor/core');
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
