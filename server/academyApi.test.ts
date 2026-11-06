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
      makeAccount('academy-officer-2', 'AcademyOfficerTwo', 'officer')
    ],
    applications: [], modules: [], exams: [], progress: [], announcements: [], messages: [],
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
    assert.equal(participantList.body!.courses.length, 1);
    assert.equal(participantList.body!.courses[0].version.title, 'HTTP Academy Course v2');
    assert.equal(participantList.body!.courses[0].draft, null);

    const started = await request(`/api/academy/courses/${courseId}/participations`, officer, { method: 'POST' });
    assert.equal(started.status, 201, JSON.stringify(started.body));
    const participationId = started.body!.participation.id as string;
    assert.equal(started.body!.participation.userUid, 'academy-officer');
    assert.equal(started.body!.participation.courseVersionId, published.body!.version.id);
    assert.equal(started.body!.participation.status, 'in_progress');
    assert.equal((await request(`/api/academy/courses/${courseId}/participations`, officer)).status, 403);
    assert.equal((await request(`/api/academy/courses/${courseId}/participations`, admin)).status, 200);
    assert.equal((await request('/api/academy/participations', officer)).body!.participations.length, 1);
    assert.equal((await request('/api/academy/participations', admin)).body!.participations.length, 0);
    assert.equal((await request(`/api/academy/courses/${courseId}/participations`, officer, { method: 'POST' })).status, 409);

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
    assert.equal(detail.body!.corrections.length, 1);

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
    assert.equal((await request(`/api/academy/program-participations/${programStarted.body!.participation.id}`, admin)).status, 404);
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
