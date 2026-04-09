import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "crumbz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const [manropeBold, crumbzLogo] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/Manrope-Bold.ttf")),
    readFile(join(process.cwd(), "public/brand/crumbz-logo.png")),
  ]);
  const crumbzLogoDataUrl = `data:image/png;base64,${crumbzLogo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fffaf2 0%, #fff1df 100%)",
          padding: 40,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 28,
            background: "#FFFFFF",
            border: "2px solid #F3E1CF",
            borderRadius: 36,
            padding: "42px 48px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "14px 20px",
                borderRadius: 999,
                background: "#FFF7E8",
                width: "fit-content",
              }}
            >
              <img
                src={crumbzLogoDataUrl}
                alt="crumbz logo"
                width={76}
                height={76}
                style={{ borderRadius: 999, objectFit: "cover" }}
              />
              <div
                style={{
                  fontFamily: "Manrope",
                  fontSize: 34,
                  fontWeight: 700,
                  color: "#2C1A0E",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                crumbz
              </div>
            </div>
            <div
              style={{
                fontFamily: "Manrope",
                fontSize: 70,
                fontWeight: 700,
                color: "#2C1A0E",
                letterSpacing: "-0.04em",
                lineHeight: 0.98,
                display: "flex",
                alignItems: "center",
              }}
            >
              the feed that
            </div>
            <div
              style={{
                fontFamily: "Manrope",
                fontSize: 70,
                fontWeight: 700,
                color: "#2C1A0E",
                letterSpacing: "-0.04em",
                lineHeight: 0.98,
                display: "flex",
                alignItems: "center",
              }}
            >
              keeps you hungry.
            </div>
          </div>
          <div
            style={{
              width: 360,
              height: 360,
              borderRadius: 36,
              background: "#FFF7E8",
              border: "2px solid #F3E1CF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 28,
            }}
          >
            <img
              src={crumbzLogoDataUrl}
              alt="crumbz"
              width={304}
              height={304}
              style={{ objectFit: "contain" }}
            />
          </div>
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
