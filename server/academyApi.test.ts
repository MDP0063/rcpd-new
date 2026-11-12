import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { hashPassword } from './auth.ts';
import { getDefaultGranularPermissions } from './rolePermissions.ts';

const PASSWORD = 'Academy-http-test-password-123';

function makeAccount(uid: string, username: string, role: 'admin' | 'colonel' | 'officer') {
  const now = new Date().toISOString();
  return {
    uid, username, passwordHash: hashPassword(PASSWORD), sessionVersion: 0,
    isOnline: false, lastSeenIso: now,
    publicProfile: {
      uid, username, displayName: username, badgeNumber: uid, callsign: username,
      rank: role, role, clearanceLevel: 10, division: 'Academy HTTP test',
      whitelistStatus: 'whitelisted', isOnline: false, lastSeenIso: now, updatedIso: now
    },
    privateProfile: { uid, email: `${username}@example.test`, discordTag: '', steamHex: '', supervisorNotes: '' }
  };
}

function makeScopedAccount(uid: string, username: string, assignedCourseCodes: string[]) {
  const base = makeAccount(uid, username, 'officer');
  return {
    ...base,
    publicProfile: {
      ...base.publicProfile,
      granularPermissions: {
        ...getDefaultGranularPermissions('officer'),
        assignedCourseCodes,
        canGradeAssignedCourses: true
      }
    }
  };
}

async function unusedPort(): Promise<number> {
  const server = createNetServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('HTTP_TEST_PORT_UNAVAILABLE');
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function login(baseUrl: string, username: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD })
  });
  if (!response.ok) assert.fail(`login failed for ${username}: ${await response.text()}`);
  return (await response.json() as { token: string }).token;
}

