import { NextRequest, NextResponse } from 'next/server'
import { getDashboardUserByTokenHash } from '@/lib/user'
import { hashToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Missing Bearer token' }, { status: 401 })

    const tokenHash = hashToken(token)
    const user = await getDashboardUserByTokenHash(tokenHash)
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    return NextResponse.json({
      user_id: user.id,
      plan: user.plan,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Validation failed' },
      { status: 500 }
    )
  }
}
