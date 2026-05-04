export async function haptic(style: "light" | "medium" | "heavy" = "light") {
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: map[style] });
  } catch {
    // Not running inside Capacitor, or haptics unavailable — silently skip.
  }
}
