// Isolated API fixtures: no database changes and no real email deliveries.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')

const baseURL = process.env.KAIRO_WEB_URL || 'http://127.0.0.1:5173'
const output = path.resolve(__dirname, '../test-results/account')
const token = 'a'.repeat(43)

async function run(browser, mobile) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const errors = []
  const unexpected = []
  const writes = []
  const user = {
    id: 'fixture-user', name: 'Colaborador Teste', role: 'USER', employeeId: 'TRACTOR-101',
    cardNumber: '101', unit: 'TRACTOR', active: true, production: false, firstLogin: false,
    absent: false, absenceStartedAt: null, absenceEndedAt: null, shiftStart: null, shiftEnd: null,
    hasOwnedTeams: false, hasTeams: false,
  }
  let profile = { email: null, verifiedAt: null, pendingEmail: null }
  let recoveryStatus = 'no_email'
  let failSave = false
  let failRecovery = false
  let failVerify = false
  page.on('pageerror', (error) => errors.push(error.message))
  await context.addInitScript(() => {
    if (!sessionStorage.getItem('account-fixture-initialized')) {
      localStorage.setItem('kairo:token', 'fixture-token')
      localStorage.setItem('kairo:refreshToken', 'fixture-refresh')
      sessionStorage.setItem('account-fixture-initialized', 'true')
    }
  })
  await context.route('**/api/**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname.replace(/^.*\/api/, '')
    let dados = null
    let status = 200
    let mensagem
    if (pathname === '/auth/me') dados = { user }
    else if (pathname === '/time-entries/active') dados = { activeTimer: null }
    else if (pathname === '/auth/me/profile' && request.method() === 'GET') dados = { profile }
    else if (pathname === '/auth/me/profile' && request.method() === 'PATCH') {
      const payload = request.postDataJSON()
      writes.push({ pathname, payload })
      if (payload.email === null) profile = { email: null, verifiedAt: null, pendingEmail: null }
      else profile = { ...profile, pendingEmail: payload.email }
      if (failSave) { status = 503; mensagem = 'Falha SMTP' }
      else { dados = { profile }; mensagem = 'Perfil atualizado.' }
    } else if (pathname === '/auth/me/profile/resend-email-verification') {
      writes.push({ pathname }); mensagem = 'Confirmação reenviada.'
    } else if (pathname === '/auth/forgot-password') {
      writes.push({ pathname, payload: request.postDataJSON() })
      if (failRecovery) { status = 503; mensagem = 'Falha SMTP' }
      else dados = { status: recoveryStatus }
    } else if (pathname === '/auth/verify-email') {
      writes.push({ pathname, payload: request.postDataJSON() })
      if (failVerify) { status = 400; mensagem = 'Este link é inválido ou expirou. Solicite um novo link.' }
    } else if (pathname === '/auth/reset-password') {
      writes.push({ pathname, payload: request.postDataJSON() })
    } else if (pathname === '/auth/logout') {
      writes.push({ pathname })
    } else {
      unexpected.push(`${request.method()} ${pathname}`)
      status = 404; mensagem = 'Unexpected fixture request'
    }
    await route.fulfill({ status, json: status >= 400 ? { mensagem } : { dados, ...(mensagem ? { mensagem } : {}) } })
  })
  const screenshot = (name) => page.screenshot({ path: path.join(output, `${name}-${mobile ? 'mobile' : 'desktop'}.png`), fullPage: true })
  const verifyWidth = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'No horizontal overflow')
  try {
    await page.goto(baseURL + '/perfil')
    await page.getByRole('heading', { name: 'Meu perfil' }).waitFor()
    if (mobile) await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
    await page.getByRole('button', { name: /Colaborador Teste/ }).click()
    await page.getByRole('menuitem', { name: 'Perfil', exact: true }).click()
    await page.getByLabel('E-mail (opcional)').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Salvar e-mail' }).isDisabled(), true)

    await page.getByLabel('E-mail (opcional)').fill('colaborador@example.com')
    await page.getByRole('button', { name: 'Salvar e-mail' }).click()
    await page.getByText('Confirmação pendente', { exact: true }).waitFor()
    const resent = page.waitForResponse((response) => response.url().endsWith('/resend-email-verification'))
    await page.getByRole('button', { name: 'Reenviar confirmação' }).click()
    await resent
    await verifyWidth()
    await screenshot('profile-pending')

    profile = { email: 'colaborador@example.com', verifiedAt: new Date().toISOString(), pendingEmail: null }
    await page.reload()
    await page.getByText('E-mail confirmado', { exact: true }).waitFor()
    await page.getByLabel('E-mail (opcional)').fill('novo@example.com')
    failSave = true
    await page.getByRole('button', { name: 'Salvar e-mail' }).click()
    await page.getByText('Confirmação pendente', { exact: true }).waitFor()
    await page.getByText('Até a confirmação, a recuperação continua usando o endereço confirmado acima.').waitFor()
    await page.getByRole('alert').filter({ hasText: 'Não foi possível enviar o link' }).waitFor()
    assert.equal(profile.email, 'colaborador@example.com')
    failSave = false
    await page.getByRole('button', { name: 'Remover e-mail', exact: true }).click()
    await page.getByRole('dialog', { name: 'Remover e-mail?' }).waitFor()
    const beforeCancel = writes.length
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    assert.equal(writes.length, beforeCancel)
    await page.getByRole('button', { name: 'Remover e-mail', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar remoção', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.deepEqual(profile, { email: null, verifiedAt: null, pendingEmail: null })

    await page.evaluate(() => {
      localStorage.removeItem('kairo:token')
      localStorage.removeItem('kairo:refreshToken')
      window.dispatchEvent(new Event('kairo:session-expired'))
    })
    await page.goto(baseURL + '/login')
    await page.getByRole('button', { name: 'Esqueci minha senha' }).click()
    await page.getByRole('status').filter({ hasText: 'Informe o número do cartão' }).waitFor()
    await page.getByLabel('Número do cartão').fill('101')
    await page.getByRole('button', { name: 'TRACTOR', exact: true }).click()
    await page.getByRole('button', { name: 'Esqueci minha senha' }).click()
    await page.getByRole('status').filter({ hasText: 'Contate a equipe de automação' }).waitFor()
    assert.deepEqual(writes.at(-1).payload, { cardNumber: '101', unit: 'TRACTOR' })
    assert.equal(await page.getByLabel('Senha', { exact: true }).inputValue(), '')
    await verifyWidth()
    await screenshot('recovery-no-email')
    recoveryStatus = 'verification_pending'
    await page.getByRole('button', { name: 'Esqueci minha senha' }).click()
    await page.getByRole('status').filter({ hasText: 'Reenviamos a confirmação' }).waitFor()
    assert.ok(!(await page.getByRole('status').filter({ hasText: 'Reenviamos a confirmação' }).innerText()).includes('automação'))
    recoveryStatus = 'sent'
    await page.getByRole('button', { name: 'Esqueci minha senha' }).click()
    await page.getByRole('status').filter({ hasText: 'você receberá um link' }).waitFor()
    failRecovery = true
    await page.getByRole('button', { name: 'Esqueci minha senha' }).click()
    await page.getByRole('status').filter({ hasText: 'Ocorreu um erro inesperado' }).waitFor()
    failRecovery = false

    await page.goto(baseURL + '/confirmar-email#token=' + token)
    await page.getByRole('heading', { name: 'Confirme seu e-mail' }).waitFor()
    assert.equal(writes.filter((entry) => entry.pathname === '/auth/verify-email').length, 0)
    assert.equal(new URL(page.url()).hash, '')
    await page.getByRole('button', { name: 'Confirmar e-mail', exact: true }).click()
    await page.getByRole('heading', { name: 'E-mail confirmado', exact: true }).waitFor()
    assert.deepEqual(writes.at(-1).payload, { token })
    await screenshot('confirmation')

    failVerify = true
    await page.goto(baseURL + '/confirmar-email#token=' + token)
    await page.getByRole('button', { name: 'Confirmar e-mail', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'inválido ou expirou' }).waitFor()
    failVerify = false
    await page.goto(baseURL + '/redefinir-senha')
    await page.getByRole('alert').filter({ hasText: 'Este link é inválido' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Salvar nova senha' }).isDisabled(), true)

    await page.evaluate(() => {
      localStorage.setItem('kairo:token', 'fixture-token')
      localStorage.setItem('kairo:refreshToken', 'fixture-refresh')
    })
    await page.goto(baseURL + '/redefinir-senha#token=' + token)
    await page.getByRole('heading', { name: 'Defina sua nova senha' }).waitFor()
    await page.getByLabel('Nova senha', { exact: true }).fill('new-password')
    await page.getByLabel('Confirmar senha', { exact: true }).fill('different')
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await page.getByRole('alert').filter({ hasText: 'As senhas não coincidem' }).waitFor()
    assert.equal(writes.filter((entry) => entry.pathname === '/auth/reset-password').length, 0)
    await page.getByLabel('Confirmar senha', { exact: true }).fill('new-password')
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await page.getByRole('heading', { name: 'Senha redefinida', exact: true }).waitFor()
    assert.deepEqual(writes.at(-1).payload, { token, newPassword: 'new-password', confirmPassword: 'new-password' })
    assert.equal(await page.evaluate(() => localStorage.getItem('kairo:token')), null)
    await verifyWidth()
    await screenshot('reset-complete')
    await page.getByRole('link', { name: 'Voltar ao login' }).click()
    await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor()
    assert.deepEqual(errors, [])
    assert.deepEqual(unexpected, [])
    process.stdout.write(`PASS profile, SMTP failure, confirmation and recovery (${mobile ? 'mobile' : 'desktop'})\n`)
  } finally { await context.close() }
}

async function main() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ channel: process.env.KAIRO_BROWSER || 'msedge', headless: true })
  try { await run(browser, false); await run(browser, true) }
  finally { await browser.close() }
}
main().catch((error) => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1 })
