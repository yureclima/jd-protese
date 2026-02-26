import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";

export interface BookingDisplay {
    name: string;
    service: string;
    status: string;
    statusColor: string;
    date: string;
    initials: string;
}

export function LatestAppointments({ bookings }: { bookings: BookingDisplay[] }) {
    return (
        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden h-full">
            <CardHeader className="border-b border-slate-50 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-indigo-500" />
                    Últimos Agendamentos
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-zinc-400 text-xs">Agenda dos próximos dias (Cal.com).</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex flex-col space-y-6">
                    {bookings && bookings.length > 0 ? (
                        bookings.map((item, index) => (
                            <div key={index} className="flex items-center gap-4 group transition-all duration-200">
                                <Avatar className="h-10 w-10 border border-slate-100 dark:border-zinc-800 shadow-sm transition-transform group-hover:scale-110">
                                    <AvatarFallback className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs">{item.initials}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate leading-none mb-1">{item.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{item.service}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`text-xs font-bold ${item.statusColor}`}>{item.status}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium mt-0.5 uppercase tracking-wider">{item.date}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center text-slate-500 text-sm">
                            Nenhum agendamento futuro encontrado.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