test('Academy HTTP API enforces roles, ownership, revisions, publication and private-note isolation', { timeout: 60_000 }, async () => {
  const dataDirectory = await mkdtemp(path.join(tmpdir(), 'rcpd-academy-http-'));
  const port = await unusedPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let childOutput = '';
  let childError = '';

  const portalState = {
    version: 3,
    accounts: [
      makeAccount('academy-admin', 'AcademyAdmin', 'admin'),
      makeAccount('academy-colonel', 'AcademyColonel', 'colonel'),
      makeAccount('academy-officer', 'AcademyOfficer', 'officer'),
      makeAccount('academy-officer-2', 'AcademyOfficerTwo', 'officer'),
      makeScopedAccount('academy-scoped-officer', 'AcademyScopedOfficer', ['SCOPE-OPS-01'])
    ],
    applications: [],
    modules: [
      {
        id: 'existing-pdf-module', title: 'Existing PDF handbook', code: 'SOP-PDF-01',
        category: 'SOP & Policy', minClearance: 1, requiredRole: 'trainee', embedType: 'pdf_upload',
        contentMarkdown: '', externalUrl: '', pdfDataUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
        pdfFileName: 'legacy-handbook.pdf', interactiveCode: '', estimatedMinutes: 15,
        authorUid: 'academy-admin', updatedIso: new Date().toISOString()
      },
      {
        id: 'mod_default_sop01', title: 'Streifendienst, Eigensicherung & Funkdisziplin', code: 'SOP-01',
        category: 'SOP & Policy', minClearance: 1, requiredRole: 'trainee', embedType: 'document',
        contentMarkdown: 'Old sample content', externalUrl: '', pdfDataUrl: '', pdfFileName: '',
        interactiveCode: '', estimatedMinutes: 20, authorUid: 'academy-admin', updatedIso: new Date().toISOString()
      },
      {
        id: 'mod_default_pc102', title: 'California Penal Code & Eingriffsrecht im Vollzugsdienst', code: 'PC-102',
        category: 'California Penal Code', minClearance: 1, requiredRole: 'trainee', embedType: 'document',
        contentMarkdown: 'Old sample content', externalUrl: '', pdfDataUrl: '', pdfFileName: '',
        interactiveCode: '', estimatedMinutes: 25, authorUid: 'academy-admin', updatedIso: new Date().toISOString()
      }
    ],
    exams: [], progress: [], announcements: [], messages: [],
    requests: [], events: [], auditLogs: [], notifications: []
  };
  await writeFile(path.join(dataDirectory, 'portal-db-v3.json'), JSON.stringify(portalState));
  const runtimePreload = path.join(dataDirectory, 'runtime-preload.mjs');
  await writeFile(runtimePreload, [
    "import os from 'node:os';",
    "import { syncBuiltinESMExports } from 'node:module';",
    "os.userInfo = () => ({ username: 'academy-test', uid: -1, gid: -1, shell: null, homedir: process.cwd() });",
    'syncBuiltinESMExports();'
  ].join('\n'));

  const child = spawn(process.execPath, ['--import', pathToFileURL(runtimePreload).href, '--import', 'tsx', path.join(process.cwd(), 'server.ts')], {
    cwd: process.cwd(),
    env: {
      ...process.env, DATA_DIR: dataDirectory, PORT: String(port),
      SESSION_SECRET: 'academy-http-test-session-secret-is-at-least-32-bytes',
      NODE_ENV: 'production', STORAGE_BACKEND: 'json', ALLOWED_ORIGINS: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.setEncoding('utf8').on('data', data => { childOutput += data; });
  child.stderr.setEncoding('utf8').on('data', data => { childError += data; });

  try {
    let ready = false;
    let lastError = '';
    for (let attempt = 0; attempt < 150; attempt += 1) {
      if (child.exitCode !== null) break;
      try {
        if ((await fetch(`${baseUrl}/api/health`)).ok) { ready = true; break; }
      } catch (error) { lastError = String(error); }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, `server did not become ready: ${lastError}\n${childOutput}\n${childError}`);

    const admin = await login(baseUrl, 'AcademyAdmin');
    const colonel = await login(baseUrl, 'AcademyColonel');
    const officer = await login(baseUrl, 'AcademyOfficer');
    const officer2 = await login(baseUrl, 'AcademyOfficerTwo');
    const scopedOfficer = await login(baseUrl, 'AcademyScopedOfficer');
    const request = async (url: string, token?: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const response = await fetch(`${baseUrl}${url}`, { ...init, headers });
      const body = response.status === 204 ? null : await response.json();
      return { status: response.status, body: body as Record<string, any> | null };
    };
    const json = (body: unknown) => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    assert.equal((await request('/api/academy/courses')).status, 401);
    assert.equal((await request('/api/academy/courses', officer)).status, 200);
    assert.equal((await request('/api/academy/courses', officer, { method: 'POST', ...json({ code: 'NOPE', title: 'Nope' }) })).status, 403);

    assert.equal((await request('/api/academy/materials/categories')).status, 401);
    assert.equal((await request('/api/academy/materials/categories', officer)).status, 200);
    assert.equal((await request('/api/academy/materials/categories', officer, {
      method: 'POST', ...json({ name: 'Unauthorized category' })
    })).status, 403);

    const createdCategory = await request('/api/academy/materials/categories', admin, {
      method: 'POST', ...json({ name: 'SOP & Richtlinien', description: 'Verbindliche Vorgaben.' })
    });
    assert.equal(createdCategory.status, 201, JSON.stringify(createdCategory.body));
    const categoryId = createdCategory.body!.category.id as string;
    assert.equal(createdCategory.body!.category.createdByUid, 'academy-admin');
    const participantCategories = await request('/api/academy/materials/categories', officer);
    const participantCategory = participantCategories.body!.categories.find((item: { id: string }) => item.id === categoryId);
    assert.equal(participantCategory.name, 'SOP & Richtlinien');
    assert.equal(participantCategory.revision, 1);
    assert.equal('createdByUid' in participantCategory, false);
    assert.equal('updatedByUid' in participantCategory, false);
    assert.equal('archivedByUid' in participantCategory, false);
    assert.equal('createdIso' in participantCategory, false);

    const duplicateCategory = await request('/api/academy/materials/categories', colonel, {
      method: 'POST', ...json({ name: 'sop & RICHTLINIEN' })
    });
    assert.equal(duplicateCategory.status, 409);

    const renamedCategory = await request(`/api/academy/materials/categories/${categoryId}`, colonel, {
      method: 'PUT', ...json({ expectedRevision: 1, name: 'Dienstvorschriften', description: 'Aktualisierte Beschreibung.' })
    });
    assert.equal(renamedCategory.status, 200, JSON.stringify(renamedCategory.body));
    assert.equal(renamedCategory.body!.category.id, categoryId);
    assert.equal(renamedCategory.body!.category.revision, 2);

    const staleCategoryEdit = await request(`/api/academy/materials/categories/${categoryId}`, admin, {
      method: 'PUT', ...json({ expectedRevision: 1, name: 'Veraltete Änderung' })
    });
    assert.equal(staleCategoryEdit.status, 409);

    const archivedCategory = await request(`/api/academy/materials/categories/${categoryId}/archive`, admin, {
      method: 'POST', ...json({ expectedRevision: 2 })
    });
    assert.equal(archivedCategory.status, 200);
    assert.equal(archivedCategory.body!.category.status, 'archived');
    assert.equal(archivedCategory.body!.category.archivedByUid, 'academy-admin');

    const restoredCategory = await request(`/api/academy/materials/categories/${categoryId}/restore`, colonel, {
      method: 'POST', ...json({ expectedRevision: 3 })
    });
    assert.equal(restoredCategory.status, 200);
    assert.equal(restoredCategory.body!.category.status, 'active');
    assert.equal(restoredCategory.body!.category.id, categoryId);

    const deletedCategory = await request(`/api/academy/materials/categories/${categoryId}`, admin, {
      method: 'DELETE', ...json({ expectedRevision: 4 })
    });
    assert.equal(deletedCategory.status, 204);
    const categoryCatalogAfterDelete = await request('/api/academy/materials/categories', admin);
    assert.equal(categoryCatalogAfterDelete.body!.categories.some((item: { id: string }) => item.id === categoryId), false);

    assert.equal((await request('/api/academy/materials/document-types')).status, 401);
    assert.equal((await request('/api/academy/materials/document-types', officer)).status, 200);
    assert.equal((await request('/api/academy/materials/document-types', officer, {
      method: 'POST', ...json({ name: 'Unauthorized document type' })
    })).status, 403);

    const createdDocumentType = await request('/api/academy/materials/document-types', admin, {
      method: 'POST', ...json({ name: 'SOP / Standardverfahren', description: 'Verbindlicher Dokumenttyp.' })
    });
    assert.equal(createdDocumentType.status, 201, JSON.stringify(createdDocumentType.body));
    const documentTypeId = createdDocumentType.body!.documentType.id as string;
    assert.equal(createdDocumentType.body!.documentType.createdByUid, 'academy-admin');
    const participantDocumentTypes = await request('/api/academy/materials/document-types', officer);
    const participantDocumentType = participantDocumentTypes.body!.documentTypes.find((item: { id: string }) => item.id === documentTypeId);
    assert.equal(participantDocumentType.name, 'SOP / Standardverfahren');
    assert.equal(participantDocumentType.revision, 1);
    assert.equal('createdByUid' in participantDocumentType, false);
    assert.equal('updatedByUid' in participantDocumentType, false);
    assert.equal('archivedByUid' in participantDocumentType, false);
    assert.equal('createdIso' in participantDocumentType, false);

    const duplicateDocumentType = await request('/api/academy/materials/document-types', colonel, {
      method: 'POST', ...json({ name: 'sop / STANDARDVERFAHREN' })
    });
    assert.equal(duplicateDocumentType.status, 409);

    const renamedDocumentType = await request('/api/academy/materials/document-types/' + documentTypeId, colonel, {
      method: 'PUT', ...json({ expectedRevision: 1, name: 'Dienstanweisung', description: 'Aktualisierte Beschreibung.' })
    });
    assert.equal(renamedDocumentType.status, 200, JSON.stringify(renamedDocumentType.body));
    assert.equal(renamedDocumentType.body!.documentType.id, documentTypeId);
    assert.equal(renamedDocumentType.body!.documentType.revision, 2);

    const staleDocumentTypeEdit = await request('/api/academy/materials/document-types/' + documentTypeId, admin, {
      method: 'PUT', ...json({ expectedRevision: 1, name: 'Veraltete Änderung' })
    });
    assert.equal(staleDocumentTypeEdit.status, 409);

    const archivedDocumentType = await request('/api/academy/materials/document-types/' + documentTypeId + '/archive', admin, {
      method: 'POST', ...json({ expectedRevision: 2 })
    });
    assert.equal(archivedDocumentType.status, 200);
    assert.equal(archivedDocumentType.body!.documentType.status, 'archived');
    assert.equal(archivedDocumentType.body!.documentType.archivedByUid, 'academy-admin');

    const restoredDocumentType = await request('/api/academy/materials/document-types/' + documentTypeId + '/restore', colonel, {
      method: 'POST', ...json({ expectedRevision: 3 })
    });
    assert.equal(restoredDocumentType.status, 200);
    assert.equal(restoredDocumentType.body!.documentType.status, 'active');
    assert.equal(restoredDocumentType.body!.documentType.id, documentTypeId);

    const deletedDocumentType = await request('/api/academy/materials/document-types/' + documentTypeId, admin, {
      method: 'DELETE', ...json({ expectedRevision: 4 })
    });
    assert.equal(deletedDocumentType.status, 204);
    const documentTypeCatalogAfterDelete = await request('/api/academy/materials/document-types', admin);
    assert.equal(documentTypeCatalogAfterDelete.body!.documentTypes.some((item: { id: string }) => item.id === documentTypeId), false);

    assert.equal((await request('/api/academy/materials')).status, 401);
    assert.equal((await request('/api/academy/materials/catalog')).status, 401);
    assert.equal((await request('/api/academy/materials/catalog/unknown-material')).status, 401);
    assert.equal((await request('/api/academy/materials', officer)).status, 200);
    assert.equal((await request('/api/academy/materials', officer, {
      method: 'POST', ...json({ title: 'Unauthorized material' })
    })).status, 403);

    const materialCategory = await request('/api/academy/materials/categories', admin, {
      method: 'POST', ...json({ name: 'Operations – Materialtest' })
    });
    assert.equal(materialCategory.status, 201, JSON.stringify(materialCategory.body));
    const materialCategoryId = materialCategory.body!.category.id as string;
    const materialDocumentType = await request('/api/academy/materials/document-types', admin, {
      method: 'POST', ...json({ name: 'Handbuch – Materialtest' })
    });
    assert.equal(materialDocumentType.status, 201, JSON.stringify(materialDocumentType.body));
    const materialDocumentTypeId = materialDocumentType.body!.documentType.id as string;

    const materialCreated = await request('/api/academy/materials', admin, {
      method: 'POST',
      ...json({
        title: 'Operations Handbook',
        description: 'Erste veröffentlichbare Materialfassung.',
        categoryId: materialCategoryId,
        documentTypeId: materialDocumentTypeId,
        contentFormat: 'markdown',
        content: '# Operations\n\nErste Fassung.'
      })
    });
    assert.equal(materialCreated.status, 201, JSON.stringify(materialCreated.body));
    const materialId = materialCreated.body!.master.id as string;
    const materialCode = materialCreated.body!.master.code as string;
    assert.match(materialCode, /^MAT-\d{4}-[A-F0-9]{12}$/);
    assert.equal(materialCreated.body!.master.publicationStatus, 'draft');
    assert.equal(materialCreated.body!.draft.createdByUid, 'academy-admin');

    const materialList = await request('/api/academy/materials', admin);
    assert.equal(materialList.body!.materials.length, 1);
    assert.equal(materialList.body!.materials[0].draft.title, 'Operations Handbook');
    assert.equal(materialList.body!.materials[0].currentVersion, null);
    const unpublishedCatalog = await request('/api/academy/materials/catalog', officer);
    assert.equal(unpublishedCatalog.status, 200);
    assert.equal(unpublishedCatalog.body!.materials.length, 0, 'draft materials must never appear in the public catalog');

    const materialPublishedV1 = await request('/api/academy/materials/' + materialId + '/publish', admin, {
      method: 'POST', ...json({ expectedRevision: 1 })
    });
    assert.equal(materialPublishedV1.status, 201, JSON.stringify(materialPublishedV1.body));
    const materialVersion1Id = materialPublishedV1.body!.version.id as string;
    assert.equal(materialVersion1Id, materialId + '__v1');
    assert.equal(materialPublishedV1.body!.master.publicationStatus, 'published');
    const publicCatalogV1 = await request('/api/academy/materials/catalog', officer);
    assert.equal(publicCatalogV1.status, 200);
    assert.equal(publicCatalogV1.body!.materials.length, 1);
    assert.equal(publicCatalogV1.body!.materials[0].id, materialId);
    assert.equal(publicCatalogV1.body!.materials[0].title, 'Operations Handbook');
    assert.equal(publicCatalogV1.body!.materials[0].categoryName, 'Operations – Materialtest');
    assert.equal(publicCatalogV1.body!.materials[0].documentTypeName, 'Handbuch – Materialtest');
    assert.equal(publicCatalogV1.body!.materials[0].versionId, materialVersion1Id);
    const publicReaderV1 = await request('/api/academy/materials/catalog/' + materialId, officer);
    assert.equal(publicReaderV1.status, 200, JSON.stringify(publicReaderV1.body));
    assert.equal(publicReaderV1.body!.material.content, '# Operations\n\nErste Fassung.');
    assert.equal(publicReaderV1.body!.material.versionId, materialVersion1Id);
    assert.equal('publishedByUid' in publicReaderV1.body!.material, false, 'public reader must not expose audit UIDs');

    const materialDraftUpdated = await request('/api/academy/materials/' + materialId + '/draft', admin, {
      method: 'PUT',
      ...json({
        expectedRevision: 1,
        draft: {
          title: 'Operations Handbook – Revised',
          description: 'Zweite Entwurfsfassung.',
          categoryId: materialCategoryId,
          documentTypeId: materialDocumentTypeId,
          requiredRole: 'admin',
          contentFormat: 'markdown',
          content: '# Operations\n\nZweite Fassung.'
        }
      })
    });
    assert.equal(materialDraftUpdated.status, 200, JSON.stringify(materialDraftUpdated.body));
    assert.equal(materialDraftUpdated.body!.draft.workingRevision, 2);
    const materialAfterDraft = await request('/api/academy/materials/' + materialId, admin);
    assert.equal(materialAfterDraft.body!.master.currentPublishedVersionId, materialVersion1Id,
      'saving a draft must not change the current published version');
    assert.equal(materialAfterDraft.body!.currentVersion.content, '# Operations\n\nErste Fassung.');

    const readerWhileDraftChanged = await request('/api/academy/materials/catalog/' + materialId, officer);
    assert.equal(readerWhileDraftChanged.status, 200);
    assert.equal(readerWhileDraftChanged.body!.material.versionId, materialVersion1Id);
    assert.equal(readerWhileDraftChanged.body!.material.content, '# Operations\n\nErste Fassung.',
      'reader must continue to serve the last published version while a new draft is edited');

    const materialPublishedV2 = await request('/api/academy/materials/' + materialId + '/publish', admin, {
      method: 'POST', ...json({ expectedRevision: 2 })
    });
    assert.equal(materialPublishedV2.status, 201, JSON.stringify(materialPublishedV2.body));
    assert.equal(materialPublishedV2.body!.version.id, materialId + '__v2');
    const materialHistory = await request('/api/academy/materials/' + materialId, admin);
    assert.equal(materialHistory.body!.versions.length, 2);
    const materialHistoryOffset = await request('/api/academy/materials/' + materialId + '?offset=1', admin);
    assert.equal(materialHistoryOffset.status, 200);
    assert.deepEqual(materialHistoryOffset.body!.versions.map((item: { versionNumber: number }) => item.versionNumber), [1]);
    assert.equal((await request('/api/academy/materials/' + materialId + '?offset=-1', admin)).status, 400);
    assert.equal(materialHistory.body!.currentVersion.content, '# Operations\n\nZweite Fassung.');

    const restrictedCatalog = await request('/api/academy/materials/catalog', officer);
    assert.equal(restrictedCatalog.status, 200);
    assert.equal(restrictedCatalog.body!.materials.length, 0, 'rank-restricted material must be hidden from lower roles');
    const permittedCatalog = await request('/api/academy/materials/catalog', admin);
    assert.equal(permittedCatalog.body!.materials.length, 1);
    assert.equal(permittedCatalog.body!.materials[0].versionNumber, 2);
    assert.equal(permittedCatalog.body!.materials[0].title, 'Operations Handbook – Revised');
    const forbiddenPublicReader = await request('/api/academy/materials/catalog/' + materialId, officer);
    assert.equal(forbiddenPublicReader.status, 404);
    const publicReaderV2 = await request('/api/academy/materials/catalog/' + materialId, admin);
    assert.equal(publicReaderV2.status, 200);
    assert.equal(publicReaderV2.body!.material.content, '# Operations\n\nZweite Fassung.');
    assert.equal(publicReaderV2.body!.material.versionId, materialId + '__v2');

    const courseWithMaterial = await request('/api/academy/courses', admin, {
      method: 'POST',
      ...json({
        code: 'MAT-HTTP-01',
        title: 'Material reference course',
        summary: '',
        learningObjectives: [{ id: 'goal-material-1', description: 'Use a fixed material version.' }],
        chapters: [{
          id: 'chapter-material-1',
          title: 'Operations material',
          materialReferences: [{ materialId, materialVersionId: materialVersion1Id, title: 'Falscher Clienttitel', versionNumber: 99, required: true, order: 0 }],
          required: true,
          order: 0
        }],
        completionRequirements: [{
          id: 'req-material-course-chapter',
          type: 'required_chapter',
          targetId: 'chapter-material-1',
          required: true
        }]
      })
    });
    assert.equal(courseWithMaterial.status, 201, JSON.stringify(courseWithMaterial.body));
    const courseWithMaterialId = courseWithMaterial.body!.master.id as string;
    assert.equal(courseWithMaterial.body!.draft.chapters[0].materialReferences[0].title, 'Operations Handbook');
    assert.equal(courseWithMaterial.body!.draft.chapters[0].materialReferences[0].versionNumber, 1);
    const courseMaterialPublished = await request('/api/academy/courses/' + courseWithMaterialId + '/publish', admin, {
      method: 'POST', ...json({ expectedRevision: 1 })
    });
    assert.equal(courseMaterialPublished.status, 201, JSON.stringify(courseMaterialPublished.body));
    assert.equal(courseMaterialPublished.body!.version.chapters[0].materialReferences[0].materialVersionId, materialVersion1Id);
    assert.equal(courseMaterialPublished.body!.version.chapters[0].materialReferences[0].title, 'Operations Handbook');
    const enrichedCourseList = await request('/api/academy/courses', admin);
    const enrichedCourse = enrichedCourseList.body!.courses.find((item: { master: { id: string } }) => item.master.id === courseWithMaterialId);
    assert.equal(enrichedCourse.draft.chapters[0].materialReferences[0].title, 'Operations Handbook');
    assert.equal(typeof enrichedCourse.master.ownerUid, 'string');
    assert.equal(typeof enrichedCourse.version.publishedByUid, 'string');
    const participantCourseList = await request('/api/academy/courses', officer);
    const participantCourseListEntry = participantCourseList.body!.courses.find((item: { master: { id: string } }) => item.master.id === courseWithMaterialId);
    assert.equal('ownerUid' in participantCourseListEntry.master, false);
    assert.equal('archivedByUid' in participantCourseListEntry.master, false);
    assert.equal('archiveReason' in participantCourseListEntry.master, false);
    assert.equal('createdByUid' in participantCourseListEntry.version, false);
    assert.equal('publishedByUid' in participantCourseListEntry.version, false);
    const participantCourseDetail = await request('/api/academy/courses/' + courseWithMaterialId, officer);
    assert.equal(participantCourseDetail.status, 200);
    assert.equal('ownerUid' in participantCourseDetail.body!.master, false);
    assert.equal('publishedByUid' in participantCourseDetail.body!.version, false);
    assert.equal(enrichedCourse.draft.chapters[0].materialReferences[0].versionNumber, 1);

    const readerParticipation = await request('/api/academy/courses/' + courseWithMaterialId + '/participations', officer, { method: 'POST' });
    assert.equal(readerParticipation.status, 201, JSON.stringify(readerParticipation.body));
    const readerParticipationId = readerParticipation.body!.participation.id as string;
    const readerDetail = await request('/api/academy/participations/' + readerParticipationId, officer);
    assert.equal(readerDetail.status, 200, JSON.stringify(readerDetail.body));
    assert.equal(readerDetail.body!.materials[0].accessStatus, 'available');
    assert.equal(readerDetail.body!.materials[0].materialVersionId, materialVersion1Id);
    assert.equal('publishedByUid' in readerDetail.body!.version, false);
    assert.equal('createdByUid' in readerDetail.body!.version, false);
    const pinnedMaterialContent = await request(
      '/api/academy/participations/' + readerParticipationId + '/materials/' + materialId + '/versions/' + materialVersion1Id,
      officer
    );
    assert.equal(pinnedMaterialContent.status, 200, JSON.stringify(pinnedMaterialContent.body));
    assert.equal(pinnedMaterialContent.body!.material.content, '# Operations\n\nErste Fassung.');
    assert.equal('publishedByUid' in pinnedMaterialContent.body!.material, false, 'participant reader responses must not expose internal audit UIDs');
    const unpinnedMaterialContent = await request(
      '/api/academy/participations/' + readerParticipationId + '/materials/' + materialId + '/versions/' + materialId + '__v2',
      officer
    );
    assert.equal(unpinnedMaterialContent.status, 404, 'reader must reject a material version that is not pinned in this course version');
    const foreignParticipationContent = await request(
      '/api/academy/participations/' + readerParticipationId + '/materials/' + materialId + '/versions/' + materialVersion1Id,
      officer2
    );
    assert.equal(foreignParticipationContent.status, 404, 'reader must not disclose another participant’s pinned material');

    const courseWithInvalidMaterial = await request('/api/academy/courses', admin, {
      method: 'POST',
      ...json({
        code: 'MAT-HTTP-02',
        title: 'Invalid material reference course',
        summary: '',
        learningObjectives: [{ id: 'goal-material-2', description: 'Must reject unknown version.' }],
        chapters: [{
          id: 'chapter-material-2',
          title: 'Unknown material version',
          materialReferences: [{ materialId, materialVersionId: materialId + '__v999', required: true, order: 0 }],
          required: true,
          order: 0
        }],
        completionRequirements: [{
          id: 'req-invalid-material-chapter',
          type: 'required_chapter',
          targetId: 'chapter-material-2',
          required: true
        }]
      })
    });
    assert.equal(courseWithInvalidMaterial.status, 201, JSON.stringify(courseWithInvalidMaterial.body));
    const invalidCoursePublish = await request('/api/academy/courses/' + courseWithInvalidMaterial.body!.master.id + '/publish', admin, {
      method: 'POST', ...json({ expectedRevision: 1 })
    });
    assert.equal(invalidCoursePublish.status, 409);

    const unauthorizedMaterialArchive = await request('/api/academy/materials/' + materialId + '/archive', officer, {
      method: 'POST', ...json({ expectedRevision: 2, reason: 'Unauthorized archive attempt.' })
    });
    assert.equal(unauthorizedMaterialArchive.status, 403);
    const archivedMaterial = await request('/api/academy/materials/' + materialId + '/archive', admin, {
      method: 'POST', ...json({ expectedRevision: 2, reason: 'Material is replaced by a newer policy.' })
    });
    assert.equal(archivedMaterial.status, 200);
    const archivedPinnedMaterialContent = await request(
      '/api/academy/participations/' + readerParticipationId + '/materials/' + materialId + '/versions/' + materialVersion1Id,
      officer
    );
    assert.equal(archivedPinnedMaterialContent.status, 200, 'archiving a material must not break an existing pinned course version');
    assert.equal(archivedMaterial.body!.master.publicationStatus, 'archived');
    const catalogAfterArchive = await request('/api/academy/materials/catalog', admin);
    assert.equal(catalogAfterArchive.status, 200);
    assert.equal(catalogAfterArchive.body!.materials.some((item: { id: string }) => item.id === materialId), false,
      'archived materials must disappear from the public catalog');
    const publicReaderAfterArchive = await request('/api/academy/materials/catalog/' + materialId, admin);
    assert.equal(publicReaderAfterArchive.status, 404,
      'archived materials must not remain accessible through the public reader');
    assert.equal((await request('/api/academy/materials/' + materialId, admin)).body!.versions.length, 2);

    const scopeCourse = await request('/api/academy/courses', admin, {
      method: 'POST',
      ...json({
        code: 'SCOPE-OPS-01',
        title: 'Scoped operations course',
        summary: '',
        learningObjectives: [{ id: 'goal-scope-1', description: 'Work within assigned scope.' }],
        chapters: [],
        completionRequirements: []
      })
    });
    assert.equal(scopeCourse.status, 201, JSON.stringify(scopeCourse.body));

    const scopedMaterial = await request('/api/academy/materials', scopedOfficer, {
      method: 'POST',
      ...json({
        title: 'Scoped instructor material',
        categoryId: materialCategoryId,
        documentTypeId: materialDocumentTypeId,
        responsibleCourseCode: 'SCOPE-OPS-01',
        contentFormat: 'code',
        codeLanguage: 'typescript',
        content: 'const materialIsStoredOnly = true;'
      })
    });
    assert.equal(scopedMaterial.status, 201, JSON.stringify(scopedMaterial.body));
    assert.equal(scopedMaterial.body!.master.ownerUid, 'academy-scoped-officer');
    assert.equal(scopedMaterial.body!.master.responsibleCourseCode, 'SCOPE-OPS-01');
    assert.equal(scopedMaterial.body!.draft.createdByUid, 'academy-scoped-officer');

    const scopedMaterialList = await request('/api/academy/materials', scopedOfficer);
    assert.equal(scopedMaterialList.status, 200);
    assert.equal(scopedMaterialList.body!.materials.length, 1);
    assert.equal(scopedMaterialList.body!.materials[0].master.id, scopedMaterial.body!.master.id);

    const outOfScopeMaterial = await request('/api/academy/materials', scopedOfficer, {
      method: 'POST',
      ...json({
        title: 'Out of scope material',
        categoryId: materialCategoryId,
        documentTypeId: materialDocumentTypeId,
        responsibleCourseCode: 'OTHER-COURSE',
        contentFormat: 'markdown',
        content: 'Should be rejected.'
      })
    });
    assert.equal(outOfScopeMaterial.status, 403);

    const scopedMaterialPublished = await request('/api/academy/materials/' + scopedMaterial.body!.master.id + '/publish', scopedOfficer, {
      method: 'POST', ...json({ expectedRevision: 1 })
    });
    assert.equal(scopedMaterialPublished.status, 201, JSON.stringify(scopedMaterialPublished.body));
    assert.equal(scopedMaterialPublished.body!.version.publishedByUid, 'academy-scoped-officer');

    const scopedArchiveForbidden = await request('/api/academy/materials/' + scopedMaterial.body!.master.id + '/archive', scopedOfficer, {
      method: 'POST', ...json({ expectedRevision: 1, reason: 'Should not be allowed to archive.' })
    });
    assert.equal(scopedArchiveForbidden.status, 403);

    // Legacy library write routes must use the authenticated session, never a caller-supplied actorUid.
    const spoofedModuleCreate = await request('/api/academy/modules', officer, {
      method: 'POST',
      ...json({
        actorUid: 'academy-admin', title: 'Spoofed Module', code: 'SOP-LEGACY-01',
        category: 'SOP & Policy', requiredRole: 'trainee', embedType: 'pdf_upload',
        contentMarkdown: '', externalUrl: '', pdfDataUrl: '', pdfFileName: '',
        interactiveCode: '', estimatedMinutes: 15
      })
    });
    assert.equal(spoofedModuleCreate.status, 403);

    const blockedPdfCreate = await request('/api/academy/modules', admin, {
      method: 'POST',
      ...json({
        title: 'Blocked PDF Module', code: 'SOP-PDF-02',
        category: 'SOP & Policy', requiredRole: 'trainee', embedType: 'pdf_upload',
        contentMarkdown: '', externalUrl: '', pdfDataUrl: '', pdfFileName: '',
        interactiveCode: '', estimatedMinutes: 15
      })
    });
    assert.equal(blockedPdfCreate.status, 400);

    const blockedPdfPayload = await request('/api/academy/modules', admin, {
      method: 'POST',
      ...json({
        title: 'Blocked PDF Payload', code: 'SOP-PDF-03',
        category: 'SOP & Policy', requiredRole: 'trainee', embedType: 'document',
        contentMarkdown: '', externalUrl: '', pdfDataUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
        pdfFileName: 'new.pdf', interactiveCode: '', estimatedMinutes: 15
      })
    });
    assert.equal(blockedPdfPayload.status, 400);

    const existingPdf = await request('/api/academy/modules/existing-pdf-module/pdf', admin);
    assert.equal(existingPdf.status, 200, JSON.stringify(existingPdf.body));
    assert.equal(existingPdf.body!.pdfDataUrl, 'data:application/pdf;base64,JVBERi0xLjQK');
    const existingPdfMetadataEdit = await request('/api/academy/modules/existing-pdf-module', admin, {
      method: 'PUT',
      ...json({ title: 'Existing PDF handbook updated', pdfDataUrl: '' })
    });
    assert.equal(existingPdfMetadataEdit.status, 200, JSON.stringify(existingPdfMetadataEdit.body));
    const existingPdfAfterEdit = await request('/api/academy/modules/existing-pdf-module/pdf', admin);
    assert.equal(existingPdfAfterEdit.status, 200);
    assert.equal(existingPdfAfterEdit.body!.pdfDataUrl, 'data:application/pdf;base64,JVBERi0xLjQK');

    const legacyModule = await request('/api/academy/modules', admin, {
      method: 'POST',
      ...json({
        title: 'Session-bound Module', code: 'SOP-LEGACY-01',
        category: 'SOP & Policy', requiredRole: 'trainee', embedType: 'document',
        contentMarkdown: '', externalUrl: '', pdfDataUrl: '', pdfFileName: '',
        interactiveCode: '', estimatedMinutes: 15
      })
    });
    assert.equal(legacyModule.status, 200, JSON.stringify(legacyModule.body));
    assert.equal(legacyModule.body!.module.authorUid, 'academy-admin');
    const legacyModuleId = legacyModule.body!.module.id as string;

    // A scoped instructor cannot take over an out-of-scope legacy module by
    // changing its course code to an assigned code in the same update.
    const outOfScopeModule = await request('/api/academy/modules', admin, {
      method: 'POST',
      ...json({
        title: 'Out-of-scope legacy module', code: 'SOP-LEGACY-02',
        category: 'SOP & Policy', requiredRole: 'trainee', embedType: 'document',
        contentMarkdown: 'Original content', externalUrl: '', pdfDataUrl: '', pdfFileName: '',
        interactiveCode: '', estimatedMinutes: 15
      })
    });
    assert.equal(outOfScopeModule.status, 200, JSON.stringify(outOfScopeModule.body));
    const outOfScopeModuleId = outOfScopeModule.body!.module.id as string;
    const crossScopeModuleTakeover = await request(`/api/academy/modules/${outOfScopeModuleId}`, scopedOfficer, {
      method: 'PUT',
      ...json({ code: 'SCOPE-OPS-01', title: 'Unauthorized takeover' })
    });
    assert.equal(crossScopeModuleTakeover.status, 403, JSON.stringify(crossScopeModuleTakeover.body));
    const originalModuleAfterBlockedTakeover = await request(`/api/academy/modules/${outOfScopeModuleId}`, admin, {
      method: 'PUT',
      ...json({ title: 'Out-of-scope legacy module unchanged' })
    });
    assert.equal(originalModuleAfterBlockedTakeover.status, 200, JSON.stringify(originalModuleAfterBlockedTakeover.body));
    assert.equal(originalModuleAfterBlockedTakeover.body!.module.code, 'SOP-LEGACY-02');
    assert.equal(originalModuleAfterBlockedTakeover.body!.module.contentMarkdown, 'Original content');

    const spoofedModuleUpdate = await request(`/api/academy/modules/${legacyModuleId}`, admin, {
      method: 'PUT',
      ...json({ actorUid: 'academy-officer', title: 'Spoofed update' })
    });
    assert.equal(spoofedModuleUpdate.status, 403);

    const blockedPdfUpdate = await request(`/api/academy/modules/${legacyModuleId}`, admin, {
      method: 'PUT',
      ...json({ pdfDataUrl: 'data:application/pdf;base64,JVBERi0xLjQK' })
    });
    assert.equal(blockedPdfUpdate.status, 400);

    const sessionModuleUpdate = await request(`/api/academy/modules/${legacyModuleId}`, admin, {
      method: 'PUT',
      ...json({ title: 'Updated by authenticated administrator' })
    });
    assert.equal(sessionModuleUpdate.status, 200, JSON.stringify(sessionModuleUpdate.body));
    assert.equal(sessionModuleUpdate.body!.module.title, 'Updated by authenticated administrator');

    const spoofedModuleDelete = await request(`/api/academy/modules/${legacyModuleId}?actorUid=academy-officer`, admin, {
      method: 'DELETE'
    });
    assert.equal(spoofedModuleDelete.status, 403);

    const sessionModuleDelete = await request(`/api/academy/modules/${legacyModuleId}`, admin, {
      method: 'DELETE'
    });
    assert.equal(sessionModuleDelete.status, 200, JSON.stringify(sessionModuleDelete.body));
    assert.equal(sessionModuleDelete.body!.deleted, true);

    const retiredExampleIds = ['mod_default_sop01', 'mod_default_pc102'];
    const stateAfterRetirement = await request('/api/portal/state?uid=academy-admin', admin);
    assert.equal(stateAfterRetirement.status, 200, JSON.stringify(stateAfterRetirement.body));
    for (const retiredId of retiredExampleIds) {
      assert.equal(
        stateAfterRetirement.body!.modules.some((module: { id: string }) => module.id === retiredId),
        false,
        'retired sample material must not appear in the active catalog: ' + retiredId
      );
      const blockedEdit = await request('/api/academy/modules/' + retiredId, admin, {
        method: 'PUT', ...json({ title: 'Attempted legacy edit' })
      });
      assert.equal(blockedEdit.status, 409);
      assert.equal(blockedEdit.body!.error, 'LEGACY_EXAMPLE_MODULE_RETIRED');
      const blockedDelete = await request('/api/academy/modules/' + retiredId, admin, { method: 'DELETE' });
      assert.equal(blockedDelete.status, 409);
      assert.equal(blockedDelete.body!.error, 'LEGACY_EXAMPLE_MODULE_RETIRED');
    }

    const created = await request('/api/academy/courses', admin, {
      method: 'POST',
      ...json({
        code: 'SOP-HTTP-01', title: 'HTTP Academy Course', summary: 'Initial draft',
        learningObjectives: [{ id: 'objective-1', description: 'Understand the basic process.' }],
        chapters: [{ id: 'chapter-1', title: 'Introduction', materialReferences: [], required: true, order: 0 }],
        completionRequirements: [
          { id: 'req-chapter', type: 'required_chapter', targetId: 'chapter-1', required: true },
          { id: 'req-instructor', type: 'instructor_confirmation', targetId: 'practical-task-1', required: true },
          { id: 'req-assessment', type: 'required_assessment', targetId: 'exam-1', required: false }
        ]
      })
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const courseId = created.body!.master.id as string;
    assert.equal(created.body!.master.ownerUid, 'academy-admin');
    assert.equal(created.body!.draft.updatedByUid, 'academy-admin');
    const draftState = await request('/api/portal/state?uid=academy-admin', admin);
    assert.equal(draftState.status, 200);
    assert.equal(draftState.body!.recentPublicActivity.some((item: { title: string }) => item.title === 'SOP-HTTP-01'), false);

    const duplicateCode = await request('/api/academy/courses', colonel, {
      method: 'POST',
      ...json({ code: 'sop-http-01', title: 'Duplicate', learningObjectives: [], chapters: [], completionRequirements: [] })
    });
    assert.equal(duplicateCode.status, 409);

    const foreignDraftEdit = await request(`/api/academy/courses/${courseId}/draft`, colonel, {
      method: 'PUT',
      ...json({ expectedRevision: 1, draft: { title: 'Hijack', learningObjectives: [], chapters: [], completionRequirements: [] } })
    });
    assert.equal(foreignDraftEdit.status, 403);

    const saved = await request(`/api/academy/courses/${courseId}/draft`, admin, {
      method: 'PUT',
      ...json({
        expectedRevision: 1,
        draft: {
          title: 'HTTP Academy Course v2', summary: 'Saved draft',
          learningObjectives: [{ id: 'objective-1', description: 'Understand the updated process.' }],
          chapters: [{ id: 'chapter-1', title: 'Introduction', materialReferences: [], required: true, order: 0 }],
          completionRequirements: [
            { id: 'req-chapter', type: 'required_chapter', targetId: 'chapter-1', required: true },
            { id: 'req-instructor', type: 'instructor_confirmation', targetId: 'practical-task-1', required: true },
            { id: 'req-assessment', type: 'required_assessment', targetId: 'exam-1', required: false }
          ]
        }
      })
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body!.draft.workingRevision, 2);

    const conflict = await request(`/api/academy/courses/${courseId}/draft`, admin, {
      method: 'PUT',
      ...json({ expectedRevision: 1, draft: { title: 'Stale', learningObjectives: [], chapters: [], completionRequirements: [] } })
    });
    assert.equal(conflict.status, 409);

    const published = await request(`/api/academy/courses/${courseId}/publish`, admin, {
      method: 'POST', ...json({ expectedRevision: 2 })
    });
    assert.equal(published.status, 201, JSON.stringify(published.body));
    assert.equal(published.body!.version.versionNumber, 1);
    assert.equal(published.body!.master.publicationStatus, 'published');
    const publishedState = await request('/api/portal/state?uid=academy-officer', officer);
    assert.equal(publishedState.status, 200);
    assert.equal(publishedState.body!.recentPublicActivity.some((item: { title: string }) => item.title === 'SOP-HTTP-01'), true);

    const participantList = await request('/api/academy/courses', officer);
    assert.equal(participantList.status, 200);
    const participantCourse = participantList.body!.courses.find((item: { master: { id: string } }) => item.master.id === courseId);
    assert.ok(participantCourse, 'the specifically published course is visible to its participant');
    assert.equal(participantCourse.version.title, 'HTTP Academy Course v2');
    assert.equal(participantCourse.draft, null);

    const started = await request(`/api/academy/courses/${courseId}/participations`, officer, { method: 'POST' });
    assert.equal(started.status, 201, JSON.stringify(started.body));
    const participationId = started.body!.participation.id as string;
    assert.equal(started.body!.participation.userUid, 'academy-officer');
    assert.equal(started.body!.participation.courseVersionId, published.body!.version.id);
    assert.equal(started.body!.participation.status, 'in_progress');
    assert.equal((await request(`/api/academy/courses/${courseId}/participations`, officer)).status, 403);
    assert.equal((await request(`/api/academy/courses/${courseId}/participations`, admin)).status, 200);
    assert.equal((await request('/api/academy/participations', officer)).body!.participations.length, 2, 'the participant has the reader fixture plus this course participation');
    assert.equal((await request('/api/academy/participations', admin)).body!.participations.length, 0);
    assert.equal((await request(`/api/academy/courses/${courseId}/participations`, officer, { method: 'POST' })).status, 409);

    const completionCorrectionWithoutEvidence = await request(`/api/academy/participations/${participationId}/correction`, admin, {
      method: 'POST', ...json({
        expectedStatus: 'in_progress',
        correctedStatus: 'completed',
        reason: 'Attempt to complete without required evidence.'
      })
    });
    assert.equal(completionCorrectionWithoutEvidence.status, 409);
    assert.equal(completionCorrectionWithoutEvidence.body!.error, 'ACADEMY_COMPLETION_CORRECTION_EVIDENCE_INCOMPLETE');
    const unchangedParticipation = await request(`/api/academy/participations/${participationId}`, admin);
    assert.equal(unchangedParticipation.body!.participation.status, 'in_progress');
    assert.equal(unchangedParticipation.body!.corrections.length, 0);

    const blockedAssessment = await request(`/api/academy/participations/${participationId}/evidence`, officer, {
      method: 'POST', ...json({ requirementId: 'req-assessment' })
    });
    assert.equal(blockedAssessment.status, 409);
    const selfEvidence = await request(`/api/academy/participations/${participationId}/evidence`, officer, {
      method: 'POST', ...json({ requirementId: 'req-chapter' })
    });
    assert.equal(selfEvidence.status, 201, JSON.stringify(selfEvidence.body));
    assert.equal(selfEvidence.body!.participation.status, 'in_progress');
    const forbiddenInstructorEvidence = await request(`/api/academy/participations/${participationId}/evidence`, officer, {
      method: 'POST', ...json({ requirementId: 'req-instructor' })
    });
    assert.equal(forbiddenInstructorEvidence.status, 403);
    const instructorEvidence = await request(`/api/academy/participations/${participationId}/evidence`, admin, {
      method: 'POST', ...json({ requirementId: 'req-instructor', details: 'Practical task checked.' })
    });
    assert.equal(instructorEvidence.status, 201, JSON.stringify(instructorEvidence.body));
    assert.equal(instructorEvidence.body!.participation.status, 'completed');
    assert.ok(instructorEvidence.body!.participation.completedIso);

    const forbiddenCorrection = await request(`/api/academy/participations/${participationId}/correction`, colonel, {
      method: 'POST', ...json({ expectedStatus: 'completed', correctedStatus: 'in_progress', reason: 'Correction test reason' })
    });
    assert.equal(forbiddenCorrection.status, 403);
    const correctionWithoutInvalidation = await request(`/api/academy/participations/${participationId}/correction`, admin, {
      method: 'POST', ...json({
        expectedStatus: 'completed', correctedStatus: 'in_progress',
        reason: 'The completion was recorded in error.'
      })
    });
    assert.equal(correctionWithoutInvalidation.status, 409);
    const corrected = await request(`/api/academy/participations/${participationId}/correction`, admin, {
      method: 'POST', ...json({
        expectedStatus: 'completed', correctedStatus: 'in_progress',
        reason: 'The completion was recorded in error.',
        invalidatedEvidenceIds: [instructorEvidence.body!.evidence.id]
      })
    });
    assert.equal(corrected.status, 200, JSON.stringify(corrected.body));
    assert.equal(corrected.body!.participation.status, 'in_progress');
    assert.equal(corrected.body!.correction.previousStatus, 'completed');
    const correctedAgain = await request(`/api/academy/participations/${participationId}/correction`, admin, {
      method: 'POST', ...json({ expectedStatus: 'completed', correctedStatus: 'in_progress', reason: 'A stale correction request.' })
    });
    assert.equal(correctedAgain.status, 409);
    const replacementEvidence = await request(`/api/academy/participations/${participationId}/evidence`, admin, {
      method: 'POST', ...json({ requirementId: 'req-instructor', details: 'Practical task rechecked.' })
    });
    assert.equal(replacementEvidence.status, 201, JSON.stringify(replacementEvidence.body));
    assert.notEqual(replacementEvidence.body!.evidence.id, instructorEvidence.body!.evidence.id);
    assert.equal(replacementEvidence.body!.participation.status, 'completed');
    const detail = await request(`/api/academy/participations/${participationId}`, officer);
    assert.equal(detail.status, 200);
    assert.equal(detail.body!.evidence.length, 3);
    const participantSelfEvidence = detail.body!.evidence.find((item: { id: string }) => item.id === selfEvidence.body!.evidence.id);
    const participantInstructorEvidence = detail.body!.evidence.find((item: { id: string }) => item.id === replacementEvidence.body!.evidence.id);
    assert.equal('recordedByUid' in participantSelfEvidence, false, 'participants must not receive evidence actor UIDs');
    assert.equal(participantSelfEvidence.recordedByParticipant, true);
    assert.equal('recordedByUid' in participantInstructorEvidence, false, 'participants must not receive instructor actor UIDs');
    assert.equal(participantInstructorEvidence.recordedByParticipant, false);
    assert.equal(detail.body!.corrections.length, 1);
    assert.equal('reason' in detail.body!.corrections[0], false, 'participants must not receive internal correction reasons');
    assert.equal('actorUid' in detail.body!.corrections[0], false, 'participants must not receive correction actor UIDs');
    assert.deepEqual(detail.body!.corrections[0].invalidatedEvidenceIds, [instructorEvidence.body!.evidence.id]);

    const managerDetail = await request(`/api/academy/participations/${participationId}`, admin);
    assert.equal(managerDetail.status, 200);
    assert.equal(managerDetail.body!.corrections[0].reason, 'The completion was recorded in error.');
    assert.equal(typeof managerDetail.body!.corrections[0].actorUid, 'string');
    assert.equal(
      managerDetail.body!.evidence.find((item: { id: string }) => item.id === replacementEvidence.body!.evidence.id).recordedByUid,
      'academy-admin',
      'managers retain the original evidence actor UID for audit'
    );

    const createdProgram = await request('/api/academy/programs', admin, {
      method: 'POST',
      ...json({
        code: 'PROGRAM-HTTP-01', title: 'HTTP Program', summary: '',
        learningObjectives: [
          { id: 'p1', description: 'Objective one' },
          { id: 'p2', description: 'Objective two' },
          { id: 'p3', description: 'Objective three' }
        ],
        courseReferences: [{ courseId, requirement: 'required', order: 0 }]
      })
    });
    assert.equal(createdProgram.status, 201, JSON.stringify(createdProgram.body));
    const programId = createdProgram.body!.master.id as string;
    const publishedProgram = await request(`/api/academy/programs/${programId}/publish`, admin, {
      method: 'POST', ...json({ expectedRevision: 1 })
    });
    assert.equal(publishedProgram.status, 201, JSON.stringify(publishedProgram.body));

    const danglingProgram = await request('/api/academy/programs', admin, {
      method: 'POST',
      ...json({
        code: 'PROGRAM-DANGLING-REF',
        title: 'Program with missing course reference',
        summary: '',
        learningObjectives: [
          { id: 'dangling-p1', description: 'Objective one' },
          { id: 'dangling-p2', description: 'Objective two' },
          { id: 'dangling-p3', description: 'Objective three' }
        ],
        courseReferences: [{ courseId: 'course-does-not-exist', requirement: 'required', order: 0 }]
      })
    });
    assert.equal(danglingProgram.status, 201, JSON.stringify(danglingProgram.body));
    const danglingProgramId = danglingProgram.body!.master.id as string;
    const danglingPublish = await request(`/api/academy/programs/${danglingProgramId}/publish`, admin, {
      method: 'POST', ...json({ expectedRevision: 1 })
    });
    assert.equal(danglingPublish.status, 400);
    assert.equal(danglingPublish.body!.error, 'ACADEMY_PROGRAM_COURSE_REFERENCE_MISSING');
    assert.equal((await request(`/api/academy/programs/${danglingProgramId}`, admin)).body!.master.publicationStatus, 'draft');

    const managerProgramList = await request('/api/academy/programs', admin);
    const managerProgram = managerProgramList.body!.programs.find((item: { master: { id: string } }) => item.master.id === programId);
    assert.equal(typeof managerProgram.master.ownerUid, 'string');
    assert.equal(typeof managerProgram.version.publishedByUid, 'string');
    const participantProgramList = await request('/api/academy/programs', officer);
    const participantProgram = participantProgramList.body!.programs.find((item: { master: { id: string } }) => item.master.id === programId);
    assert.equal('ownerUid' in participantProgram.master, false);
    assert.equal('archivedByUid' in participantProgram.master, false);
    assert.equal('archiveReason' in participantProgram.master, false);
    assert.equal('publishedByUid' in participantProgram.version, false);
    const participantProgramDetail = await request('/api/academy/programs/' + programId, officer);
    assert.equal(participantProgramDetail.status, 200);
    assert.equal('ownerUid' in participantProgramDetail.body!.master, false);
    assert.equal('publishedByUid' in participantProgramDetail.body!.version, false);

    const programStarted = await request(`/api/academy/programs/${programId}/participations`, officer, { method: 'POST' });
    assert.equal(programStarted.status, 201, JSON.stringify(programStarted.body));
    assert.equal(programStarted.body!.participation.programVersionId, publishedProgram.body!.version.id);
    assert.equal(programStarted.body!.participation.requiredCoursePins.length, 1);
    assert.equal(programStarted.body!.participation.requiredCoursePins[0].courseVersionId, published.body!.version.id);
    assert.equal(programStarted.body!.participation.requiredCoursePins[0].courseParticipationId, participationId);
    assert.equal((await request('/api/academy/program-participations', officer)).body!.participations.length, 1);
    assert.equal((await request('/api/academy/program-participations', admin)).body!.participations.length, 0);
    const programDetail = await request(`/api/academy/program-participations/${programStarted.body!.participation.id}`, officer);
    assert.equal(programDetail.status, 200, JSON.stringify(programDetail.body));
    assert.equal(programDetail.body!.progress.requiredCourseCount, 1);
    assert.equal(programDetail.body!.progress.completedRequiredCourseCount, 1);
    assert.equal(programDetail.body!.progress.completionPercentage, 100);
    assert.equal(programDetail.body!.progress.status, 'completed');
    assert.equal('publishedByUid' in programDetail.body!.version, false);
    assert.equal('createdByUid' in programDetail.body!.version, false);
    assert.equal('publishedByUid' in programDetail.body!.requiredCourses[0].version, false);
    assert.equal((await request(`/api/academy/program-participations/${programStarted.body!.participation.id}`, admin)).status, 404);

    const optionalOnlyProgram = await request('/api/academy/programs', admin, {
      method: 'POST',
      ...json({
        code: 'PROGRAM-OPTIONAL-ONLY',
        title: 'Optional-only Program',
        summary: '',
        learningObjectives: [
          { id: 'optional-p1', description: 'Objective one' },
          { id: 'optional-p2', description: 'Objective two' },
          { id: 'optional-p3', description: 'Objective three' }
        ],
        courseReferences: [{ courseId, requirement: 'recommended', order: 0 }]
      })
    });
    assert.equal(optionalOnlyProgram.status, 201, JSON.stringify(optionalOnlyProgram.body));
    const optionalOnlyProgramId = optionalOnlyProgram.body!.master.id as string;
    const optionalOnlyPublished = await request(`/api/academy/programs/${optionalOnlyProgramId}/publish`, admin, {
      method: 'POST', ...json({ expectedRevision: 1 })
    });
    assert.equal(optionalOnlyPublished.status, 201, JSON.stringify(optionalOnlyPublished.body));
    const optionalOnlyStarted = await request(`/api/academy/programs/${optionalOnlyProgramId}/participations`, officer, { method: 'POST' });
    assert.equal(optionalOnlyStarted.status, 201, JSON.stringify(optionalOnlyStarted.body));
    const optionalOnlyDetail = await request(`/api/academy/program-participations/${optionalOnlyStarted.body!.participation.id}`, officer);
    assert.equal(optionalOnlyDetail.status, 200, JSON.stringify(optionalOnlyDetail.body));
    assert.equal(optionalOnlyDetail.body!.progress.requiredCourseCount, 0);
    assert.equal(optionalOnlyDetail.body!.progress.startedRequiredCourseCount, 0);
    assert.equal(optionalOnlyDetail.body!.progress.completedRequiredCourseCount, 0);
    assert.equal(optionalOnlyDetail.body!.progress.completionPercentage, 0);
    assert.equal(optionalOnlyDetail.body!.progress.status, 'not_started');
    assert.equal((await request(`/api/academy/programs/${programId}/participations`, officer, { method: 'POST' })).status, 409);

    const secondParticipantProgram = await request(`/api/academy/programs/${programId}/participations`, officer2, { method: 'POST' });
    assert.equal(secondParticipantProgram.status, 201, JSON.stringify(secondParticipantProgram.body));
    const secondParticipantProgramDetail = await request(`/api/academy/program-participations/${secondParticipantProgram.body!.participation.id}`, officer2);
    assert.equal(secondParticipantProgramDetail.status, 200, JSON.stringify(secondParticipantProgramDetail.body));
    assert.equal(secondParticipantProgramDetail.body!.progress.requiredCourseCount, 1);
    assert.equal(secondParticipantProgramDetail.body!.progress.startedRequiredCourseCount, 0);
    assert.equal(secondParticipantProgramDetail.body!.progress.completedRequiredCourseCount, 0);
    assert.equal(secondParticipantProgramDetail.body!.progress.completionPercentage, 0);
    assert.equal(secondParticipantProgramDetail.body!.progress.status, 'not_started');

    const secondParticipantCourseStart = await request(`/api/academy/courses/${courseId}/participations`, officer2, { method: 'POST' });
    assert.equal(secondParticipantCourseStart.status, 201, JSON.stringify(secondParticipantCourseStart.body));
    assert.equal(secondParticipantCourseStart.body!.participation.id, secondParticipantProgram.body!.participation.requiredCoursePins[0].courseParticipationId);
    const secondParticipantAfterCourseStart = await request(`/api/academy/program-participations/${secondParticipantProgram.body!.participation.id}`, officer2);
    assert.equal(secondParticipantAfterCourseStart.body!.progress.startedRequiredCourseCount, 1);
    assert.equal(secondParticipantAfterCourseStart.body!.progress.status, 'in_progress');

    const adminNote = await request('/api/academy/notes', admin, {
      method: 'POST',
      ...json({ ownerUid: 'academy-officer', materialId: 'manual-1', materialVersionId: 'manual-1__v1', kind: 'note', content: 'Admin private text' })
    });
    assert.equal(adminNote.status, 201, JSON.stringify(adminNote.body));
    assert.equal(adminNote.body!.note.ownerUid, 'academy-admin');

    const officerNote = await request('/api/academy/notes', officer, {
      method: 'POST',
      ...json({ materialId: 'manual-1', materialVersionId: 'manual-1__v1', kind: 'note', content: 'Officer private text' })
    });
    assert.equal(officerNote.status, 201, JSON.stringify(officerNote.body));
    const officerNoteId = officerNote.body!.note.id as string;
    assert.equal(officerNote.body!.note.revision, 1);
    const firstNoteEdit = await request(`/api/academy/notes/${officerNoteId}`, officer, {
      method: 'PUT', ...json({ expectedRevision: 1, content: 'Aktualisierte private Notiz' })
    });
    assert.equal(firstNoteEdit.status, 200, JSON.stringify(firstNoteEdit.body));
    assert.equal(firstNoteEdit.body!.note.revision, 2);
    const addSecondNoteSource = await request(`/api/academy/notes/${officerNoteId}`, officer, {
      method: 'PUT', ...json({
        expectedRevision: 2,
        sources: [
          { materialId: 'manual-1', materialVersionId: 'manual-1__v1' },
          { materialId: 'manual-2', materialVersionId: 'manual-2__v3' }
        ]
      })
    });
    assert.equal(addSecondNoteSource.status, 200, JSON.stringify(addSecondNoteSource.body));
    assert.equal(addSecondNoteSource.body!.note.revision, 3);
    assert.deepEqual(addSecondNoteSource.body!.note.sources, [
      { materialId: 'manual-1', materialVersionId: 'manual-1__v1' },
      { materialId: 'manual-2', materialVersionId: 'manual-2__v3' }
    ]);
    const editNoteWithoutSourcePayload = await request(`/api/academy/notes/${officerNoteId}`, officer, {
      method: 'PUT', ...json({ expectedRevision: 3, title: 'Mehrquellen-Notiz' })
    });
    assert.equal(editNoteWithoutSourcePayload.status, 200, JSON.stringify(editNoteWithoutSourcePayload.body));
    assert.equal(editNoteWithoutSourcePayload.body!.note.revision, 4);
    assert.deepEqual(editNoteWithoutSourcePayload.body!.note.sources, [
      { materialId: 'manual-1', materialVersionId: 'manual-1__v1' },
      { materialId: 'manual-2', materialVersionId: 'manual-2__v3' }
    ]);

    const duplicateNoteSource = await request(`/api/academy/notes/${officerNoteId}`, officer, {
      method: 'PUT', ...json({
        expectedRevision: 4,
        sources: [
          { materialId: 'manual-1', materialVersionId: 'manual-1__v1' },
          { materialId: 'manual-1', materialVersionId: 'manual-1__v1' }
        ]
      })
    });
    assert.equal(duplicateNoteSource.status, 400);

    const removeOriginalSource = await request(`/api/academy/notes/${officerNoteId}`, officer, {
      method: 'PUT', ...json({
        expectedRevision: 4,
        sources: [{ materialId: 'manual-2', materialVersionId: 'manual-2__v3' }]
      })
    });
    assert.equal(removeOriginalSource.status, 200, JSON.stringify(removeOriginalSource.body));
    assert.deepEqual(removeOriginalSource.body!.note.sources, [
      { materialId: 'manual-2', materialVersionId: 'manual-2__v3' }
    ]);
    assert.equal(removeOriginalSource.body!.note.materialId, 'manual-1');

    const sourceStatusNote = await request('/api/academy/notes', officer, {
      method: 'POST',
      ...json({
        materialId,
        materialVersionId: materialVersion1Id,
        kind: 'note',
        sources: [
          { materialId, materialVersionId: materialVersion1Id },
          { materialId, materialVersionId: materialPublishedV2.body!.version.id },
          { materialId, materialVersionId: materialId + '__v99' }
        ]
      })
    });
    assert.equal(sourceStatusNote.status, 201, JSON.stringify(sourceStatusNote.body));
    const sourceStatusNoteId = sourceStatusNote.body!.note.id as string;
    const sourceStatuses = await request(`/api/academy/notes/${sourceStatusNoteId}/source-status`, officer);
    assert.equal(sourceStatuses.status, 200, JSON.stringify(sourceStatuses.body));
    assert.deepEqual(sourceStatuses.body!.sources.map((source: { status: string }) => source.status), [
      'available', 'restricted', 'unavailable'
    ]);
    assert.equal('content' in sourceStatuses.body!.sources[0], false, 'source status must never return material content');
    assert.equal((await request(`/api/academy/notes/${sourceStatusNoteId}/source-status`)).status, 401);
    assert.equal((await request(`/api/academy/notes/${sourceStatusNoteId}/source-status`, admin)).status, 404,
      'another account must not inspect a private note source status');
    assert.equal((await request(`/api/academy/notes/${sourceStatusNoteId}`, officer, { method: 'DELETE' })).status, 204);

    const staleNoteEdit = await request(`/api/academy/notes/${officerNoteId}`, officer, {
      method: 'PUT', ...json({ expectedRevision: 1, content: 'Veralteter Schreibversuch' })
    });
    assert.equal(staleNoteEdit.status, 409);
    assert.equal((await request('/api/academy/notes', officer)).body!.notes[0].content, 'Aktualisierte private Notiz');

    const adminNotes = await request('/api/academy/notes', admin);
    assert.deepEqual(adminNotes.body!.notes.map((note: { ownerUid: string }) => note.ownerUid), ['academy-admin']);
    const officerNotes = await request('/api/academy/notes', officer);
    assert.deepEqual(officerNotes.body!.notes.map((note: { ownerUid: string }) => note.ownerUid), ['academy-officer']);
    assert.equal((await request(`/api/academy/notes/${officerNoteId}`, admin)).status, 404);
    assert.equal((await request(`/api/academy/notes/${officerNoteId}`, colonel)).status, 404);
    assert.equal((await request(`/api/academy/notes/${officerNoteId}`, officer)).status, 404);

    const updateForeignNote = await request(`/api/academy/notes/${officerNoteId}`, admin, {
      method: 'PUT', ...json({ content: 'Attempted admin read/write' })
    });
    assert.equal(updateForeignNote.status, 404);
    const deleteForeignNote = await request(`/api/academy/notes/${officerNoteId}`, admin, { method: 'DELETE' });
    assert.equal(deleteForeignNote.status, 404);
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await Promise.race([once(child, 'exit').then(() => undefined), new Promise(resolve => setTimeout(resolve, 1000))]);
      if (child.exitCode === null) {
        child.kill('SIGKILL');
        await Promise.race([once(child, 'exit').then(() => undefined), new Promise(resolve => setTimeout(resolve, 1000))]);
      }
    }
    await rm(dataDirectory, { recursive: true, force: true });
  }
});

test('fresh portal databases do not seed the retired legacy Academy sample materials', { timeout: 30_000 }, async () => {
  const dataDirectory = await mkdtemp(path.join(tmpdir(), 'rcpd-academy-fresh-'));
  const port = await unusedPort();
  const baseUrl = 'http://127.0.0.1:' + port;
  let childOutput = '';
  let childError = '';
  const runtimePreload = path.join(dataDirectory, 'runtime-preload.mjs');
  await writeFile(runtimePreload, [
    "import os from 'node:os';",
    "import { syncBuiltinESMExports } from 'node:module';",
    "os.userInfo = () => ({ username: 'academy-test', uid: -1, gid: -1, shell: null, homedir: process.cwd() });",
    'syncBuiltinESMExports();'
  ].join('\n'));
  const child = spawn(process.execPath, ['--import', pathToFileURL(runtimePreload).href, '--import', 'tsx', path.join(process.cwd(), 'server.ts')], {
    cwd: process.cwd(),
    env: {
      ...process.env, DATA_DIR: dataDirectory, PORT: String(port),
      SESSION_SECRET: 'academy-fresh-test-session-secret-is-at-least-32-bytes',
      ADMIN_INITIAL_PASSWORD: PASSWORD,
      NODE_ENV: 'production', STORAGE_BACKEND: 'json', ALLOWED_ORIGINS: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.setEncoding('utf8').on('data', data => { childOutput += data; });
  child.stderr.setEncoding('utf8').on('data', data => { childError += data; });
  try {
    let ready = false;
    let lastError = '';
    for (let attempt = 0; attempt < 150; attempt += 1) {
      if (child.exitCode !== null) break;
      try {
        if ((await fetch(baseUrl + '/api/health')).ok) { ready = true; break; }
      } catch (error) { lastError = String(error); }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, 'server did not become ready: ' + lastError + '\n' + childOutput + '\n' + childError);
    const admin = await login(baseUrl, 'Admin1');
    const response = await fetch(baseUrl + '/api/portal/state?uid=usr_admin_1', {
      headers: { Authorization: 'Bearer ' + admin }
    });
    assert.equal(response.status, 200);
    const state = await response.json() as { modules: Array<{ id: string }> };
    assert.deepEqual(state.modules, []);
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await Promise.race([once(child, 'exit').then(() => undefined), new Promise(resolve => setTimeout(resolve, 1000))]);
      if (child.exitCode === null) {
        child.kill('SIGKILL');
        await Promise.race([once(child, 'exit').then(() => undefined), new Promise(resolve => setTimeout(resolve, 1000))]);
      }
    }
    await rm(dataDirectory, { recursive: true, force: true });
  }
});