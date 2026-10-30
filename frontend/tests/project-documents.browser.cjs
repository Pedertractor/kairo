const assert = require('node:assert/strict')
const { chromium } = require('playwright')

const baseURL = process.env.KAIRO_WEB_URL || 'http://127.0.0.1:5173'
const projectPath = '/teams/team/projects/project/documents'
const pdf = Buffer.from('%PDF-1.4\n%%EOF')
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1cAAAAASUVORK5CYII=', 'base64')

async function run(browser, mobile, role) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const errors = []
  const uploads = []
  let deletions = 0
  page.on('pageerror', error => errors.push(error.message))
  const document = (id, name, mimeType = 'application/pdf') => ({ id, originalName: name, mimeType, sizeBytes: 12,
    uploadedBy: { id: 'user', name: 'Pessoa Teste' }, createdAt: '2026-10-29T12:00:00Z' })
  const docs = [document('existing', 'Project file.pdf')]
  const project = { id: 'project', teamId: 'team', title: 'Projeto teste', description: null, status: 'TODO',
    createdById: 'user', estimatedHours: null, loggedSeconds: 0, integrationSource: null }
  const team = { id: 'team', name: 'Equipe teste', active: true, role, members: [], costCenters: [],
    membersCanDeleteCards: true, membersCanCreateProjects: true }
  await context.addInitScript(() => localStorage.setItem('kairo:token', 'fixture-token'))
  await context.route('**/api/**', async route => {
    const request = route.request()
    const endpoint = new URL(request.url()).pathname.split('/api')[1]
    let data
    if (endpoint === '/auth/me') data = { user: { id: 'user', name: 'Pessoa Teste', employeeId: '123', cardNumber: '123',
      unit: 'PEDERTRACTOR', role: 'ADMIN', active: true, hasTeams: true, hasOwnedTeams: true } }
    else if (endpoint === '/projects/project') data = { project }
    else if (endpoint === '/teams/team') data = { team }
    else if (endpoint === '/teams/team/projects') data = { projects: [project] }
    else if (endpoint === '/time-entries/active') data = { activeTimer: null }
    else if (endpoint === '/absences/unseen-count') data = { count: 0, absencesSeenAt: null }
    else if (endpoint.endsWith('/tasks')) data = { tasks: [] }
    else if (endpoint.endsWith('/tags')) data = { tags: [] }
    else if (endpoint === projectPath && request.method() === 'POST') {
      const body = request.postDataBuffer().toString()
      const isImage = body.includes('dropped.png')
      const doc = document(`upload-${uploads.length}`, isImage ? 'dropped.png' : 'selected.pdf', isImage ? 'image/png' : 'application/pdf')
      uploads.push(endpoint)
      docs.push(doc)
      data = { document: doc }
    } else if (endpoint === projectPath) data = { documents: docs }
    else if (endpoint.startsWith(`${projectPath}/`) && endpoint.endsWith('/file')) {
      const doc = docs.find(item => endpoint === `${projectPath}/${item.id}/file`)
      assert.ok(doc)
      return route.fulfill({ contentType: doc.mimeType, body: doc.mimeType === 'image/png' ? png : pdf })
    } else if (endpoint.startsWith(`${projectPath}/`) && request.method() === 'DELETE') {
      deletions++
      docs.splice(docs.findIndex(item => endpoint === `${projectPath}/${item.id}`), 1)
      data = { ok: true }
    } else if (endpoint === '/teams/team/documents') data = { documents: [document('team-doc', 'Team file.pdf')] }
    else {
      errors.push(`Unexpected API request: ${request.method()} ${endpoint}`)
      return route.fulfill({ status: 404, json: {} })
    }
    return route.fulfill({ json: { dados: data } })
  })
  try {
    await page.goto(`${baseURL}/projetos/project?tab=invalid&keep=1`)
    const tasksTab = page.getByRole('tab', { name: 'Tarefas', exact: true })
    await tasksTab.waitFor()
    assert.equal(await tasksTab.getAttribute('aria-selected'), 'true')
    await page.getByRole('tab', { name: 'Documentos', exact: true }).click()
    await page.getByText('Project file.pdf', { exact: true }).waitFor()
    assert.ok(page.url().includes('tab=documentos'))
    assert.ok(page.url().includes('keep=1'))
    await page.reload()
    await page.getByText('Project file.pdf', { exact: true }).waitFor()
    assert.equal(await page.getByRole('tab', { name: 'Documentos', exact: true }).getAttribute('aria-selected'), 'true')
    await page.getByText('Project file.pdf', { exact: true }).click()
    await page.getByRole('dialog').locator('iframe').waitFor()
    await page.keyboard.press('Escape')
    await page.locator('input[type=file]').setInputFiles({ name: 'selected.pdf', mimeType: 'application/pdf', buffer: pdf })
    await page.getByText('selected.pdf', { exact: true }).waitFor()
    const transfer = await page.evaluateHandle(bytes => {
      const transfer = new DataTransfer()
      transfer.items.add(new File([new Uint8Array(bytes)], 'dropped.png', { type: 'image/png' }))
      return transfer
    }, [...png])
    await page.getByRole('button', { name: /Arraste PDF ou imagens/ }).dispatchEvent('drop', { dataTransfer: transfer })
    await page.getByText('dropped.png', { exact: true }).waitFor()
    await page.getByText('dropped.png', { exact: true }).click()
    await page.getByRole('dialog').getByRole('img', { name: 'dropped.png' }).waitFor()
    await page.keyboard.press('Escape')
    assert.deepEqual(uploads, [projectPath, projectPath])
    if (role === 'ADMIN') {
      await page.getByRole('button', { name: 'Excluir selected.pdf', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
      assert.equal(deletions, 0)
      await page.getByRole('button', { name: 'Excluir selected.pdf', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }).click()
      await page.getByText('selected.pdf', { exact: true }).waitFor({ state: 'hidden' })
      assert.equal(deletions, 1)
    } else assert.equal(await page.getByRole('button', { name: /^Excluir / }).count(), 0)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    await page.goto(`${baseURL}/equipes/team?tab=documentos`)
    await page.getByText('Team file.pdf', { exact: true }).waitFor()
    assert.equal(await page.getByText('Project file.pdf', { exact: true }).count(), 0)
    assert.deepEqual(errors, [])
    process.stdout.write(`PASS project documents: ${mobile ? 'mobile' : 'desktop'} ${role}\n`)
  } finally { await context.close() }
}

async function main() {
  const browser = await chromium.launch({ channel: process.env.KAIRO_BROWSER || 'msedge', headless: true })
  try {
    for (const role of ['ADMIN', 'MEMBER']) for (const mobile of [false, true]) await run(browser, mobile, role)
  } finally { await browser.close() }
}
main().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1 })
