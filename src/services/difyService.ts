/**
 * Dify service — wrapper fino sobre server functions em
 * `@/lib/dify.functions.ts`. A `api_key` fica no servidor.
 */
import { mockKnowledgeDocs, mockQA } from "@/mocks/data";
import { USE_MOCKS } from "@/lib/mocks";
import { isDifyLive, useIntegrationsStore } from "@/stores/integrationsStore";
import type { KnowledgeDoc, QAPair } from "@/services/types";
import {
  difyListDocuments,
  difyUploadDocument,
  difyRemoveDocument,
  difyAsk,
  difyPing,
} from "@/lib/dify.functions";

const cfg = () => useIntegrationsStore.getState().dify;
const isLive = () => isDifyLive(cfg());
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

interface DifyDoc {
  id: string; name: string;
  doc_type?: string; data_source_type?: string;
  display_status?: "indexing" | "indexed" | "error" | string;
  created_at: number; word_count?: number;
}

const sizeLabel = (words?: number) => (words ? `${Math.round(words / 250)} KB` : "—");
const statusMap = (s?: string): KnowledgeDoc["status"] =>
  s === "indexed" || s === "available" ? "indexed" : s === "error" ? "error" : "indexing";

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function listKnowledgeDocuments(): Promise<KnowledgeDoc[]> {
  if (!isLive()) { await delay(); return USE_MOCKS ? mockKnowledgeDocs : []; }
  const data = await difyListDocuments();
  const docs = (data as { data: DifyDoc[] }).data;
  return docs.map((d) => ({
    id: d.id,
    name: d.name,
    type: (d.name.split(".").pop() ?? "FILE").toUpperCase(),
    size: sizeLabel(d.word_count),
    status: statusMap(d.display_status),
    updatedAt: new Date(d.created_at * 1000).toISOString().slice(0, 10),
  }));
}

export async function uploadDocument(file: File): Promise<KnowledgeDoc> {
  if (!isLive()) {
    await delay();
    return {
      id: `d_${Date.now()}`, name: file.name,
      type: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
      size: `${Math.round(file.size / 1024)} KB`,
      status: "indexing",
      updatedAt: new Date().toISOString().slice(0, 10),
    };
  }
  const contentBase64 = await blobToBase64(file);
  const out = await difyUploadDocument({
    data: { name: file.name, mime: file.type || "application/octet-stream", contentBase64 },
  });
  const doc = (out as { document: DifyDoc }).document;
  return {
    id: doc.id,
    name: doc.name,
    type: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
    size: `${Math.round(file.size / 1024)} KB`,
    status: statusMap(doc.display_status),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

export async function removeDocument(id: string): Promise<void> {
  if (!isLive()) { await delay(); return; }
  await difyRemoveDocument({ data: { id } });
}

export async function listQAPairs(): Promise<QAPair[]> {
  await delay();
  return USE_MOCKS ? mockQA : [];
}

export async function addQAPair(question: string, answer: string): Promise<QAPair> {
  await delay();
  return {
    id: `q_${Date.now()}`, question, answer,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

export interface DifyAnswer {
  answer: string;
  conversation_id?: string;
  message_id?: string;
  metadata?: { retriever_resources?: Array<{ document_name: string; score: number }> };
}

export async function askDify(
  query: string,
  user = "host-ai-concierge-agent",
  conversationId?: string,
): Promise<DifyAnswer> {
  if (!isLive()) {
    await delay(600);
    return {
      answer: `(mock) Baseado no que sei, sugiro: ${query.slice(0, 80)}…`,
      conversation_id: conversationId,
    };
  }
  const out = await difyAsk({ data: { query, user, conversationId } });
  return out as DifyAnswer;
}

export async function pingDify(input: {
  url?: string; api_key?: string; dataset_id?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { url, api_key, dataset_id } = input;
  if (!url || !api_key || !dataset_id) return { ok: false, error: "URL, API Key e Dataset ID são obrigatórios." };
  return difyPing({ data: { url, api_key, dataset_id } });
}
