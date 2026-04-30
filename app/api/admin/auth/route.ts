import { NextResponse } from 'next/server'

function guardProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Admin not available in production')
  }
}

export async function POST(request: Request) {
  guardProduction()

  const adminPassword = process.env.ADMIN_PASSWORD
  const adminSecret = process.env.ADMIN_SECRET

  if (!adminPassword || !adminSecret) {
    return NextResponse.json(
      { error: 'Admin env vars (ADMIN_PASSWORD, ADMIN_SECRET) not set' },
      { status: 500 }
    )
  }

  const body = await request.json()
  if (body.password !== adminPassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_token', adminSecret, {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}

export async function DELETE() {
  guardProduction()
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('admin_token')
  return response
}
