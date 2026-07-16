/**
 * Dify service — Knowledge (datasets/documents) e Chat completion.
 * Credenciais vêm do store `useIntegrationsStore`, populado pelo bootstrap
 * (server fn `getDifyConfig`) a partir de `app_settings`.
 *
 * Docs: https://docs.dify.ai/guides/knowledge-base/maintain-knowledge-base-via-api
 *       https://docs.dify.ai/guides/application-publishing/developing-with-apis
 */
import { mockKnowledgeDocs, mockQA } from "@/mocks/data";
import { USE_MOCKS } from "@/lib/mocks";
import { isDifyLive, useIntegrationsStore } from "@/stores/integrationsStore";
import type { KnowledgeDoc, QAPair } from "@/services/types";

const cfg = () => useIntegrationsStore.getState().dify;
const isLive = () => isDifyLive(cfg());
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const auth = (): HeadersInit => ({ Authorization: `Bearer ${cfg().api_key!}` });
const json = (): HeadersInit => ({ ...auth(), "Content-Type": "application/json" });

async function http<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(`Dify ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}


// --- Knowledge --------------------------------------------------------------

interface DifyDoc {
  id: string; name: string;
  doc_type?: string; data_source_type?: string;
  display_status?: "indexing" | "indexed" | "error" | string;
  created_at: number; word_count?: number;
}

const sizeLabel = (words?: number) => (words ? `${Math.round(words / 250)} KB` : "—");
const statusMap = (s?: string): KnowledgeDoc["status"] =>
  s === "indexed" || s === "available" ? "indexed" : s === "error" ? "error" : "indexing";

export async function listKnowledgeDocuments(): Promise<KnowledgeDoc[]> {
  if (!isLive) { await delay(); return USE_MOCKS ? mockKnowledgeDocs : []; }
  const data = await http<{ data: DifyDoc[] }>(
    `${BASE}/v1/datasets/${DATASET}/documents?page=1&limit=50`,
    { headers: auth() },
  );
  return data.data.map((d) => ({
    id: d.id,
    name: d.name,
    type: (d.name.split(".").pop() ?? "FILE").toUpperCase(),
    size: sizeLabel(d.word_count),
    status: statusMap(d.display_status),
    updatedAt: new Date(d.created_at * 1000).toISOString().slice(0, 10),
  }));
}

export async function uploadDocument(file: File): Promise<KnowledgeDoc> {
  if (!isLive) {
    await delay();
    return {
      id: `d_${Date.now()}`, name: file.name,
      type: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
      size: `${Math.round(file.size / 1024)} KB`,
      status: "indexing",
      updatedAt: new Date().toISOString().slice(0, 10),
    };
  }
  const fd = new FormData();
  fd.append("file", file, file.name);
  fd.append(
    "data",
    JSON.stringify({
      indexing_technique: "high_quality",
      process_rule: { mode: "automatic" },
    }),
  );
  const res = await fetch(
    `${BASE}/v1/datasets/${DATASET}/document/create-by-file`,
    { method: "POST", headers: auth(), body: fd },
  );
  if (!res.ok) throw new Error(`dify_upload_${res.status}`);
  const out = (await res.json()) as { document: DifyDoc };
  return {
    id: out.document.id,
    name: out.document.name,
    type: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
    size: `${Math.round(file.size / 1024)} KB`,
    status: statusMap(out.document.display_status),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

export async function removeDocument(id: string): Promise<void> {
  if (!isLive) { await delay(); return; }
  const res = await fetch(`${BASE}/v1/datasets/${DATASET}/documents/${id}`, {
    method: "DELETE", headers: auth(),
  });
  if (!res.ok) throw new Error(`dify_delete_${res.status}`);
}

// --- Q&A pairs (segments) ---------------------------------------------------

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

// --- Chat completion (RAG) --------------------------------------------------

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
  if (!isLive) {
    await delay(600);
    return {
      answer: `(mock) Baseado no que sei, sugiro: ${query.slice(0, 80)}…`,
      conversation_id: conversationId,
    };
  }
  return http<DifyAnswer>(`${BASE}/v1/chat-messages`, {
    method: "POST",
    headers: json(),
    body: JSON.stringify({
      inputs: {},
      query,
      user,
      response_mode: "blocking",
      conversation_id: conversationId ?? "",
    }),
  });
}
