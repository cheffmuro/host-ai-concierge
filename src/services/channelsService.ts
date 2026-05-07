/**
 * Channels service — gerencia inboxes do Chatwoot + instâncias Evolution (WhatsApp).
 * Modo mock quando VITE_CHATWOOT_URL ausente (igual chatwootService.ts/difyService.ts).
 *
 * Multi-tenant: cada usuário usa seu próprio token Chatwoot (VITE_CHATWOOT_USER_TOKEN
 * por enquanto; em produção virá da sessão do usuário via server function).
 */

const CW_BASE = import.meta.env.VITE_CHATWOOT_URL as string | undefined;
const CW_TOKEN = import.meta.env.VITE_CHATWOOT_USER_TOKEN as string | undefined;
const CW_ACCOUNT = import.meta.env.VITE_CHATWOOT_ACCOUNT_ID as string | undefined;
const EVO_BASE = import.meta.env.VITE_EVOLUTION_URL as string | undefined;
const EVO_KEY = import.meta.env.VITE_EVOLUTION_API_KEY as string | undefined;

const isLive = Boolean(CW_BASE && CW_TOKEN && CW_ACCOUNT);
const isEvoLive = Boolean(EVO_BASE && EVO_KEY);
const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export type ChannelKind = "whatsapp" | "instagram" | "email" | "webchat";
export type ChannelStatus = "connected" | "pending" | "disconnected" | "error";

export interface ChannelConnection {
  id: string;
  kind: ChannelKind;
  name: string;
  status: ChannelStatus;
  identifier?: string; // número, @user, e-mail, URL do site
  conversations24h: number;
  unread: number;
  createdAt: string;
  // Metadata específica
  websiteToken?: string; // webchat
  qrCode?: string;       // whatsapp
  instanceName?: string; // whatsapp
}

// --- Mock state -------------------------------------------------------------
const mockState: ChannelConnection[] = [];

// --- Helpers ----------------------------------------------------------------
const cwApi = (path: string) => `${CW_BASE}/api/v1/accounts/${CW_ACCOUNT}${path}`;
const cwHeaders = (): HeadersInit => ({
  api_access_token: CW_TOKEN!,
  "Content-Type": "application/json",
});

async function http<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

interface CwInbox {
  id: number;
  name: string;
  channel_type: string;
  phone_number?: string;
  website_url?: string;
  email?: string;
  website_token?: string;
}

function mapInboxKind(channelType: string): ChannelKind {
  const c = channelType.toLowerCase();
  if (c.includes("whatsapp") || c.includes("api")) return "whatsapp";
  if (c.includes("instagram") || c.includes("facebook")) return "instagram";
  if (c.includes("email")) return "email";
  return "webchat";
}

function mapInbox(inbox: CwInbox): ChannelConnection {
  const kind = mapInboxKind(inbox.channel_type);
  return {
    id: String(inbox.id),
    kind,
    name: inbox.name,
    status: "connected",
    identifier: inbox.phone_number || inbox.email || inbox.website_url,
    conversations24h: 0,
    unread: 0,
    createdAt: new Date().toISOString(),
    websiteToken: inbox.website_token,
  };
}

// --- Public API -------------------------------------------------------------

export async function listChannels(): Promise<ChannelConnection[]> {
  if (!isLive) {
    await delay();
    return [...mockState];
  }
  const data = await http<{ payload: CwInbox[] }>(cwApi("/inboxes"), { headers: cwHeaders() });
  return data.payload.map(mapInbox);
}

export async function deleteChannel(id: string): Promise<void> {
  if (!isLive) {
    await delay();
    const idx = mockState.findIndex((c) => c.id === id);
    if (idx >= 0) mockState.splice(idx, 1);
    return;
  }
  await fetch(cwApi(`/inboxes/${id}`), { method: "DELETE", headers: cwHeaders() });
}

// --- WhatsApp (Evolution + Chatwoot API channel) ----------------------------

export interface WhatsAppCreateResult {
  instanceName: string;
  qrCode: string; // dataURL base64
  inboxId?: string;
}

