import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readPublicProfilePreview } from "@/lib/public-profiles";

export const alt = "crumbz profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ProfileRouteProps = {
  params: Promise<{ profileHandle: string }>;
};

function normalizeHandle(rawHandle: string) {
  if (!rawHandle.startsWith("@")) return "";
  return rawHandle.slice(1).trim().toLowerCase();
}

export default async function ProfileOpengraphImage({ params }: ProfileRouteProps) {
  const { profileHandle } = await params;
  const username = normalizeHandle(profileHandle);
  const profile = username ? await readPublicProfilePreview(username) : null;
  const displayName = profile?.fullName || `@${username || "crumbz"}`;
  const description =
    profile?.bio ||
    [profile?.city, profile?.schoolName].filter(Boolean).join(" • ") ||
    "the feed that keeps you hungry.";
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
          background: "linear-gradient(135deg, #fffaf2 0%, #fff1df 100%)",
          color: "#2C1A0E",
          padding: 46,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            borderRadius: 34,
            border: "2px solid #F3E1CF",
            background: "#FFFFFF",
            padding: "34px 38px",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "14px 20px",
                borderRadius: 999,
                background: "#FFF7E8",
                alignSelf: "flex-start",
              }}
            >
              {profile?.picture ? (
                <img
                  src={profile.picture}
                  alt={displayName}
                  width={76}
                  height={76}
                  style={{ borderRadius: 999, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 999,
                    background: "#FFF0D0",
                    color: "#F5A623",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    fontWeight: 700,
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 34, fontWeight: 700 }}>{displayName}</div>
                <div style={{ fontSize: 24, color: "#6C7289" }}>@{profile?.username || username || "crumbz"}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", marginTop: 34 }}>
              <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1 }}>share this profile</div>
              <div style={{ fontSize: 32, lineHeight: 1.35, color: "#6C7289", marginTop: 18 }}>
                {description}
              </div>
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  padding: "14px 18px",
                  borderRadius: 22,
                  background: "#FFF7E8",
                  color: "#B56D19",
                  fontSize: 24,
                }}
              >
                https://app.crumbz.pl/@{profile?.username || username || "crumbz"}
              </div>
            </div>
          </div>

          <div
            style={{
              width: 292,
              height: 292,
              borderRadius: 28,
              border: "2px solid #F3E1CF",
              background: "#FFF7E8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F5A623",
              fontSize: 32,
              textAlign: "center",
              padding: 24,
            }}
          >
            open on crumbz
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
    },
  );
}
