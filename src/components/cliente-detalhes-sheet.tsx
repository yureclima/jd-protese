import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Brain, MessageSquare, Clock, Edit2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ClienteDetalhesSheetProps {
    contato: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onContatoUpdated?: () => void;
}

interface FichaTecnica {
    modelo_base: string | null;
    cor_cabelo: string | null;
    tipo_fixacao: string | null;
    data_ultima_compra_protese: string | null;
}

interface MemoriaLong {
    categoria: string;
    conteudo: string;
    relevancia: number;
}

export function ClienteDetalhesSheet({ contato, open, onOpenChange, onContatoUpdated }: ClienteDetalhesSheetProps) {
    const [fichaTecnica, setFichaTecnica] = useState<FichaTecnica | null>(null);
    const [memorias, setMemorias] = useState<MemoriaLong[]>([]);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [isUpdatingName, setIsUpdatingName] = useState(false);

    // States: Ficha Técnica
    const [isEditingFicha, setIsEditingFicha] = useState(false);
    const [isUpdatingFicha, setIsUpdatingFicha] = useState(false);
    const [editedModeloBase, setEditedModeloBase] = useState("");
    const [editedCorCabelo, setEditedCorCabelo] = useState("");
    const [editedTipoFixacao, setEditedTipoFixacao] = useState("");
    const [editedDataCompra, setEditedDataCompra] = useState("");

    // States: Telefone
    const [isEditingTelefone, setIsEditingTelefone] = useState(false);
    const [editedTelefone, setEditedTelefone] = useState("");
    const [isUpdatingTelefone, setIsUpdatingTelefone] = useState(false);

    useEffect(() => {
        if (contato && open) {
            setEditedName(contato.nome || "");
            setEditedTelefone(contato.telefone || "");
            setIsEditingName(false);
            setIsEditingTelefone(false);
            setIsEditingFicha(false);
        }
    }, [contato, open]);

    const handleSaveName = async () => {
        if (!contato || !editedName.trim()) return;
        setIsUpdatingName(true);
        try {
            const { error } = await supabase
                .from("contatos")
                .update({ nome: editedName })
                .eq("id", contato.id);
            if (error) throw error;
            toast.success("Nome atualizado com sucesso");
            setIsEditingName(false);
            contato.nome = editedName; // Optimistic update
            if (onContatoUpdated) onContatoUpdated();
        } catch (error) {
            console.error("Erro ao atualizar nome:", error);
            toast.error("Erro ao atualizar nome");
        } finally {
            setIsUpdatingName(false);
        }
    };

    const handleSaveTelefone = async () => {
        if (!contato || !editedTelefone.trim()) return;
        setIsUpdatingTelefone(true);
        try {
            const { error } = await supabase
                .from("contatos")
                .update({ telefone: editedTelefone })
                .eq("id", contato.id);
            if (error) throw error;
            toast.success("Telefone atualizado com sucesso");
            setIsEditingTelefone(false);
            contato.telefone = editedTelefone; // Optimistic update
            if (onContatoUpdated) onContatoUpdated();
        } catch (error) {
            console.error("Erro ao atualizar telefone:", error);
            toast.error("Erro ao atualizar telefone");
        } finally {
            setIsUpdatingTelefone(false);
        }
    };

    const handleSaveFicha = async () => {
        if (!contato) return;
        setIsUpdatingFicha(true);
        try {
            // Upsert ficha_tecnica_protese
            const { error } = await supabase
                .from("ficha_tecnica_protese")
                .upsert({
                    contato_id: contato.id,
                    modelo_base: editedModeloBase,
                    cor_cabelo: editedCorCabelo,
                    tipo_fixacao: editedTipoFixacao,
                    data_ultima_compra_protese: editedDataCompra || null,
                    atualizado_em: new Date().toISOString()
                }, { onConflict: 'contato_id' });

            if (error) throw error;
            toast.success("Ficha técnica atualizada com sucesso");
            setIsEditingFicha(false);

            // Refetch details to update state
            const { data: fichaData } = await supabase
                .from("ficha_tecnica_protese")
                .select("*")
                .eq("contato_id", contato.id)
                .single();

            if (fichaData) {
                setFichaTecnica(fichaData);
            }
        } catch (error) {
            console.error("Erro ao atualizar ficha técnica:", error);
            toast.error("Erro ao atualizar ficha técnica");
        } finally {
            setIsUpdatingFicha(false);
        }
    };

    useEffect(() => {
        async function fetchDetalhes() {
            if (!contato?.id) return;

            setLoadingDetalhes(true);

            const { data: fichaData } = await supabase
                .from("ficha_tecnica_protese")
                .select("*")
                .eq("contato_id", contato.id)
                .single();

            if (fichaData) {
                setFichaTecnica(fichaData);
                setEditedModeloBase(fichaData.modelo_base || "");
                setEditedCorCabelo(fichaData.cor_cabelo || "");
                setEditedTipoFixacao(fichaData.tipo_fixacao || "");
                setEditedDataCompra(fichaData.data_ultima_compra_protese || "");
            } else {
                setFichaTecnica(null);
                setEditedModeloBase("");
                setEditedCorCabelo("");
                setEditedTipoFixacao("");
                setEditedDataCompra("");
            }

            const { data: memData } = await supabase
                .from("memory_long")
                .select("*")
                .eq("contato_id", contato.id)
                .order("relevancia", { ascending: false });

            if (memData) {
                setMemorias(memData);
            } else {
                setMemorias([]);
            }

            setLoadingDetalhes(false);
        }

        if (open && contato) {
            fetchDetalhes();
        }
    }, [open, contato]);

    if (!contato) return null;

    const getScoreVariant = (score: number) => {
        if (score >= 80) return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
        if (score >= 40) return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
        return "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400";
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-xl bg-slate-50 dark:bg-zinc-950 overflow-y-auto border-l-0 sm:border-l sm:rounded-l-2xl shadow-2xl">
                <SheetHeader className="mb-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-2xl shadow-lg shadow-indigo-500/20 shrink-0">
                            {contato.nome ? contato.nome.substring(0, 2).toUpperCase() : "NL"}
                        </div>
                        <div className="flex-1 w-full min-w-0">
                            {isEditingName ? (
                                <div className="flex items-center gap-2 mb-1">
                                    <Input
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        className="h-8 text-lg font-bold"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveName();
                                            if (e.key === "Escape") setIsEditingName(false);
                                        }}
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0" onClick={handleSaveName} disabled={isUpdatingName}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 shrink-0" onClick={() => setIsEditingName(false)} disabled={isUpdatingName}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <SheetTitle className="text-2xl font-bold tracking-tight truncate">{contato.nome || "Novo Lead"}</SheetTitle>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 md:opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600 shrink-0" onClick={() => setIsEditingName(true)}>
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            )}
                            {isEditingTelefone ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={editedTelefone}
                                        onChange={(e) => setEditedTelefone(e.target.value)}
                                        className="h-8 text-base"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveTelefone();
                                            if (e.key === "Escape") setIsEditingTelefone(false);
                                        }}
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 shrink-0" onClick={handleSaveTelefone} disabled={isUpdatingTelefone}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 shrink-0" onClick={() => setIsEditingTelefone(false)} disabled={isUpdatingTelefone}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <SheetDescription className="flex items-center gap-2 text-base group/phone">
                                    {contato.telefone}
                                    <Button size="icon" variant="ghost" className="h-5 w-5 md:opacity-0 group-hover/phone:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600" onClick={() => setIsEditingTelefone(true)}>
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                </SheetDescription>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getScoreVariant(contato.lead_score)}`}>
                            Score: {contato.lead_score}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700">
                            {contato.fase_funil || "Fase Indefinida"}
                        </span>
                        {contato.interesse_atual && (
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${contato.interesse_atual === "manutenção" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"}`}>
                                {contato.interesse_atual}
                            </span>
                        )}
                    </div>
                </SheetHeader>

                <div className="grid gap-6 py-4">


                    {loadingDetalhes ? (
                        <div className="flex items-center justify-center p-10">
                            <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent animate-spin rounded-full" />
                        </div>
                    ) : (
                        <>
                            {/* Card de Ficha Técnica */}
                            <Card className="border-none shadow-sm dark:bg-zinc-900 overflow-hidden relative">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between z-10">
                                    <div className="flex items-center gap-2">
                                        <Edit2 className="h-5 w-5 text-indigo-500" />
                                        <CardTitle className="text-lg">Ficha Técnica</CardTitle>
                                    </div>
                                    {!isEditingFicha ? (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 transition-colors"
                                            onClick={() => setIsEditingFicha(true)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 font-bold"
                                                onClick={handleSaveFicha}
                                                disabled={isUpdatingFicha}
                                            >
                                                {isUpdatingFicha ? "Salvando..." : "Salvar"}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-3 text-slate-500 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                                onClick={() => setIsEditingFicha(false)}
                                                disabled={isUpdatingFicha}
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    )}
                                </CardHeader>
                                <Separator className="dark:bg-zinc-800" />
                                <CardContent className="pt-4 grid sm:grid-cols-2 gap-4">
                                    {isEditingFicha ? (
                                        <>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Modelo Base</Label>
                                                <Input
                                                    value={editedModeloBase}
                                                    onChange={(e) => setEditedModeloBase(e.target.value)}
                                                    className="h-9"
                                                    placeholder="Digite o modelo..."
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cor do Cabelo</Label>
                                                <Input
                                                    value={editedCorCabelo}
                                                    onChange={(e) => setEditedCorCabelo(e.target.value)}
                                                    className="h-9"
                                                    placeholder="Digite a cor..."
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo de Fixação</Label>
                                                <Input
                                                    value={editedTipoFixacao}
                                                    onChange={(e) => setEditedTipoFixacao(e.target.value)}
                                                    className="h-9"
                                                    placeholder="Ex: Fita, Cola..."
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Última Compra</Label>
                                                <Input
                                                    type="date"
                                                    value={editedDataCompra}
                                                    onChange={(e) => setEditedDataCompra(e.target.value)}
                                                    className="h-9"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Modelo Base</span>
                                                <p className="font-semibold text-slate-900 dark:text-zinc-100">{fichaTecnica?.modelo_base || "Não Registrado"}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Cor do Cabelo</span>
                                                <p className="font-semibold text-slate-900 dark:text-zinc-100">{fichaTecnica?.cor_cabelo || "Não Registrado"}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Tipo de Fixação</span>
                                                <p className="font-semibold text-slate-900 dark:text-zinc-100">{fichaTecnica?.tipo_fixacao || "Não Registrado"}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Última Compra</span>
                                                <p className="font-semibold text-slate-900 dark:text-zinc-100">
                                                    {fichaTecnica?.data_ultima_compra_protese ? new Date(fichaTecnica.data_ultima_compra_protese).toLocaleDateString("pt-BR") : "Não Registrado"}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Card de Memória da IA */}
                            <Card className="border-none shadow-sm dark:bg-zinc-900">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <Brain className="h-5 w-5 text-indigo-500" />
                                        <CardTitle className="text-lg">Memória da IA (Longo Prazo)</CardTitle>
                                    </div>
                                    <CardDescription>Principais pontos capturados nas conversas pelo WhatsApp.</CardDescription>
                                </CardHeader>
                                <Separator className="dark:bg-zinc-800" />
                                <CardContent className="pt-4 flex flex-col gap-4">
                                    {memorias.length > 0 ? (
                                        memorias.map((memoria, index) => (
                                            <div key={index} className="flex gap-3 items-start bg-slate-100 dark:bg-zinc-800/50 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
                                                <div className="mt-0.5"><MessageSquare className="h-4 w-4 text-indigo-400" /></div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 dark:text-indigo-300 uppercase tracking-wider mb-1">{memoria.categoria}</p>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">{memoria.conteudo}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 text-slate-400 dark:text-zinc-500 text-sm">
                                            Nenhuma anotação importante capturada ainda.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Informações do Lead */}
                            <div className="text-xs text-slate-400 text-center flex items-center justify-center gap-4 mt-4">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Origem: {contato.origem_lead || "-"}</span>
                                <span>Última interação: {contato.ultima_interacao ? new Date(contato.ultima_interacao).toLocaleDateString("pt-BR") : "Desconhecida"}</span>
                            </div>
                        </>
                    )}

                </div>
            </SheetContent>
        </Sheet>
    );
}
