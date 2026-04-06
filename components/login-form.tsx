"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/lib/auth-service"
import { toast } from "@/components/ui/use-toast"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { SplashScreen } from "@/components/splash-screen"
import { db } from "@/lib/client-db"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPrefetchSplash, setShowPrefetchSplash] = useState(false)
  const [isPrefetching, setIsPrefetching] = useState(false)
  const router = useRouter()
  const [showSplash, setShowSplash] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Detectar que está no cliente para evitar flash de conteúdo
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (navigator.onLine) {
        // Login Online
        console.log('🌐 Modo online - tentando login na API...')
        const user = await authService.login(email, password)

        if (user) {
          // Preparar dados do usuário no formato correto
          const userData = {
            id: user.id || (user as any).CODUSUARIO,
            name: user.name || (user as any).NOME,
            email: user.email || (user as any).EMAIL,
            role: user.role || (user as any).FUNCAO,
            avatar: user.avatar || (user as any).AVATAR || '',
            codVendedor: user.codVendedor || (user as any).CODVEND,
            ID_EMPRESA: (user as any).ID_EMPRESA,
            codEmp: (user as any).codEmp || (user as any).CODEMP,
            empresa: (user as any).empresa || (user as any).EMPRESA,
            cnpj: (user as any).cnpj || (user as any).CNPJ
          }

          console.log('✅ Login online bem-sucedido:', userData.email)

          // Salvar credenciais para login offline futuro
          try {
            const { OfflineAuth } = await import('@/lib/auth-offline')
            await OfflineAuth.salvarCredenciais(userData, password)
            console.log('✅ Credenciais salvas para login offline')
          } catch (error) {
            console.error('⚠️ Erro ao salvar credenciais offline:', error)
          }

          // Garantir persistência no localStorage e cookie
          localStorage.setItem("currentUser", JSON.stringify(userData))
          localStorage.setItem("isAuthenticated", "true")
          localStorage.setItem("lastLoginTime", new Date().toISOString())
          document.cookie = `user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${60 * 60 * 24 * 7}`

          toast({
            title: "Login realizado com sucesso!",
            description: `Bem-vindo(a), ${userData.name}!`,
          })

          // Mostrar splash de prefetch
          setShowPrefetchSplash(true)
          setIsPrefetching(true)

          console.log('🚀 Iniciando prefetch de dados após login...')

          try {
            // Obter última sincronização para Delta Sync
            const lastSyncRecord = await db.metadados.get('lastSync');
            const lastSync = lastSyncRecord?.valor || null;

            const [prefetchData] = await Promise.all([
              (async () => {
                const response = await fetch('/api/prefetch', { 
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ lastSync })
                });
                return response.ok ? await response.json() : null;
              })(),
              (async () => {
                const { OfflineRouter } = await import('@/lib/offline-router')
                await OfflineRouter.precacheRoutes()
              })()
            ]);

            if (prefetchData && prefetchData.success) {
              const { OfflineDataService } = await import('@/lib/offline-data-service');
              await OfflineDataService.sincronizarTudo(prefetchData, 'LoginForm');
              console.log('✅ IndexedDB sincronizado com sucesso');
            }

            console.log('✅ Prefetch e cache concluídos com sucesso')
          } catch (error) {
            console.error('⚠️ Erro no prefetch, continuando mesmo assim:', error)
          } finally {
            setIsPrefetching(false)
          }

        } else {
          toast({
            title: "Erro no login",
            description: "Email ou senha inválidos.",
            variant: "destructive",
          })
        }
      } else {
        // Login Offline
        console.log('🔌 Modo offline detectado, tentando login offline...')

        const { OfflineAuth } = await import('@/lib/auth-offline')
        const userOffline = await OfflineAuth.validarLoginOffline(email, password)

        if (userOffline && userOffline.dados) {
          const userData = userOffline.dados

          console.log('✅ Login offline bem-sucedido:', userData.name)

          localStorage.setItem("currentUser", JSON.stringify(userData))
          localStorage.setItem("isAuthenticated", "true")
          localStorage.setItem("lastLoginTime", new Date().toISOString())
          document.cookie = `user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${60 * 60 * 24 * 7}`

          toast({
            title: "🔌 Modo Offline",
            description: `Bem-vindo(a), ${userData.name}! Você está trabalhando offline.`,
          })

          await new Promise(resolve => setTimeout(resolve, 300))

          router.push("/dashboard")
        } else {
          console.error('❌ Credenciais offline inválidas')
          toast({
            title: "Login offline não disponível",
            description: "Você precisa fazer login online pelo menos uma vez antes de usar o modo offline.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('❌ Erro geral no login:', error)
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro ao tentar fazer login. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrefetchFinish = () => {
    sessionStorage.setItem('suppressLoading', 'true')
    router.push("/dashboard")
  }

  if (showPrefetchSplash) {
    return (
      <SplashScreen
        onFinish={handlePrefetchFinish}
        duration={isPrefetching ? 60000 : 500}
        forceStay={isPrefetching}
      />
    )
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} duration={2000} />
  }

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-[#2ECC71] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex bg-white flex-col lg:flex-row font-sans">
      {/* Esquerda: Branding & Identidade visual (Visível apenas no desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1E5128] flex-col p-12 relative overflow-hidden">
        {/* Imagem de fundo com overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/Login.png"
            alt="Login Background"
            fill
            className="object-cover opacity-40 mix-blend-overlay"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E5128]/80 to-[#1E5128]/40" />
        </div>

        {/* Efeitos de gradiente/brilho no fundo escuro */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#76BA1B]/20 to-transparent z-1 pointer-events-none" />
        <div className="absolute -bottom-[20%] -right-[20%] w-[70%] h-[70%] rounded-full bg-[#76BA1B]/20 blur-[120px] z-1 pointer-events-none" />

        <div className="flex-1 flex flex-col justify-center relative z-10 w-full">
          <div className="max-w-lg mx-auto w-full flex flex-col items-center">
            <div className="flex justify-center w-full mb-6 relative">
              <Image
                src="/Logo_Final.png"
                alt="PredictSales Logo"
                width={160}
                height={48}
                className="object-contain"
                priority
              />
            </div>

            <div className="text-white space-y-4 w-full">
              <h1 className="text-3xl xl:text-4xl font-bold tracking-tight font-montserrat leading-snug text-center drop-shadow-sm">
                Aumente seu desempenho comercial com Inteligência Artificial.
              </h1>
              <p className="text-base xl:text-lg text-[#F2F2F2]/90 font-light leading-relaxed text-center max-w-md mx-auto">
                A plataforma definitiva para gerenciar suas vendas, analisar projeções de faturamento e fechar mais negócios.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-[#F2F2F2]/60 font-medium text-center">
          &copy; {new Date().getFullYear()} PredictSales. Todos os direitos reservados.
        </div>
      </div>

      {/* Direita: Formulário Clean Card (Mobile & Desktop) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] sm:border sm:border-gray-100 flex flex-col justify-center min-h-[500px]">

          <div className="space-y-3 mb-8 text-center">
            <div className="lg:hidden flex justify-center mb-8">
              <Image
                src="/Logo_Final.png"
                alt="PredictSales Logo"
                width={160}
                height={50}
                className="object-contain"
                priority
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#121212] font-montserrat tracking-tight">Bem-vindo de volta</h2>
            <p className="text-[#121212]/60 text-sm">Insira suas credenciais para acessar o painel.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-[#1E5128] uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-[#F2F2F2] border-transparent focus-visible:ring-[#76BA1B]/30 focus-visible:border-[#76BA1B] rounded-xl transition-all text-[#121212]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-[#1E5128] uppercase tracking-wider">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-[#F2F2F2] border-transparent focus-visible:ring-[#76BA1B]/30 focus-visible:border-[#76BA1B] rounded-xl transition-all pr-12 text-[#121212]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-[#1E5128]/60 hover:text-[#1E5128] focus:outline-none transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <Link href="#" className="flex self-end text-xs font-medium text-[#76BA1B] hover:text-[#1E5128] transition-colors">Esqueceu a senha?</Link>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 mt-4 bg-[#76BA1B] hover:bg-[#1E5128] text-white font-bold font-montserrat rounded-xl shadow-lg shadow-[#76BA1B]/20 transition-all hover:shadow-[#1E5128]/30 active:scale-[0.98] flex items-center justify-center gap-2 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Acessar Plataforma"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm font-medium">
            <span className="text-gray-500">Não tem uma conta? </span>
            <Link href="/register" className="text-[#76BA1B] hover:text-[#1E5128] transition-colors">
              Solicite seu acesso
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}