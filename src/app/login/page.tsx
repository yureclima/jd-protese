import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
    // O middleware e o server component cuidam de mostrar a mensagem caso a url venha com ?message=XXX

    return (
        <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950">
            <Card className="w-full max-w-sm rounded-2xl shadow-xl dark:bg-zinc-900 border-none">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold tracking-tight">Login</CardTitle>
                    <CardDescription>Insira o seu email abaixo para entrar na sua conta.</CardDescription>
                </CardHeader>
                <form>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                className="rounded-xl border-slate-200 dark:border-zinc-800 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Palavra-passe</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="rounded-xl border-slate-200 dark:border-zinc-800 focus-visible:ring-indigo-500"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 pb-8">
                        <Button
                            formAction={login}
                            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            Entrar
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
