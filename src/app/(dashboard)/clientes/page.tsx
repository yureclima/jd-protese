"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClienteDetalhesSheet } from "@/components/cliente-detalhes-sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Contato {
    id: string;
    nome: string | null;
    telefone: string;
    origem_lead: string | null;
    lead_score: number;
    fase_funil: string | null;
    interesse_atual: string | null;
}

export default function ClientesPage() {
    const [clientes, setClientes] = useState<Contato[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedContato, setSelectedContato] = useState<Contato | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const [isNewContactOpen, setIsNewContactOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newContact, setNewContact] = useState({
        nome: "",
        telefone: "55",
        origem_lead: "Manual (CRM)",
        fase_funil: "Triagem",
        interesse_atual: "manutenção"
    });

    const fetchClientes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("contatos")
            .select("*")
            .order("ultima_interacao", { ascending: false });

        if (error) {
            console.error("Erro ao buscar clientes:", error);
        } else {
            setClientes(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchClientes();
    }, []);

    const handleCreateContact = async () => {
        if (!newContact.telefone || !newContact.nome) {
            toast.error("Por favor, preencha o nome e o telefone.");
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase.from("contatos").insert({
                nome: newContact.nome,
                telefone: newContact.telefone,
                origem_lead: newContact.origem_lead,
                fase_funil: newContact.fase_funil,
                interesse_atual: newContact.interesse_atual,
                lead_score: 50
            });

            if (error) throw error;

            toast.success("Contato criado com sucesso!");
            setIsNewContactOpen(false);
            setNewContact({
                nome: "",
                telefone: "55",
                origem_lead: "Manual (CRM)",
                fase_funil: "Triagem",
                interesse_atual: "manutenção"
            });
            fetchClientes();
        } catch (err) {
            console.error("Erro ao criar contato:", err);
            toast.error("Erro ao tentar criar contato no banco de dados.");
        }
        setIsSaving(false);
    };

    const filteredClientes = clientes.filter((cliente) =>
        (cliente.nome?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        cliente.telefone.includes(searchTerm)
    );

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Clientes (CRM)</h1>
                    <p className="text-muted-foreground mt-1">Gerencie seus leads e histórico de clientes.</p>
                </div>

                <Dialog open={isNewContactOpen} onOpenChange={setIsNewContactOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white rounded-xl px-6 py-6 h-auto shadow-lg shadow-zinc-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <UserPlus className="mr-2 h-5 w-5" />
                            Novo Contato
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl flex items-center gap-2 text-slate-900 dark:text-zinc-100">
                                <UserPlus className="h-5 w-5 text-emerald-500" />
                                Adicionar Novo Contato
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-zinc-400">
                                Adicione manualmente um lead ou cliente à base.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nome" className="text-slate-700 dark:text-zinc-300">Resumo / Nome</Label>
                                <Input
                                    id="nome"
                                    placeholder="Ex: João Silva"
                                    value={newContact.nome}
                                    onChange={(e) => setNewContact({ ...newContact, nome: e.target.value })}
                                    className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 dark:text-zinc-100"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="telefone" className="text-slate-700 dark:text-zinc-300">Telefone (WhatsApp)</Label>
                                <Input
                                    id="telefone"
                                    placeholder="Ex: 5511999999999"
                                    value={newContact.telefone}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/\D/g, '');
                                        if (!val.startsWith('55') && val.length > 0) {
                                            val = '55' + val;
                                        }
                                        setNewContact({ ...newContact, telefone: val });
                                    }}
                                    className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 dark:text-zinc-100"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-slate-700 dark:text-zinc-300">Interesse Principal</Label>
                                <Select value={newContact.interesse_atual} onValueChange={(val) => setNewContact({ ...newContact, interesse_atual: val })}>
                                    <SelectTrigger className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 dark:text-zinc-100">
                                        <SelectValue placeholder="Selecione um interesse" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                                        <SelectItem value="manutenção">Manutenção de Prótese</SelectItem>
                                        <SelectItem value="comprar">Adquirir Nova Prótese</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-slate-700 dark:text-zinc-300">Fase do Funil</Label>
                                <Select value={newContact.fase_funil} onValueChange={(val) => setNewContact({ ...newContact, fase_funil: val })}>
                                    <SelectTrigger className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 dark:text-zinc-100">
                                        <SelectValue placeholder="Selecione a fase" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                                        <SelectItem value="Triagem">Triagem Inicial</SelectItem>
                                        <SelectItem value="Agendamento Solicitado">Agendamento Solicitado</SelectItem>
                                        <SelectItem value="Qualificado">Qualificado (Com interesse)</SelectItem>
                                        <SelectItem value="Cliente Ativo">Cliente Ativo</SelectItem>
                                        <SelectItem value="Follow-up">Aguardando Follow-up</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNewContactOpen(false)} disabled={isSaving}>Cancelar</Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={handleCreateContact} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Contato"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                        placeholder="Buscar por nome ou telefone..."
                        className="pl-10 h-12 bg-white dark:bg-zinc-900 border-none shadow-sm rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-all dark:text-zinc-100"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
                <CardHeader className="border-b border-slate-50 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100">Base de Contatos</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-zinc-400">
                        Listagem de todos os contatos capturados pela IA ou inseridos manualmente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading && clientes.length === 0 ? (
                        <Table>
                            <TableHeader className="bg-slate-50/50 dark:bg-zinc-800/30">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="py-4 px-6"></TableHead>
                                    <TableHead></TableHead><TableHead></TableHead><TableHead></TableHead><TableHead></TableHead><TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Array(6).fill(0).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell className="px-6 py-4"><div className="h-5 bg-slate-200 dark:bg-zinc-800 rounded w-32"></div></TableCell>
                                        <TableCell><div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-24"></div></TableCell>
                                        <TableCell><div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-20"></div></TableCell>
                                        <TableCell><div className="h-6 bg-slate-200 dark:bg-zinc-800 rounded-lg w-24"></div></TableCell>
                                        <TableCell><div className="h-6 bg-slate-200 dark:bg-zinc-800 rounded-full w-12"></div></TableCell>
                                        <TableCell><div className="h-6 bg-slate-200 dark:bg-zinc-800 rounded-lg w-20"></div></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/50 dark:bg-zinc-800/30">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase px-6">Nome</TableHead>
                                    <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">Telefone</TableHead>
                                    <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">Origem</TableHead>
                                    <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">Fase do Funil</TableHead>
                                    <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">Score</TableHead>
                                    <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">Interesse</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredClientes.map((cliente) => (
                                    <TableRow
                                        key={cliente.id}
                                        className="group hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors border-slate-50 dark:border-zinc-800 cursor-pointer"
                                        onClick={() => {
                                            setSelectedContato(cliente);
                                            setIsSheetOpen(true);
                                        }}
                                    >
                                        <TableCell className="font-semibold text-slate-900 dark:text-zinc-100 px-6 py-4">{cliente.nome || "Novo Lead"}</TableCell>
                                        <TableCell className="font-medium text-slate-600 dark:text-zinc-400">{cliente.telefone}</TableCell>
                                        <TableCell className="text-slate-500 dark:text-zinc-500 font-medium">{cliente.origem_lead || "-"}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                                                {cliente.fase_funil || "Não Definida"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${cliente.lead_score >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                                cliente.lead_score >= 40 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                                                }`}>
                                                {cliente.lead_score}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {cliente.interesse_atual === "manutenção" ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 uppercase tracking-wider">
                                                    Manutenção
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 uppercase tracking-wider">
                                                    Adquirir
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredClientes.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-slate-400 dark:text-zinc-500 font-medium bg-white dark:bg-zinc-900">
                                            Nenhum cliente encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            <ClienteDetalhesSheet
                contato={selectedContato}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                onContatoUpdated={fetchClientes}
            />
        </div>
    );
}
