'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="nav">
      <Link href="/" data-active={pathname === '/' ? 'true' : undefined}>
        Home
      </Link>
      <Link
        href="/connectors"
        data-active={pathname === '/connectors' ? 'true' : undefined}
      >
        Connectors
      </Link>
      <Link
        href="/profile"
        data-active={pathname === '/profile' ? 'true' : undefined}
      >
        Profile
      </Link>
      <span style={{ marginLeft: 'auto' }}>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
        <SignedOut>
          <Link href="/sign-in">Sign in</Link>
        </SignedOut>
      </span>
    </nav>
  )
}
