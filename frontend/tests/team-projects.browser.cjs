// Uses isolated API fixtures; no database credentials or writes are needed.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')

const baseURL = process.env.KAIRO_WEB_URL || 'http://127.0.0.1:5173'
const statuses = ['TODO', 'IN_PROGRESS', 'PAUSED', 'DONE', 'CANCELED']
const labels = ['A fazer', 'Em andamento', 'Pausado', 'Concluído', 'Cancelado']
const orderLabels = ['Mais recentes', 'Mais antigos', 'Nome (A–Z)', 'Nome (Z–A)']
const output = path.resolve(__dirname, '../test-results/team-projects')

function fixtures() {
  return [...statuses].reverse().flatMap((status) => ['old', 'new'].map((age) => ({
    id: `${status}-${age}`, teamId: 'team', status,
    title: `${age === 'new' ? 'Árvore' : 'Bola'} ${status}`,
    description: 'Projeto da equipe', estimatedHours: null, loggedSeconds: 0,
    createdById: 'user', integrationSource: null, deletedAt: null, deletedByName: null,
    createdAt: `2026-10-${age === 'new' ? '02' : '01'}T12:00:00Z`,
    updatedAt: '2026-10-03T12:00:00Z',
  })))
}

async function run(browser, mobile) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1904, height: 1007 } })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const projects = fixtures()
  const team = { id: 'team', name: 'Programação', description: 'Projetos da equipe', active: true,
    role: 'ADMIN', createdById: 'user', memberCount: 1, members: [], costCenters: [],
    membersCanDeleteCards: true, membersCanCreateProjects: true }
  await context.addInitScript(() => localStorage.setItem('kairo:token', 'fixture-token'))
  await context.route('**/api/**', async (route) => {
    const request = route.request()
    const endpoint = new URL(request.url()).pathname.split('/api')[1]
    let data
    if (endpoint === '/auth/me') data = { user: { id: 'user', name: 'Pessoa Teste', employeeId: '123',
      cardNumber: '123', unit: 'PEDERTRACTOR', role: 'ADMIN', active: true, hasTeams: true, hasOwnedTeams: true } }
    else if (endpoint === '/teams/team') data = { team }
    else if (endpoint === '/teams/team/projects') data = { projects }
    else if (endpoint === '/time-entries/active') data = { activeTimer: null }
    else if (endpoint === '/absences/unseen-count') data = { count: 0, absencesSeenAt: null }
    else if (endpoint.startsWith('/teams/team/projects/') && request.method() === 'PATCH') {
      const project = projects.find((item) => item.id === endpoint.split('/').pop())
      Object.assign(project, request.postDataJSON())
      data = { project }
    } else {
      errors.push(`Unexpected API request: ${request.method()} ${endpoint}`)
      return route.fulfill({ status: 404, json: {} })
    }
    return route.fulfill({ json: { dados: data } })
  })
  try {
    await page.goto(`${baseURL}/equipes/team?tab=projetos`)
    const cards = page.locator('ul.grid > li > a')
    async function checkCards(expected) {
      await page.waitForFunction((ids) => JSON.stringify(
        [...document.querySelectorAll('ul.grid > li > a')].map((a) => a.getAttribute('href').split('/').pop()),
      ) === JSON.stringify(ids), expected)
    }
    const defaultIds = statuses.flatMap((status) => [`${status}-new`, `${status}-old`])
    await checkCards(defaultIds)
    assert.equal(await page.getByLabel('10 projetos', { exact: true }).count(), 1)
    assert.equal(await page.getByLabel('Filtrar concluídos').count(), 0)
    assert.equal(await cards.first().getAttribute('href'), '/projetos/TODO-new')
    const filterButton = page.getByRole('button', { name: 'Abrir filtros', exact: true })
    const marker = filterButton.locator('span[aria-hidden="true"]')
    if (mobile) {
      assert.equal(await marker.count(), 0)
      await filterButton.click()
    }
    const statusSelect = page.getByRole('combobox', { name: 'Filtrar por status', exact: true })
    const orderSelect = page.getByRole('combobox', { name: 'Ordenar por', exact: true })
    async function select(control, label) {
      await control.click()
      await page.getByRole('option', { name: label, exact: true }).click()
    }
    async function closeSheet() {
      await page.getByRole('button', { name: 'Close', exact: true }).click()
      await page.getByRole('dialog', { name: 'Filtros', exact: true }).waitFor({ state: 'hidden' })
    }
    for (let order = 0; order < orderLabels.length; order++) {
      await select(orderSelect, orderLabels[order])
      const ages = order === 1 || order === 3 ? ['old', 'new'] : ['new', 'old']
      await checkCards(statuses.flatMap((status) => ages.map((age) => `${status}-${age}`)))
      for (let status = 0; status < statuses.length; status++) {
        await select(statusSelect, labels[status])
        await checkCards(ages.map((age) => `${statuses[status]}-${age}`))
        assert.equal(await page.getByLabel('10 projetos', { exact: true }).count(), 1)
      }
      await select(statusSelect, 'Todos os status')
    }
    if (mobile) {
      await closeSheet()
      assert.equal(await marker.count(), 1)
      await page.setViewportSize({ width: 1904, height: 1007 })
      assert.match(await orderSelect.innerText(), /Nome \(Z–A\)/)
      await select(orderSelect, 'Mais recentes')
      await page.setViewportSize({ width: 390, height: 844 })
      assert.equal(await marker.count(), 0)
      await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true })
      await filterButton.click()
      await page.screenshot({ path: path.join(output, 'mobile-filters.png'), fullPage: true })
      await closeSheet()
    } else {
      await select(orderSelect, 'Mais recentes')
      await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true })
      // Existing card actions still open, and status updates reapply the selected filter.
      for (const [action, title] of [['Finalizar', 'Finalizar projeto'], ['Excluir', 'Excluir projeto']]) {
        await page.getByRole('button', { name: 'Ações para Árvore TODO', exact: true }).click()
        await page.getByRole('menuitem', { name: action, exact: true }).click()
        const dialog = page.getByRole('dialog', { name: title, exact: true })
        await dialog.waitFor()
        await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
      }
      await page.getByRole('button', { name: 'Criar novo projeto', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
      await select(statusSelect, 'A fazer')
      for (const id of ['TODO-new', 'TODO-old']) {
        await page.locator('li').filter({ has: page.locator(`a[href="/projetos/${id}"]`) })
          .getByRole('button', { name: 'A fazer', exact: true }).click()
        const dialog = page.getByRole('dialog', { name: 'Alterar status', exact: true })
        await select(dialog.getByRole('combobox'), 'Cancelado')
        await dialog.getByRole('button', { name: 'Salvar', exact: true }).click()
        await checkCards(id === 'TODO-new' ? ['TODO-old'] : [])
      }
      await page.getByText('Tente ajustar o filtro de status.', { exact: true }).waitFor()
      assert.equal(await page.getByLabel('10 projetos', { exact: true }).count(), 1)
      await select(statusSelect, 'Todos os status')
      await checkCards(['IN_PROGRESS-new', 'IN_PROGRESS-old', 'PAUSED-new', 'PAUSED-old',
        'DONE-new', 'DONE-old', 'CANCELED-new', 'TODO-new', 'CANCELED-old', 'TODO-old'])
    }
    assert.deepEqual(errors, [])
    process.stdout.write(`PASS team projects: ${mobile ? 'mobile' : 'desktop'} filters, ordering, and layout\n`)
  } finally {
    await context.close()
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ channel: process.env.KAIRO_BROWSER || 'msedge', headless: true })
  try {
    await Promise.all([run(browser, false), run(browser, true)])
  } finally {
    await browser.close()
  }
}

main().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1 })
