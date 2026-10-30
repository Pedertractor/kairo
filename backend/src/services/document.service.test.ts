import assert from 'node:assert/strict';
import { after, it } from 'node:test';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { PrismaClient } from '../generated/client.js';
import { DocumentRepository } from '../repositories/document.repository.js';
import type { TeamRepository } from '../repositories/team.repository.js';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';

const uploadRoot = await mkdtemp(path.join(tmpdir(), 'kairo-documents-'));
Object.assign(process.env, {
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  JWT_SECRET: 'document-tests-secret-at-least-32-characters',
  DEFAULT_PASSWORD: 'test', API_BASE_KEY: 'test', API_BASE_NAME_APPLICATION: 'test',
  UPLOAD_DIR: uploadRoot,
});
const { DocumentService } = await import('./document.service.js');
const { documentRoutes } = await import('../routes/document.route.js');
after(() => rm(uploadRoot, { recursive: true, force: true }));

function fixture(options: { role?: 'ADMIN' | 'MEMBER'; member?: boolean; active?: boolean; failStorageUpdate?: boolean } = {}) {
  const documents = [
    { id: 'team-doc', projectId: null },
    { id: 'project-doc', projectId: 'project' },
    { id: 'other-doc', projectId: 'other-project' },
  ].map(doc => ({ ...doc, teamId: 'team', originalName: 'file.pdf', mimeType: 'application/pdf',
    sizeBytes: 4, storageKey: `${doc.id}.pdf`, createdAt: new Date(), uploadedBy: { id: 'user', name: 'User' } }));
  const projects = [
    { id: 'project', teamId: 'team', type: 'PROJECT', deletedAt: null },
    { id: 'other-project', teamId: 'team', type: 'PROJECT', deletedAt: null },
    { id: 'deleted', teamId: 'team', type: 'PROJECT', deletedAt: new Date() },
    { id: 'foreign', teamId: 'another-team', type: 'PROJECT', deletedAt: null },
    { id: 'activity', teamId: 'team', type: 'ACTIVITY', deletedAt: null },
  ];
  const matches = (record: object, where: object) => Object.entries(where).every(([key, value]) => record[key as keyof typeof record] === value);
  const prisma = {
    teamMember: { findUnique: async () => options.member === false ? null : {
      role: options.role ?? 'ADMIN', team: { active: options.active ?? true },
    } },
    card: { findFirst: async ({ where }: { where: object }) => projects.find(p => matches(p, where)) ?? null },
    teamDocument: {
      findMany: async ({ where }: { where: object }) => documents.filter(d => matches(d, where)),
      findFirst: async ({ where }: { where: object }) => documents.find(d => matches(d, where)) ?? null,
      create: async ({ data }: { data: object }) => {
        const doc = { ...documents[0]!, ...data, id: `upload-${documents.length}` };
        documents.push(doc);
        return doc;
      },
      update: async ({ where, data }: { where: { id: string }; data: object }) => {
        if (options.failStorageUpdate) throw new Error('update failed');
        return Object.assign(documents.find(d => d.id === where.id)!, data);
      },
      delete: async ({ where }: { where: { id: string } }) => documents.splice(documents.findIndex(d => d.id === where.id), 1)[0],
    },
  } as unknown as PrismaClient;
  const teamRepository = { findMembershipByTeamAndUser: async () => options.member === false ? null : {
    role: options.role ?? 'ADMIN', team: { active: options.active ?? true },
  } } as unknown as TeamRepository;
  return { service: new DocumentService(new DocumentRepository(prisma), teamRepository), documents, prisma, teamRepository };
}

it('isolates collection, file and deletion lookups by team and project', async () => {
  const { service, documents } = fixture();
  assert.deepEqual((await service.list('team', 'user')).map(d => d.id), ['team-doc']);
  assert.deepEqual((await service.list('team', 'user', 'project')).map(d => d.id), ['project-doc']);
  for (const [id, scope] of [['project-doc', null], ['team-doc', 'project'], ['other-doc', 'project']] as const) {
    await assert.rejects(service.getFile('team', id, 'user', scope), { statusCode: 404 });
    await assert.rejects(service.delete('team', id, 'user', scope), { statusCode: 404 });
  }
  await assert.rejects(service.getFile('another-team', 'project-doc', 'user', 'project'), { statusCode: 404 });
  assert.equal(documents.length, 3);
  assert.equal((await service.getFile('team', 'project-doc', 'user', 'project')).mimeType, 'application/pdf');
});

