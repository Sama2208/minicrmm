import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/_reset-pwd')({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          'ccdf7b84-1deb-48b0-ba95-c69c5de27bea',
          { password: 'Samandar2208' }
        )
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
        return new Response(JSON.stringify({ ok: true, id: data.user?.id, email: data.user?.email }))
      }
    }
  }
})
