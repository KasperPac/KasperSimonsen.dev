import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) return NextResponse.next()

  // Admin is local-only — block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Login page is always reachable so the user can authenticate
  if (pathname === '/admin/login') return NextResponse.next()

  const token = request.cookies.get('admin_token')?.value
  const secret = process.env.ADMIN_SECRET

  if (!token || !secret || token !== secret) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
