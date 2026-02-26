"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Plus, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { supabase } from "@/lib/supabase";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface Cliente {
    id: string;
    nome: string | null;
    telefone: string;
}

interface ClienteComboboxProps {
    onSelect: (clienteId: string | null, cliente: Cliente | null) => void;
    selectedId: string | null;
}

export function ClienteCombobox({ onSelect, selectedId }: ClienteComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [options, setOptions] = React.useState<Cliente[]>([]);
    const [selectedCliente, setSelectedCliente] = React.useState<Cliente | null>(null);

    const debouncedSearch = useDebounce(search, 300);

    // Busca inicial do cliente selecionado se for o caso
    React.useEffect(() => {
        async function fetchSelected() {
            if (!selectedId) {
                setSelectedCliente(null);
                return;
            }

            const { data } = await supabase
                .from("contatos")
                .select("id, nome, telefone")
                .eq("id", selectedId)
                .single();

            if (data) setSelectedCliente(data);
        }

        fetchSelected();
    }, [selectedId]);

    // Busca na lista
    React.useEffect(() => {
        async function searchClientes() {
            if (!debouncedSearch) {
                setOptions([]);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from("contatos")
                .select("id, nome, telefone")
                .or(`nome.ilike.%${debouncedSearch}%,telefone.ilike.%${debouncedSearch}%`)
                .limit(5);

            if (data) {
                setOptions(data);
            }
            setLoading(false);
        }

        searchClientes();
    }, [debouncedSearch]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-12 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl"
                >
                    {selectedCliente ? (
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className="font-semibold text-slate-900 dark:text-zinc-100 truncate">
                                {selectedCliente.nome || "Lead Sem Nome"}
                            </span>
                            <span className="text-slate-400 dark:text-zinc-500 text-xs truncate">
                                {selectedCliente.telefone}
                            </span>
                        </div>
                    ) : (
                        <span className="text-slate-400">Buscar ou cadastrar cliente...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 shadow-xl" align="start">
                <Command shouldFilter={false}>
                    <div className="flex items-center border-b border-slate-100 dark:border-zinc-800 px-3 overflow-hidden">
                        <Search className="h-4 w-4 shrink-0 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <CommandInput
                            placeholder="Digite o nome ou telefone..."
                            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus:ring-0 shadow-none dark:text-zinc-100 dark:placeholder-zinc-500"
                            value={search}
                            onValueChange={setSearch}
                        />
                        {loading && <Loader2 className="ml-1 h-4 w-4 shrink-0 animate-spin text-emerald-500" />}
                    </div>
                    <CommandList>
                        <CommandEmpty className="py-6 text-center text-sm text-slate-500 dark:text-zinc-400">
                            {search && !loading ? (
                                <div className="flex flex-col items-center gap-3">
                                    <p>Nenhum cliente encontrado.</p>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                        onClick={() => {
                                            // Simula criação e passa um cliente fake (em PRD chamaria um form ou API)
                                            const tempId = "new-" + Date.now();
                                            const novo = { id: tempId, nome: search, telefone: search };
                                            setSelectedCliente(novo);
                                            onSelect(tempId, novo);
                                            setOpen(false);
                                        }}
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Cadastrar "{search}"
                                    </Button>
                                </div>
                            ) : loading ? "Buscando..." : "Digite para pesquisar..."}
                        </CommandEmpty>
                        {options.length > 0 && (
                            <CommandGroup heading="Resultados da Busca" className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
                                {options.map((cliente) => (
                                    <CommandItem
                                        key={cliente.id}
                                        value={cliente.id}
                                        onSelect={() => {
                                            setSelectedCliente(cliente);
                                            onSelect(cliente.id, cliente);
                                            setOpen(false);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-md py-3 dark:text-zinc-200"
                                    >
                                        <div className="flex flex-col flex-1 pl-1">
                                            <span className="font-semibold text-slate-900 dark:text-zinc-100">
                                                {cliente.nome || "Novo Lead"}
                                            </span>
                                            <span className="text-slate-500 dark:text-zinc-400 text-xs">{cliente.telefone}</span>
                                        </div>
                                        <Check
                                            className={cn(
                                                "h-4 w-4 mr-2 text-emerald-500",
                                                selectedId === cliente.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
