"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Key, Clock, Activity, LogOut, RefreshCw, AlertCircle, Shield, Settings, Users, User } from "lucide-react"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface TokenInfo {
  token: string
  createdAt: string
  expiresIn: number
  remainingTime: number
  ativo: boolean // Adicionado para verificar o status do token retornado pela API
  hasToken: boolean;
  isExpired: boolean;
  minutesRemaining: number;
  expiresAt: string;
}

interface ApiLog {
  id: string
  timestamp: string
  method: string
  url: string
  status: number
  duration: number
  tokenUsed: boolean
  error?: string
  userName?: string
}

interface UserOnline {
  userId: string
  userName: string
  email: string
  lastActivity: string
}

export default function AdminPanelDashboard() {
  const router = useRouter()
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([])
  const [usersOnline, setUsersOnline] = useState<UserOnline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loading, setLoading] = useState(true); // Estado para indicar carregamento inicial

  const envVars = {
    SANKHYA_TOKEN: process.env.NEXT_PUBLIC_SANKHYA_TOKEN || process.env.SANKHYA_TOKEN,
    SANKHYA_APPKEY: process.env.NEXT_PUBLIC_SANKHYA_APPKEY || process.env.SANKHYA_APPKEY,
    SANKHYA_USERNAME: process.env.NEXT_PUBLIC_SANKHYA_USERNAME || process.env.SANKHYA_USERNAME,
    SANKHYA_PASSWORD: process.env.NEXT_PUBLIC_SANKHYA_PASSWORD || process.env.SANKHYA_PASSWORD,
  };

  const [renovandoToken, setRenovandoToken] = useState(false);

  useEffect(() => {
    // Verificar autenticação
    const isAuthenticated = sessionStorage.getItem("admin_authenticated")
    if (!isAuthenticated) {
      router.push("/admin-panel")
      return
    }

    const loadData = async () => {
      await Promise.all([fetchTokenInfo(), fetchApiLogs(), fetchUsersOnline()])
      setIsLoading(false)
    }
    loadData()

    // Atualizar dados a cada 5 segundos
    const interval = setInterval(() => {
      fetchTokenInfo()
      fetchApiLogs()
      fetchUsersOnline()
    }, 5000)
    return () => clearInterval(interval)
  }, [router])

  const fetchTokenInfo = async () => {
    try {
      console.log('🔄 [Dashboard] Buscando token info do servidor...');
      const response = await fetch('/api/admin/token-info', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Dashboard] Token info recebido:', {
          ativo: data.ativo,
          remainingTime: data.remainingTime,
          hasToken: !!data.token
        });
        // SEMPRE atualizar se receber token válido
        if (data && data.token && data.ativo && data.remainingTime > 0) {
          setTokenInfo(data)
        } else if (data && !data.token) {
          // Se não tem token e estado anterior também não tinha, setar null
          setTokenInfo(prev => {
            // Manter token anterior se ele ainda estava ativo e a API retornou vazio
            if (prev && prev.remainingTime > 0) {
              console.log('⚠️ [Dashboard] Mantendo token anterior - API retornou vazio mas token local ainda válido')
              // Decrementar tempo manualmente se necessário
              return {
                ...prev,
                remainingTime: Math.max(0, prev.remainingTime - 10) // Decrementar ~10s desde última atualização
              }
            }
            return null
          })
        } else {
          // Se a API retornou dados mas o token não é válido (inativo ou expirado)
          setTokenInfo(null)
        }
      } else {
        console.error('❌ [Dashboard] Erro ao buscar token info:', response.status);
        // Em caso de erro na API, manter o estado anterior e tentar decrementar o tempo
        setTokenInfo(prev => {
          if (prev && prev.remainingTime > 0) {
            return {
              ...prev,
              remainingTime: Math.max(0, prev.remainingTime - 10)
            }
          }
          return null // Se não havia token ou já expirou, manter como null
        });
      }
    } catch (error) {
      console.error('❌ [Dashboard] Erro ao buscar token:', error);
      // Em caso de erro de rede, manter o estado anterior e tentar decrementar o tempo
      setTokenInfo(prev => {
        if (prev && prev.remainingTime > 0) {
          return {
            ...prev,
            remainingTime: Math.max(0, prev.remainingTime - 10)
          }
        }
        return null // Se não havia token ou já expirou, manter como null
      })
    } finally {
        setLoading(false); // Finaliza o carregamento após a primeira tentativa
    }
  }

  const fetchApiLogs = async () => {
    try {
      console.log('🔄 [Dashboard] Buscando logs do servidor...');
      const response = await fetch('/api/admin/api-logs', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Dashboard] Logs recebidos:', {
          total: data.total,
          logsCount: data.logs?.length || 0
        });
        // Só atualizar se recebeu logs válidos
        if (data.logs && Array.isArray(data.logs)) {
          setApiLogs(prev => {
            // Se os logs são diferentes, atualizar
            if (JSON.stringify(prev) !== JSON.stringify(data.logs)) {
              return data.logs
            }
            return prev
          })
        }
      } else {
        console.error('❌ [Dashboard] Erro ao buscar logs:', response.status);
        // Não limpar apiLogs em caso de erro - manter estado anterior
      }
    } catch (error) {
      console.error('❌ [Dashboard] Erro ao buscar logs:', error)
      // Não limpar apiLogs em caso de erro - manter estado anterior
    }
  }

  const fetchUsersOnline = async () => {
    try {
      console.log('🔄 [Dashboard] Buscando usuários online...');
      const response = await fetch('/api/admin/users-online', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Dashboard] Usuários online recebidos:', data);
        if (Array.isArray(data)) {
          setUsersOnline(data);
        }
      } else {
        console.error('❌ [Dashboard] Erro ao buscar usuários online:', response.status);
      }
    } catch (error) {
      console.error('❌ [Dashboard] Erro ao buscar usuários online:', error);
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated")
    router.push("/admin-panel")
  }

  const handleBackToLogin = () => {
    sessionStorage.removeItem("admin_authenticated")
    router.push("/admin-panel")
  }

  const handleRefreshToken = async () => {
    setRenovandoToken(true);
    setIsLoading(true); // Inicia o loading para o botão de renovar
    try {
      console.log('🔄 [Dashboard] Solicitando renovação de token...');
      const response = await fetch('/api/admin/refresh-token', {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Dashboard] Token renovado com sucesso');
        toast({
          title: "Token renovado",
          description: "Token do servidor foi renovado com sucesso!",
        });
        // Aguardar 1 segundo para garantir que o token foi salvo no Redis
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Atualizar token info com cache bust
        await fetchTokenInfo();
      } else {
        throw new Error('Erro ao renovar token');
      }
    } catch (error) {
      console.error('❌ [Dashboard] Erro ao renovar token:', error);
      toast({
        title: "Erro",
        description: "Falha ao renovar token",
        variant: "destructive",
      });
    } finally {
      setRenovandoToken(false);
      setIsLoading(false); // Finaliza o loading
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-500"
    if (status >= 400 && status < 500) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: "oklch(0.32 0.02 235)" }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Painel Administrativo
              </CardTitle>
              <CardDescription>
                Gerenciamento do sistema Sankhya - Logs Globais do Servidor
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleBackToLogin} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Voltar ao Login
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Variáveis de Ambiente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Variáveis de Ambiente
            </CardTitle>
            <CardDescription>Credenciais configuradas no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-white font-medium">SANKHYA_TOKEN</p>
                <p className="font-mono text-sm text-white bg-gray-100 dark:bg-gray-800 p-2 rounded break-all">
                  {envVars.SANKHYA_TOKEN || "Não configurado"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-white font-medium">SANKHYA_APPKEY</p>
                <p className="font-mono text-sm text-white bg-gray-100 dark:bg-gray-800 p-2 rounded break-all">
                  {envVars.SANKHYA_APPKEY || "Não configurado"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-white font-medium">SANKHYA_USERNAME</p>
                <p className="font-mono text-sm text-white bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  {envVars.SANKHYA_USERNAME || "Não configurado"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-white font-medium">SANKHYA_PASSWORD</p>
                <p className="font-mono text-sm text-white bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  {"•".repeat(12)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token Atual */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Bearer Token Atual
                </CardTitle>
                <CardDescription>Token de autenticação ativo</CardDescription>
              </div>
              <Button onClick={handleRefreshToken} disabled={isLoading} size="sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Renovar Token
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Carregando informações do token...</p>
              </div>
            ) : tokenInfo ? (
              <>
                <div className="space-y-2">
                  <p className="text-xs text-white font-medium">Token</p>
                  <p className="font-mono text-sm text-white bg-gray-100 dark:bg-gray-800 p-3 rounded break-all">
                    {tokenInfo.token}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-white font-medium">Criado em</p>
                    <p className="text-sm text-white font-medium">
                      {tokenInfo.createdAt ? new Date(tokenInfo.createdAt).toLocaleString('pt-BR') : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-white font-medium">Expira em</p>
                    <Badge variant={tokenInfo.remainingTime < 300 ? "destructive" : "default"}>
                      {formatTime(tokenInfo.remainingTime)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-white font-medium">Status</p>
                    <Badge variant={tokenInfo.remainingTime > 0 && tokenInfo.ativo ? "default" : "destructive"}>
                      {tokenInfo.remainingTime > 0 && tokenInfo.ativo ? "Ativo" : "Expirado"}
                    </Badge>
                  </div>
                </div>
                {tokenInfo.remainingTime < 300 && tokenInfo.remainingTime > 0 && tokenInfo.ativo && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <p className="text-sm text-yellow-500">Token próximo de expirar. Considere renovar.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <AlertCircle className="w-12 h-12 text-gray-400" />
                <p className="text-sm text-gray-500">Nenhum token ativo no momento</p>
                <p className="text-xs text-gray-400">O token será gerado automaticamente na próxima requisição à API</p>
                <Button onClick={handleRefreshToken} size="sm" variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Gerar Token Agora
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs de API */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Logs Globais da API Sankhya
            </CardTitle>
            <CardDescription>
              Histórico de até 500 logs de requisições (persistidos por 7 dias)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {apiLogs.length > 0 ? (
                  apiLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-gray-100 dark:bg-gray-800 rounded space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.method}
                          </Badge>
                          <span className={`font-mono text-xs ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                          {log.tokenUsed && (
                            <Badge variant="secondary" className="text-xs">
                              <Key className="w-3 h-3 mr-1" />
                              Token
                            </Badge>
                          )}
                          {log.error && (
                            <Badge variant="destructive" className="text-xs">
                              Erro
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{log.duration}ms</span>
                      </div>
                      <p className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                        {log.url}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </p>
                        {log.userName && (
                          <Badge variant="outline" className="text-xs">
                            <User className="w-3 h-3 mr-1" />
                            {log.userName}
                          </Badge>
                        )}
                      </div>
                      {log.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {log.error}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">Nenhum log disponível</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Informações do Token */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Token Sankhya
            </CardTitle>
            <CardDescription>Status do token de autenticação</CardDescription>
          </CardHeader>
          <CardContent>
            {tokenInfo ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={tokenInfo.hasToken && !tokenInfo.isExpired ? "default" : "destructive"}>
                    {tokenInfo.hasToken ? (tokenInfo.isExpired ? "Expirado" : "Ativo") : "Inativo"}
                  </Badge>
                </div>
                {tokenInfo.hasToken && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                      <span className="text-sm font-medium">Tempo restante:</span>
                      <span className="text-sm font-mono">
                        {tokenInfo.isExpired ? "Expirado" : `${tokenInfo.minutesRemaining} minutos`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                      <span className="text-sm font-medium">Expira em:</span>
                      <span className="text-sm">{new Date(tokenInfo.expiresAt).toLocaleString('pt-BR')}</span>
                    </div>
                    {tokenInfo.createdAt && (
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <span className="text-sm font-medium">Criado em:</span>
                        <span className="text-sm">{new Date(tokenInfo.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                  </>
                )}
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={async () => {
                    try {
                      await fetch('/api/admin/refresh-token', { method: 'POST' });
                      await fetchTokenInfo();
                    } catch (error) {
                      console.error('Erro ao renovar token:', error);
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Renovar Token
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Carregando informações do token...</p>
            )}
          </CardContent>
        </Card>

        {/* Usuários Online */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuários Conectados
            </CardTitle>
            <CardDescription>Usuários ativos nos últimos 5 minutos</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {usersOnline.length > 0 ? (
                  usersOnline.map((user) => (
                    <div key={user.userId} className="p-3 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{user.userName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(user.lastActivity).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">Nenhum usuário conectado</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}