import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { CalendarDays, Home, Users, BellRing, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { signout } from "@/app/login/actions"

export async function AppSidebar() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    let companyName = "A Minha Clínica"
    let logoUrl = ""
    let initials = "JD"

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_name, logo_url')
            .eq('id', user.id)
            .single()

        if (profile) {
            companyName = profile.company_name || "A Minha Clínica"
            logoUrl = profile.logo_url || ""
            if (companyName) {
                const words = companyName.split(' ')
                initials = words.length > 1 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : companyName.substring(0, 2).toUpperCase()
            }
        } else {
            if (user.email) {
                const parts = user.email.split('@')[0]
                initials = parts.substring(0, 2).toUpperCase()
            }
        }
    }

    const items = [
        {
            title: "Início",
            url: "/",
            icon: Home,
        },
        {
            title: "Clientes (CRM)",
            url: "/clientes",
            icon: Users,
        },
        {
            title: "Agenda",
            url: "/agenda",
            icon: CalendarDays,
        },
        {
            title: "Follow-up",
            url: "/follow-up",
            icon: BellRing,
        },
        {
            title: "Configurações",
            url: "/dashboard/perfil",
            icon: Settings,
        }
    ]

    return (
        <Sidebar className="border-r-0">
            <SidebarContent className="bg-zinc-950 text-zinc-400">
                <SidebarGroup>
                    <div className="flex items-center gap-3 p-4 py-8">
                        {logoUrl ? (
                            <img src={logoUrl} alt={companyName} className="flex h-9 w-9 items-center justify-center rounded-xl shadow-lg shadow-emerald-500/20 object-cover" />
                        ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-lg shadow-lg shadow-emerald-500/20">
                                {initials}
                            </div>
                        )}
                        <span className="text-xl font-bold tracking-tight text-white line-clamp-1">{companyName}</span>
                    </div>
                    <SidebarGroupLabel className="px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                        Menu de Gestão
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1 px-2 flex flex-col h-full justify-between">
                            <div>
                                {items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            className="hover:bg-zinc-900 data-[active=true]:bg-zinc-900 data-[active=true]:text-white hover:text-white transition-all py-6 px-4 rounded-xl group"
                                        >
                                            <Link href={item.url}>
                                                <item.icon className="h-5 w-5 group-hover:text-emerald-400 transition-colors" />
                                                <span className="text-sm font-medium">{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </div>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {user && (
                    <div className="mt-auto px-4 pb-4">
                        <form action={signout}>
                            <button
                                type="submit"
                                title="Sair da conta"
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                Terminar Sessão
                            </button>
                        </form>
                    </div>
                )}
            </SidebarContent>
        </Sidebar>
    )
}
