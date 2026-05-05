export type Channel = "whatsapp" | "email" | "web";
export type Sentiment = "frustrated" | "neutral" | "satisfied";
export type MessageAuthor = "customer" | "agent" | "ai";

export interface Message {
  id: string;
  author: MessageAuthor;
  content: string;
  timestamp: string;
  aiReasoning?: string;
}

export interface CustomerContext {
  ltv: number;
  averageTicket: number;
  totalOrders: number;
  lastPurchases: { id: string; item: string; date: string; amount: number }[];
  tags: string[];
  aiReasoning?: string;
}

export interface Conversation {
  id: string;
  customerName: string;
  customerInitials: string;
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
