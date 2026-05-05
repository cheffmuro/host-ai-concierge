import { mockConversations } from "@/mocks/data";
import type { Conversation, Message } from "@/services/types";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export async function listConversations(): Promise<Conversation[]> {
  await delay();
  return mockConversations;
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  await delay();
  return mockConversations.find((c) => c.id === id);
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  await delay();
  return {
    id: `m_${Date.now()}`,
    author: "agent",
    content,
    timestamp: new Date().toISOString(),
  };
}

export async function assignAgent(conversationId: string, agentId: string): Promise<void> {
  await delay();
  void conversationId;
  void agentId;
}
