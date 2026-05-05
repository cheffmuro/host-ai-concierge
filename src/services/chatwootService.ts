import { mockConversations } from "@/mocks/data";
import type { Attachment, AutomationEvent, Conversation, Message } from "@/services/types";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export async function listConversations(): Promise<Conversation[]> {
  await delay();
  return mockConversations;
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  await delay();
  return mockConversations.find((c) => c.id === id);
}

/**
 * Mock send. Simulates network failure ~25% of the time so the offline queue
 * is exercised in the UI. Always fails when navigator.onLine is false.
 */
export async function sendMessage(conversationId: string, content: string, attachments?: Attachment[]): Promise<Message> {
  await delay(450);
  void conversationId;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("offline");
  }
  if (Math.random() < 0.25) {
    throw new Error("network_unstable");
  }
  return {
    id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    author: "agent",
    content,
    timestamp: new Date().toISOString(),
    status: "delivered",
    attachments,
  };
}

export async function assignAgent(conversationId: string, agentId: string): Promise<void> {
  await delay();
  void conversationId;
  void agentId;
}

export async function listAutomations(conversationId: string): Promise<AutomationEvent[]> {
  await delay();
  return mockConversations.find((c) => c.id === conversationId)?.context.automations ?? [];
}
