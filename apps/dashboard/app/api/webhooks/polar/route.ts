import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase'

function verifyPolarSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature) return false
  const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex')
  return signature === expected
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('polar-signature') ?? req.headers.get('x-polar-signature') ?? null
    const secret = process.env.POLAR_WEBHOOK_SECRET
    if (secret && !verifyPolarSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const body = JSON.parse(rawBody)
    const eventType = body.type as string | undefined
    if (eventType !== 'order.paid') {
      return NextResponse.json({ received: true })
    }

    const order = body.data as { customer_email?: string; metadata?: { clerk_user_id?: string } }
    const clerkUserId = order?.metadata?.clerk_user_id
    const customerEmail = order?.customer_email

    if (!clerkUserId && !customerEmail) {
      return NextResponse.json({ error: 'No user identifier in order' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    let userId: string | null = null

    if (clerkUserId) {
      const { data: user } = await supabase
        .from('dashboard_users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single()
      userId = user?.id ?? null
    }

    if (!userId && customerEmail) {
      const { data: user } = await supabase
        .from('dashboard_users')
        .select('id')
        .eq('clerk_user_id', customerEmail)
        .single()
      userId = user?.id ?? null
    }

    if (!userId) {
      return NextResponse.json({ error: 'User not found for order' }, { status: 404 })
    }

    const { error } = await supabase
      .from('dashboard_users')
      .update({ plan: 'paid', updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ received: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook failed' },
      { status: 500 }
    )
  }
}
