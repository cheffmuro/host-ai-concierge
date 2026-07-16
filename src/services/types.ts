export type Channel = "whatsapp" | "email" | "web" | "instagram" | "facebook";
export type Sentiment = "frustrated" | "neutral" | "satisfied";
export type MessageAuthor = "customer" | "agent" | "ai";
export type MessageStatus = "sending" | "queued" | "delivered" | "error";

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  url: string;
  kind: "image" | "file";
}

export interface Message {
  id: string;
  author: MessageAuthor;
  content: string;
  timestamp: string;
  aiReasoning?: string;
  status?: MessageStatus;
  attachments?: Attachment[];
  error?: string;
}

export type AutomationType = "handover" | "reverse_logistics" | "ai_response";
export type AutomationStatus = "success" | "error" | "pending";

export interface AutomationEvent {
  id: string;
  type: AutomationType;
  title: string;
  description: string;
  status: AutomationStatus;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export interface CustomerPurchase {
  id: string;
  item: string;
  date: string;
  amount: number;
}

export interface CustomerContext {
  ltv: number;
  averageTicket: number;
  totalOrders: number;
  lastPurchases: CustomerPurchase[];
  tags: string[];
  aiReasoning?: string;
  automations: AutomationEvent[];
  source?: string;
  notes?: string;
  externalId?: string;
}

export interface Conversation {
  id: string;
  customerName: string;
  customerInitials: string;
  customerIdentifier?: string;
  channel: Channel;
  sentiment: Sentiment;
  preview: string;
  unread: number;
  updatedAt: string;
  aiHandling: boolean;
  messages: Message[];
  context: CustomerContext;
}

export interface KnowledgeDoc {
  id: string;
  name: string;
  type: string;
  size: string;
  status: "indexed" | "indexing" | "error";
  updatedAt: string;
}

export interface QAPair {
  id: string;
  question: string;
  answer: string;
  updatedAt: string;
}
