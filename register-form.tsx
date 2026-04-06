"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { SplashScreen } from "./splash-screen"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import Image from "next/image"
import { useIsMobile } from "@/hooks/use-mobile"
import { ArrowLeft } from "lucide-react"

export default function RegisterForm() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSplash, setShowSplash] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setName(value);
    } else if (name === 'email') {
      setEmail(value);
    } else if (name === 'password') {
      setPassword(value);
    } else if (name === 'confirmPassword') {
      setConfirmPassword(value);
    }
    setError("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      return
    }

    setIsSubmitting(true)

    const payload = {
      idEmpresa: 1,
      nome: name,
      email: email,
      senha: password,
      funcao: 'Vendedor'
    };

    console.log('📤 Enviando dados para registro:', {
      ...payload,
      senha: '***'
    });

    try {
      const response = await fetch('/api/usuarios/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao realizar cadastro')
      }

      // Redirecionar para a página de login
      alert("Cadastro realizado com sucesso! Aguarde a aprovação do administrador para fazer login.")
      router.push("/")
    } catch (err: any) {
      setError(err.message || "Erro ao realizar cadastro. Tente novamente.")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Mobile Layout
  if (isMobile) {
    if (showSplash) {
      return <SplashScreen onFinish={() => setShowSplash(false)} duration={2000} />
    }
    return (
      <div className="min-h-screen bg-white">
        <div className="h-screen flex flex-col items-center justify-center p-6">
          {/* Logo Mobile */}
          <div className="mb-6">
            <div className="relative w-32 h-32 mx-auto">
              <Image
                src="/image 4.png"
                alt="Sankhya Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-xl font-semibold text-gray-800 mb-6">Crie sua conta</h1>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-sm text-gray-600">Nome</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Nome"
                value={name}
                onChange={handleChange}
                className="h-11 bg-gray-50 border-gray-200 rounded-lg"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm text-gray-600">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={handleChange}
                className="h-11 bg-gray-50 border-gray-200 rounded-lg"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm text-gray-600">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Senha"
                value={password}
                onChange={handleChange}
                className="h-11 bg-gray-50 border-gray-200 rounded-lg"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="text-sm text-gray-600">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChange={handleChange}
                className="h-11 bg-gray-50 border-gray-200 rounded-lg"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-lg font-medium text-white"
              style={{ backgroundColor: '#70CA71' }}
            >
              {isSubmitting ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </form>

          {/* Link para login */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Já tem uma conta? </span>
            <Link href="/" className="font-medium" style={{ color: '#70CA71' }}>
              Entrar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Desktop Layout (original)
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} duration={2000} />
  }
  return (
    <div className="w-full max-w-md bg-card rounded-lg shadow-xl p-8">
      <div className="flex flex-col items-center mb-8">
        <div className="mb-4">
          <div className="relative w-48 h-48 mx-auto">
            <Image
              src="/image 4.png"
              alt="Sankhya Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm text-muted-foreground">
            Nome Completo
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={name}
            onChange={handleChange}
            className="bg-background border-input"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm text-muted-foreground">
            E-mail
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={handleChange}
            className="bg-background border-input"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm text-muted-foreground">
            Senha
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={handleChange}
            className="bg-background border-input"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm text-muted-foreground">
            Confirmar Senha
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={handleChange}
            className="bg-background border-input"
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase tracking-wide"
        >
          {isSubmitting ? "Cadastrando..." : "Cadastrar"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/" className="text-primary hover:text-primary/90 font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}