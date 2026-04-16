import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Email et code requis' }, { status: 400 })
    }

    // In production, use a real email service (SendGrid, Resend, AWS SES, etc.)
    // For now, we'll use a placeholder that logs to console
    console.log(`[AXIS SHIPPING] Envoi du code de vérification à ${email}`)
    console.log(`[AXIS SHIPPING] Code: ${code}`)

    // Simulate email sending with fetch to a mock endpoint
    // In production, replace this with actual email service:
    /*
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email }],
          subject: 'Code de vérification AXIS SHIPPING LINE'
        }],
        from: { email: 'noreply@axis-shipping.com', name: 'AXIS SHIPPING LINE' },
        content: [{
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e3a8a;">AXIS SHIPPING LINE</h2>
              <p>Votre code de vérification est :</p>
              <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e3a8a;">
                ${code}
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Ce code expire dans 10 minutes. Si vous n'avez pas demandé ce code, ignorez cet email.
              </p>
            </div>
          `
        }]
      })
    })
    */

    // For demo purposes, return success immediately
    return NextResponse.json({ 
      success: true, 
      message: `Code de vérification généré`,
      code: code // Displayed directly since no email service configured yet
    })

  } catch (error) {
    console.error('[AXIS SHIPPING] Erreur envoi email:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi du code' }, { status: 500 })
  }
}
