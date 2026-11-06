// Isolated P5/API fixtures: no database access or calls to the unpublished route.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')

const baseURL = process.env.KAIRO_WEB_URL || 'http://127.0.0.1:5173'
const output = path.resolve(__dirname, '../test-results/infractions')
const person = {
  name: 'Ana Exemplo', cardNumber: '1234', unit: 'TRACTOR',
  monthlyAverage: { percent: 54.16666667, loggedSeconds: 50400, workedSeconds: 86400 },
  infractionCount: 3,
  infractions: [
    { date: '2026-10-01', type: 'EXCESS', workedSeconds: 28800, loggedSeconds: 32400, percent: 112.5 },
    { date: '2026-10-02', type: 'BELOW_70', workedSeconds: 28800, loggedSeconds: 18000, percent: 62.5 },
    { date: '2026-10-03', type: 'NONE', workedSeconds: 28800, loggedSeconds: 0, percent: 0 },
  ],
}
const report = (url, people = [structuredClone(person)]) => ({
  month: Number(url.searchParams.get('month')), year: Number(url.searchParams.get('year')),
  totalPeople: people.length, totalInfractions: people.reduce((total, entry) => total + entry.infractionCount, 0), people,
})

async function setup(browser, { mobile = false, role = 'ADMIN', authenticated = true } = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    timezoneId: 'America/Sao_Paulo',
  })
  if (authenticated) await context.addInitScript(() => localStorage.setItem('kairo:token', 'fixture-token'))
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date('2026-11-04T15:00:00-03:00'))
  page.setDefaultTimeout(10000)
  const errors = []
  const requests = []
  let respond = async (route, url) => route.fulfill({ json: { dados: report(url) } })
  page.on('pageerror', (error) => errors.push(error.message))
  await context.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const endpoint = url.pathname.split('/api')[1]
    let dados
    if (endpoint === '/auth/me') dados = { user: {
      id: 'fixture-admin', name: 'Admin Teste', cardNumber: '99', unit: 'TRACTOR',
      role, active: true, hasTeams: false, hasOwnedTeams: false, production: false,
    } }
    else if (endpoint === '/time-entries/active') dados = { activeTimer: null }
    else if (endpoint === '/time-entries/recent') dados = { items: [] }
    else if (endpoint === '/time-entries/day') dados = { blocks: [], absences: [] }
    else if (endpoint === '/absences/unseen-count') dados = { count: 0 }
    else if (endpoint === '/infractions/leaders') dados = { leaders: [
      { id: 'leader-tractor', name: 'Líder Tractor', members: [{ unit: 'TRACTOR', cardNumber: '1234' }] },
      { id: 'leader-pedertractor', name: 'Líder Pedertractor', members: [{ unit: 'PEDERTRACTOR', cardNumber: '1234' }] },
      { id: 'leader-empty', name: 'Líder sem equipe', members: [] },
    ] }
    else if (endpoint === '/infractions') {
      requests.push(url)
      return respond(route, url)
    } else {
      errors.push(`Unexpected API request: ${endpoint}`)
      return route.fulfill({ status: 404, json: { mensagem: 'Fixture não encontrada' } })
    }
    return route.fulfill({ json: { dados } })
  })
  return { context, page, errors, requests, setResponder: (handler) => { respond = handler } }
}