for (const projectId of ['missing', 'deleted', 'foreign', 'activity']) {
  it(`denies every operation for ${projectId} project`, async () => {
    const { service } = fixture();
    await assert.rejects(service.list('team', 'user', projectId), { statusCode: 404 });
    await assert.rejects(service.getFile('team', 'project-doc', 'user', projectId), { statusCode: 404 });
    await assert.rejects(service.delete('team', 'project-doc', 'user', projectId), { statusCode: 404 });
    await assert.rejects(service.upload('team', 'user', file(), projectId), { statusCode: 404 });
  });
}

function file() { return { filename: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF') }; }

for (const options of [{ member: false }, { active: false }]) {
  it(`denies operations without active membership: ${JSON.stringify(options)}`, async () => {
    const { service } = fixture(options);
    await assert.rejects(service.list('team', 'user', 'project'), { statusCode: 404 });
    await assert.rejects(service.getFile('team', 'project-doc', 'user', 'project'), { statusCode: 404 });
    await assert.rejects(service.upload('team', 'user', file(), 'project'), { statusCode: 404 });
    await assert.rejects(service.delete('team', 'project-doc', 'user', 'project'), { statusCode: 404 });
  });
}

it('members can upload and view; only team admins can delete', async () => {
  const { service } = fixture({ role: 'MEMBER' });
  const doc = await service.upload('team', 'user', file(), 'project');
  const stored = await service.getFile('team', doc.id, 'user', 'project');
  assert.equal(stored.storageKey, `teams/team/projects/project/${doc.id}.pdf`);
  assert.deepEqual(await readFile(path.join(uploadRoot, stored.storageKey)), file().buffer);
  await assert.rejects(service.delete('team', doc.id, 'user', 'project'), { statusCode: 403 });
  const admin = fixture();
  await admin.service.delete('team', 'project-doc', 'user', 'project');
  assert.equal(admin.documents.some(d => d.id === 'project-doc'), false);
});

it('preserves team-level upload paths', async () => {
  const { service } = fixture();
  const doc = await service.upload('team', 'user', file());
  assert.equal((await service.getFile('team', doc.id, 'user')).storageKey, `teams/team/${doc.id}.pdf`);
});

it('rejects unsupported, empty and oversized uploads before creating records', async () => {
  const { service, documents } = fixture();
  for (const invalid of [
    { ...file(), filename: 'test.exe', mimetype: 'application/octet-stream' },
    { ...file(), buffer: Buffer.alloc(0) },
    { ...file(), buffer: Buffer.alloc(10 * 1024 * 1024 + 1) },
  ]) await assert.rejects(service.upload('team', 'user', invalid, 'project'), { statusCode: 400 });
  assert.equal(documents.length, 3);
});

it('removes the record and stored file if storage-key persistence fails', async () => {
  const { service, documents } = fixture({ failStorageUpdate: true });
  await assert.rejects(service.upload('team', 'user', file(), 'project'), /update failed/);
  assert.equal(documents.length, 3);
  await assert.rejects(access(path.join(uploadRoot, 'teams/team/projects/project/upload-3.pdf')));
});

it('routes project uploads, listing, streaming and deletion through the project scope', async () => {
  const { prisma } = fixture();
  const app = Fastify();
  app.decorate('prisma', prisma);
  app.decorate('authenticate', async (request: { user: { sub: string } }) => {
    request.user = { sub: 'user' };
  });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(documentRoutes);
  const url = '/teams/team/projects/project/documents';
  try {
    const upload = await app.inject({ method: 'POST', url,
      headers: { 'content-type': 'multipart/form-data; boundary=test-boundary' },
      payload: '--test-boundary\r\nContent-Disposition: form-data; name="file"; filename="route.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF\r\n--test-boundary--\r\n',
    });
    assert.equal(upload.statusCode, 201, upload.body);
    const doc = upload.json().dados.document;
    const list = await app.inject({ method: 'GET', url });
    assert.deepEqual(list.json().dados.documents.map((d: { id: string }) => d.id), ['project-doc', doc.id]);
    const teamList = await app.inject({ method: 'GET', url: '/teams/team/documents' });
    assert.deepEqual(teamList.json().dados.documents.map((d: { id: string }) => d.id), ['team-doc']);
    const stream = await app.inject({ method: 'GET', url: `${url}/${doc.id}/file` });
    assert.equal(stream.statusCode, 200);
    assert.equal(stream.body, '%PDF');
    assert.match(String(stream.headers['content-disposition']), /inline/);
    const wrongScope = await app.inject({ method: 'GET', url: `/teams/team/documents/${doc.id}/file` });
    assert.equal(wrongScope.statusCode, 404);
    const deletion = await app.inject({ method: 'DELETE', url: `${url}/${doc.id}` });
    assert.equal(deletion.statusCode, 200);
    const missing = await app.inject({ method: 'GET', url: `${url}/${doc.id}/file` });
    assert.equal(missing.statusCode, 404);
  } finally { await app.close(); }
});
