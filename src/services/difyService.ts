import { mockKnowledgeDocs, mockQA } from "@/mocks/data";
import type { KnowledgeDoc, QAPair } from "@/services/types";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export async function listKnowledgeDocuments(): Promise<KnowledgeDoc[]> {
  await delay();
  return mockKnowledgeDocs;
}

export async function uploadDocument(file: File): Promise<KnowledgeDoc> {
  await delay();
  return {
    id: `d_${Date.now()}`,
    name: file.name,
    type: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
    size: `${Math.round(file.size / 1024)} KB`,
    status: "indexing",
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

export async function listQAPairs(): Promise<QAPair[]> {
  await delay();
  return mockQA;
}

export async function addQAPair(question: string, answer: string): Promise<QAPair> {
  await delay();
  return { id: `q_${Date.now()}`, question, answer, updatedAt: new Date().toISOString().slice(0, 10) };
}

export async function removeDocument(id: string): Promise<void> {
  await delay();
  void id;
}
