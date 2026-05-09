"use client";

import { Avatar, Button, Input, Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";

export type LikesViewerRow = {
  email: string;
  username: string;
  fullName: string;
  picture: string;
};

type LikesViewerModalProps = {
  isOpen: boolean;
  likeCount: number;
  rows: LikesViewerRow[];
  search: string;
  label: string;
  likesLabel: string;
  closeLabel: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onOpenProfile: (email: string) => void;
};

export default function LikesViewerModal({
  isOpen,
  likeCount,
  rows,
  search,
  label,
  likesLabel,
  closeLabel,
  searchPlaceholder,
  onSearchChange,
  onOpenChange,
  onOpenProfile,
}: LikesViewerModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="bottom-center"
      scrollBehavior="inside"
    >
      <ModalContent className="bg-[#fffaf2]">
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between border-b border-[#FFF0D0]">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">{label}</p>
                <p className="mt-1 font-[family-name:var(--font-young-serif)] text-[1.8rem] leading-none text-[#2C1A0E]">
                  {likesLabel}
                </p>
              </div>
              <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                {closeLabel}
              </Button>
            </ModalHeader>
            <ModalBody className="gap-4 bg-[#fffaf2] pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5">
              <Input
                radius="full"
                placeholder={searchPlaceholder}
                value={search}
                onValueChange={onSearchChange}
                classNames={{ inputWrapper: "bg-white border border-[#FFF0D0] shadow-none" }}
              />
              {rows.length ? (
                <div className="space-y-3">
                  {rows.map((row) => (
                    <button
                      key={`${row.email}-${row.username}`}
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenProfile(row.email);
                      }}
                      className="flex w-full items-center gap-3 rounded-[18px] bg-white px-3 py-3 text-left ring-1 ring-[#FFF0D0]"
                    >
                      <Avatar src={row.picture} name={row.fullName} className="h-12 w-12 bg-[#FFF0D0] text-[#F5A623]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#2C1A0E]">{row.username || row.fullName}</p>
                        <p className="truncate text-sm text-[#6c7289]">{row.fullName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6c7289]">{likeCount > 0 ? "no matching people." : "no likes to show yet."}</p>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
