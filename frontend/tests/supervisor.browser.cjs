// Isolated API fixtures: supervisor → leader cards → leader teams → read-only team detail.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')

const baseURL = process.env.KAIRO_WEB_URL || 'http://127.0.0.1:5173'
const output = path.resolve(__dirname, '../test-results/supervisor')

const supervisor = {
  id: 'supervisor', employeeId: 'TRACTOR-900', name: 'Sofia Supervisora', cardNumber: '900', unit: 'TRACTOR',
  role: 'SUPERVISOR', active: true, firstLogin: false, production: false, absent: false,
  absenceStartedAt: null, absenceEndedAt: null, shiftStart: null, shiftEnd: null,
  hasTeams: false, hasOwnedTeams: false,
}
const leaders = [
  {
    userId: 'leader-ana', cardNumber: '100', name: 'Ana Líder', unit: 'TRACTOR', registered: true,
    shifts: ['DAY'], costCenters: [{ costCenter: '401', description: 'Solda', group: 'SOLDA' }], teamCount: 2, memberCount: 7,
  },
  {
    userId: null, cardNumber: '300', name: 'BRUNO SEM CADASTRO', unit: 'PEDERTRACTOR', registered: false,
    shifts: ['NIGHT'], costCenters: [{ costCenter: '402', description: 'Pintura', group: 'PINTURA_PO' }], teamCount: 0, memberCount: 0,
  },
]
const member = (id, name, role = 'MEMBER') => ({
  id, name, role, absent: false, absenceStartedAt: null, absenceEndedAt: null, shiftStart: null, shiftEnd: null,
})
const team = (id, name) => ({
  id, name, description: `Equipe ${name}`, createdById: 'leader-ana', memberCount: 2,
  members: [member('leader-ana', 'Ana Líder', 'ADMIN'), member(`${id}-m`, 'Carlos Membro')],
  costCenters: [], role: 'ADMIN', active: true, viewerAccess: 'readonly',
  membersCanCreateActivities: true, membersCanCreateProjects: true, membersCanViewTimeline: true,
  membersCanEditActivities: true, membersCanEditTags: true, membersCanDeleteTags: true, membersCanDeleteCards: true,
  createdAt: '2026-01-01T00:00:00.000Z',
})
const teams = [team('team-solda', 'Solda A'), team('team-solda-b', 'Solda B')]

async function setup(browser, { mobile = false } = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    timezoneId: 'America/Sao_Paulo',
  })
  await context.addInitScript(() => localStorage.setItem('kairo:token', 'fixture-token'))
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  const errors = []
  const writes = []
  page.on('pageerror', (error) => errors.push(error.message))
  await context.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const endpoint = url.pathname.split('/api')[1]
    if (request.method() !== 'GET') {
      writes.push(`${request.method()} ${endpoint}`)
      return route.fulfill({ status: 403, json: { mensagem: 'Acesso negado' } })
    }
    let dados
    if (endpoint === '/auth/me') dados = { user: supervisor }
    else if (endpoint === '/time-entries/active') dados = { activeTimer: null }
    else if (endpoint === '/time-entries/recent') dados = { items: [] }
    else if (endpoint === '/time-entries/day') dados = { blocks: [], absences: [] }
    else if (endpoint === '/absences/unseen-count') dados = { count: 0 }
    else if (endpoint === '/supervisor/leaders') dados = { leaders }
    else if (endpoint === '/supervisor/leaders/leader-ana/teams') dados = { leader: leaders[0], teams }
    else if (endpoint === '/teams') dados = { teams: [] }
    else if (endpoint === '/teams/team-solda') dados = { team: teams[0] }
    else if (endpoint === '/teams/team-solda/activities') dados = { activities: [] }
    else if (endpoint === '/teams/team-solda/projects') dados = { projects: [] }
    else if (endpoint === '/teams/team-solda/tags') dados = { tags: [] }
    else if (endpoint === '/teams/team-solda/documents') dados = { documents: [] }
    else if (endpoint === '/machines' || endpoint === '/clients') dados = { machines: [], clients: [] }
    else {
      errors.push(`Unexpected API request: ${endpoint}`)
      return route.fulfill({ status: 404, json: { mensagem: 'Fixture não encontrada' } })
    }
    return route.fulfill({ json: { dados } })
  })
  return { context, page, errors, writes }
}

async function run(browser, mobile) {
  const { context, page, errors, writes } = await setup(browser, { mobile })
  const suffix = mobile ? 'mobile' : 'desktop'
  try {
    await page.goto(`${baseURL}/equipes`)
    await page.getByRole('heading', { name: 'Equipes', exact: true }).waitFor()
    await page.getByRole('tab', { name: 'Líderes' }).waitFor()

    const anaLink = page.getByRole('link', { name: 'Ver equipes de Ana Líder' })
    await anaLink.waitFor()
    await page.getByText('2 equipes · 7 pessoas').waitFor()
    await page.getByText('Sem cadastro no Kairo').waitFor()
    assert.equal(await page.getByRole('link', { name: 'Ver equipes de BRUNO SEM CADASTRO' }).count(), 0)
    if (!mobile) assert.ok(await page.getByRole('link', { name: 'Usuários' }).count() > 0, 'sidebar shows Usuários')
    await page.screenshot({ path: path.join(output, `leaders-${suffix}.png`), fullPage: true })

    await anaLink.click()
    await page.getByRole('heading', { name: 'Equipes de Ana Líder' }).waitFor()
    await page.getByText('Solda B', { exact: true }).waitFor()
    await page.screenshot({ path: path.join(output, `leader-teams-${suffix}.png`), fullPage: true })

    await page.getByRole('link', { name: /^Solda A / }).click()
    await page.getByRole('heading', { name: 'Solda A' }).waitFor()
    await page.getByText('Somente leitura').waitFor()
    assert.equal(await page.getByRole('tab', { name: 'Configurações' }).count(), 0, 'no settings tab')
    assert.equal(await page.getByRole('tab', { name: 'Apontamentos' }).count(), 1, 'time entries visible')
    assert.equal(await page.getByRole('button', { name: 'Editar nome e descrição' }).count(), 0, 'no edit button')
    await page.getByRole('tab', { name: 'Documentos' }).click()
    assert.equal(await page.getByText('Arraste PDF ou imagens').count(), 0, 'no upload area')
    await page.screenshot({ path: path.join(output, `team-readonly-${suffix}.png`), fullPage: true })

    await page.goto(`${baseURL}/equipes?visao=minhas`)
    await page.getByRole('tab', { name: 'Minhas equipes', selected: true }).waitFor()

    assert.deepEqual(writes, [])
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
}

;(async () => {
  await fs.mkdir(output, { recursive: true })
  // PW_CHANNEL=chrome reuses an installed Chrome when Playwright's browsers are not downloaded.
  const browser = await chromium.launch(
    process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {},
  )
  try {
    await run(browser, false)
    await run(browser, true)
    console.log('supervisor browser checks passed')
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