async function selectMonth(page, label) {
  await page.getByRole('combobox', { name: 'Mês', exact: true }).click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

async function checkLayout(browser, mobile) {
  const fixture = await setup(browser, { mobile })
  const { page, requests, errors } = fixture
  try {
    await page.goto(`${baseURL}/infracoes`)
    const trigger = page.getByRole('button', { name: 'Infrações de Ana Exemplo, Tractor, cartão 1234', exact: true })
    await trigger.waitFor()
    assert.equal(await page.getByText('Colaboradores', { exact: true }).locator('..').locator('dd').innerText(), '1')
    assert.equal(await page.getByText('Infrações no período', { exact: true }).locator('..').locator('dd').innerText(), '3')
    assert.equal(requests.at(-1).searchParams.get('month'), '11')
    assert.equal(requests.at(-1).searchParams.get('year'), '2026')
    assert.equal(await page.getByLabel('Ano', { exact: true }).inputValue(), '2026')
    if (!mobile) await page.locator('a[href="/infracoes"]').waitFor()
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false')
    await selectMonth(page, 'Outubro')
    await trigger.waitFor()
    assert.equal(requests.at(-1).searchParams.get('month'), '10')
    assert.match(await trigger.innerText(), /3 infrações/)
    assert.match(await trigger.innerText(), /54,17%/)
    await trigger.click()
    const occurrences = page.getByRole('list', { name: 'Ocorrências de Ana Exemplo' })
    await occurrences.waitFor()
    assert.equal(await occurrences.getByRole('listitem').count(), 3)
    for (const label of ['Excesso', 'Abaixo de 70%', 'Sem apontamento', '112,5%', '62,5%', '0%', '00h 00m', '01/10/2026']) {
      await occurrences.getByText(label, { exact: true }).waitFor()
    }
    await page.getByText('24h 00m', { exact: true }).waitFor()
    await page.getByText('14h 00m', { exact: true }).waitFor()
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'page must fit viewport')
    await page.screenshot({ path: path.join(output, mobile ? 'mobile.png' : 'desktop.png'), fullPage: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false')
    await page.getByLabel('Ano', { exact: true }).fill('2025')
    await trigger.waitFor()
    assert.equal(requests.at(-1).searchParams.get('year'), '2025')
    await page.getByLabel('Ano', { exact: true }).fill('')
    await page.getByText('Informe um ano inteiro positivo.', { exact: true }).waitFor()
    assert.equal(await trigger.count(), 0)
    const beforeInvalid = requests.length
    await page.getByLabel('Ano', { exact: true }).fill('0')
    assert.equal(requests.length, beforeInvalid)
    assert.deepEqual(errors, [])
    process.stdout.write(`PASS infractions ${mobile ? 'mobile' : 'desktop'}: filters, totals, details, formatting, keyboard and layout\n`)
  } finally { await fixture.context.close() }
}

async function checkStates(browser) {
  const fixture = await setup(browser)
  const { page, requests, errors } = fixture
  try {
    fixture.setResponder(async (route, url) => {
      const secondPerson = { ...structuredClone(person), name: 'Ana Outra Unidade', unit: 'PEDERTRACTOR' }
      secondPerson.infractions[0].type = 'NEW_TYPE'
      secondPerson.monthlyAverage.workedSeconds = 180000
      return route.fulfill({ json: { dados: report(url, [structuredClone(person), secondPerson]) } })
    })
    await page.goto(`${baseURL}/infracoes`)
    const first = page.getByRole('button', { name: 'Infrações de Ana Exemplo, Tractor, cartão 1234', exact: true })
    const second = page.getByRole('button', { name: 'Infrações de Ana Outra Unidade, Pedertractor, cartão 1234', exact: true })
    await first.waitFor()
    await first.click()
    await second.click()
    assert.equal(await first.getAttribute('aria-expanded'), 'true')
    assert.equal(await second.getAttribute('aria-expanded'), 'true')
    await page.getByText('NEW_TYPE', { exact: true }).waitFor()
    await page.getByText('50h 00m', { exact: true }).waitFor()

    const beforeLeaderFilter = requests.length
    async function chooseLeader(label) {
      await page.getByRole('combobox', { name: 'Líder', exact: true }).click()
      await page.getByRole('option', { name: label, exact: true }).click()
    }
    await chooseLeader('Líder Tractor')
    await first.waitFor()
    assert.equal(await second.count(), 0)
    assert.equal(await page.getByText('Colaboradores', { exact: true }).locator('..').locator('dd').innerText(), '1')
    assert.equal(await page.getByText('Infrações no período', { exact: true }).locator('..').locator('dd').innerText(), '3')
    await chooseLeader('Líder Pedertractor')
    await second.waitFor()
    assert.equal(await first.count(), 0)
    await chooseLeader('Líder sem equipe')
    await page.getByText('Nenhuma infração encontrada para este líder no período selecionado.', { exact: true }).waitFor()
    await chooseLeader('Todos os líderes')
    await first.waitFor()
    await second.waitFor()
    assert.equal(requests.length, beforeLeaderFilter, 'leader filtering must not make new P5 requests')

    fixture.setResponder(async (route, url) => route.fulfill({ json: { dados: report(url, []) } }))
    await selectMonth(page, 'Outubro')
    await page.getByText('Nenhuma infração encontrada para o período selecionado.', { exact: true }).waitFor()
    fixture.setResponder(async (route) => route.fulfill({ status: 502, json: { mensagem: 'P5 indisponível' } }))
    await selectMonth(page, 'Setembro')
    await page.getByRole('alert').filter({ hasText: 'Não foi possível carregar as infrações.' }).waitFor()
    fixture.setResponder(async (route, url) => route.fulfill({ json: { dados: report(url) } }))
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
    await first.waitFor()

    let release
    const held = new Promise((resolve) => { release = resolve })
    let sawSlow
    const slowRequest = new Promise((resolve) => { sawSlow = resolve })
    fixture.setResponder(async (route, url) => {
      if (url.searchParams.get('month') === '8') {
        sawSlow()
        await held
        // The application may have aborted this request while changing periods.
        try { await route.fulfill({ json: { dados: report(url, [{ ...structuredClone(person), name: 'Resultado antigo' }]) } }) } catch { /* canceled */ }
        return
      }
      return route.fulfill({ json: { dados: report(url, [{ ...structuredClone(person), name: 'Resultado atual' }]) } })
    })
    await selectMonth(page, 'Agosto')
    await slowRequest
    await page.getByText('Carregando infrações...', { exact: true }).waitFor()
    await selectMonth(page, 'Julho')
    await page.getByRole('button', { name: /Infrações de Resultado atual/ }).waitFor()
    release()
    await page.waitForLoadState('networkidle')
    assert.equal(await page.getByRole('button', { name: /Infrações de Resultado antigo/ }).count(), 0)
    assert.equal(requests.at(-1).searchParams.get('month'), '7')
    assert.deepEqual(errors, [])
    process.stdout.write('PASS infractions: duplicate cards across units, independent expansion, unknown types, empty/error/retry/loading and stale responses\n')
  } finally { await fixture.context.close() }
}

async function checkAccess(browser) {
  for (const role of ['USER', 'LEADER']) {
    const fixture = await setup(browser, { role })
    try {
      await fixture.page.goto(`${baseURL}/infracoes`)
      await fixture.page.waitForURL(`${baseURL}/`)
      assert.equal(await fixture.page.locator('a[href="/infracoes"]').count(), 0)
      assert.equal(fixture.requests.length, 0)
      assert.deepEqual(fixture.errors, [])
    } finally { await fixture.context.close() }
  }
  const fixture = await setup(browser, { authenticated: false })
  try {
    await fixture.page.goto(`${baseURL}/infracoes`)
    await fixture.page.waitForURL(`${baseURL}/login`)
    assert.equal(fixture.requests.length, 0)
    assert.deepEqual(fixture.errors, [])
  } finally { await fixture.context.close() }
  process.stdout.write('PASS infractions: non-admin direct URLs and sidebar access, unauthenticated redirect\n')
}

async function main() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ channel: process.env.KAIRO_BROWSER || 'msedge', headless: true })
  try {
    await checkLayout(browser, false)
    await checkLayout(browser, true)
    await checkStates(browser)
    await checkAccess(browser)
  } finally { await browser.close() }
}
main().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1 })
