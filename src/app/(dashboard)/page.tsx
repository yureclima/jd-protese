import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Calendar, AlertTriangle } from "lucide-react";
import { LatestAppointments, BookingDisplay } from "@/components/latest-appointments";
import { createClient } from "@/lib/supabase/server";
import { isToday, isFuture, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function DashboardHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Buscar Perfil (Para obter a API key do Cal.com)
  const { data: profile } = await supabase.from('profiles').select('cal_api_key').eq('id', user.id).single();
  const calApiKey = profile?.cal_api_key;

  // 2. Buscar Dados Reais de Contatos (Supabase CRM)
  const dataUmaSemanaAtras = new Date();
  dataUmaSemanaAtras.setDate(dataUmaSemanaAtras.getDate() - 7);

  // Novos Leads (Semana)
  const { count: leadsSemanaCount } = await supabase
    .from('contatos')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dataUmaSemanaAtras.toISOString());

  // Follow-up Pendente (Ajustado para evitar erro de ENUM após mudança no banco)
  const { count: followUpCount } = await supabase
    .from('contatos')
    .select('*', { count: 'exact', head: true })
    .is('fase_funil', null);

  // Atividade Recente (IA) - Últimos 4 contatos atualizados
  const { data: contatosRecentes } = await supabase
    .from('contatos')
    .select('*')
    .order('ultima_interacao', { ascending: false })
    .limit(4);

  // 3. Buscar Dados Reais do Cal.com
  let agendamentosHojeCount = 0;
  let summaryAgendamentos = "Livre para hoje";
  let bookingsDisplay: BookingDisplay[] = [];

  if (calApiKey) {
    try {
      let res = await fetch(`https://api.cal.com/v2/bookings`, {
        headers: {
          "Authorization": `Bearer ${calApiKey}`,
          "cal-api-version": "2024-08-13"
        },
        next: { revalidate: 60 }
      });
      let calData = await res.json();
      
      if (!res.ok) {
        res = await fetch(`https://api.cal.com/v1/bookings?apiKey=${calApiKey}`, { next: { revalidate: 60 } });
        calData = await res.json();
      }

      const bookingsData = Array.isArray(calData?.data) ? calData.data : 
                           Array.isArray(calData?.bookings) ? calData.bookings : 
                           Array.isArray(calData) ? calData : null;
      if (bookingsData) {

        // Contar Agendamentos Confirmados para Hoje
        const todaysBookings = bookingsData.filter((b: any) => {
          const st = b.status?.toUpperCase();
          if (st !== "ACCEPTED" && st !== "PENDING") return false;
          return isToday(parseISO(b.start || b.startTime));
        });
        agendamentosHojeCount = todaysBookings.length;
        if (agendamentosHojeCount > 0) {
          summaryAgendamentos = `${agendamentosHojeCount} marcados para hoje`;
        }

        // Preparar "Últimos Agendamentos" (Próximos)
        const futureBookings = bookingsData.filter((b: any) => {
          const st = b.status?.toUpperCase();
          if (st !== "ACCEPTED" && st !== "PENDING") return false;
          return isFuture(parseISO(b.start || b.startTime)) || isToday(parseISO(b.start || b.startTime));
        }).sort((a: any, b: any) => parseISO(a.start || a.startTime).getTime() - parseISO(b.start || b.startTime).getTime())
          .slice(0, 5);

        bookingsDisplay = futureBookings.map((b: any) => {
          const dateObj = parseISO(b.start || b.startTime);
          const isHoje = isToday(dateObj);

          let dateStr = "";
          if (isHoje) {
            dateStr = `Hoje, ${format(dateObj, 'HH:mm')}`;
          } else {
            dateStr = format(dateObj, "dd/MMM, HH:mm", { locale: ptBR });
          }

          const name = b.responses?.name || b.attendees?.[0]?.name || "Cliente Vazio";
          const init = name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();

          const st = b.status?.toUpperCase();
          return {
            name: name,
            service: b.title,
            status: st === "ACCEPTED" ? "Confirmado" : "Pendente",
            statusColor: st === "ACCEPTED" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
            date: dateStr,
            initials: init
          };
        });
      }
    } catch (error) {
      console.error("Cal.com fetch error:", error);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 line-clamp-1">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral da sua operação JD Prótese Capilar.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Card Agendamentos */}
        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden transition-all hover:shadow-md hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Agendamentos do Dia</CardTitle>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg transition-colors group-hover:bg-indigo-100">
              <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
              {calApiKey ? agendamentosHojeCount : "-"}
            </div>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" /> {calApiKey ? summaryAgendamentos : "Configure a Chave API"}
            </p>
          </CardContent>
        </Card>

        {/* Card Leads */}
        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden transition-all hover:shadow-md hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Novos Leads (Semana)</CardTitle>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg transition-colors group-hover:bg-emerald-100">
              <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
              +{leadsSemanaCount || 0}
            </div>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" /> Registados na Base de Dados
            </p>
          </CardContent>
        </Card>

        {/* Card Follow-up */}
        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden transition-all hover:shadow-md hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Follow-up Pendente</CardTitle>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg transition-colors group-hover:bg-rose-100">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
              {followUpCount || 0}
            </div>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-400" /> Dependentes de ação
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Tabela de Atividade Recente */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden h-full">
            <CardHeader className="border-b border-slate-50 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100">Atividade Recente (IA)</CardTitle>
              <CardDescription className="text-slate-500 dark:text-zinc-400">Últimas interações processadas na base de contatos.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 text-slate-600 dark:text-zinc-400">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-zinc-800/30">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase px-6">Cliente</TableHead>
                    <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">Telefone</TableHead>
                    <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">Lead Score</TableHead>
                    <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase text-right px-6">Fase Atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contatosRecentes && contatosRecentes.length > 0 ? (
                    contatosRecentes.map((contato) => (
                      <TableRow key={contato.id} className="group hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors border-slate-50 dark:border-zinc-800">
                        <TableCell className="font-semibold text-slate-900 dark:text-zinc-100 px-6 py-4">{contato.nome || "Lead S/ Nome"}</TableCell>
                        <TableCell className="font-medium text-slate-600 dark:text-zinc-400">{contato.telefone}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${contato.lead_score >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                              contato.lead_score >= 40 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                            }`}>
                            {contato.lead_score || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 uppercase tracking-tight">
                            {contato.fase_funil === "cliente_novo" ? "Novo" : contato.fase_funil === "cliente_recorrente" ? "Recorrente" : (contato.fase_funil || "Pendente")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-slate-500">
                        Sem interações recentes no banco de dados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Últimos Agendamentos */}
        <div className="lg:col-span-1">
          <LatestAppointments bookings={bookingsDisplay} />
        </div>
      </div>
    </div>
  );
}
