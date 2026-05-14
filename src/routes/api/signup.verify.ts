import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const VerifySignupSchema = z.object({
  email: z.string().email().max(320),
  code: z.string().regex(/^\d{6}$/),
})

export const Route = createFileRoute('/api/signup/verify')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        let input: z.infer<typeof VerifySignupSchema>
        try {
          input = VerifySignupSchema.parse(await request.json())
        } catch {
          return Response.json({ error: 'Enter the 6-digit code' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })

        const { data: aliases, error: lookupError } = await supabase
          .from('signup_otp_aliases')
          .select('id,email,real_token')
          .eq('alias_code', input.code)
          .is('consumed_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(5)

        if (lookupError) {
          return Response.json({ error: 'Could not verify code' }, { status: 500 })
        }

        const alias = aliases?.find(
          (entry) => String(entry.email).toLowerCase() === input.email.toLowerCase(),
        )

        if (!alias) {
          return Response.json({ error: 'Invalid or expired code' }, { status: 400 })
        }

        const { data, error } = await supabase.auth.verifyOtp({
          email: input.email,
          token: alias.real_token,
          type: 'email',
        })

        if (error || !data.user || !data.session) {
          return Response.json({ error: error?.message || 'Invalid code' }, { status: 400 })
        }

        await supabase
          .from('signup_otp_aliases')
          .update({ consumed_at: new Date().toISOString() })
          .eq('id', alias.id)

        return Response.json({ user: data.user, session: data.session })
      },
    },
  },
})