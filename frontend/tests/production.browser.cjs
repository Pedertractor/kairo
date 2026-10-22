// Uses a real browser and the configured local database. Keeps the requested operator account.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

const baseURL = process.env.KAIRO_WEB_URL || 'http://localhost:5173'
const apiURL = process.env.KAIRO_API_URL || 'http://localhost:3000/api'
const adminCard = process.env.KAIRO_ADMIN_CARD
const adminUnit = process.env.KAIRO_ADMIN_UNIT
const adminPassword = process.env.KAIRO_ADMIN_PASSWORD
const operatorCard = process.env.KAIRO_PRODUCTION_CARD
const operatorUnit = process.env.KAIRO_PRODUCTION_UNIT
assert.ok(adminCard && adminUnit && adminPassword && operatorCard && operatorUnit, 'Set the KAIRO_ADMIN_* and KAIRO_PRODUCTION_* environment variables')
const out = path.resolve(__dirname, '../test-results/production')
const results = []
const pass = (name) => { results.push(name); console.log('PASS', name) }

async function main() {
  await fs.mkdir(out, { recursive: true })
  const browser = await chromium.launch({ channel: process.env.KAIRO_BROWSER || 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  page.setDefaultNavigationTimeout(60_000)
  const errors = []
  let success = false
  page.on('pageerror', (e) => errors.push(e.message))
  let adminToken, activity, teamId, temporaryTeam = false
  const extraActivities = []
  const orderingPrefix = 'Validação produção ' + Date.now()
  const api = async (route, token, method = 'GET', data) => {
    const r = await context.request.fetch(apiURL + route, { method, headers: token ? { Authorization: `Bearer ${token}` } : {}, ...(data ? { data } : {}) })
    return { status: r.status(), body: await r.json() }
  }
  const loginProduction = async () => {
    await page.goto(baseURL + '/producao', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Número do cartão', { exact: true }).fill(operatorCard)
    await page.getByRole('button', { name: operatorUnit, exact: true }).click()
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL('**/producao/atividades')
    await page.getByRole('heading', { name: 'Atividades', exact: true }).waitFor()
    await page.getByRole('textbox', { name: 'Filtrar atividades por nome' }).fill('')
  }
  try {
    await page.goto(baseURL + '/login', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Número do cartão', { exact: true }).fill(adminCard)
    await page.getByLabel('Senha', { exact: true }).fill(adminPassword)
    await page.getByRole('button', { name: adminUnit, exact: true }).click()
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL(baseURL + '/')
    adminToken = await page.evaluate(() => localStorage.getItem('kairo:token'))
    assert.ok(adminToken)
    const beforeUsers = await api('/users', adminToken)
    assert.equal(beforeUsers.status, 200)
    assert.ok(beforeUsers.body.dados.users.filter(u => u.cardNumber !== operatorCard || u.unit !== operatorUnit).every(u => u.production === false))
    pass('Admin login and existing users retain production=false')

    await page.goto(baseURL + '/usuarios', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Criar usuário', exact: true }).click()
    const checkbox = page.getByRole('checkbox', { name: 'Usuário de produção' })
    assert.equal(await checkbox.isChecked(), false)
    await page.getByRole('button', { name: 'Sobre o acesso de produção' }).hover()
    const tooltip = page.locator('[data-slot="tooltip-content"]')
    await tooltip.waitFor({ state: 'visible' })
    assert.match(await tooltip.innerText(), /15s/)
    await page.screenshot({ path: path.join(out, 'create-user-default.png') })
    await checkbox.check()
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.getByRole('button', { name: 'Criar usuário', exact: true }).click()
    assert.equal(await checkbox.isChecked(), false, 'Reopening the dialog must reset production to false')
    const existing = beforeUsers.body.dados.users.find(u => u.cardNumber === operatorCard && u.unit === operatorUnit)
    if (!existing) {
      await page.getByLabel('Número do cartão', { exact: true }).fill(operatorCard)
      await page.getByRole('button', { name: operatorUnit, exact: true }).click()
      await checkbox.check()
      assert.equal(await page.getByRole('combobox', { name: 'Função' }).isDisabled(), true)
      await page.getByText('Funcionário encontrado', { exact: true }).waitFor({ timeout: 30_000 })
      const created = page.waitForResponse(r => r.url() === apiURL + '/users' && r.request().method() === 'POST')
      await page.getByRole('button', { name: 'Criar', exact: true }).click()
      const r = await created
      assert.equal(r.status(), 201, await r.text())
      assert.equal((await r.json()).dados.user.production, true)
    } else {
      assert.equal(existing.production, true, 'Existing operator must already be production; do not silently convert users')
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    }
    pass('Creation dialog defaults false, explains flow, and creates the requested production operator')

    const teams = (await api('/teams', adminToken)).body.dados.teams
    let team = teams.find(t => t.role === 'ADMIN')
    if (!team) {
      const createdTeam = await api('/teams', adminToken, 'POST', { name: 'Validação produção ' + Date.now() })
      assert.equal(createdTeam.status, 201)
      team = createdTeam.body.dados.team
      temporaryTeam = true
    }
    teamId = team.id
    const createdActivity = await api(`/teams/${teamId}/activities`, adminToken, 'POST', { title: orderingPrefix + ' A principal' })
    assert.equal(createdActivity.status, 201)
    activity = createdActivity.body.dados.activity
    assert.ok(activity?.id)
    for (const suffix of ['B recente', 'C sem apontamento', '0 encerrada']) {
      const created = await api(`/teams/${teamId}/activities`, adminToken, 'POST', { title: orderingPrefix + ' ' + suffix })
      assert.equal(created.status, 201)
      extraActivities.push(created.body.dados.activity)
    }
    const [recentActivity, untouchedActivity, closedActivity] = extraActivities
    assert.equal((await api(`/teams/${teamId}/activities/${closedActivity.id}`, adminToken, 'PATCH', { status: 'DONE' })).status, 200)
    const historyLogin = await api('/production/login', null, 'POST', { cardNumber: operatorCard, unit: operatorUnit })
    assert.equal(historyLogin.status, 200)
    const historyToken = historyLogin.body.dados.token
    assert.equal((await api(`/teams/${teamId}/activities/${recentActivity.id}/time-entries`, historyToken, 'POST')).status, 201)
    assert.equal((await api('/time-entries/active/pause', historyToken, 'POST')).status, 200)
    await api('/auth/logout', historyToken, 'POST')

    // Remove the administrative session before entering the shared production screen.
    await context.clearCookies()
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await loginProduction()
    const productionToken = await page.evaluate(() => sessionStorage.getItem('kairo:token'))
    assert.ok(productionToken)
    assert.equal(await page.evaluate(() => localStorage.getItem('kairo:token')), null)
    assert.equal(await page.getByLabel('Senha', { exact: true }).count(), 0)
    assert.equal(await page.locator('[data-slot="sidebar"]').count(), 0)
    const visibleText = await page.locator('body').innerText()
    assert.doesNotMatch(visibleText, /Timeline|Apontamentos do dia/)
    pass('Passwordless production login, dedicated page, no sidebar or timeline')

    const filter = page.getByRole('textbox', { name: 'Filtrar atividades por nome' })
    await filter.fill('nome impossível xyz')
    await page.getByText('Nenhuma atividade encontrada.', { exact: true }).waitFor()
    await filter.fill(activity.title.toUpperCase())
    await page.getByRole('heading', { name: activity.title, exact: true }).waitFor()
    assert.equal(await page.locator('article').count(), 1)
    await page.getByRole('button', { name: 'Iniciar', exact: true }).click()
    await page.getByRole('button', { name: 'Pausar timer', exact: true }).waitFor()
    const firstActive = await api('/time-entries/active', productionToken)
    assert.equal(firstActive.body.dados.activeTimer.activity.id, activity.id)
    const cardPause = page.locator(`article[data-activity-id="${activity.id}"]`).getByRole('button', { name: 'Pausar', exact: true })
    await cardPause.click()
    await page.getByRole('button', { name: 'Retomar timer', exact: true }).waitFor()
    assert.equal((await api('/time-entries/active', productionToken)).body.dados.activeTimer, null)
    assert.equal(await page.locator(`article[data-activity-id="${activity.id}"]`).getAttribute('data-state'), 'open')
    assert.equal(await page.locator('article').getByRole('button', { name: 'Pausar', exact: true }).count(), 0)
    await page.getByRole('button', { name: 'Retomar timer', exact: true }).click()
    await page.getByRole('button', { name: 'Pausar timer', exact: true }).waitFor()
    await cardPause.waitFor()
    pass('Pause directly on the active card stops the timer and synchronizes the widget; resume restores the card action')
    await filter.fill(orderingPrefix)
    const card = (id) => page.locator(`article[data-activity-id="${id}"]`)
    const orderedIds = () => page.locator('article').evaluateAll(cards => cards.map(c => c.getAttribute('data-activity-id')))
    assert.deepEqual(await orderedIds(), [activity.id, recentActivity.id, untouchedActivity.id, closedActivity.id])
    assert.equal(await card(closedActivity.id).getAttribute('data-state'), 'closed')
    assert.ok(await card(closedActivity.id).evaluate(c => Number(getComputedStyle(c).opacity) < 1))
    assert.notEqual(await card(activity.id).evaluate(c => getComputedStyle(c).backgroundColor), await card(untouchedActivity.id).evaluate(c => getComputedStyle(c).backgroundColor))
    await card(untouchedActivity.id).getByRole('button', { name: 'Iniciar', exact: true }).click()
    await page.locator(`article[data-activity-id="${untouchedActivity.id}"][data-state="active"]`).waitFor()
    assert.deepEqual(await orderedIds(), [untouchedActivity.id, activity.id, recentActivity.id, closedActivity.id])
    await card(activity.id).getByRole('button', { name: 'Iniciar', exact: true }).click()
    await page.locator(`article[data-activity-id="${activity.id}"][data-state="active"]`).waitFor()
    assert.deepEqual(await orderedIds(), [activity.id, untouchedActivity.id, recentActivity.id, closedActivity.id])
    pass('Active card is highlighted and first, personal history follows, closed cards are faded and last, starting reorders immediately')
    const running = (await api('/time-entries/active', productionToken)).body.dados.activeTimer
    await page.screenshot({ path: path.join(out, 'production-desktop.png'), fullPage: true })
    pass('Name filter, start activity, existing widget, pause and resume')

    for (const route of ['/users', '/teams', '/time-entries/day', '/activities', '/projects']) {
      assert.equal((await api(route, productionToken)).status, 403, route)
    }
    assert.equal((await api('/auth/login', null, 'POST', { unit: operatorUnit, cardNumber: operatorCard, password: adminPassword })).status, 401)
    pass('Production token cannot access ordinary APIs or use password login')

    // Genuine keyboard interaction resets inactivity. Polling below must not reset it.
    await filter.fill(activity.title)
    await filter.press('End')
    const lastInput = Date.now()
    for (let i = 0; i < 2; i++) {
      await page.waitForTimeout(5_000)
      assert.equal((await api('/time-entries/active', productionToken)).status, 200)
    }
    const countdown = await page.getByRole('timer').innerText()
    assert.match(countdown, /Sair em [1-6]s/)
    await page.waitForURL(baseURL + '/producao', { timeout: 8_000 })
    assert.ok(Date.now() - lastInput >= 14_500)
    assert.ok(Date.now() - lastInput < 20_000)
    assert.equal(await page.evaluate(() => sessionStorage.getItem('kairo:token')), null)
    assert.equal((await api('/time-entries/active', productionToken)).status, 401)
    await page.screenshot({ path: path.join(out, 'production-expired.png') })
    pass('15-second idle logout, visible countdown, polling cannot renew, expired JWT denied by server')

    await loginProduction()
    await page.getByRole('button', { name: 'Pausar timer', exact: true }).waitFor()
    const nextToken = await page.evaluate(() => sessionStorage.getItem('kairo:token'))
    assert.equal((await api('/time-entries/active', nextToken)).body.dados.activeTimer.timeEntry.id, running.timeEntry.id)
    pass('Logout keeps the running time entry and restores the widget on next login')
    await page.goto(baseURL + '/usuarios', { waitUntil: 'domcontentloaded' })
    await page.waitForURL('**/producao/atividades')
    await page.getByRole('button', { name: 'Pausar timer', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Pausar timer', exact: true }).click()
    await page.getByRole('button', { name: 'Retomar timer', exact: true }).waitFor()
    pass('Direct navigation to ordinary pages returns the operator to production')
    await page.getByRole('textbox', { name: 'Filtrar atividades por nome' }).fill(orderingPrefix)
    assert.deepEqual(await orderedIds(), [activity.id, untouchedActivity.id, recentActivity.id, closedActivity.id])
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('textbox', { name: 'Filtrar atividades por nome' }).fill(orderingPrefix)
    await card(closedActivity.id).waitFor()
    assert.deepEqual(await orderedIds(), [activity.id, untouchedActivity.id, recentActivity.id, closedActivity.id])
    pass('Personal recency persists after pause and page reload')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('textbox', { name: 'Filtrar atividades por nome' }).fill(activity.title)
    await card(activity.id).getByRole('button', { name: 'Iniciar', exact: true }).click()
    await card(activity.id).getByRole('button', { name: 'Pausar', exact: true }).click()
    await page.getByRole('button', { name: 'Retomar timer', exact: true }).waitFor()
    assert.equal((await api('/time-entries/active', nextToken)).body.dados.activeTimer, null)
    pass('Pause on the activity card also works on mobile')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false)
    await page.screenshot({ path: path.join(out, 'production-mobile.png'), fullPage: true })
    await page.getByRole('button', { name: 'Sair', exact: true }).click()
    await page.waitForURL(baseURL + '/producao')
    pass('Mobile layout and immediate manual logout')

    await page.getByLabel('Número do cartão', { exact: true }).fill(adminCard)
    await page.getByRole('button', { name: adminUnit, exact: true }).click()
    const rejected = page.waitForResponse(r => r.url() === apiURL + '/production/login')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    assert.equal((await rejected).status(), 401)
    assert.ok(page.url().endsWith('/producao'))
    pass('Regular administrative accounts cannot log into production using only their card')
    assert.deepEqual(errors, [])
    pass('No browser JavaScript errors')
    success = true
  } catch (error) {
    console.error('Browser failure:', error)
    await page.screenshot({ path: path.join(out, 'failure.png'), timeout: 5000 }).catch(() => {})
    console.error('Browser state:', (await page.locator('body').innerText()).slice(0, 2500))
    throw error
  } finally {
    if (activity?.id && adminToken) {
      const cleanup = await api(`/teams/${teamId}/activities/${activity.id}`, adminToken, 'DELETE')
      console.log('Fixture cleanup status:', cleanup.status)
    }
    for (const extra of extraActivities) {
      const cleanup = await api(`/teams/${teamId}/activities/${extra.id}`, adminToken, 'DELETE')
      console.log('Ordering fixture cleanup status:', cleanup.status)
    }
    if (temporaryTeam && teamId && adminToken) {
      const cleanup = await api(`/teams/${teamId}/deactivate`, adminToken, 'PATCH')
      console.log('Temporary team cleanup status:', cleanup.status)
    }
    await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ success, passed: results, browserErrors: errors }, null, 2))
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))])
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
