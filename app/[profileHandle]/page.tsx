import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileRedirect } from "./ProfileRedirect";
import { readPublicProfilePreview } from "@/lib/public-profiles";

type ProfileRouteProps = {
  params: Promise<{ profileHandle: string }>;
};

function normalizeHandle(rawHandle: string) {
  if (!rawHandle.startsWith("@")) return "";
  return rawHandle.slice(1).trim().toLowerCase();
}

function buildProfileDescription(profile: Awaited<ReturnType<typeof readPublicProfilePreview>> | null, username: string) {
  if (!profile) return `open @${username}'s crumbz profile.`;
  if (profile.bio) return profile.bio;

  const meta = [profile.city, profile.schoolName].filter(Boolean).join(" • ");
  return meta ? `${profile.fullName} on crumbz • ${meta}` : `open @${profile.username}'s crumbz profile.`;
}

export async function generateMetadata({ params }: ProfileRouteProps): Promise<Metadata> {
  const { profileHandle } = await params;
  const username = normalizeHandle(profileHandle);
  if (!username) return {};

  const profile = await readPublicProfilePreview(username);
  const title = profile ? `${profile.fullName} (@${profile.username})` : `@${username} on crumbz`;
  const description = buildProfileDescription(profile, username);
  const profileUrl = `https://app.crumbz.pl/@${username}`;
  const imageUrl = `${profileUrl}/opengraph-image`;

  return {
    title,
    description,
    alternates: {
      canonical: profileUrl,
    },
    openGraph: {
      title,
      description,
      url: profileUrl,
      siteName: "crumbz",
      type: "profile",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProfileHandlePage({ params }: ProfileRouteProps) {
  const { profileHandle } = await params;
  const username = normalizeHandle(profileHandle);
  if (!username) notFound();

  return <ProfileRedirect username={username} />;
}