export async function createWhatsAppChannel(name: string): Promise<WhatsAppCreateResult> {
  const instanceName = `wa_${Date.now()}`;

  if (!isEvoLive) {
    await delay(800);
    const placeholder =
      "data:image/svg+xml;base64," +
      btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="#fff"/><g fill="#0f172a">${
        Array.from({ length: 144 }, (_, i) => {
          const x = (i % 12) * 20;
          const y = Math.floor(i / 12) * 20;
          return Math.random() > 0.5 ? `<rect x="${x}" y="${y}" width="20" height="20"/>` : "";
        }).join("")
      }</g></svg>`);
    const conn: ChannelConnection = {
      id: `mock_${Date.now()}`,
      kind: "whatsapp",
      name,
      status: "pending",
      conversations24h: 0,
      unread: 0,
      createdAt: new Date().toISOString(),
      qrCode: placeholder,
      instanceName,
    };
    mockState.unshift(conn);
    return { instanceName, qrCode: placeholder };
  }

  const res = await fetch(`${EVO_BASE}/instance/create`, {
    method: "POST",
    headers: { apikey: EVO_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
  });
  if (!res.ok) throw new Error(`evolution_${res.status}`);
  const data = (await res.json()) as { qrcode?: { base64?: string } };
  return { instanceName, qrCode: data.qrcode?.base64 ?? "" };
}

export async function getWhatsAppStatus(instanceName: string): Promise<ChannelStatus> {
  if (!isEvoLive) {
    // mock: depois de 6s vira "connected"
    await delay(150);
    const conn = mockState.find((c) => c.instanceName === instanceName);
    if (!conn) return "error";
    const ageMs = Date.now() - new Date(conn.createdAt).getTime();
    if (ageMs > 6000) {
      conn.status = "connected";
      conn.identifier = "+55 11 9 9999-0000";
    }
    return conn.status;
  }
  const res = await fetch(`${EVO_BASE}/instance/connectionState/${instanceName}`, {
    headers: { apikey: EVO_KEY! },
  });
  if (!res.ok) return "error";
  const data = (await res.json()) as { instance?: { state?: string } };
  const state = data.instance?.state;
  if (state === "open") return "connected";
  if (state === "connecting") return "pending";
  return "disconnected";
}

// --- Email (Chatwoot Email channel) -----------------------------------------

export interface EmailChannelInput {
  name: string;
  email: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  smtpHost: string;
  smtpPort: number;
}

export async function createEmailChannel(input: EmailChannelInput): Promise<ChannelConnection> {
  if (!isLive) {
    await delay(900);
    const conn: ChannelConnection = {
      id: `mock_${Date.now()}`,
      kind: "email",
      name: input.name,
      status: "connected",
      identifier: input.email,
      conversations24h: 0,
      unread: 0,
      createdAt: new Date().toISOString(),
    };
    mockState.unshift(conn);
    return conn;
  }
  const inbox = await http<{ id: number }>(cwApi("/inboxes"), {
    method: "POST",
    headers: cwHeaders(),
    body: JSON.stringify({
      name: input.name,
      channel: {
        type: "email",
        email: input.email,
        imap_address: input.imapHost,
        imap_port: input.imapPort,
        imap_login: input.imapUser,
        imap_password: input.imapPassword,
        imap_enabled: true,
        smtp_address: input.smtpHost,
        smtp_port: input.smtpPort,
        smtp_login: input.imapUser,
        smtp_password: input.imapPassword,
        smtp_enabled: true,
      },
    }),
  });
  return {
    id: String(inbox.id), kind: "email", name: input.name, status: "connected",
    identifier: input.email, conversations24h: 0, unread: 0,
    createdAt: new Date().toISOString(),
  };
}

// --- Webchat (Chatwoot Website channel) -------------------------------------

export interface WebchatChannelInput {
  name: string;
  websiteUrl: string;
  primaryColor: string;
  welcomeTitle?: string;
  welcomeTagline?: string;
}

export async function createWebchatChannel(input: WebchatChannelInput): Promise<ChannelConnection> {
  if (!isLive) {
    await delay(800);
    const conn: ChannelConnection = {
      id: `mock_${Date.now()}`,
      kind: "webchat",
      name: input.name,
      status: "connected",
      identifier: input.websiteUrl,
      conversations24h: 0,
      unread: 0,
      createdAt: new Date().toISOString(),
      websiteToken: `mock_tok_${Math.random().toString(36).slice(2, 10)}`,
    };
    mockState.unshift(conn);
    return conn;
  }
  const inbox = await http<{ id: number; website_token: string }>(cwApi("/inboxes"), {
    method: "POST",
    headers: cwHeaders(),
    body: JSON.stringify({
      name: input.name,
      channel: {
        type: "web_widget",
        website_url: input.websiteUrl,
        widget_color: input.primaryColor,
        welcome_title: input.welcomeTitle,
        welcome_tagline: input.welcomeTagline,
      },
    }),
  });
  return {
    id: String(inbox.id), kind: "webchat", name: input.name, status: "connected",
    identifier: input.websiteUrl, conversations24h: 0, unread: 0,
    createdAt: new Date().toISOString(),
    websiteToken: inbox.website_token,
  };
}

// --- Instagram (placeholder, requer OAuth Meta) -----------------------------

export async function startInstagramOAuth(): Promise<{ authUrl: string }> {
  // Em produção: server function gera state, abre OAuth da Meta, callback
  // cria inbox no Chatwoot. Aqui só sinaliza que ainda não está disponível.
  await delay(200);
  return { authUrl: "" };
}

export function getWebchatSnippet(websiteToken: string): string {
  const baseUrl = CW_BASE ?? "https://app.chatwoot.com";
  return `<script>
  (function(d,t) {
    var BASE_URL="${baseUrl}";
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+"/packs/js/sdk.js";
    g.defer = true;
    g.async = true;
    s.parentNode.insertBefore(g,s);
    g.onload=function(){
      window.chatwootSDK.run({
        websiteToken: '${websiteToken}',
        baseUrl: BASE_URL
      })
    }
  })(document,"script");
</script>`;
}

export const channelsConfig = {
  isLive,
  isEvoLive,
  chatwootUrl: CW_BASE,
};
