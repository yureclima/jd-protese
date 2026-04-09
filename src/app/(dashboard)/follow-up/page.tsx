import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BellRing } from "lucide-react";

export default function FollowUpPage() {
    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Follow-up</h1>
                <p className="text-muted-foreground mt-1">Gerenciamento de lembretes e acompanhamentos de clientes.</p>
            </div>

            <Card className="border-none shadow-sm bg-white dark:bg-zinc-900">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BellRing className="h-5 w-5 text-indigo-500" />
                        Lembretes Automáticos
                    </CardTitle>
                    <CardDescription>
                        Visualize quem precisa de contato hoje.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="py-20 text-center text-slate-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 text-sm">
                        Em desenvolvimento. Em breve você poderá ver alertas baseados no ciclo de manutenção da prótese.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
