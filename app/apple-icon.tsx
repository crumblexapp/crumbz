import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#FE8A01",
          borderRadius: 40,
          color: "#FFF4DE",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          fontSize: 62,
          fontWeight: 700,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-0.06em",
          width: "100%",
        }}
      >
        crumble
      </div>
    ),
    size,
  );
}
