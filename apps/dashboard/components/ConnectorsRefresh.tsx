'use client'

import { useRouter } from 'next/navigation'
import { LovableConnectorCard } from './LovableConnectorCard'

type Connection = { id: string; name: string; created_at: string }

export function ConnectorsRefresh({
  connections,
  plan,
}: {
  connections: Connection[]
  plan: 'free' | 'paid'
}) {
  const router = useRouter()
  const refresh = () => router.refresh()

  return (
    <LovableConnectorCard
      connections={connections}
      plan={plan}
      onConnectionCreated={refresh}
      onConnectionRevoked={refresh}
    />
  )
}
