import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from './profile-form'

export default async function PerfilPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let profile = null

    if (user) {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        profile = data
    }

    return (
        <div className="flex flex-col gap-8 flex-1 w-full max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                    Configurações e Perfil
                </h1>
                <p className="text-muted-foreground mt-1">
                    Faça a gestão dos seus dados visuais e chaves de integração do sistema.
                </p>
            </div>

            <ProfileForm initialProfile={profile} />
        </div>
    )
}
