// Uses isolated API fixtures; no database credentials or writes are needed.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')

const baseURL = process.env.KAIRO_WEB_URL || 'http://127.0.0.1:5173'
const output = path.resolve(__dirname, '../test-results/user-access')

async function run(browser, mobile) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const errors = []
  const unexpectedRequests = []
  const writes = []
  let failSave = false
  const user = (id, name, role) => ({
    id, name, role, employeeId: `TRACTOR-${id}`, cardNumber: id, unit: 'TRACTOR',
    active: true, production: false, firstLogin: false, absent: false,
    absenceStartedAt: null, absenceEndedAt: null, shiftStart: null, shiftEnd: null,
    hasTeams: false, hasOwnedTeams: false,
  })
  const users = {
    admin: user('admin', 'Administrador Teste', 'ADMIN'),
    target: user('target', 'Operador Teste', 'LEADER'),
  }
  page.on('pageerror', (error) => errors.push(error.message))
  await context.addInitScript(() => {
    localStorage.setItem('kairo:token', 'fixture-token')
    localStorage.setItem('kairo:refreshToken', 'fixture-refresh')
  })
  await context.route('**/api/**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname.replace(/^.*\/api/, '')
    let dados
    if (pathname === '/auth/me') dados = { user: users.admin }
    else if (pathname === '/users' && request.method() === 'GET') dados = { users: Object.values(users) }
    else if (pathname === '/time-entries/active') dados = { activeTimer: null }
    else if (/^\/users\/[^/]+\/role$/.test(pathname) && request.method() === 'PATCH') {
      const payload = request.postDataJSON()
      writes.push(payload)
      if (failSave) {
        await route.fulfill({ status: 500, json: { mensagem: 'Save failed' } })
        return
      }
      const id = pathname.split('/')[2]
      Object.assign(users[id], payload)
      dados = { user: users[id] }
    } else {
      unexpectedRequests.push(`${request.method()} ${pathname}`)
      await route.fulfill({ status: 404, json: { mensagem: 'Unexpected fixture request' } })
      return
    }
    await route.fulfill({ json: { dados } })
  })
  const row = (id) => page.getByRole('row').filter({ has: page.getByText(users[id].name, { exact: true }) })
  const open = async (id = 'target') => {
    await row(id).getByRole('button', { name: `Ações para ${users[id].name}` }).click()
    await page.getByRole('menuitem', { name: 'Alterar função e acesso', exact: true }).click()
    await page.getByRole('dialog', { name: 'Alterar função e acesso' }).waitFor()
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"]')
      return dialog && !dialog.hasAttribute('data-starting-style') && getComputedStyle(dialog).opacity === '1'
    })
  }
  const checkbox = () => page.getByRole('checkbox', { name: 'Usuário de produção' })
  const roleSelect = () => page.getByRole('combobox', { name: 'Função', exact: true })
  const save = async (status = 200) => {
    const pending = page.waitForResponse((r) => /\/users\/[^/]+\/role$/.test(r.url()) && r.request().method() === 'PATCH')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    assert.equal((await pending).status(), status)
  }
  try {
    await page.goto(baseURL + '/usuarios')
    await row('target').waitFor()
    await page.getByRole('columnheader', { name: 'Produção', exact: true }).waitFor()
    await row('target').getByRole('cell', { name: 'Líder', exact: true }).waitFor()
    await row('target').getByRole('cell', { name: 'Não', exact: true }).waitFor()

    await open()
    assert.equal(await checkbox().isChecked(), false)
    assert.equal(await page.getByRole('button', { name: 'Salvar', exact: true }).isDisabled(), true)
    await checkbox().check()
    assert.equal(await roleSelect().isDisabled(), true)
    assert.equal(await roleSelect().innerText(), 'Usuário')
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    assert.equal(writes.length, 0)
    await open()
    assert.equal(await checkbox().isChecked(), false)
    assert.equal(await roleSelect().innerText(), 'Líder')

    await checkbox().check()
    failSave = true
    await save(500)
    await page.getByRole('button', { name: 'Salvar', exact: true }).waitFor({ state: 'visible' })
    assert.equal(await checkbox().isChecked(), true)
    assert.equal(await roleSelect().isDisabled(), true)
    assert.equal(users.target.production, false)
    failSave = false
    await save()
    await row('target').getByRole('cell', { name: 'Sim', exact: true }).waitFor()
    await row('target').getByRole('cell', { name: 'Usuário', exact: true }).waitFor()
    assert.deepEqual(writes.at(-1), { role: 'USER', production: true })
    await page.reload()
    await row('target').getByRole('cell', { name: 'Sim', exact: true }).waitFor()
    await page.screenshot({ path: path.join(output, mobile ? 'users-mobile.png' : 'users-desktop.png'), fullPage: true })
    await open()
    assert.equal(await checkbox().isChecked(), true)
    assert.equal(await roleSelect().isDisabled(), true)
    await page.screenshot({ path: path.join(output, mobile ? 'dialog-mobile.png' : 'dialog-desktop.png'), fullPage: true })
    await checkbox().uncheck()
    assert.equal(await roleSelect().isDisabled(), false)
    await roleSelect().click()
    await page.getByRole('option', { name: 'Líder', exact: true }).click()
    await save()
    await row('target').getByRole('cell', { name: 'Não', exact: true }).waitFor()
    await row('target').getByRole('cell', { name: 'Líder', exact: true }).waitFor()
    assert.deepEqual(writes.at(-1), { role: 'LEADER', production: false })
    await page.reload()
    await row('target').getByRole('cell', { name: 'Não', exact: true }).waitFor()

    await open('admin')
    await checkbox().check()
    await save()
    await page.waitForURL('**/login')
    assert.deepEqual(await page.evaluate(() => [
      localStorage.getItem('kairo:token'), localStorage.getItem('kairo:refreshToken'),
      sessionStorage.getItem('kairo:token'),
    ]), [null, null, null])
    assert.deepEqual(errors, [])
    assert.deepEqual(unexpectedRequests, [])
    process.stdout.write(`PASS user access editing, retry, cancellation, persistence and self-conversion (${mobile ? 'mobile' : 'desktop'})\n`)
  } finally {
    await context.close()
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ channel: process.env.KAIRO_BROWSER || 'msedge', headless: true })
  try {
    await run(browser, false)
    await run(browser, true)
  } finally {
    await browser.close()
  }
}
main().catch((error) => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1 })
