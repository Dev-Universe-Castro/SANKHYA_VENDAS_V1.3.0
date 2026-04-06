
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Eye, EyeOff, Copy, Check, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ContratoData {
  EMPRESA: string
  IS_SANDBOX: string
  AUTH_TYPE?: string
  SANKHYA_TOKEN: string
  SANKHYA_APPKEY: string
  SANKHYA_USERNAME: string
  SANKHYA_PASSWORD: string
  OAUTH_CLIENT_ID?: string
  OAUTH_CLIENT_SECRET?: string
  OAUTH_X_TOKEN?: string
  GEMINI_API_KEY: string
  AI_PROVEDOR?: string
  AI_MODELO?: string
  AI_CREDENTIAL?: string
  ATIVO: string
}

export default function ConfiguracoesGerais() {
  const [contrato, setContrato] = useState<ContratoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSankhyaPassword, setShowSankhyaPassword] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [validatingToken, setValidatingToken] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<{ token: string, expiry: string } | null>(null)

  const fetchContrato = async () => {
    try {
      setLoading(true)

      // Primeiro tenta pegar do localStorage
      let userData = null
      const storedUser = localStorage.getItem('currentUser')

      if (storedUser) {
        userData = JSON.parse(storedUser)
      } else {
        // Se não tiver no localStorage, tenta pegar do cookie
        const userCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('user='))

        if (!userCookie) {
          toast.error("Usuário não autenticado")
          return
        }

        const cookieValue = userCookie.split('=')[1]
        userData = JSON.parse(decodeURIComponent(cookieValue))
      }

      const idEmpresa = userData.ID_EMPRESA || userData.id_empresa

      if (!idEmpresa) {
        toast.error("Empresa não identificada")
        return
      }

      const response = await fetch(`/api/configuracoes/credenciais?idEmpresa=${idEmpresa}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar credenciais')
      }

      const data = await response.json()
      setContrato(data.contrato)
    } catch (error) {
      console.error('Erro ao buscar contrato:', error)
      toast.error("Erro ao carregar credenciais da empresa")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContrato()
  }, [])

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      toast.success(`${fieldName} copiado!`)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      toast.error("Erro ao copiar")
    }
  }

  const maskValue = (value: string, show: boolean) => {
    if (show || !value) return value
    return '•'.repeat(Math.min(value.length, 20))
  }

  const validarTokenSankhya = async () => {
    try {
      if (!contrato) return;
      setValidatingToken(true)
      const response = await fetch('/api/auth/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrato })
      })
      const data = await response.json()

      if (data.success) {
        setTokenInfo({ token: data.token, expiry: data.expiry })
        toast.success("Bearer Token gerado com sucesso!")
      } else {
        toast.error(data.error || "Erro ao gerar token")
      }
    } catch (error) {
      toast.error("Erro na comunicação com a API")
    } finally {
      setValidatingToken(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>Credenciais e informações da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!contrato) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>Credenciais e informações da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma credencial encontrada para esta empresa
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-[#F2F2F2] rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-50/50 bg-white/50 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-800">Validação de API (Bearer Token)</CardTitle>
              <CardDescription>Verifique se as credenciais estão gerando o token corretamente</CardDescription>
            </div>
            <Button
              onClick={validarTokenSankhya}
              disabled={validatingToken}
              className="bg-[#76BA1B] hover:bg-[#65A017] text-white rounded-full shadow-sm transition-all px-4"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${validatingToken ? 'animate-spin' : ''}`} />
              {validatingToken ? 'Validando...' : 'Validar Conexão'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {tokenInfo ? (
            <div className="p-4 rounded-xl bg-green-50/50 border border-green-100 space-y-3">
              <div className="flex items-center gap-2 text-[#1E5128] font-semibold">
                <Check className="w-5 h-5 text-[#76BA1B]" />
                Conexão Estabelecida com Sucesso
              </div>
              <div className="space-y-1">
                <Label className="text-[#1E5128]/70 text-xs">Bearer Token Gerado:</Label>
                <div className="flex gap-2">
                  <Input
                    value={tokenInfo.token}
                    readOnly
                    className="bg-white border-green-100 text-xs font-mono shadow-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-green-100 shadow-sm hover:bg-green-50"
                    onClick={() => copyToClipboard(tokenInfo.token, 'Bearer Token')}
                  >
                    {copiedField === 'Bearer Token' ? <Check className="w-4 h-4 text-[#76BA1B]" /> : <Copy className="w-4 h-4 text-[#76BA1B]" />}
                  </Button>
                </div>
              </div>
              <div className="text-[10px] text-[#1E5128]/60 font-medium">
                Expira em: {new Date(tokenInfo.expiry).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-[#F2F2F2] rounded-xl text-muted-foreground bg-gray-50/30">
              Clique em "Validar Conexão" para testar suas credenciais Sankhya.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#F2F2F2] rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-50/50 bg-white/50 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-800">Informações da Empresa</CardTitle>
              <CardDescription>Dados gerais do contrato</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchContrato} className="rounded-full shadow-sm border-[#F2F2F2] hover:bg-gray-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Dados
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input value={contrato.EMPRESA} readOnly />
          </div>

          <div className="space-y-2">
            <Label>Ambiente</Label>
            <div>
              <Badge variant={contrato.IS_SANDBOX === 'S' ? 'secondary' : 'default'}>
                {contrato.IS_SANDBOX === 'S' ? 'Sandbox (Teste)' : 'Produção'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status do Contrato</Label>
            <div>
              <Badge variant={contrato.ATIVO === 'S' ? 'default' : 'destructive'}>
                {contrato.ATIVO === 'S' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#F2F2F2] rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-50/50 bg-white/50 pb-4">
          <CardTitle className="text-xl font-semibold text-gray-800">Credenciais Sankhya</CardTitle>
          <CardDescription>Credenciais de acesso à API Sankhya</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Token</Label>
            <div className="flex gap-2">
              <Input
                value={maskValue(contrato.SANKHYA_TOKEN || '', showSankhyaPassword)}
                readOnly
                type={showSankhyaPassword ? "text" : "password"}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(contrato.SANKHYA_TOKEN || '', 'Token')}
              >
                {copiedField === 'Token' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Autenticação</Label>
            <Input
              value={contrato.AUTH_TYPE || 'LEGACY'}
              readOnly
              className="font-semibold"
            />
          </div>

          {(!contrato.AUTH_TYPE || contrato.AUTH_TYPE === 'LEGACY') && (
            <>
              <div className="space-y-2">
                <Label>App Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={maskValue(contrato.SANKHYA_APPKEY || '', showSankhyaPassword)}
                    readOnly
                    type={showSankhyaPassword ? "text" : "password"}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(contrato.SANKHYA_APPKEY || '', 'App Key')}
                  >
                    {copiedField === 'App Key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Username</Label>
                <div className="flex gap-2">
                  <Input value={contrato.SANKHYA_USERNAME} readOnly />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(contrato.SANKHYA_USERNAME, 'Username')}
                  >
                    {copiedField === 'Username' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}

          {contrato.AUTH_TYPE === 'OAUTH2' && (
            <>
              <div className="space-y-2">
                <Label>Client ID</Label>
                <div className="flex gap-2">
                  <Input
                    value={maskValue(contrato.OAUTH_CLIENT_ID || '', showSankhyaPassword)}
                    readOnly
                    type={showSankhyaPassword ? "text" : "password"}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(contrato.OAUTH_CLIENT_ID || '', 'Client ID')}
                  >
                    {copiedField === 'Client ID' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Client Secret</Label>
                <div className="flex gap-2">
                  <Input
                    value={maskValue(contrato.OAUTH_CLIENT_SECRET || '', showSankhyaPassword)}
                    readOnly
                    type={showSankhyaPassword ? "text" : "password"}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(contrato.OAUTH_CLIENT_SECRET || '', 'Client Secret')}
                  >
                    {copiedField === 'Client Secret' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>X-Token</Label>
                <div className="flex gap-2">
                  <Input
                    value={maskValue(contrato.OAUTH_X_TOKEN || '', showSankhyaPassword)}
                    readOnly
                    type={showSankhyaPassword ? "text" : "password"}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(contrato.OAUTH_X_TOKEN || '', 'X-Token')}
                  >
                    {copiedField === 'X-Token' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Password</Label>
            <div className="flex gap-2">
              <Input
                value={maskValue(contrato.SANKHYA_PASSWORD || '', showSankhyaPassword)}
                readOnly
                type={showSankhyaPassword ? "text" : "password"}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSankhyaPassword(!showSankhyaPassword)}
              >
                {showSankhyaPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(contrato.SANKHYA_PASSWORD || '', 'Password')}
              >
                {copiedField === 'Password' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#F2F2F2] rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-50/50 bg-white/50 pb-4">
          <CardTitle className="text-xl font-semibold text-gray-800">Configurações de Inteligência Artificial</CardTitle>
          <CardDescription>Provedor e modelo utilizados para análise e chat</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provedor de IA</Label>
              <Input
                value={contrato.AI_PROVEDOR || 'Google Gemini (Legado)'}
                readOnly
                className="font-semibold bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo Ativo</Label>
              <Input
                value={contrato.AI_MODELO || 'gemini-1.5-flash'}
                readOnly
                className="font-mono text-xs bg-gray-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chave API / Credencial</Label>
            <div className="flex gap-2">
              <Input
                value={maskValue(contrato.AI_CREDENTIAL || contrato.GEMINI_API_KEY || 'Não configurado', showGeminiKey)}
                readOnly
                type={showGeminiKey ? "text" : "password"}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                disabled={!contrato.AI_CREDENTIAL && !contrato.GEMINI_API_KEY}
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(contrato.AI_CREDENTIAL || contrato.GEMINI_API_KEY, 'AI API Key')}
                disabled={!contrato.AI_CREDENTIAL && !contrato.GEMINI_API_KEY}
              >
                {copiedField === 'AI API Key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {(!contrato.AI_CREDENTIAL && !contrato.GEMINI_API_KEY) && (
            <p className="text-sm text-red-500 font-medium">
              ⚠️ Nenhuma chave API configurada para IA.
            </p>
          )}

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-xs text-blue-700">
              ℹ️ O sistema redireciona automaticamente as requisições para o provedor e modelo especificados acima. Para alterar estas configurações, entre em contato com o suporte técnico.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
