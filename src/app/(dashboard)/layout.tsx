import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 overflow-x-hidden w-full relative">
                <div className="flex items-center justify-between h-16 px-6 border-b bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10 transition-colors">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger />
                    </div>
                    <ModeToggle />
                </div>
                <div className="p-6 md:p-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    );
}
