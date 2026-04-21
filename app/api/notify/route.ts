import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { PEOPLE } from '@/lib/people'

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const { senderName, text, recipients } = await req.json() as {
    senderName: string
    text: string
    recipients: string[]
  }

  const emails = (recipients || [])
    .map(name => PEOPLE[name])
    .filter(e => e && e !== 'YOUR_EMAIL_HERE' && !e.endsWith('_HERE'))

  if (emails.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.NOTIFY_FROM_EMAIL || 'Wedding Chat <onboarding@resend.dev>'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const safeText = text.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))

  try {
    await resend.emails.send({
      from,
      to: emails,
      subject: `${senderName} sent a message`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #2E3A2E;">
          <h2 style="font-family: Georgia, serif; color: #4A5D4A; margin: 0 0 16px;">Wedding Chat</h2>
          <p style="margin: 0 0 8px; color: #666;"><strong>${senderName}</strong> wrote:</p>
          <div style="background: #FAF7F2; padding: 16px; border-radius: 12px; border-left: 3px solid #B08585; margin-bottom: 24px;">
            ${safeText}
          </div>
          ${appUrl ? `<a href="${appUrl}/messages" style="display: inline-block; background: #4A5D4A; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">Open chat →</a>` : ''}
        </div>
      `
    })
    return NextResponse.json({ ok: true, sent: emails.length })
  } catch (err) {
    console.error('Failed to send notification:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
