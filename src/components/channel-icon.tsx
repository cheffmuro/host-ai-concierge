import { MessageCircle, Mail, Globe, Instagram, Facebook } from "lucide-react";
import type { Channel } from "@/services/types";

export function ChannelIcon({ channel, className }: { channel: Channel; className?: string }) {
  const Icon =
    channel === "whatsapp"
      ? MessageCircle
      : channel === "email"
      ? Mail
      : channel === "instagram"
      ? Instagram
      : channel === "facebook"
      ? Facebook
      : Globe;
  return <Icon className={className ?? "h-3.5 w-3.5"} strokeWidth={1.5} />;
}

export const channelLabel: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  web: "Site",
  instagram: "Instagram",
  facebook: "Facebook",
};
