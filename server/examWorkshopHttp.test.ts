import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { hashPassword } from './auth.ts';
import { EXAM_COLLECTIONS } from './examRepositoryTypes.ts';
import { ACADEMY_COLLECTIONS } from './academyRepositoryTypes.ts';
import { getDefaultGranularPermissions } from './rolePermissions.ts';

const TEST_PASSWORD = 'Exam-http-test-password-123';
const TEST_EXAM_ID = 'http-workshop-exam';

function makeAccount(uid: string, username: string, role: 'admin' | 'officer' | 'trainee', permissions?: ReturnType<typeof getDefaultGranularPermissions>) {
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
      rank: role === 'admin' ? 'Chief' : role === 'trainee' ? 'Trainee' : 'Officer',
      role,
      clearanceLevel: role === 'admin' ? 10 : role === 'officer' ? 5 : 1,
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
  const secondReviewerPermissions = getDefaultGranularPermissions('officer');
  secondReviewerPermissions.canGradeAssignedCourses = true;
  secondReviewerPermissions.assignedCourseCodes = ['SOP-01'];
  const pendingReviewerPermissions = getDefaultGranularPermissions('officer');
  pendingReviewerPermissions.canGradeAssignedCourses = true;
  pendingReviewerPermissions.assignedCourseCodes = ['SOP-01'];
  const pendingReviewer = makeAccount('http-pending-reviewer', 'HttpPendingReviewer', 'officer', pendingReviewerPermissions);
  pendingReviewer.publicProfile.whitelistStatus = 'pending';
  const pendingSupervisor = makeAccount('http-pending-supervisor', 'HttpPendingSupervisor', 'officer');
  pendingSupervisor.publicProfile.whitelistStatus = 'pending';
  const portalState = {
    version: 3,
    accounts: [
      makeAccount('http-admin', 'HttpAdmin', 'admin'),
      makeAccount('http-delegate', 'HttpDelegate', 'officer', delegatePermissions),
      makeAccount('http-other-course', 'HttpOtherCourse', 'officer', otherCoursePermissions),
      makeAccount('http-course-reviewer', 'HttpCourseReviewer', 'officer', courseReviewerPermissions),
      makeAccount('http-second-reviewer', 'HttpSecondReviewer', 'officer', secondReviewerPermissions),
      pendingReviewer,
      pendingSupervisor,
      makeAccount('http-unauthorized', 'HttpUnauthorized', 'officer'),
      makeAccount('http-applicant', 'HttpApplicant', 'officer'),
      makeAccount('http-deleted-account', 'HttpDeletedAccount', 'officer'),
      makeAccount('http-trainee', 'HttpTrainee', 'trainee')
    ],
    applications: [{
      id: 'app-already-reviewed',
      applicantUid: 'http-delegate',
      applicantName: 'HttpDelegate',
      characterName: 'HTTP Candidate',
      dateOfBirth: '2000-01-01',
      discordTag: 'candidate',
      priorExperience: 'Existing experience',
      scenarioResponse: 'Existing response',
      penalCodeAck: true,
      status: 'accepted',
      reviewerUid: 'http-admin',
      reviewerFeedback: 'Accepted',
      updatedIso: '2026-11-10T08:00:00.000Z'
    }, {
      id: 'app-last-admin-promotion',
      applicantUid: 'http-admin',
      applicantName: 'HttpAdmin',
      characterName: 'HTTP Administrator',
      dateOfBirth: '1980-01-01',
      discordTag: 'admin',
      priorExperience: 'Existing service',
      scenarioResponse: 'Existing response',
      penalCodeAck: true,
      status: 'pending',
      reviewerUid: '',
      reviewerFeedback: '',
      updatedIso: '2026-11-10T08:00:00.000Z'
    }, {
      id: 'app-to-anonymize',
      applicantUid: 'http-deleted-account',
      applicantName: 'HttpDeletedAccount',
      characterName: 'Applicant Character',
      dateOfBirth: '2001-02-03',
      discordTag: 'Applicant#1234',
      priorExperience: 'Personal experience',
      scenarioResponse: 'Personal scenario details',
      penalCodeAck: true,
      status: 'rejected',
      reviewerUid: 'http-admin',
      reviewerFeedback: 'Decision retained',
      updatedIso: '2026-11-10T08:00:00.000Z'
    }],
    modules: [{
      id: 'http-rookie-material',
      title: 'Rookie-only material',
      code: 'SOP-LOCK',
      category: 'SOP & Policy',
      minClearance: 3,
      requiredRole: 'rookie',
      embedType: 'document',
      contentMarkdown: 'Protected material body',
      externalUrl: 'https://example.test/protected-material',
      pdfDataUrl: '',
      pdfFileName: '',
      interactiveCode: 'window.protectedMaterial = true;',
      estimatedMinutes: 10,
      authorUid: 'http-admin',
      updatedIso: '2026-11-10T08:00:00.000Z'
    }],
    exams: [
      {
        id: 'http-active-test',
        title: 'Active HTTP code test',
        moduleCode: 'SOP-01',
        assessmentStage: 'test',
        minClearance: 1,
        passingScore: 75,
        timeLimitMinutes: 15,
        examFormat: 'interactive_code',
        questionsPayload: '[]',
        interactiveWidgetCode: '',
        authorUid: 'http-admin',
        status: 'published'
      },
      {
        id: 'http-rookie-final',
        title: 'Rookie final exam',
        moduleCode: 'SOP-01',
        assessmentStage: 'final_exam',
        minClearance: 3,
        passingScore: 75,
        timeLimitMinutes: 15,
        examFormat: 'interactive_code',
        questionsPayload: '[]',
        interactiveWidgetCode: '',
        authorUid: 'http-admin',
        status: 'published'
      },
      {
        id: 'http-draft-test',
        title: 'Draft HTTP test',
        moduleCode: 'SOP-01',
        assessmentStage: 'test',
        minClearance: 1,
        passingScore: 75,
        timeLimitMinutes: 15,
        examFormat: 'interactive_code',
        questionsPayload: '[]',
        interactiveWidgetCode: '',
        authorUid: 'http-admin',
        status: 'draft'
      },
      {
        id: 'http-high-clearance-test',
        title: 'High clearance HTTP test',
        moduleCode: 'SOP-01',
        assessmentStage: 'test',
        minClearance: 8,
        passingScore: 75,
        timeLimitMinutes: 15,
        examFormat: 'interactive_code',
        questionsPayload: '[]',
        interactiveWidgetCode: '',
        authorUid: 'http-admin',
        status: 'published'
      }
    ],
    progress: [], announcements: [],
    messages: [{
      id: 'msg-known-private',
      senderUid: 'http-admin',
      senderName: 'HttpAdmin',
      senderBadge: 'http-admin',
      senderRole: 'admin',
      recipientUid: 'http-delegate',
      recipientName: 'HttpDelegate',
      recipientBadge: 'http-delegate',
      subject: 'Private route regression test',
      body: 'Private message body',
      priority: 'routine',
      readByUids: [],
      createdIso: '2026-11-10T08:00:00.000Z'
    }, {
      id: 'msg-from-applicant',
      senderUid: 'http-deleted-account',
      senderName: 'HttpDeletedAccount',
      senderBadge: 'http-deleted-account',
      senderRole: 'officer',
      recipientUid: 'http-delegate',
      recipientName: 'HttpDelegate',
      recipientBadge: 'http-delegate',
      subject: 'Account deletion message',
      body: 'Private content',
      priority: 'routine',
      readByUids: [],
      createdIso: '2026-11-10T08:00:00.000Z'
    }],
    requests: [{
      id: 'req-already-reviewed',
      requesterUid: 'http-delegate',
      requesterName: 'HttpDelegate',
      requesterBadge: 'http-delegate',
      requesterCurrentRole: 'officer',
      category: 'rank_change',
      title: 'Already reviewed',
      requestedRole: 'colonel',
      targetDetail: '',
      justification: 'Existing decision',
      priority: 'normal',
      status: 'approved',
      reviewerUid: 'http-admin',
      reviewerName: 'HttpAdmin',
      reviewerComment: 'Done',
      createdIso: '2026-11-10T08:00:00.000Z',
      updatedIso: '2026-11-10T08:00:00.000Z'
    }, {
      id: 'req-last-admin-demotion',
      requesterUid: 'http-admin',
      requesterName: 'HttpAdmin',
      requesterBadge: 'http-admin',
      requesterCurrentRole: 'admin',
      category: 'rank_change',
      title: 'Demotion of final administrator',
      requestedRole: 'colonel',
      targetDetail: '',
      justification: 'HTTP regression for final-admin protection',
      priority: 'normal',
      status: 'pending',
      createdIso: '2026-11-10T08:00:00.000Z',
      updatedIso: '2026-11-10T08:00:00.000Z'
    }],
    events: [], auditLogs: [], notifications: []
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
  collections.exam_attempts['doc:http-deleted-attempt'] = {
    id: 'http-deleted-attempt', userId: 'http-deleted-account', userName: 'HttpDeletedAccount',
    examId: TEST_EXAM_ID, status: 'passed', finalScoreBasisPoints: 9000
  };
  collections.exam_progress['doc:http-deleted-progress'] = {
    id: 'http-deleted-progress', userId: 'http-deleted-account', targetId: TEST_EXAM_ID,
    targetType: 'test', status: 'completed', scorePercent: 100, attempts: 1
  };
  const academyCollections = Object.fromEntries(ACADEMY_COLLECTIONS.map(collection => [collection, {}])) as Record<string, Record<string, unknown>>;
  academyCollections.academy_courses['doc:http-deleted-course'] = { id: 'http-deleted-course', ownerUid: 'http-deleted-account' };
  academyCollections.academy_private_notes['doc:http-deleted-note'] = {
    id: 'http-deleted-note', ownerUid: 'http-deleted-account', materialId: 'material-1',
    materialVersionId: 'material-1__v1', kind: 'note', content: 'private note',
    tags: [], createdIso: '2026-11-10T08:00:00.000Z', updatedIso: '2026-11-10T08:00:00.000Z'
  };
  await writeFile(path.join(dataDirectory, 'exam-db-v1.json'), JSON.stringify({ version: 1, maintenanceMode: false, collections }));
  await writeFile(path.join(dataDirectory, 'academy-db.json'), JSON.stringify({ version: 6, collections: academyCollections }));

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
    const secondReviewer = await login(baseUrl, 'HttpSecondReviewer');
    const pendingReviewerSession = await login(baseUrl, 'HttpPendingReviewer');
    const pendingSupervisorSession = await login(baseUrl, 'HttpPendingSupervisor');
    const unauthorized = await login(baseUrl, 'HttpUnauthorized');
    const applicant = await login(baseUrl, 'HttpApplicant');
    const trainee = await login(baseUrl, 'HttpTrainee');
    const jsonRequest = async (url: string, token?: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const response = await fetch(`${baseUrl}${url}`, { ...init, headers });
      return { status: response.status, body: await response.json() as Record<string, any> };
    };

    const foreignMessageRead = await jsonRequest('/api/messages/msg-known-private/read', unauthorized.token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(foreignMessageRead.status, 403);
    assert.equal(JSON.stringify(foreignMessageRead.body).includes('Private message body'), false);

    const hideMessage = await jsonRequest('/api/messages/msg-known-private?actorUid=http-delegate', delegate.token, {
      method: 'DELETE'
    });
    assert.equal(hideMessage.status, 200);
    const delegateInboxAfterHide = await jsonRequest('/api/portal/state?uid=http-delegate', delegate.token);
    assert.equal(delegateInboxAfterHide.body.messages.some((message: Record<string, unknown>) => message.id === 'msg-known-private'), false);
    const senderInboxAfterHide = await jsonRequest('/api/portal/state?uid=http-admin', admin.token);
    assert.equal(senderInboxAfterHide.body.messages.some((message: Record<string, unknown>) => message.id === 'msg-known-private'), true);

    const selfInstructorGrade = await jsonRequest('/api/academy/instructor-grade', courseReviewer.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserUid: 'http-course-reviewer',
        targetType: 'module',
        courseCode: 'SOP-01',
        status: 'passed',
        scorePercent: 100,
        targetTitle: 'Eigener Lehrgang'
      })
    });
    assert.equal(selfInstructorGrade.status, 403, JSON.stringify(selfInstructorGrade.body));
    assert.match(selfInstructorGrade.body.error, /eigenen Lehrgangsfortschritt/);

    const listResponse = await jsonRequest('/api/workshop/exams', delegate.token);
    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.body.exams.length, 1);
    const listExam = listResponse.body.exams[0];
    const detailResponse = await jsonRequest(`/api/workshop/exams/${TEST_EXAM_ID}`, delegate.token);
    assert.equal(detailResponse.status, 200);
    const detailExam = detailResponse.body.exam;
    assert.deepEqual(new Set(listExam.questions[3].matchingPairs.map((pair: { id: string }) => pair.id)), new Set(detailExam.questions[3].matchingPairs.map((pair: { id: string }) => pair.id)));
    assert.deepEqual(new Set(listExam.questions[3].matchingTargets.map((target: { id: string }) => target.id)), new Set(detailExam.questions[3].matchingTargets.map((target: { id: string }) => target.id)));

    const ownReviewQueue = await jsonRequest('/api/academy/exam-reviews', delegate.token);
    assert.equal(ownReviewQueue.status, 200, JSON.stringify(ownReviewQueue.body));
    assert.deepEqual(ownReviewQueue.body.reviews, [], 'reviewers must not receive their own submitted answers');
    assert.equal((await jsonRequest('/api/academy/exam-reviews', pendingReviewerSession.token)).status, 403,
      'pending whitelist accounts must not receive confidential review answers');
    assert.equal((await jsonRequest('/api/academy/exam-reviews', pendingSupervisorSession.token)).status, 403,
      'pending supervisor accounts must not receive the review queue');
    const pendingClaim = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-claim`, pendingReviewerSession.token, { method: 'POST' });
    assert.equal(pendingClaim.status, 403, 'pending accounts cannot claim review work');
    const reviewQueue = await jsonRequest('/api/academy/exam-reviews', courseReviewer.token);
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
    assert.equal((await jsonRequest('/api/academy/exam-reviews', delegate.token)).body.reviews.length, 0);
    const gradeWithoutClaim = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/grade`, courseReviewer.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grades: [{ questionId: 'http-free-text', pointsEarnedMilli: 3000 }] })
    });
    assert.equal(gradeWithoutClaim.status, 409, JSON.stringify(gradeWithoutClaim.body));
    const deniedParticipantHistory = await jsonRequest('/api/academy/participants/http-delegate/exam-history', pendingReviewerSession.token);
    assert.equal(deniedParticipantHistory.status, 403, 'pending whitelist accounts cannot access participant review history');
    const ownParticipantHistory = await jsonRequest('/api/academy/participants/http-course-reviewer/exam-history', courseReviewer.token);
    assert.equal(ownParticipantHistory.status, 403, 'reviewers must use the participant-facing released-results projection for themselves');
    const scopedParticipantHistory = await jsonRequest('/api/academy/participants/http-delegate/exam-history', courseReviewer.token);
    assert.equal(scopedParticipantHistory.status, 200, JSON.stringify(scopedParticipantHistory.body));
    assert.equal(scopedParticipantHistory.body.history.length, 1);
    assert.equal(scopedParticipantHistory.body.history[0].detailed, false,
      'an authorized but uninvolved reviewer receives only status and responsibility');
    assert.equal('questions' in scopedParticipantHistory.body.history[0], false);
    const outOfScopeHistory = await jsonRequest('/api/academy/participants/http-delegate/exam-history', otherCourse.token);
    assert.equal(outOfScopeHistory.status, 200);
    assert.deepEqual(outOfScopeHistory.body.history, [], 'reviewer receives no history outside assigned courses');

    const claimResponse = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-claim`, courseReviewer.token, {
      method: 'POST'
    });
    assert.equal(claimResponse.status, 200, JSON.stringify(claimResponse.body));
    const detailedParticipantHistory = await jsonRequest('/api/academy/participants/http-delegate/exam-history', courseReviewer.token);
    assert.equal(detailedParticipantHistory.status, 200);
    assert.equal(detailedParticipantHistory.body.history[0].detailed, true);
    assert.equal(detailedParticipantHistory.body.history[0].questions[0].answer, 'Meine HTTP Antwort');

    const draftResponse = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-draft`, courseReviewer.token, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 'http-free-text', pointsEarnedMilli: 2500 })
    });
    assert.equal(draftResponse.status, 200, JSON.stringify(draftResponse.body));
    assert.equal(draftResponse.body.draftGrades['http-free-text'], 2500);
    assert.equal(draftResponse.body.revision, 1);
    const pendingDraft = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-draft`, pendingReviewerSession.token, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 'http-free-text', pointsEarnedMilli: 1000 })
    });
    assert.equal(pendingDraft.status, 403, 'pending accounts cannot read or write review drafts');
    const pendingGrade = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/grade`, pendingReviewerSession.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grades: [{ questionId: 'http-free-text', pointsEarnedMilli: 3000 }] })
    });
    assert.equal(pendingGrade.status, 403, 'pending accounts cannot submit grades');
    const pendingTransfer = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-claim/transfer`, pendingReviewerSession.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'http-second-reviewer', reason: 'Nicht berechtigt' })
    });
    assert.equal(pendingTransfer.status, 403, 'pending accounts cannot transfer review work');
    const pendingRelease = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-claim`, pendingReviewerSession.token, { method: 'DELETE' });
    assert.equal(pendingRelease.status, 403, 'pending accounts cannot release another reviewer claim');
    const pendingActivity = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-claim/activity`, pendingReviewerSession.token, { method: 'POST' });
    assert.equal(pendingActivity.status, 403, 'pending accounts cannot extend reviewer claims');
    const pendingDisconnect = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-claim/disconnect`, pendingReviewerSession.token, { method: 'POST' });
    assert.equal(pendingDisconnect.status, 403, 'pending accounts cannot disconnect reviewer claims');
    const pendingReassign = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-claim/reassign`, pendingSupervisorSession.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'http-course-reviewer', reason: 'Nicht berechtigt' })
    });
    assert.equal(pendingReassign.status, 403, 'pending supervisors cannot administratively reassign review work');
    const adminQueueDuringClaim = await jsonRequest('/api/academy/exam-reviews', admin.token);
    assert.equal(adminQueueDuringClaim.body.reviews.length, 1);
    assert.deepEqual(adminQueueDuringClaim.body.reviews[0].questions, [], 'claimed answers stay hidden from other reviewers');
    assert.deepEqual(adminQueueDuringClaim.body.reviews[0].draftGrades, {}, 'claimed draft points stay hidden from other reviewers');
    assert.equal(adminQueueDuringClaim.body.reviews[0].reviewClaim.reviewerName, 'HttpCourseReviewer');
    assert.equal('reviewerUid' in adminQueueDuringClaim.body.reviews[0].reviewClaim, false);
    assert.equal((await jsonRequest('/api/academy/exam-reviews', delegate.token)).body.reviews.length, 0);

    const pendingTargetTransfer = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-claim/transfer`, courseReviewer.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'http-pending-reviewer', reason: 'Nicht berechtigt' })
    });
    assert.equal(pendingTargetTransfer.status, 400, 'pending accounts cannot receive review assignments');
    const invalidTargetTransfer = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-claim/transfer`, courseReviewer.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'http-other-course', reason: 'Fachliche Übergabe' })
    });
    assert.equal(invalidTargetTransfer.status, 400, JSON.stringify(invalidTargetTransfer.body));
    const transferResponse = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-claim/transfer`, courseReviewer.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'http-second-reviewer', reason: 'Spezialzuständigkeit' })
    });
    assert.equal(transferResponse.status, 200, JSON.stringify(transferResponse.body));
    const oldOwnerAfterTransfer = await jsonRequest('/api/academy/exam-reviews', courseReviewer.token);
    assert.deepEqual(oldOwnerAfterTransfer.body.reviews[0].questions, []);
    const newOwnerAfterTransfer = await jsonRequest('/api/academy/exam-reviews', secondReviewer.token);
    assert.equal(newOwnerAfterTransfer.body.reviews[0].questions[0].answer, 'Meine HTTP Antwort');
    assert.equal(newOwnerAfterTransfer.body.reviews[0].draftGrades['http-free-text'], 2500);
    const secondReviewerState = await jsonRequest('/api/portal/state?uid=http-second-reviewer', secondReviewer.token);
    const newOwnerNotification = secondReviewerState.body.notifications.find((item: Record<string, any>) =>
      item.type === 'exam_review_assignment' && item.linkTarget?.attemptId === 'http-review-attempt'
    );
    assert.ok(newOwnerNotification, 'the new reviewer receives an assignment notification');
    assert.equal(newOwnerNotification.linkTarget.type, 'exam_review');
    assert.equal(newOwnerNotification.linkTarget.examId, TEST_EXAM_ID);
    const oldOwnerState = await jsonRequest('/api/portal/state?uid=http-course-reviewer', courseReviewer.token);
    assert.equal(oldOwnerState.body.notifications.some((item: Record<string, any>) =>
      item.type === 'exam_review_assignment' && item.linkTarget?.attemptId === 'http-review-attempt'
    ), true, 'the previous reviewer receives a transfer notification');

    const forbiddenReassignment = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-claim/reassign`, courseReviewer.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'http-course-reviewer', reason: 'Nicht berechtigt' })
    });
    assert.equal(forbiddenReassignment.status, 403);
    const reassignmentResponse = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/http-review-attempt/review-claim/reassign`, admin.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'http-course-reviewer', reason: 'Administrative Neuverteilung' })
    });
    assert.equal(reassignmentResponse.status, 200, JSON.stringify(reassignmentResponse.body));
    const previousReviewerState = await jsonRequest('/api/portal/state?uid=http-second-reviewer', secondReviewer.token);
    assert.equal(previousReviewerState.body.notifications.some((item: Record<string, any>) =>
      item.type === 'exam_review_assignment' && item.message.includes('administrativ')
    ), true, 'the previous reviewer receives an administrative reassignment notification');
    const currentReviewerState = await jsonRequest('/api/portal/state?uid=http-course-reviewer', courseReviewer.token);
    assert.equal(currentReviewerState.body.notifications.some((item: Record<string, any>) =>
      item.type === 'exam_review_assignment' && item.message.includes('zugewiesen')
    ), true, 'the new reviewer receives an administrative assignment notification');

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
    assert.equal(submissionResponse.body.submission.status, 'awaiting_release');
    assert.equal(submissionResponse.body.submission.finalScoreBasisPoints, null);
    assert.deepEqual(submissionResponse.body.submission.questionResults, []);
    const ownNextReviewQueue = await jsonRequest('/api/academy/exam-reviews', delegate.token);
    assert.deepEqual(ownNextReviewQueue.body.reviews, []);
    const nextReviewQueue = await jsonRequest('/api/academy/exam-reviews', courseReviewer.token);
    assert.equal(nextReviewQueue.body.reviews.length, 1);
    const attemptToGrade = nextReviewQueue.body.reviews[0];
    const nextClaimResponse = await jsonRequest(`/api/academy/exams/${TEST_EXAM_ID}/attempts/${attemptToGrade.id}/review-claim`, courseReviewer.token, { method: 'POST' });
    assert.equal(nextClaimResponse.status, 200, JSON.stringify(nextClaimResponse.body));
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
    assert.equal(updatedOwnResults.body.results.every((item: any) => item.status === 'awaiting_release' && item.finalScoreBasisPoints === null && item.questionResults.length === 0), true);
    assert.equal((await jsonRequest('/api/academy/exam-results', admin.token)).body.results.length, 0);
    assert.equal((await jsonRequest('/api/admin/exam-result-releases', delegate.token)).status, 403);
    const releaseQueue = await jsonRequest('/api/admin/exam-result-releases', admin.token);
    assert.equal(releaseQueue.status, 200, JSON.stringify(releaseQueue.body));
    const releasable = releaseQueue.body.releases.find((item: any) => item.id === attemptToGrade.id);
    assert.ok(releasable);
    const releaseResponse = await jsonRequest(`/api/admin/exams/${TEST_EXAM_ID}/attempts/${attemptToGrade.id}/release-result`, admin.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
    });
    assert.equal(releaseResponse.status, 200, JSON.stringify(releaseResponse.body));
    assert.equal((await jsonRequest('/api/academy/exam-results', delegate.token)).body.results.find((item: any) => item.id === attemptToGrade.id).status, 'passed');

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
    const outsiderRead = await jsonRequest('/api/messages/msg-known-private/read', unauthorized.token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userUid: 'http-unauthorized' })
    });
    assert.equal(outsiderRead.status, 403);
    const participantRead = await jsonRequest('/api/messages/msg-known-private/read', delegate.token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userUid: 'http-delegate' })
    });
    assert.equal(participantRead.status, 200);
    assert.equal(participantRead.body.message.id, 'msg-known-private');

    const lastAdminDemotion = await jsonRequest('/api/admin/accounts/http-admin', admin.token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUid: 'http-admin', role: 'officer' })
    });
    assert.equal(lastAdminDemotion.status, 409);

    const lastAdminRequestDemotion = await jsonRequest('/api/requests/req-last-admin-demotion/review', admin.token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', applyRankChange: true })
    });
    assert.equal(lastAdminRequestDemotion.status, 409);

    const lastAdminApplicationPromotion = await jsonRequest('/api/admin/applications/app-last-admin-promotion', admin.token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUid: 'http-admin', status: 'accepted', promoteToRole: 'trainee' })
    });
    assert.equal(lastAdminApplicationPromotion.status, 409);

    const stateAfterAdminProtection = JSON.parse(await readFile(path.join(dataDirectory, 'portal-db-v3.json'), 'utf8'));
    assert.equal(stateAfterAdminProtection.accounts.find((account: Record<string, any>) => account.uid === 'http-admin').publicProfile.role, 'admin');
    assert.equal(stateAfterAdminProtection.applications.find((application: Record<string, any>) => application.id === 'app-last-admin-promotion').status, 'pending');
    assert.equal(stateAfterAdminProtection.requests.find((request: Record<string, any>) => request.id === 'req-last-admin-demotion').status, 'pending');

    const repeatedRequestDecision = await jsonRequest('/api/requests/req-already-reviewed/review', admin.token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', reviewerComment: 'second decision' })
    });
    assert.equal(repeatedRequestDecision.status, 409);

    const repeatedApplicationDecision = await jsonRequest('/api/admin/applications/app-already-reviewed', admin.token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUid: 'http-admin', status: 'rejected', reviewerFeedback: 'second decision' })
    });
    assert.equal(repeatedApplicationDecision.status, 409);

    const invalidApplication = await jsonRequest('/api/applications', applicant.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicantUid: 'http-applicant',
        characterName: 'A',
        dateOfBirth: '2000-01-01',
        discordTag: 'applicant',
        priorExperience: 'Existing experience',
        scenarioResponse: 'Existing response',
        penalCodeAck: false
      })
    });
    assert.equal(invalidApplication.status, 400);

    const validApplication = await jsonRequest('/api/applications', applicant.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicantUid: 'http-applicant',
        characterName: 'Alex Applicant',
        dateOfBirth: '2000-01-01',
        discordTag: 'applicant',
        priorExperience: 'Existing experience',
        scenarioResponse: 'Existing response',
        penalCodeAck: false
      })
    });
    assert.equal(validApplication.status, 200);

    const traineeState = await jsonRequest('/api/portal/state?uid=http-trainee', trainee.token);
    assert.equal(traineeState.status, 200);
    const traineeModule = traineeState.body.modules.find((module: Record<string, unknown>) => module.id === 'http-rookie-material');
    assert.ok(traineeModule);
    assert.equal(traineeModule.requiredRole, 'rookie');
    assert.equal(traineeModule.title, 'Rookie-only material');
    assert.equal(traineeModule.contentMarkdown, '');
    assert.equal(traineeModule.externalUrl, '');
    assert.equal(traineeModule.interactiveCode, '');
    assert.equal(traineeState.body.exams.some((exam: Record<string, unknown>) =>
      ['http-rookie-final', 'http-draft-test', 'http-high-clearance-test'].includes(String(exam.id))
    ), false);

    const delegateState = await jsonRequest('/api/portal/state?uid=http-delegate', delegate.token);
    assert.equal(delegateState.status, 200);
    const accessibleModule = delegateState.body.modules.find((module: Record<string, unknown>) => module.id === 'http-rookie-material');
    assert.equal(accessibleModule.contentMarkdown, 'Protected material body');
    assert.equal(accessibleModule.externalUrl, 'https://example.test/protected-material');
    assert.equal(accessibleModule.interactiveCode, 'window.protectedMaterial = true;');
    assert.equal(delegateState.body.exams.some((exam: Record<string, unknown>) => exam.id === 'http-active-test'), true);
    assert.equal(delegateState.body.exams.some((exam: Record<string, unknown>) => exam.id === 'http-rookie-final'), true);
    assert.equal(delegateState.body.exams.some((exam: Record<string, unknown>) =>
      ['http-draft-test', 'http-high-clearance-test'].includes(String(exam.id))
    ), false);

    const traineeModuleProgress = await jsonRequest('/api/progress', trainee.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'http-trainee', targetId: 'http-rookie-material', targetType: 'module', scorePercent: 100 })
    });
    assert.equal(traineeModuleProgress.status, 403);

    const officerModuleProgress = await jsonRequest('/api/progress', delegate.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'http-delegate', targetId: 'http-rookie-material', targetType: 'module', scorePercent: 100 })
    });
    assert.equal(officerModuleProgress.status, 200);

    const traineeFinalExamProgress = await jsonRequest('/api/progress', trainee.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'http-trainee', targetId: 'http-rookie-final', targetType: 'final_exam', scorePercent: 100 })
    });
    assert.equal(traineeFinalExamProgress.status, 403);

    const draftExamProgress = await jsonRequest('/api/progress', delegate.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'http-delegate', targetId: 'http-draft-test', targetType: 'test', scorePercent: 100 })
    });
    assert.equal(draftExamProgress.status, 403);

    const highClearanceExamProgress = await jsonRequest('/api/progress', delegate.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'http-delegate', targetId: 'http-high-clearance-test', targetType: 'test', scorePercent: 100 })
    });
    assert.equal(highClearanceExamProgress.status, 403);

    // Legacy code exams may record completion, but a client-reported score is never an official pass.
    const activeCodeExamProgress = await jsonRequest('/api/progress', delegate.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'http-delegate', targetId: 'http-active-test', targetType: 'test', scorePercent: 100 })
    });
    assert.equal(activeCodeExamProgress.status, 200);
    assert.equal(activeCodeExamProgress.body.passed, false);
    assert.equal(activeCodeExamProgress.body.scorePercent, 100);
    const legacyProgressState = await jsonRequest('/api/portal/state?uid=http-delegate', delegate.token);
    assert.equal(legacyProgressState.status, 200);
    const legacyCodeProgress = legacyProgressState.body.progress.find((item: Record<string, unknown>) =>
      item.targetId === 'http-active-test' && item.targetType === 'test'
    );
    assert.equal(legacyCodeProgress.status, 'completed');
    assert.equal(legacyCodeProgress.scorePercent, 100);

    const passwordUpdate = await jsonRequest('/api/admin/accounts/http-delegate', admin.token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUid: 'http-admin', password: 'Updated-Password-For-Test-123' })
    });
    assert.equal(passwordUpdate.status, 200);
    const revokedOldSession = await jsonRequest('/api/portal/heartbeat', delegate.token);
    assert.equal(revokedOldSession.status, 401);
    const updatedLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'HttpDelegate', password: 'Updated-Password-For-Test-123' })
    });
    assert.equal(updatedLogin.status, 200);

    const freshSessionOneResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'HttpDelegate', password: 'Updated-Password-For-Test-123' })
    });
    const freshSessionTwoResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'HttpDelegate', password: 'Updated-Password-For-Test-123' })
    });
    assert.equal(freshSessionOneResponse.status, 200);
    assert.equal(freshSessionTwoResponse.status, 200);
    const freshSessionOne = await freshSessionOneResponse.json() as { token: string };
    const freshSessionTwo = await freshSessionTwoResponse.json() as { token: string };
    const logout = await jsonRequest('/api/auth/logout', freshSessionOne.token, { method: 'POST' });
    assert.equal(logout.status, 200);
    assert.equal((await jsonRequest('/api/portal/heartbeat', freshSessionOne.token)).status, 401);
    assert.equal((await jsonRequest('/api/portal/heartbeat', freshSessionTwo.token)).status, 401);

    const deleteAccount = await jsonRequest('/api/admin/accounts/http-deleted-account?adminUid=http-admin', admin.token, {
      method: 'DELETE'
    });
    assert.equal(deleteAccount.status, 200);
    const academyAfterDeletion = JSON.parse(await readFile(path.join(dataDirectory, 'academy-db.json'), 'utf8'));
    assert.equal(academyAfterDeletion.collections.academy_courses['doc:http-deleted-course'].ownerUid.startsWith('deleted-'), true);
    assert.equal(academyAfterDeletion.collections.academy_private_notes['doc:http-deleted-note'], undefined);
    const examsAfterDeletion = JSON.parse(await readFile(path.join(dataDirectory, 'exam-db-v1.json'), 'utf8'));
    assert.equal(examsAfterDeletion.collections.exam_attempts['doc:http-deleted-attempt'].userId.startsWith('deleted-'), true);
    assert.equal(examsAfterDeletion.collections.exam_attempts['doc:http-deleted-attempt'].userName, 'Gelöschtes Konto');
    assert.equal(examsAfterDeletion.collections.exam_attempts['doc:http-deleted-attempt'].status, 'passed');
    assert.equal(examsAfterDeletion.collections.exam_progress['doc:http-deleted-progress'].userId.startsWith('deleted-'), true);
    const adminStateAfterDeletion = await jsonRequest('/api/portal/state?uid=http-admin', admin.token);
    const anonymizedApplication = adminStateAfterDeletion.body.applications.find((application: Record<string, unknown>) => application.id === 'app-to-anonymize');
    assert.equal(anonymizedApplication.applicantUid, 'deleted-account');
    assert.equal(anonymizedApplication.applicantName, 'Gelöschtes Konto');
    assert.equal(anonymizedApplication.dateOfBirth, '');
    assert.equal(anonymizedApplication.discordTag, '');
    assert.equal(anonymizedApplication.scenarioResponse, '');
    assert.equal(anonymizedApplication.status, 'rejected');
    assert.equal(adminStateAfterDeletion.body.messages.some((message: Record<string, unknown>) => message.id === 'msg-from-applicant'), false);
    const deletedAccountLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'HttpDeletedAccount', password: TEST_PASSWORD })
    });
    assert.equal(deletedAccountLogin.status, 401);

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
