"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClienteCombobox } from "@/components/cliente-combobox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, Loader2, Scissors, CheckCircle2, Plus, Search, Trash2, XCircle, CalendarClock, Key } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

interface EventType {
    id: number | string;
    title: string;
    duration: number;
    price: string;
}

interface Booking {
    id: number | string;
    client: string;
    service: string;
    date: Date;
    status: string;
    uid: string;
    eventTypeId?: string | number;
}

export default function AgendaPage() {
    const supabase = createClient();
    const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
    const [selectedCliente, setSelectedCliente] = useState<any | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
    const [isBooking, setIsBooking] = useState(false);

    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [slots, setSlots] = useState<string[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [searchBookings, setSearchBookings] = useState("");
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [isCanceling, setIsCanceling] = useState<string | null>(null);
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

    const [bookingToReschedule, setBookingToReschedule] = useState<Booking | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(new Date());
    const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState<string | null>(null);
    const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
    const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
    const [isRescheduling, setIsRescheduling] = useState(false);

    const [loadingEvents, setLoadingEvents] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);

    const [savedApiKey, setSavedApiKey] = useState<string | null>(null);
    const [isCheckingKey, setIsCheckingKey] = useState(true);

    // Carregar chave do perfil do supabase
    useEffect(() => {
        async function fetchKey() {
            setIsCheckingKey(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('cal_api_key').eq('id', user.id).single();
                if (data?.cal_api_key) {
                    setSavedApiKey(data.cal_api_key);
                }
            }
            setIsCheckingKey(false);
        }
        fetchKey();
    }, [supabase]);

    const loadData = async () => {
        if (!savedApiKey) return;
        setLoadingEvents(true);
        try {
            const resEvents = await fetch(`https://api.cal.com/v1/event-types?apiKey=${savedApiKey}`);
            const dataEvents = await resEvents.json();

            if (dataEvents && Array.isArray(dataEvents)) {
                setEventTypes(dataEvents.filter((e: any) => !e.hidden).map((e: any) => ({
                    id: e.id,
                    title: e.title,
                    duration: e.length,
                    price: e.price ? `R$ ${e.price / 100}` : "Padrão",
                })));
            } else if (dataEvents?.event_types) {
                setEventTypes(dataEvents.event_types.filter((e: any) => !e.hidden).map((e: any) => ({
                    id: e.id,
                    title: e.title,
                    duration: e.length,
                    price: e.price ? `R$ ${e.price / 100}` : "Padrão",
                })));
            }

            const resBookings = await fetch(`https://api.cal.com/v1/bookings?apiKey=${savedApiKey}`);
            const dataBookings = await resBookings.json();

            let newBookings: Booking[] = [];
            const mapBooking = (b: any) => ({
                id: b.id,
                client: b.attendees?.[0]?.name || "Cliente",
                service: b.title || "Agendamento",
                date: new Date(b.startTime),
                status: b.status === "ACCEPTED" ? "Confirmado" : b.status === "PENDING" ? "Pendente" : "Cancelado",
                uid: b.uid,
                eventTypeId: b.eventType?.id || b.eventTypeId
            });

            if (dataBookings && Array.isArray(dataBookings)) {
                newBookings = dataBookings.map(mapBooking);
            } else if (dataBookings?.bookings) {
                newBookings = dataBookings.bookings.map(mapBooking);
            }

            newBookings.sort((a, b) => b.date.getTime() - a.date.getTime());
            setBookings(newBookings);
        } catch (err) {
            console.error("Erro ao carregar dados do Cal.com", err);
        }
        setLoadingEvents(false);
    };

    useEffect(() => {
        if (savedApiKey) loadData();
    }, [savedApiKey]);

    useEffect(() => {
        if (!savedApiKey || !selectedEventId || !selectedDate) {
            setSlots([]);
            return;
        }
        async function fetchSlots() {
            setLoadingSlots(true);
            try {
                const startStr = new Date(selectedDate!);
                startStr.setHours(0, 0, 0, 0);
                const endStr = new Date(selectedDate!);
                endStr.setHours(23, 59, 59, 999);

                const url = `https://api.cal.com/v1/slots?apiKey=${savedApiKey}&eventTypeId=${selectedEventId}&startTime=${startStr.toISOString()}&endTime=${endStr.toISOString()}`;
                const res = await fetch(url);
                const data = await res.json();

                if (data && data.slots) {
                    const dateKey = startStr.toISOString().split('T')[0];
                    const daySlots = data.slots[dateKey] || [];
                    const timeStrings = daySlots.map((s: any) => format(new Date(s.time), "HH:mm"));
                    setSlots(timeStrings);
                }
            } catch (err) {
                console.error("Erro ao carregar os horários", err);
                setSlots([]);
            }
            setLoadingSlots(false);
        }
        fetchSlots();
    }, [savedApiKey, selectedEventId, selectedDate]);

    useEffect(() => {
        if (!savedApiKey || !bookingToReschedule?.eventTypeId || !rescheduleDate) {
            setRescheduleSlots([]);
            return;
        }
        async function fetchReschSlots() {
            setLoadingRescheduleSlots(true);
            try {
                const startStr = new Date(rescheduleDate!);
                startStr.setHours(0, 0, 0, 0);
                const endStr = new Date(rescheduleDate!);
                endStr.setHours(23, 59, 59, 999);

                const url = `https://api.cal.com/v1/slots?apiKey=${savedApiKey}&eventTypeId=${bookingToReschedule!.eventTypeId}&startTime=${startStr.toISOString()}&endTime=${endStr.toISOString()}`;
                const res = await fetch(url);
                const data = await res.json();

                if (data && data.slots) {
                    const dateKey = startStr.toISOString().split('T')[0];
                    const daySlots = data.slots[dateKey] || [];
                    const timeStrings = daySlots.map((s: any) => format(new Date(s.time), "HH:mm"));
                    setRescheduleSlots(timeStrings);
                }
            } catch (err) {
                console.error("Erro ao carregar os horários (Reagendar)", err);
                setRescheduleSlots([]);
            }
            setLoadingRescheduleSlots(false);
        }
        fetchReschSlots();
    }, [savedApiKey, bookingToReschedule, rescheduleDate]);

    const handleSelectCliente = (id: string | null, cliente: any | null) => {
        setSelectedClienteId(id);
        setSelectedCliente(cliente);
    };

    const handleBookAppointment = async () => {
        if (!selectedCliente || !selectedDate || !selectedEventId || !selectedTimeSlot || !savedApiKey) return;
        setIsBooking(true);
        try {
            const [hours, minutes] = selectedTimeSlot.split(":");
            const startDateTime = new Date(selectedDate!);
            startDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

            let rawPhone = selectedCliente.telefone ? selectedCliente.telefone.replace(/\D/g, '') : "";
            if (rawPhone.startsWith("55") && (rawPhone.length === 12 || rawPhone.length === 13)) {
                rawPhone = rawPhone.substring(2);
            }
            if (rawPhone.length === 10) {
                rawPhone = `${rawPhone.substring(0, 2)}9${rawPhone.substring(2)}`;
            }
            let formattedPhone = `+55${rawPhone}`;
            if (rawPhone.length < 10) {
                formattedPhone = "+5511999999999";
            }

            const payload = {
                eventTypeId: parseInt(selectedEventId, 10),
                start: startDateTime.toISOString(),
                responses: {
                    name: selectedCliente.nome || "Cliente JD",
                    email: selectedCliente.email || `${formattedPhone.replace(/\D/g, '')}@jdprotese.com`,
                    phone: formattedPhone || "",
                    attendeePhoneNumber: formattedPhone || "",
                },
                metadata: { supabase_id: selectedClienteId },
                timeZone: "America/Sao_Paulo",
                language: "pt-BR"
            };

            const response = await fetch(`https://api.cal.com/v1/bookings?apiKey=${savedApiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success(`Agendamento realizado com sucesso para ${format(selectedDate, "dd/MM")} às ${selectedTimeSlot}!`);
                setSelectedTimeSlot(null);
                loadData();
            } else {
                const errorData = await response.json();
                console.error("Erro Cal.com:", errorData);
                toast.error(`Erro ao agendar: ${errorData.message || 'Verifique as configurações'}`);
            }
        } catch (err) {
            console.error("Erro de conexão com a API do Cal.com", err);
            toast.error("Ocorreu um erro de rede ao tentar agendar.");
        }
        setIsBooking(false);
    };

    const handleCancelBooking = async () => {
        if (!savedApiKey || !bookingToCancel?.uid) return;
        setIsCanceling(bookingToCancel.id.toString());
        try {
            const url = `https://api.cal.com/v2/bookings/${bookingToCancel.uid}/cancel`;
            const payload = {
                cancellationReason: "Cancelado pelo painel gerencial JD",
                cancelSubsequentBookings: true
            };
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "cal-api-version": "2024-08-13",
                    "Authorization": `Bearer ${savedApiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok && res.status === 401) {
                const urlV1 = `https://api.cal.com/v1/bookings/${bookingToCancel.id}/cancel?apiKey=${savedApiKey}`;
                const resV1 = await fetch(urlV1, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reason: "Cancelado pelo gestor no JD Painel" })
                });
                if (resV1.ok) {
                    setBookings(prev => prev.map(b => b.id === bookingToCancel.id ? { ...b, status: "Cancelado" } : b));
                    setBookingToCancel(null);
                    setIsCanceling(null);
                    return;
                }
            }

            if (res.ok) {
                setBookings(prev => prev.map(b => b.id === bookingToCancel.id ? { ...b, status: "Cancelado" } : b));
                toast.success("Agendamento cancelado com sucesso.");
            } else {
                toast.error(`Não foi possível cancelar o agendamento na API.`);
            }
        } catch (err) {
            console.error("Erro ao cancelar: ", err);
            toast.error("Erro de rede ao tentar cancelar.");
        }
        setIsCanceling(null);
        setBookingToCancel(null);
    };

    const handleRescheduleBooking = async () => {
        if (!savedApiKey || !bookingToReschedule?.uid || !rescheduleDate || !rescheduleTimeSlot) return;
        setIsRescheduling(true);
        try {
            const [hours, minutes] = rescheduleTimeSlot.split(":");
            const startDateTime = new Date(rescheduleDate);
            startDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

            const url = `https://api.cal.com/v2/bookings/${bookingToReschedule.uid}/reschedule`;
            const payload = {
                start: startDateTime.toISOString(),
                reschedulingReason: "Reagendado pelo painel gerencial JD"
            };

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "cal-api-version": "2024-08-13",
                    "Authorization": `Bearer ${savedApiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Reagendamento concluído com sucesso!");
                setBookingToReschedule(null);
                setRescheduleTimeSlot(null);
                loadData();
            } else {
                const resV2Fallback = await fetch(`${url}?apiKey=${savedApiKey}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "cal-api-version": "2024-08-13"
                    },
                    body: JSON.stringify(payload)
                });

                if (resV2Fallback.ok) {
                    toast.success("Reagendamento concluído com sucesso!");
                    setBookingToReschedule(null);
                    setRescheduleTimeSlot(null);
                    loadData();
                } else {
                    toast.error("Não foi possível reagendar esse booking.");
                }
            }
        } catch (err) {
            toast.error("Erro de rede ao reagendar.");
        }
        setIsRescheduling(false);
    };

    const filteredBookings = bookings.filter(b => {
        const matchesSearch = b.client.toLowerCase().includes(searchBookings.toLowerCase()) ||
            b.service.toLowerCase().includes(searchBookings.toLowerCase());
        const matchesYear = selectedYear === "all" || b.date.getFullYear().toString() === selectedYear;
        return matchesSearch && matchesYear;
    });

    const getAvailableYears = () => {
        const years = Array.from(new Set(bookings.map(b => b.date.getFullYear().toString())));
        return years.sort((a, b) => parseInt(b) - parseInt(a));
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Agenda (API V2)</h1>
                <p className="text-muted-foreground mt-1">Gerenciamento customizado de horários integrado ao banco de dados.</p>
            </div>

            {isCheckingKey ? (
                <div className="flex items-center justify-center p-20 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : !savedApiKey ? (
                <Card className="border-none shadow-sm dark:bg-zinc-900">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Integração Necessária</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-500 dark:text-zinc-400">
                            A chave da API do Cal.com não está configurada para este utilizador.
                            Por favor, acesse as <a href="/dashboard/perfil" className="text-indigo-600 underline">Configurações de Perfil</a> para adicioná-la e ativar a sua agenda.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
                            <CardHeader className="border-b border-slate-50 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 pb-4">
                                <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                                    <Plus className="h-4 w-4 text-emerald-500" />
                                    Novo Agendamento
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2 block">
                                        Cliente (Busca Inteligente)
                                    </label>
                                    <ClienteCombobox
                                        selectedId={selectedClienteId}
                                        onSelect={handleSelectCliente}
                                    />
                                </div>

                                {selectedClienteId && (
                                    <>
                                        <Separator className="dark:bg-zinc-800" />
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2 block">
                                                Qual Serviço?
                                            </label>
                                            <Select onValueChange={setSelectedEventId} value={selectedEventId}>
                                                <SelectTrigger className="h-12 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl">
                                                    <SelectValue placeholder={loadingEvents ? "Carregando serviços..." : "Escolha um serviço da lista..."} />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-zinc-800 dark:bg-zinc-950">
                                                    {eventTypes.map((event) => (
                                                        <SelectItem key={event.id.toString()} value={event.id.toString()} className="py-3 cursor-pointer">
                                                            <span className="font-medium">{event.title}</span>
                                                            <span className="text-xs text-slate-400 dark:text-zinc-500 ml-2">({event.duration} min - {event.price})</span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {selectedEventId && (
                                            <>
                                                <div>
                                                    <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2 block">
                                                        Data do Agendamento
                                                    </label>
                                                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 flex justify-center bg-white dark:bg-zinc-950">
                                                        <Calendar
                                                            mode="single"
                                                            selected={selectedDate}
                                                            onSelect={setSelectedDate}
                                                            locale={ptBR}
                                                            disabled={{ before: new Date() }}
                                                            className="bg-transparent"
                                                        />
                                                    </div>
                                                </div>

                                                {selectedDate && (
                                                    <div>
                                                        <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2 flex items-center justify-between">
                                                            <span>Horários Disponíveis</span>
                                                            <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
                                                                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                                                            </span>
                                                        </label>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {loadingSlots ? (
                                                                <div className="col-span-4 py-4 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                                                                    <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                                                                </div>
                                                            ) : slots.length > 0 ? (
                                                                slots.map((slot) => (
                                                                    <Button
                                                                        key={slot}
                                                                        variant={selectedTimeSlot === slot ? "default" : "outline"}
                                                                        className={`h-10 text-sm font-medium rounded-lg transition-colors cursor-pointer
                                                                            ${selectedTimeSlot === slot
                                                                                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                                                                : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-zinc-800 hover:border-emerald-200"}`}
                                                                        onClick={() => setSelectedTimeSlot(slot)}
                                                                    >
                                                                        {slot}
                                                                    </Button>
                                                                ))
                                                            ) : (
                                                                <div className="col-span-4 py-4 text-center text-sm text-slate-500 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800">
                                                                    Sem vagas.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="pt-2">
                                                    <Button
                                                        className="w-full h-12 rounded-xl text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                                                        disabled={!selectedTimeSlot || isBooking}
                                                        onClick={handleBookAppointment}
                                                    >
                                                        {isBooking ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Confirmar Agendamento"}
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 flex-1">
                            <CardHeader className="border-b border-slate-50 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                                            <CalendarIcon className="h-5 w-5 text-indigo-500" />
                                            Agendamentos (API V2)
                                        </CardTitle>
                                        <CardDescription className="text-slate-500 dark:text-zinc-400 mt-1">
                                            Gerenciamento direto da API do Cal.com.
                                        </CardDescription>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                                            <SelectTrigger className="h-10 w-full sm:w-32 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-xl">
                                                <SelectValue placeholder="Ano" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 dark:border-zinc-800 dark:bg-zinc-950">
                                                <SelectItem value="all">Todos</SelectItem>
                                                {getAvailableYears().map(year => (
                                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <div className="relative w-full sm:w-64 shrink-0 group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500" />
                                            <Input
                                                placeholder="Buscar cliente ou serviço..."
                                                className="pl-9 h-10 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-xl w-full"
                                                value={searchBookings}
                                                onChange={(e) => setSearchBookings(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                    {loadingEvents ? (
                                        <div className="py-10 text-center flex flex-col items-center justify-center text-slate-500 gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                                            <span className="text-sm font-medium">Sincronizando...</span>
                                        </div>
                                    ) : filteredBookings.length > 0 ? (
                                        filteredBookings.map((booking) => (
                                            <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors group">
                                                <div className="flex items-start gap-4 mb-3 sm:mb-0">
                                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                                                        ${booking.status === 'Cancelado' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                                                        {format(booking.date, "HH:mm")}
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold text-base ${booking.status === 'Cancelado' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-zinc-100'}`}>
                                                            {booking.client}
                                                        </p>
                                                        <div className="flex items-center text-xs font-medium text-slate-500 dark:text-zinc-400 mt-1 gap-2">
                                                            <span className="flex items-center gap-1"><Scissors className="h-3 w-3" /> {booking.service}</span>
                                                            <span className="text-slate-300 dark:text-zinc-700">•</span>
                                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(booking.date, "dd/MM/yyyy")}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                                                        ${booking.status === 'Confirmado' ? 'bg-emerald-100 text-emerald-700' :
                                                            booking.status === 'Cancelado' ? 'bg-rose-100 text-rose-700' :
                                                                'bg-amber-100 text-amber-700'}`}>
                                                        {booking.status}
                                                    </span>

                                                    {booking.status !== "Cancelado" && (
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                                                onClick={() => {
                                                                    setBookingToReschedule(booking);
                                                                    setRescheduleDate(new Date());
                                                                    setRescheduleTimeSlot(null);
                                                                }}
                                                            >
                                                                <CalendarClock className="h-4 w-4" />
                                                            </Button>

                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-400 hover:text-rose-600"
                                                                onClick={() => setBookingToCancel(booking)}
                                                                disabled={!!isCanceling}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-10 text-center text-slate-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 text-sm">
                                            Nenhum agendamento encontrado.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Modal de Reagendamento */}
            <Dialog open={!!bookingToReschedule} onOpenChange={(open) => !open && setBookingToReschedule(null)}>
                <DialogContent className="sm:max-w-2xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                            <CalendarClock className="h-5 w-5 text-indigo-500" />
                            Reagendar: {bookingToReschedule?.client}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 dark:text-zinc-400">
                            Escolha um novo dia e horário para o serviço.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 flex flex-col sm:flex-row gap-6">
                        <div className="flex-1">
                            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 flex justify-center bg-white dark:bg-zinc-950">
                                <Calendar
                                    mode="single"
                                    selected={rescheduleDate}
                                    onSelect={setRescheduleDate}
                                    locale={ptBR}
                                    disabled={{ before: new Date() }}
                                />
                            </div>
                        </div>

                        <div className="flex-1">
                            <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2 block">Novos Horários:</label>
                            <div className="grid grid-cols-3 gap-2 mt-2 max-h-[300px] overflow-y-auto pr-2">
                                {loadingRescheduleSlots ? (
                                    <div className="col-span-3 py-4 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
                                ) : rescheduleSlots.length > 0 ? (
                                    rescheduleSlots.map((slot) => (
                                        <Button
                                            key={slot}
                                            variant={rescheduleTimeSlot === slot ? "default" : "outline"}
                                            className="h-9 text-xs"
                                            onClick={() => setRescheduleTimeSlot(slot)}
                                        >
                                            {slot}
                                        </Button>
                                    ))
                                ) : (
                                    <div className="col-span-3 py-4 text-center text-sm text-slate-500">Sem vagas.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setBookingToReschedule(null)} disabled={isRescheduling}>Cancelar</Button>
                        <Button onClick={handleRescheduleBooking} disabled={!rescheduleTimeSlot || isRescheduling} className="bg-indigo-600 text-white font-bold">
                            {isRescheduling ? "Reagendando..." : "Confirmar Reagendamento"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Cancelamento */}
            <Dialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-rose-500" /> Cancelar Agendamento
                        </DialogTitle>
                        <DialogDescription>
                            Deseja cancelar o agendamento de <strong>{bookingToCancel?.client}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setBookingToCancel(null)} disabled={!!isCanceling}>Voltar</Button>
                        <Button variant="destructive" onClick={handleCancelBooking} disabled={!!isCanceling} className="font-bold">
                            {isCanceling ? "Cancelando..." : "Sim, Cancelar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
