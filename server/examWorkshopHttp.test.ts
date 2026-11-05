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
import { EXAM_COLLECTIONS } from './examRepositoryTypes.ts';
import { getDefaultGranularPermissions } from './rolePermissions.ts';

const TEST_PASSWORD = 'Exam-http-test-password-123';
const TEST_EXAM_ID = 'http-workshop-exam';

function makeAccount(uid: string, username: string, role: 'admin' | 'officer', permissions?: ReturnType<typeof getDefaultGranularPermissions>) {
  const nowIso = new Date().toISOString();
  return {
    uid,
    username,
    passwordHash: hashPassword(TEST_PASSWORD),
    sessionVersion: 0,
    isOnline: false,
    lastSeenIso: nowIso,
    publicProfile: {
      uid,
      username,
      displayName: username,
      badgeNumber: uid,
      callsign: username,
      rank: role === 'admin' ? 'Chief' : 'Officer',
      role,
      clearanceLevel: 10,
      division: 'HTTP test fixture',
      whitelistStatus: 'whitelisted',
      granularPermissions: permissions || getDefaultGranularPermissions(role),
      isOnline: false,
      lastSeenIso: nowIso,
      updatedIso: nowIso
    },
    privateProfile: {
      uid,
      email: `${username}@example.test`,
      discordTag: '',
      steamHex: '',
      supervisorNotes: ''
    }
  };
}

function makeMaster() {
  return {
    id: TEST_EXAM_ID,
    title: 'HTTP Lösungsschlüsseltest',
    moduleCode: 'SOP-01',
    assignedCourseCodes: ['SOP-01'],
    assessmentStage: 'test',
    status: 'published',
    minClearance: 1,
    passingScoreBasisPoints: 7500,
    timeLimitMinutes: 20,
    maxAttempts: null,
    prerequisites: [],
    examFormat: 'structured_quiz',
    isLegacyFormat: false,
    startable: true,
    authorUid: 'http-admin',
    updatedIso: '2026-11-05T12:00:00.000Z',
    latestVersionNumber: 1,
    currentPublishedVersionId: `${TEST_EXAM_ID}__v1`,
    workingRevision: 1,
    questions: [
      {
        id: 'http-single', type: 'single_choice', question: 'Single-Frage', pointsMilli: 1000,
        options: [{ id: 'single-right', text: 'Single richtig' }, { id: 'single-wrong', text: 'Single falsch' }],
        correctOptionId: 'single-right', legacyCorrectIndex: 0, explanation: 'Single intern'
      },
      {
        id: 'http-multiple', type: 'multiple_choice', question: 'Multiple-Frage', pointsMilli: 2000,
        options: [{ id: 'multiple-right-a', text: 'Multiple A' }, { id: 'multiple-right-b', text: 'Multiple B' }, { id: 'multiple-wrong', text: 'Multiple C' }],
        correctOptionIds: ['multiple-right-a', 'multiple-right-b'], explanation: 'Multiple intern'
      },
      {
        id: 'http-boolean', type: 'true_false', question: 'Wahr/Falsch-Frage', pointsMilli: 1000,
        correctBoolean: true, explanation: 'Wahr/Falsch intern'
      },
      {
        id: 'http-matching', type: 'matching', question: 'Matching-Frage', pointsMilli: 3000,
        matchingPairs: [
          { id: 'pair-a', prompt: 'Begriff A', targetId: 'target-a', targetText: 'Ziel A' },
          { id: 'pair-b', prompt: 'Begriff B', targetId: 'target-b', targetText: 'Ziel B' },
          { id: 'pair-c', prompt: 'Begriff C', targetId: 'target-c', targetText: 'Ziel C' }
        ], explanation: 'Matching intern'
      },
      {
        id: 'http-free-text', type: 'free_text', question: 'Freitext-Frage', pointsMilli: 4000,
        gradingRubric: 'Nur für Prüfer sichtbare Rubrik', maxAnswerLength: 1000,
        explanation: 'Freitext intern'
      }
    ]
  };
}

