'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfileInfo(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilizador não autenticado')

    const company_name = formData.get('company_name') as string
    const logo_url = formData.get('logo_url') as string

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            company_name,
            logo_url,
            updated_at: new Date().toISOString()
        })

    if (error) throw new Error(error.message)
    revalidatePath('/', 'layout')
    return { success: true }
}

export async function updateIntegrations(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilizador não autenticado')

    const cal_api_key = formData.get('cal_api_key') as string
    const custom_supabase_url = formData.get('custom_supabase_url') as string
    const custom_supabase_anon_key = formData.get('custom_supabase_anon_key') as string

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            cal_api_key,
            custom_supabase_url,
            custom_supabase_anon_key,
            updated_at: new Date().toISOString()
        })

    if (error) throw new Error(error.message)
    revalidatePath('/', 'layout')
    return { success: true }
}
