import { cookies } from 'next/headers'

export function verifyAdminToken(token: string): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  return token === secret
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  return !!token && verifyAdminToken(token)
}