async function unusedPort(): Promise<number> {
  const server = createNetServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('HTTP_TEST_PORT_UNAVAILABLE');
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function login(baseUrl: string, username: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: TEST_PASSWORD })
  });
  if (!response.ok) assert.fail(`login failed for ${username}: ${await response.text()}`);
  return await response.json() as { token: string };
}

test('HTTP: Werkstatt-Master schützt Lösungsschlüssel für Delegierte, erhält sie für Admins und sperrt Unberechtigte', { timeout: 60_000 }, async () => {
  const dataDirectory = await mkdtemp(path.join(tmpdir(), 'rcpd-exam-workshop-http-'));
  const port = await unusedPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const master = makeMaster();
  let childOutput = '';
  let childError = '';

  const delegatePermissions = getDefaultGranularPermissions('officer');
  delegatePermissions.examWorkshop = {
    hasAccess: true,
    canRequestAccess: false,
    tests: { canView: true, canCreate: false, canEdit: false, canUpdateExisting: true },
    finalExams: { canView: false, canCreate: false, canEdit: false, canUpdateExisting: false },
    publication: {
      newTestsRequireApproval: false,
      newFinalExamsRequireApproval: false,
      testUpdatesRequireApproval: false,
      finalExamUpdatesRequireApproval: false
    },
    lockedUpdateExamIds: []
  };
  delegatePermissions.canGradeAssignedCourses = true;
  delegatePermissions.assignedCourseCodes = ['SOP-01'];
  const otherCoursePermissions = getDefaultGranularPermissions('officer');
  otherCoursePermissions.canGradeAssignedCourses = true;
  otherCoursePermissions.assignedCourseCodes = ['LAW-02'];
  const courseReviewerPermissions = getDefaultGranularPermissions('officer');
  courseReviewerPermissions.canGradeAssignedCourses = true;
  courseReviewerPermissions.assignedCourseCodes = ['SOP-01'];
  const portalState = {
    version: 3,
    accounts: [
      makeAccount('http-admin', 'HttpAdmin', 'admin'),
      makeAccount('http-delegate', 'HttpDelegate', 'officer', delegatePermissions),
      makeAccount('http-other-course', 'HttpOtherCourse', 'officer', otherCoursePermissions),
      makeAccount('http-course-reviewer', 'HttpCourseReviewer', 'officer', courseReviewerPermissions),
      makeAccount('http-unauthorized', 'HttpUnauthorized', 'officer')
    ],
    applications: [], modules: [], exams: [], progress: [], announcements: [], messages: [],
    requests: [], events: [], auditLogs: [], notifications: []
  };
  const collections = Object.fromEntries(EXAM_COLLECTIONS.map(name => [name, {}])) as Record<string, Record<string, unknown>>;
  collections.exam_masters[`doc:${encodeURIComponent(TEST_EXAM_ID)}`] = master;
  const versionId = `${TEST_EXAM_ID}__v1`;
  collections.exam_versions[`doc:${encodeURIComponent(versionId)}`] = {
    id: versionId, examId: TEST_EXAM_ID, versionNumber: 1, title: master.title,
    assessmentStage: 'test', timeLimitMinutes: 20, passingScoreBasisPoints: 7500, minClearance: 1,
    questionsSnapshot: master.questions
  };
  collections.exam_attempts['doc:http-review-attempt'] = {
    id: 'http-review-attempt', userId: 'http-delegate', userName: 'HttpDelegate', examId: TEST_EXAM_ID,
    examVersionId: versionId, versionNumber: 1, attemptCourseCode: 'SOP-01', assessmentStage: 'test',
    attemptNumber: 1, startedAtIso: '2026-11-05T11:00:00.000Z', submittedAtIso: '2026-11-05T11:20:00.000Z',
    status: 'pending_review', answers: { 'http-free-text': 'Meine HTTP Antwort' }, questionGrades: [],
    matchingShuffleOrders: {}, totalPossiblePointsMilli: 11000, automaticallyEarnedPointsMilli: 0,
    manuallyEarnedPointsMilli: 0, preliminaryScoreBasisPoints: 0, finalScoreBasisPoints: null
  };
  await writeFile(path.join(dataDirectory, 'portal-db-v3.json'), JSON.stringify(portalState));
  await writeFile(path.join(dataDirectory, 'exam-db-v1.json'), JSON.stringify({ version: 1, maintenanceMode: false, collections }));
  // Keep the child TSX runtime independent of host account lookup in locked-down test environments.
  const runtimePreload = path.join(dataDirectory, 'runtime-preload.mjs');
  await writeFile(runtimePreload, [
    "import os from 'node:os';",
    "import { syncBuiltinESMExports } from 'node:module';",
    "os.userInfo = () => ({ username: 'http-test', uid: -1, gid: -1, shell: null, homedir: process.cwd() });",
    'syncBuiltinESMExports();'
  ].join('\n'));

  const child = spawn(process.execPath, ['--import', pathToFileURL(runtimePreload).href, '--import', 'tsx', path.join(process.cwd(), 'server.ts')], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATA_DIR: dataDirectory,
      PORT: String(port),
      SESSION_SECRET: 'http-test-session-secret-is-at-least-32-bytes-long',
      NODE_ENV: 'production',
      STORAGE_BACKEND: 'json',
      ALLOWED_ORIGINS: ''
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
        const health = await fetch(`${baseUrl}/api/health`);
        if (health.ok) { ready = true; break; }
      } catch (error) {
        lastError = String(error);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, `server did not become ready: ${lastError}\n${childOutput}\n${childError}`);

    const delegate = await login(baseUrl, 'HttpDelegate');
    const admin = await login(baseUrl, 'HttpAdmin');
    const otherCourse = await login(baseUrl, 'HttpOtherCourse');
    const courseReviewer = await login(baseUrl, 'HttpCourseReviewer');
    const unauthorized = await login(baseUrl, 'HttpUnauthorized');
    const jsonRequest = async (url: string, token?: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const response = await fetch(`${baseUrl}${url}`, { ...init, headers });
      return { status: response.status, body: await response.json() as Record<string, any> };
    };

    const listResponse = await jsonRequest('/api/workshop/exams', delegate.token);
    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.body.exams.length, 1);
    const listExam = listResponse.body.exams[0];
    const detailResponse = await jsonRequest(`/api/workshop/exams/${TEST_EXAM_ID}`, delegate.token);
    assert.equal(detailResponse.status, 200);
    const detailExam = detailResponse.body.exam;
    assert.deepEqual(new Set(listExam.questions[3].matchingPairs.map((pair: { id: string }) => pair.id)), new Set(detailExam.questions[3].matchingPairs.map((pair: { id: string }) => pair.id)));
    assert.deepEqual(new Set(listExam.questions[3].matchingTargets.map((target: { id: string }) => target.id)), new Set(detailExam.questions[3].matchingTargets.map((target: { id: string }) => target.id)));

    const reviewQueue = await jsonRequest('/api/academy/exam-reviews', delegate.token);
    assert.equal(reviewQueue.status, 200, JSON.stringify(reviewQueue.body));
    assert.equal(reviewQueue.body.reviews.length, 1);
    assert.equal(reviewQueue.body.reviews[0].questions[0].answer, 'Meine HTTP Antwort');
    assert.equal(reviewQueue.body.reviews[0].questions[0].gradingRubric, 'Nur für Prüfer sichtbare Rubrik');
    for (const key of ['correctOptionId', 'correctOptionIds', 'correctBoolean', 'targetId', 'internalScore']) {
      assert.equal(JSON.stringify(reviewQueue.body).includes(key), false, `review queue leaked ${key}`);
    }
    const selfGradeResponse = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/grade`, delegate.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grades: [{ questionId: 'http-free-text', pointsEarnedMilli: 3000 }] })
    });
    assert.equal(selfGradeResponse.status, 403, JSON.stringify(selfGradeResponse.body));
    assert.match(selfGradeResponse.body.error, /eigenen Prüfungsversuch/);
    assert.equal((await jsonRequest('/api/academy/exam-reviews', delegate.token)).body.reviews.length, 1);

    const gradeResponse = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/grade`, courseReviewer.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grades: [{ questionId: 'http-free-text', pointsEarnedMilli: 3000 }] })
    });
    assert.equal(gradeResponse.status, 200, JSON.stringify(gradeResponse.body));
    assert.equal(gradeResponse.body.submission.status, 'failed');
    assert.equal((await jsonRequest('/api/academy/exam-reviews', delegate.token)).body.reviews.length, 0);
    const ownResults = await jsonRequest('/api/academy/exam-results', delegate.token);
    assert.equal(ownResults.status, 200);
    assert.equal(ownResults.body.results.length, 1);
    assert.equal(JSON.stringify(ownResults.body.results).includes('gradingRubric'), false);
    assert.equal(JSON.stringify(ownResults.body.results).includes('Meine HTTP Antwort'), false);
    assert.deepEqual((await jsonRequest('/api/academy/exam-results', admin.token)).body.results, []);
    const foreignScopedQueue = await jsonRequest('/api/academy/exam-reviews', otherCourse.token);
    assert.equal(foreignScopedQueue.status, 200);
    assert.deepEqual(foreignScopedQueue.body.reviews, []);
    assert.equal((await jsonRequest('/api/academy/exam-results?uid=http-admin', delegate.token)).status, 403);

    const startResponse = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/start`, delegate.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptCourseCode: 'SOP-01' })
    });
    assert.equal(startResponse.status, 201, JSON.stringify(startResponse.body));
    const publicAttempt = startResponse.body.attempt;
    const publicMatching = publicAttempt.questions.find((question: { type: string }) => question.type === 'matching');
    assert.equal(publicMatching.pairs.some((pair: { id: string }) => ['pair-a', 'pair-b', 'pair-c'].includes(pair.id)), false);
    assert.equal(publicMatching.targets.some((target: { id: string }) => ['target-a', 'target-b', 'target-c'].includes(target.id)), false);
    assert.equal('matchingShuffleOrders' in publicAttempt, false);
    const matchingAnswers = (master.questions[3] as any).matchingPairs.map((pair: any) => ({
      pairId: publicMatching.pairs.find((item: { prompt: string }) => item.prompt === pair.prompt).id,
      targetId: publicMatching.targets.find((item: { text: string }) => item.text === pair.targetText).id
    }));
    const autosaveResponse = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/${publicAttempt.id}/autosave`, delegate.token, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision: 1, answers: {
        'http-single': 'single-right',
        'http-multiple': ['multiple-right-a', 'multiple-right-b'],
        'http-boolean': true,
        'http-matching': matchingAnswers,
        'http-free-text': 'Der vollständige HTTP-Freitext.'
      } })
    });
    assert.equal(autosaveResponse.status, 200, JSON.stringify(autosaveResponse.body));
    assert.equal(JSON.stringify(autosaveResponse.body.attempt.answers).includes('pair-a'), false);
    assert.equal(JSON.stringify(autosaveResponse.body.attempt.answers).includes('target-a'), false);
    const resumedResponse = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempt?attemptCourseCode=SOP-01`, delegate.token);
    assert.equal(resumedResponse.status, 200);
    assert.deepEqual(resumedResponse.body.attempt.answers['http-matching'], matchingAnswers);
    const submissionResponse = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/${publicAttempt.id}/submit`, delegate.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
    });
    assert.equal(submissionResponse.status, 200, JSON.stringify(submissionResponse.body));
    assert.equal(submissionResponse.body.submission.status, 'pending_review');
    assert.equal(submissionResponse.body.submission.questionResults.length, 5);
    assert.equal(submissionResponse.body.submission.questionResults[3].correct, true);
    const nextReviewQueue = await jsonRequest('/api/academy/exam-reviews', delegate.token);
    assert.equal(nextReviewQueue.body.reviews.length, 1);
    const attemptToGrade = nextReviewQueue.body.reviews[0];
    const finalGradeResponse = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/${attemptToGrade.id}/grade`, courseReviewer.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grades: [{ questionId: 'http-free-text', pointsEarnedMilli: 4000 }] })
    });
    assert.equal(finalGradeResponse.status, 200, JSON.stringify(finalGradeResponse.body));
    assert.equal(finalGradeResponse.body.submission.status, 'passed');
    assert.equal(finalGradeResponse.body.submission.finalScoreBasisPoints, 10000);
    const updatedOwnResults = await jsonRequest('/api/academy/exam-results', delegate.token);
    assert.equal(updatedOwnResults.status, 200);
    assert.equal(updatedOwnResults.body.results.length, 2);
    assert.equal((await jsonRequest('/api/academy/exam-results', admin.token)).body.results.length, 0);

    const assertDelegatedProjection = (exam: Record<string, any>) => {
      assert.deepEqual(exam.questions.map((question: { id: string }) => question.id), master.questions.map(question => question.id));
      const serialized = JSON.stringify(exam);
      for (const privateField of [
        'correctOptionId', 'correctOptionIds', 'correctBoolean', 'targetId', 'targetText',
        'gradingRubric', 'explanation', 'internalScore', 'legacyCorrectIndex'
      ]) assert.equal(serialized.includes(privateField), false, `delegated HTTP response leaked ${privateField}`);
      assert.deepEqual(exam.questions[0].options.map((option: { text: string }) => option.text), ['Single richtig', 'Single falsch']);
      assert.deepEqual(exam.questions[1].options.map((option: { text: string }) => option.text), ['Multiple A', 'Multiple B', 'Multiple C']);
      assert.equal(exam.questions[2].type, 'true_false');
      assert.equal(exam.questions[4].maxAnswerLength, 1000);

      const matching = exam.questions[3];
      assert.equal(matching.matchingPairs.length, 3);
      assert.equal(matching.matchingTargets.length, 3);
      assert.deepEqual(new Set(matching.matchingPairs.map((pair: { prompt: string }) => pair.prompt)), new Set(['Begriff A', 'Begriff B', 'Begriff C']));
      assert.deepEqual(new Set(matching.matchingTargets.map((target: { text: string }) => target.text)), new Set(['Ziel A', 'Ziel B', 'Ziel C']));
      assert.equal(matching.matchingPairs.every((pair: Record<string, unknown>) => Object.keys(pair).sort().join(',') === 'id,prompt'), true);
      assert.equal(matching.matchingTargets.every((target: Record<string, unknown>) => Object.keys(target).sort().join(',') === 'id,text'), true);
      assert.equal(matching.matchingPairs.some((pair: Record<string, unknown>) => 'targetId' in pair || 'targetText' in pair), false);
      assert.equal(matching.matchingTargets.some((target: Record<string, unknown>) => 'prompt' in target || 'pairId' in target), false);
      assert.equal(matching.matchingPairs.some((pair: { id: string }) => ['pair-a', 'pair-b', 'pair-c'].includes(pair.id)), false);
      assert.equal(matching.matchingTargets.some((target: { id: string }) => ['target-a', 'target-b', 'target-c'].includes(target.id)), false);
      assert.equal(new Set([...matching.matchingPairs.map((pair: { id: string }) => pair.id), ...matching.matchingTargets.map((target: { id: string }) => target.id)]).size, 6);
    };
    assertDelegatedProjection(listExam);
    assertDelegatedProjection(detailExam);

    const updateDefinition = {
      title: detailExam.title,
      moduleCode: detailExam.moduleCode,
      assignedCourseCodes: detailExam.assignedCourseCodes,
      assessmentStage: detailExam.assessmentStage,
      minClearance: detailExam.minClearance,
      timeLimitMinutes: detailExam.timeLimitMinutes,
      passingScoreBasisPoints: detailExam.passingScoreBasisPoints,
      maxAttempts: detailExam.maxAttempts,
      prerequisites: detailExam.prerequisites,
      questions: detailExam.questions.map((question: Record<string, any>) => ({
        ...question,
        ...(question.id === 'http-single' ? { question: 'Single-Frage nach HTTP-Edit' } : {})
      }))
    };
    const updateResponse = await jsonRequest(`/api/workshop/exams/${TEST_EXAM_ID}`, delegate.token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedRevision: 1, definition: updateDefinition })
    });
    assert.equal(updateResponse.status, 200, JSON.stringify(updateResponse.body));
    assertDelegatedProjection(updateResponse.body.exam);
    assert.equal(updateResponse.body.exam.questions[0].question, 'Single-Frage nach HTTP-Edit');

    const afterUpdateResponse = await jsonRequest(`/api/workshop/exams/${TEST_EXAM_ID}`, delegate.token);
    assert.equal(afterUpdateResponse.status, 200);
    assertDelegatedProjection(afterUpdateResponse.body.exam);

    const adminListResponse = await jsonRequest('/api/workshop/exams', admin.token);
    assert.equal(adminListResponse.status, 200);
    assert.deepEqual(adminListResponse.body.exams[0].questions, master.questions.map((question, index) =>
      index === 0 ? { ...question, question: 'Single-Frage nach HTTP-Edit' } : question
    ));
    const adminDetailResponse = await jsonRequest(`/api/workshop/exams/${TEST_EXAM_ID}`, admin.token);
    assert.equal(adminDetailResponse.status, 200);
    assert.deepEqual(adminDetailResponse.body.exam.questions, adminListResponse.body.exams[0].questions);
    assert.equal(adminDetailResponse.body.exam.questions[0].correctOptionId, 'single-right');
    assert.equal(adminDetailResponse.body.exam.questions[0].legacyCorrectIndex, 0);
    assert.deepEqual(adminDetailResponse.body.exam.questions[1].correctOptionIds, ['multiple-right-a', 'multiple-right-b']);
    assert.equal(adminDetailResponse.body.exam.questions[2].correctBoolean, true);
    assert.equal(adminDetailResponse.body.exam.questions[3].matchingPairs[0].targetId, 'target-a');
    assert.equal(adminDetailResponse.body.exam.questions[4].gradingRubric, 'Nur für Prüfer sichtbare Rubrik');

    const forbiddenList = await jsonRequest('/api/workshop/exams', unauthorized.token);
    assert.equal(forbiddenList.status, 403);
    const forbiddenDetail = await jsonRequest(`/api/workshop/exams/${TEST_EXAM_ID}`, unauthorized.token);
    assert.equal(forbiddenDetail.status, 403);
    assert.equal((await jsonRequest('/api/academy/exam-reviews', unauthorized.token)).status, 403);
    assert.equal((await jsonRequest('/api/academy/exams/http-workshop-exam/attempts/http-review-attempt/grade', unauthorized.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grades: [] })
    })).status, 403);
    assert.equal((await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/grade`, otherCourse.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grades: [{ questionId: 'http-free-text', pointsEarnedMilli: 0 }] })
    })).status, 403);
    const forbiddenUpdate = await jsonRequest(`/api/workshop/exams/${TEST_EXAM_ID}`, unauthorized.token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedRevision: 1, definition: updateDefinition })
    });
    assert.equal(forbiddenUpdate.status, 403);
    const unauthenticatedDetail = await jsonRequest(`/api/workshop/exams/${TEST_EXAM_ID}`);
    assert.equal(unauthenticatedDetail.status, 401);
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await Promise.race([
        once(child, 'exit').then(() => undefined),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
      if (child.exitCode === null) {
        child.kill('SIGKILL');
        await Promise.race([
          once(child, 'exit').then(() => undefined),
          new Promise(resolve => setTimeout(resolve, 1000))
        ]);
      }
    }
    await rm(dataDirectory, { recursive: true, force: true });
  }
});
