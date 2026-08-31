import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const pathname = request.nextUrl.pathname

  // 1. Jika belum login dan coba akses area terproteksi
  if (!session && !pathname.startsWith('/signin')) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // 2. Proteksi Halaman Keuangan (Finance) khusus Owner & Bendahara
  if (session && pathname.startsWith('/finance')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    // Jika Role adalah Admin (bukan Owner/Bendahara), lempar balik ke Dashboard
    if (profile?.role === 'Admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon2ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}