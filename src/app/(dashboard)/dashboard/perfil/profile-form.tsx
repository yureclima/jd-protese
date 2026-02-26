"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Camera, Link as LinkIcon, Save, Key, Database } from "lucide-react"
import { updateProfileInfo, updateIntegrations } from "./actions"
import { toast } from "sonner"

export function ProfileForm({ initialProfile }: { initialProfile: any }) {
    const router = useRouter()
    const supabase = createClient()

    const [isSavingVis, setIsSavingVis] = useState(false)
    const [isSavingInt, setIsSavingInt] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // States: Visuais
    const [companyName, setCompanyName] = useState(initialProfile?.company_name || "")
    const [logoUrl, setLogoUrl] = useState(initialProfile?.logo_url || "")

    // States: Integrações
    const [calApiKey, setCalApiKey] = useState(initialProfile?.cal_api_key || "")
    const [customSupabaseUrl, setCustomSupabaseUrl] = useState(initialProfile?.custom_supabase_url || "")
    const [customSupabaseAnonKey, setCustomSupabaseAnonKey] = useState(initialProfile?.custom_supabase_anon_key || "")

    const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            // Upload to 'logos' bucket
            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file)

            if (uploadError) {
                console.error("Erro no upload", uploadError)
                toast.error("Erro ao enviar a imagem.")
                setIsUploading(false)
                return
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath)

            setLogoUrl(publicUrl)
        } catch (error) {
            console.error(error)
        }
        setIsUploading(false)
    }

    const handleSaveVisual = async () => {
        setIsSavingVis(true)
        try {
            const fd = new FormData()
            fd.append("company_name", companyName)
            fd.append("logo_url", logoUrl)

            await updateProfileInfo(fd)
            toast.success("Perfil visual atualizado com sucesso!")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao salvar os dados visuais.")
        }
        setIsSavingVis(false)
    }

    const handleSaveIntegrations = async () => {
        setIsSavingInt(true)
        try {
            const fd = new FormData()
            fd.append("cal_api_key", calApiKey)
            fd.append("custom_supabase_url", customSupabaseUrl)
            fd.append("custom_supabase_anon_key", customSupabaseAnonKey)

            await updateIntegrations(fd)
            toast.success("Integrações guardadas com sucesso!")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao salvar integrações.")
        }
        setIsSavingInt(false)
    }

    return (
        <Tabs defaultValue="visual" className="w-full">
            <TabsList className="mb-4">
                <TabsTrigger value="visual" className="gap-2">
                    <Camera className="h-4 w-4" />
                    Personalização Visual
                </TabsTrigger>
                <TabsTrigger value="integrations" className="gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Integrações & Chaves
                </TabsTrigger>
            </TabsList>

            <TabsContent value="visual">
                <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
                    <CardHeader className="border-b border-slate-50 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100">Dados do Espaço</CardTitle>
                        <CardDescription>Configure como a sua marca aparece no painel.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="companyName">Nome da Empresa / Título da Sidebar</Label>
                                <Input
                                    id="companyName"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="Ex: JD Prótese (Unidade Sul)"
                                    className="max-w-md h-11 border-slate-200 dark:border-zinc-800"
                                />
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label>Logo / Avatar</Label>
                                <div className="flex items-center gap-6">
                                    <div className="h-24 w-24 shrink-0 rounded-2xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden">
                                        {isUploading ? (
                                            <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                                        ) : logoUrl ? (
                                            <img src={logoUrl} alt="Logo preview" className="h-full w-full object-cover" />
                                        ) : (
                                            <Camera className="h-8 w-8 text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="relative">
                                            <Input
                                                id="logoUpload"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleUploadLogo}
                                                disabled={isUploading}
                                                className="hidden"
                                            />
                                            <Label
                                                htmlFor="logoUpload"
                                                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
                                            >
                                                {isUploading ? "Enviando..." : "Escolher Imagem"}
                                            </Label>
                                        </div>
                                        <p className="text-xs text-slate-500 max-w-[200px]">JPG, PNG ou SVG até 2MB. Recomendado: 1:1 format.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="p-6 pt-0">
                        <Button
                            onClick={handleSaveVisual}
                            disabled={isSavingVis || isUploading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8 rounded-xl"
                        >
                            {isSavingVis ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-4 w-4" /> Guardar Configurações Visuais</>}
                        </Button>
                    </CardFooter>
                </Card>
            </TabsContent>

            <TabsContent value="integrations">
                <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
                    <CardHeader className="border-b border-slate-50 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100">Integrações Seguras</CardTitle>
                        <CardDescription>Chaves e tokens não serão expostos diretamente no painel.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">

                        {/* Seção Cal.com */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                                <Key className="h-4 w-4" /> Agenda Cal.com
                            </h3>
                            <div className="space-y-2">
                                <Label htmlFor="calApiKey">Sua Chave API Secrta (Cal.com)</Label>
                                <Input
                                    id="calApiKey"
                                    type="password"
                                    value={calApiKey}
                                    onChange={(e) => setCalApiKey(e.target.value)}
                                    placeholder="cal_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="max-w-md h-11 border-slate-200 dark:border-zinc-800 font-mono text-sm"
                                />
                                <p className="text-xs text-slate-500">Irá ativar a marcação em tempo real na aba de Agenda.</p>
                            </div>
                        </div>

                        {/* Seção Supabase Externo (Opcional se formos usá-lo) */}
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                                <Database className="h-4 w-4" /> Banco de Dados Dedicado (Opcional)
                            </h3>
                            <div className="space-y-2">
                                <Label htmlFor="customSupabaseUrl">Supabase URL</Label>
                                <Input
                                    id="customSupabaseUrl"
                                    value={customSupabaseUrl}
                                    onChange={(e) => setCustomSupabaseUrl(e.target.value)}
                                    placeholder="https://xyz.supabase.co"
                                    className="max-w-md h-11 border-slate-200 dark:border-zinc-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customSupabaseAnonKey">Supabase Anon Key</Label>
                                <Input
                                    id="customSupabaseAnonKey"
                                    type="password"
                                    value={customSupabaseAnonKey}
                                    onChange={(e) => setCustomSupabaseAnonKey(e.target.value)}
                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                    className="max-w-md h-11 border-slate-200 dark:border-zinc-800 font-mono text-sm"
                                />
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="p-6 pt-0">
                        <Button
                            onClick={handleSaveIntegrations}
                            disabled={isSavingInt}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-8 rounded-xl"
                        >
                            {isSavingInt ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-4 w-4" /> Guardar Chaves e Token</>}
                        </Button>
                    </CardFooter>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
