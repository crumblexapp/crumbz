import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "crumble-students app";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const [manropeBold] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/Manrope-Bold.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          background: "#FE8A01",
        }}
      >
        <div
          style={{
            fontFamily: "Manrope",
            fontSize: 74,
            fontWeight: 700,
            color: "#FFF4DE",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          crumble
        </div>
        <div
          style={{
            fontFamily: "Manrope",
            fontSize: 44,
            fontWeight: 700,
            color: "#FFF4DE",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          students app
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Manrope",
          data: manropeBold,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}
