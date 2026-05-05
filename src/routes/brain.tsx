import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, FileText, Trash2, RefreshCw, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockKnowledgeDocs, mockQA } from "@/mocks/data";
import type { KnowledgeDoc, QAPair } from "@/services/types";
import { addQAPair, uploadDocument } from "@/services/difyService";

export const Route = createFileRoute("/brain")({
  head: () => ({
    meta: [
      { title: "Brain — Anfitrião" },
      { name: "description", content: "Gestão da base de conhecimento RAG do Concierge IA." },
      { property: "og:title", content: "Brain — Anfitrião" },
      { property: "og:description", content: "Gestão da base de conhecimento RAG." },
    ],
  }),
  component: BrainPage,
});

function BrainPage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(mockKnowledgeDocs);
  const [qa, setQa] = useState<QAPair[]>(mockQA);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [search, setSearch] = useState("");

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const doc = await uploadDocument(f);
      setDocs((prev) => [doc, ...prev]);
    }
  };

  const submitQA = async () => {
    if (!question.trim() || !answer.trim()) return;
    const pair = await addQAPair(question, answer);
    setQa((prev) => [pair, ...prev]);
    setQuestion("");
    setAnswer("");
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <Tabs defaultValue="documents">
        <TabsList className="rounded-sm bg-white border border-border/60 p-1">
          <TabsTrigger value="documents" className="rounded-sm text-xs uppercase tracking-wider">Documentos</TabsTrigger>
          <TabsTrigger value="qa" className="rounded-sm text-xs uppercase tracking-wider">Q&amp;A</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6 space-y-6">
          <Card className="rounded-sm border-border/60 shadow-none">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-900">Adicionar documento</CardTitle>
              <p className="text-xs text-slate-500">Manuais, políticas e tabelas serão indexados na memória da IA.</p>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-border/60 rounded-sm py-10 cursor-pointer hover:bg-slate-50 transition">
                <Upload className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
                <span className="text-sm text-slate-700">Arraste arquivos aqui ou clique para selecionar</span>
                <span className="text-[11px] text-slate-400">PDF, DOCX, XLSX · até 20MB</span>
                <input type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
              </label>
            </CardContent>
          </Card>

          <Card className="rounded-sm border-border/60 shadow-none">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-900">Documentos ativos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Nome</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Tipo</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Tamanho</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Status</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Atualizado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((d) => (
                    <TableRow key={d.id} className="border-border/60">
                      <TableCell className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.5} />
                        {d.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{d.type}</TableCell>
                      <TableCell className="text-xs text-slate-500">{d.size}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-sm font-normal text-[10px] ${
                          d.status === "indexed" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : d.status === "indexing" ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}>
                          {d.status === "indexed" ? "Indexado" : d.status === "indexing" ? "Indexando" : "Erro"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{d.updatedAt}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700" aria-label="Reindexar">
                          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Button>
                        <Button onClick={() => setDocs((prev) => prev.filter((x) => x.id !== d.id))} variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-600" aria-label="Remover">
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qa" className="mt-6 space-y-6">
          <Card className="rounded-sm border-border/60 shadow-none">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-900">Adicionar par Pergunta / Resposta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="q" className="text-[11px] uppercase tracking-wider text-slate-500">Pergunta</Label>
                <Input id="q" value={question} onChange={(e) => setQuestion(e.target.value)} className="mt-1 h-9 rounded-sm border-border/60" placeholder="Como funciona o ajuste sob medida?" />
              </div>
              <div>
                <Label htmlFor="a" className="text-[11px] uppercase tracking-wider text-slate-500">Resposta</Label>
                <Textarea id="a" value={answer} onChange={(e) => setAnswer(e.target.value)} className="mt-1 rounded-sm border-border/60 min-h-[80px]" placeholder="Resposta padrão do Concierge…" />
              </div>
              <div className="flex justify-end">
                <Button onClick={submitQA} className="rounded-sm bg-slate-900 hover:bg-slate-800 gap-1.5">
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-sm border-border/60 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-900">Treinamentos</CardTitle>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" className="h-8 w-56 rounded-sm border-border/60 text-sm" />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Pergunta</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Resposta</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qa.filter((p) => !search || p.question.toLowerCase().includes(search.toLowerCase())).map((p) => (
                    <TableRow key={p.id} className="border-border/60 align-top">
                      <TableCell className="text-sm font-medium text-slate-900 max-w-xs">{p.question}</TableCell>
                      <TableCell className="text-xs text-slate-600">{p.answer}</TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{p.updatedAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
