type WelcomeEmailProps = {
	name: string
	loginUrl: string
}

export function welcomeEmailTemplate({ name, loginUrl }: WelcomeEmailProps): string {
	return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Anna</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid #f0f0f0;
    }
    .content {
      padding: 30px 0;
    }
    .button {
      display: inline-block;
      background: #3b82f6;
      color: #ffffff;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #2563eb;
    }
    .footer {
      text-align: center;
      padding: 20px 0;
      border-top: 2px solid #f0f0f0;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="color: #3b82f6; margin: 0;">Anna</h1>
  </div>

  <div class="content">
    <h2>Bem-vindo, ${name}!</h2>
    <p>Obrigado por se juntar ao Anna. Estamos felizes em te-lo conosco.</p>
    <p>Para comecar, clique no botao abaixo:</p>

    <p style="text-align: center;">
      <a href="${loginUrl}" class="button">Comecar Agora</a>
    </p>

    <p>Se voce nao criou esta conta, pode ignorar este email.</p>
  </div>

  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} Anna. Todos os direitos reservados.</p>
  </div>
</body>
</html>
  `.trim()
}

type PasswordResetEmailProps = {
	name: string
	resetUrl: string
	expiresInMinutes?: number
}

export function passwordResetEmailTemplate({
	name,
	resetUrl,
	expiresInMinutes = 60,
}: PasswordResetEmailProps): string {
	return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha - Anna</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid #f0f0f0;
    }
    .content {
      padding: 30px 0;
    }
    .button {
      display: inline-block;
      background: #ef4444;
      color: #ffffff;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .warning {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 12px;
      margin: 20px 0;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      padding: 20px 0;
      border-top: 2px solid #f0f0f0;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="color: #3b82f6; margin: 0;">Anna</h1>
  </div>

  <div class="content">
    <h2>Redefinir sua senha</h2>
    <p>Ola ${name},</p>
    <p>Recebemos uma solicitacao para redefinir a senha da sua conta.</p>

    <p style="text-align: center;">
      <a href="${resetUrl}" class="button">Redefinir Senha</a>
    </p>

    <div class="warning">
      <strong>Importante:</strong> Este link expira em ${expiresInMinutes} minutos.
    </div>

    <p>Se voce nao solicitou a redefinicao de senha, ignore este email. Sua senha permanecera inalterada.</p>
  </div>

  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} Anna. Todos os direitos reservados.</p>
  </div>
</body>
</html>
  `.trim()
}
