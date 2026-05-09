"use client";

import { Avatar, Button, Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useEffect, useState } from "react";

type ProfileQrModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profileShareUrl: string;
  profileShareNotice: string;
  currentUserPicture: string;
  fullName: string;
  username: string;
  onShareProfile: () => void;
  onShareProfilePhoto: () => void;
  onCopyProfileLink: () => void;
};

export default function ProfileQrModal({
  isOpen,
  onOpenChange,
  profileShareUrl,
  profileShareNotice,
  currentUserPicture,
  fullName,
  username,
  onShareProfile,
  onShareProfilePhoto,
  onCopyProfileLink,
}: ProfileQrModalProps) {
  const [profileQrImageUrl, setProfileQrImageUrl] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!isOpen || !profileShareUrl) {
      setProfileQrImageUrl("");
      return;
    }

    void import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(profileShareUrl, {
          width: 960,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        }),
      )
      .then((dataUrl) => {
        if (!cancelled) setProfileQrImageUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setProfileQrImageUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, profileShareUrl]);

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
      <ModalContent className="max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-[#fffaf2]">
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between gap-3 border-b border-[#FFF0D0]">
              <div>
                <p className="font-[family-name:var(--font-young-serif)] text-[1.8rem] leading-none text-[#2C1A0E]">share your profile</p>
              </div>
              <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                close
              </Button>
            </ModalHeader>
            <ModalBody className="items-center gap-4 overflow-y-auto bg-[#fffaf2] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
              <div className="w-full rounded-[28px] border border-[#FFF0D0] bg-white p-5 text-center shadow-[0_18px_40px_rgba(254,138,1,0.08)]">
                <div className="mx-auto flex w-fit items-center gap-3 rounded-full bg-[#FFF7E8] px-4 py-2">
                  <Avatar src={currentUserPicture} name={fullName || username} className="h-11 w-11 bg-[#FFF0D0] text-[#F5A623]" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[#2C1A0E]">{fullName || "crumbz user"}</p>
                    <p className="text-sm text-[#6c7289]">@{username}</p>
                  </div>
                </div>
                {profileQrImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profileQrImageUrl} alt={`QR code for @${username}`} className="mx-auto mt-4 h-64 w-64 rounded-[24px] border border-[#FFF0D0] bg-white p-3" />
                ) : (
                  <div className="mx-auto mt-4 flex h-64 w-64 items-center justify-center rounded-[24px] border border-[#FFF0D0] bg-[#FFF7E8] text-sm text-[#6c7289]">
                    qr code loading...
                  </div>
                )}
                <div className="mt-4 space-y-3">
                  <Button radius="full" className="w-full bg-[#2C1A0E] text-white" onPress={onShareProfile}>
                    share profile link
                  </Button>
                  <Button radius="full" variant="flat" className="w-full bg-[#FFF0D0] text-[#2C1A0E]" onPress={onShareProfilePhoto}>
                    share photo to instagram
                  </Button>
                  <p className="text-sm text-[#6c7289]">this opens your phone share menu with the profile link people can tap.</p>
                </div>
                <div className="mt-3 rounded-[18px] bg-[#FFF7E8] px-4 py-3 text-left text-sm text-[#6c7289]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">link</p>
                  <button type="button" onClick={onCopyProfileLink} className="block w-full truncate text-left text-[#2C1A0E]">
                    {profileShareUrl}
                  </button>
                </div>
              </div>
              {profileShareNotice ? <p className="text-sm text-[#2C1A0E]">{profileShareNotice}</p> : null}
              <div className="flex w-full items-center justify-end gap-2">
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onCopyProfileLink}>
                  copy link
                </Button>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
