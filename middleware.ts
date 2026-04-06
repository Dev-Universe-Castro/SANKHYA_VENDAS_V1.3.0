import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Permitir acesso a arquivos estáticos
  if (
    path.startsWith('/_next/') ||
    path.startsWith('/static/') ||
    path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|js|css)$/)
  ) {
    return NextResponse.next()
  }

  // Rotas públicas
  const publicPaths = ['/', '/register', '/offline', '/admin-panel']
  const isPublicPath = publicPaths.some(p => path === p || path.startsWith(p))

  // SEMPRE permitir navegação no dashboard E suas subpáginas (offline-first)
  // O controle de autenticação será feito no client-side via localStorage
  if (path.startsWith('/dashboard')) {
    const response = NextResponse.next()
    // Headers para permitir cache offline
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return response
  }

  // Pega o cookie de usuário
  const userCookie = request.cookies.get('user')?.value

  // Se não está autenticado e tenta acessar rota protegida (exceto dashboard)
  if (!isPublicPath && !userCookie) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Se está autenticado e tenta acessar login
  if (path === '/' && userCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const response = NextResponse.next()
  response.headers.set('Access-Control-Allow-Credentials', 'true')

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|workbox-|manifest.json).*)',
  ],
}