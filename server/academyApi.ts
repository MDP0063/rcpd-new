import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type {
  AcademyCourseMasterDoc, AcademyCourseDraftDoc, AcademyCourseVersionDoc,
  AcademyProgramMasterDoc, AcademyProgramDraftDoc, AcademyProgramVersionDoc,
  AcademyPrivateNoteDoc, AcademyCourseParticipationDoc, AcademyProgressEvidenceDoc, AcademyCompletionCorrectionDoc,
  AcademyMaterialCategoryDoc
} from '../src/types/academy.ts';
import type { OfficerRole } from '../src/types/portal.ts';
import type { AcademyRepository } from './academyRepository.ts';

export interface AcademyApiActor {
  uid: string;
  role: OfficerRole;
}

type ActorResolver = (uid: string) => AcademyApiActor | null;

const canCreate = (actor: AcademyApiActor) => actor.role === 'admin' || actor.role === 'colonel';
const canManage = (actor: AcademyApiActor, ownerUid: string) =>
  actor.role === 'admin' || (actor.role === 'colonel' && ownerUid === actor.uid);

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function boundedText(value: unknown, max: number, allowEmpty = false): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (normalized.length > max || (!allowEmpty && normalized.length === 0)) return null;
  return normalized;
}
function id(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll('-', '')}`;
}
function statusFor(error: unknown): number {
  const code = error instanceof Error ? error.message : '';
  if (code.includes('NOT_FOUND')) return 404;
  if (code.includes('ACCESS_DENIED') || code.includes('OWNER_MISMATCH') || code.includes('ACTOR_MISMATCH') || code.includes('EVIDENCE_ACTOR_FORBIDDEN') || code.includes('INSTRUCTOR_REQUIRED')) return 403;
  if (code.includes('REVISION_CONFLICT') || code.includes('DRAFT_VERSION_MISMATCH') ||
      code.includes('ALREADY_EXISTS') || code.includes('ARCHIVED') || code.includes('APPEND_ONLY') ||
      code.includes('NOT_STARTABLE') || code.includes('NOT_ACTIVE') || code.includes('CORRECTION_CONFLICT') ||
      code.includes('EVIDENCE_EXTERNAL_SOURCE_REQUIRED') || code.includes('CORRECTION_EVIDENCE_CONFLICT') ||
      code.includes('REQUIRES_EVIDENCE_INVALIDATION') || code.includes('PROGRAM_NOT_STARTABLE') || code.includes('PROGRAM_PARTICIPATION_ALREADY_EXISTS') || code.includes('PROGRAM_REQUIRED_COURSE_NOT_STARTABLE') || code.includes('PROGRAM_COURSE_VERSION_CONFLICT') || code.includes('PROGRAM_COURSE_PARTICIPATION_ENDED') || code.includes('PROGRAM_COURSE_VERSION_CONFLICT') || code.includes('CATEGORY_STATE_UNCHANGED')) return 409;
  if (code.includes('PARTICIPATION_HISTORY_LIMIT')) return 503;
  if (code.includes('JSON_STORE_INVALID') || code.includes('FIRESTORE_DOCUMENT_INVALID') ||
      code.includes('TRANSACTION_READ_AFTER_WRITE')) return 500;
  if (code.startsWith('ACADEMY_')) return 400;
  return 500;
}
function fail(res: Response, error: unknown, next: NextFunction): void {
  const status = statusFor(error);
  if (status === 500) {
    next(error);
    return;
  }
  res.status(status).json({ error: error instanceof Error ? error.message : 'ACADEMY_REQUEST_FAILED' });
}
function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function revision(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 1 ? Number(value) : null;
}
function makeCourseDraft(courseId: string, body: Record<string, unknown>, workingRevision: number, actorUid: string, now: string): AcademyCourseDraftDoc {
  return {
    id: courseId, courseId,
    title: text(body.title, 200), summary: text(body.summary, 2000),
    learningObjectives: Array.isArray(body.learningObjectives) ? body.learningObjectives as AcademyCourseDraftDoc['learningObjectives'] : [],
    chapters: Array.isArray(body.chapters) ? body.chapters as AcademyCourseDraftDoc['chapters'] : [],
    completionRequirements: Array.isArray(body.completionRequirements) ? body.completionRequirements as AcademyCourseDraftDoc['completionRequirements'] : [],
    workingRevision, updatedIso: now, updatedByUid: actorUid
  };
}
function makeProgramDraft(programId: string, body: Record<string, unknown>, workingRevision: number, actorUid: string, now: string): AcademyProgramDraftDoc {
  return {
    id: programId, programId,
    title: text(body.title, 200), summary: text(body.summary, 2000),
    learningObjectives: Array.isArray(body.learningObjectives) ? body.learningObjectives as AcademyProgramDraftDoc['learningObjectives'] : [],
    courseReferences: Array.isArray(body.courseReferences) ? body.courseReferences as AcademyProgramDraftDoc['courseReferences'] : [],
    workingRevision, updatedIso: now, updatedByUid: actorUid
  };
}

export function createAcademyApiRouter(
  repository: AcademyRepository,
  resolveActor: ActorResolver,
  recordAudit: (actorUid: string, actionTitle: string, targetLabel: string, details: string, category?: 'ACADEMY_DOC' | 'ACADEMY_PROGRESS') => Promise<void>
) {
  const router = Router();

  function getActor(req: Request, res: Response): AcademyApiActor | null {
    const uid = res.locals.sessionUid as string | undefined;
    return uid ? resolveActor(uid) : null;
  }
  function requireEditor(actor: AcademyApiActor | null, res: Response): actor is AcademyApiActor {
    if (!actor || !canCreate(actor)) {
      res.status(403).json({ error: 'ACADEMY_EDIT_FORBIDDEN' });
      return false;
    }
    return true;
  }
  function requireOwnerOrAdmin(actor: AcademyApiActor | null, ownerUid: string, res: Response): actor is AcademyApiActor {
    if (!actor || !canManage(actor, ownerUid)) {
      res.status(403).json({ error: 'ACADEMY_RESOURCE_FORBIDDEN' });
      return false;
    }
    return true;
  }

  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.get('/materials/categories', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const categories = await repository.listMaterialCategories();
      categories.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return a.name.localeCompare(b.name, 'de-DE');
      });
      res.json({ categories });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/materials/categories', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!requireEditor(actor, res)) return;
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_MATERIAL_CATEGORY_BODY_INVALID' }); return; }
      const name = boundedText(req.body.name, 80);
      const description = req.body.description === undefined ? undefined : boundedText(req.body.description, 300, true);
      if (name === null || (req.body.description !== undefined && description === null)) {
        res.status(400).json({ error: 'ACADEMY_MATERIAL_CATEGORY_INVALID' }); return;
      }
      const now = new Date().toISOString();
      const category: AcademyMaterialCategoryDoc = {
        id: id('material_category'),
        name,
        ...(description == null ? {} : { description }),
        status: 'active',
        revision: 1,
        createdIso: now,
        createdByUid: actor.uid,
        updatedIso: now,
        updatedByUid: actor.uid
      };
      await repository.createMaterialCategory(category);
      await recordAudit(actor.uid, 'Academy-Materialkategorie erstellt', category.name,
        `Kategorie ${category.id} angelegt.`);
      res.status(201).json({ category });
    } catch (error) { fail(res, error, next); }
  });

  router.put('/materials/categories/:categoryId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!requireEditor(actor, res)) return;
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_MATERIAL_CATEGORY_BODY_INVALID' }); return; }
      const existing = await repository.get<AcademyMaterialCategoryDoc>('academy_material_categories', req.params.categoryId);
      if (!existing) { res.status(404).json({ error: 'ACADEMY_MATERIAL_CATEGORY_NOT_FOUND' }); return; }
      const expectedRevision = revision(req.body.expectedRevision);
      if (expectedRevision === null) { res.status(400).json({ error: 'ACADEMY_MATERIAL_CATEGORY_REVISION_INVALID' }); return; }
      const name = req.body.name === undefined ? existing.name : boundedText(req.body.name, 80);
      const description = req.body.description === undefined
        ? existing.description
        : boundedText(req.body.description, 300, true);
      if (name === null || (req.body.description !== undefined && description === null)) {
        res.status(400).json({ error: 'ACADEMY_MATERIAL_CATEGORY_INVALID' }); return;
      }
      const category: AcademyMaterialCategoryDoc = {
        ...existing,
        name,
        ...(description == null ? {} : { description }),
        revision: expectedRevision + 1,
        updatedIso: new Date().toISOString(),
        updatedByUid: actor.uid
      };
      await repository.updateMaterialCategory(category, expectedRevision, actor.uid);
      await recordAudit(actor.uid, 'Academy-Materialkategorie geändert', category.name,
        `Kategorie ${category.id}; Revision ${category.revision}.`);
      res.json({ category });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/materials/categories/:categoryId/archive', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!requireEditor(actor, res)) return;
      const expectedRevision = isObject(req.body) ? revision(req.body.expectedRevision) : null;
      if (expectedRevision === null) { res.status(400).json({ error: 'ACADEMY_MATERIAL_CATEGORY_REVISION_INVALID' }); return; }
      const category = await repository.setMaterialCategoryArchived(
        req.params.categoryId, true, expectedRevision, actor.uid, new Date().toISOString()
      );
      await recordAudit(actor.uid, 'Academy-Materialkategorie archiviert', category.name,
        `Kategorie ${category.id} archiviert; bestehende Referenzen bleiben erhalten.`);
      res.json({ category });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/materials/categories/:categoryId/restore', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!requireEditor(actor, res)) return;
      const expectedRevision = isObject(req.body) ? revision(req.body.expectedRevision) : null;
      if (expectedRevision === null) { res.status(400).json({ error: 'ACADEMY_MATERIAL_CATEGORY_REVISION_INVALID' }); return; }
      const category = await repository.setMaterialCategoryArchived(
        req.params.categoryId, false, expectedRevision, actor.uid, new Date().toISOString()
      );
      await recordAudit(actor.uid, 'Academy-Materialkategorie reaktiviert', category.name,
        `Kategorie ${category.id} reaktiviert.`);
      res.json({ category });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/courses', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const masters = await repository.list<AcademyCourseMasterDoc>('academy_courses');
      const visible = masters.filter(master =>
        (master.publicationStatus === 'published' && master.availability === 'available') ||
        canManage(actor, master.ownerUid)
      );
      const courses = await Promise.all(visible.map(async master => ({
        master,
        version: master.currentPublishedVersionId
          ? await repository.get<AcademyCourseVersionDoc>('academy_course_versions', master.currentPublishedVersionId)
          : null,
        draft: canManage(actor, master.ownerUid) ? await repository.getCourseDraft(master.id) : null
      })));
      res.json({ courses });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/courses', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!requireEditor(actor, res)) return;
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_BODY_INVALID' }); return; }
      const code = text(req.body.code, 40).toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code)) { res.status(400).json({ error: 'ACADEMY_CODE_INVALID' }); return; }
      const existing = await repository.list<AcademyCourseMasterDoc>('academy_courses');
      if (existing.some(item => item.code.toUpperCase() === code)) { res.status(409).json({ error: 'ACADEMY_CODE_ALREADY_EXISTS' }); return; }
      const now = new Date().toISOString();
      const courseId = `course_${code.toLowerCase()}`;
      const master: AcademyCourseMasterDoc = {
        id: courseId, code, ownerUid: actor.uid, publicationStatus: 'draft', availability: 'available',
        latestVersionNumber: 0, workingRevision: 1, createdIso: now, updatedIso: now
      };
      const draft = makeCourseDraft(courseId, req.body, 1, actor.uid, now);
      await repository.createCourseWithDraft(master, draft);
      await recordAudit(actor.uid, 'Academy-Kursentwurf erstellt', code, `Kurs ${code} angelegt; Arbeitsrevision 1.`);
      res.status(201).json({ master, draft });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/courses/:courseId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyCourseMasterDoc>('academy_courses', req.params.courseId);
      if (!master) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      const editor = canManage(actor, master.ownerUid);
      if (!editor && (master.publicationStatus !== 'published' || master.availability !== 'available')) {
        res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return;
      }
      const version = master.currentPublishedVersionId
        ? await repository.get<AcademyCourseVersionDoc>('academy_course_versions', master.currentPublishedVersionId)
        : null;
      const draft = editor ? await repository.getCourseDraft(master.id) : null;
      res.json({ master, version, draft });
    } catch (error) { fail(res, error, next); }
  });

  router.put('/courses/:courseId/draft', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyCourseMasterDoc>('academy_courses', req.params.courseId);
      if (!master) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      if (!requireOwnerOrAdmin(actor, master.ownerUid, res)) return;
      if (!isObject(req.body) || !isObject(req.body.draft)) { res.status(400).json({ error: 'ACADEMY_DRAFT_BODY_INVALID' }); return; }
      const expected = revision(req.body.expectedRevision);
      if (expected === null) { res.status(400).json({ error: 'ACADEMY_REVISION_INVALID' }); return; }
      const draft = makeCourseDraft(master.id, req.body.draft, expected + 1, actor.uid, new Date().toISOString());
      await repository.saveCourseDraft(master.id, draft, expected, actor.uid);
      await recordAudit(actor.uid, 'Academy-Kursentwurf geändert', master.code, `Arbeitsrevision ${draft.workingRevision} gespeichert.`);
      res.json({ draft });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/courses/:courseId/publish', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyCourseMasterDoc>('academy_courses', req.params.courseId);
      if (!master) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      if (!requireOwnerOrAdmin(actor, master.ownerUid, res)) return;
      const expected = isObject(req.body) ? revision(req.body.expectedRevision) : null;
      if (expected === null) { res.status(400).json({ error: 'ACADEMY_REVISION_INVALID' }); return; }
      const draft = await repository.getCourseDraft(master.id);
      if (!draft) { res.status(409).json({ error: 'ACADEMY_DRAFT_MISSING' }); return; }
      const now = new Date().toISOString();
      const versionNumber = master.latestVersionNumber + 1;
      const version: AcademyCourseVersionDoc = {
        id: `${master.id}__v${versionNumber}`, courseId: master.id, versionNumber,
        title: draft.title, summary: draft.summary, learningObjectives: draft.learningObjectives,
        chapters: draft.chapters, completionRequirements: draft.completionRequirements,
        publishedIso: now, publishedByUid: actor.uid, createdIso: now, createdByUid: actor.uid,
        workingRevision: expected
      };
      const nextMaster: AcademyCourseMasterDoc = {
        ...master, publicationStatus: 'published', currentPublishedVersionId: version.id,
        latestVersionNumber: versionNumber, updatedIso: now
      };
      await repository.publishCourseVersion(master.id, version, nextMaster, expected, actor.uid);
      await recordAudit(actor.uid, 'Academy-Kursversion veröffentlicht', master.code, `Version ${version.versionNumber} veröffentlicht.`);
      res.status(201).json({ master: nextMaster, version });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/programs', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const masters = await repository.list<AcademyProgramMasterDoc>('academy_programs');
      const visible = masters.filter(master =>
        (master.publicationStatus === 'published' && master.availability === 'available') ||
        canManage(actor, master.ownerUid)
      );
      const programs = await Promise.all(visible.map(async master => ({
        master,
        version: master.currentPublishedVersionId
          ? await repository.get<AcademyProgramVersionDoc>('academy_program_versions', master.currentPublishedVersionId)
          : null,
        draft: canManage(actor, master.ownerUid) ? await repository.getProgramDraft(master.id) : null
      })));
      res.json({ programs });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/programs', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!requireEditor(actor, res)) return;
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_BODY_INVALID' }); return; }
      const code = text(req.body.code, 40).toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code)) { res.status(400).json({ error: 'ACADEMY_CODE_INVALID' }); return; }
      const existing = await repository.list<AcademyProgramMasterDoc>('academy_programs');
      if (existing.some(item => item.code.toUpperCase() === code)) { res.status(409).json({ error: 'ACADEMY_CODE_ALREADY_EXISTS' }); return; }
      const now = new Date().toISOString();
      const programId = `program_${code.toLowerCase()}`;
      const master: AcademyProgramMasterDoc = {
        id: programId, code, ownerUid: actor.uid, publicationStatus: 'draft', availability: 'available',
        latestVersionNumber: 0, workingRevision: 1, createdIso: now, updatedIso: now
      };
      const draft = makeProgramDraft(programId, req.body, 1, actor.uid, now);
      await repository.createProgramWithDraft(master, draft);
      await recordAudit(actor.uid, 'Academy-Programm-Entwurf erstellt', code, `Programm ${code} angelegt; Arbeitsrevision 1.`);
      res.status(201).json({ master, draft });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/programs/:programId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyProgramMasterDoc>('academy_programs', req.params.programId);
      if (!master) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      const editor = canManage(actor, master.ownerUid);
      if (!editor && (master.publicationStatus !== 'published' || master.availability !== 'available')) {
        res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return;
      }
      const version = master.currentPublishedVersionId
        ? await repository.get<AcademyProgramVersionDoc>('academy_program_versions', master.currentPublishedVersionId)
        : null;
      const draft = editor ? await repository.getProgramDraft(master.id) : null;
      res.json({ master, version, draft });
    } catch (error) { fail(res, error, next); }
  });

  router.put('/programs/:programId/draft', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyProgramMasterDoc>('academy_programs', req.params.programId);
      if (!master) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      if (!requireOwnerOrAdmin(actor, master.ownerUid, res)) return;
      if (!isObject(req.body) || !isObject(req.body.draft)) { res.status(400).json({ error: 'ACADEMY_DRAFT_BODY_INVALID' }); return; }
      const expected = revision(req.body.expectedRevision);
      if (expected === null) { res.status(400).json({ error: 'ACADEMY_REVISION_INVALID' }); return; }
      const draft = makeProgramDraft(master.id, req.body.draft, expected + 1, actor.uid, new Date().toISOString());
      await repository.saveProgramDraft(master.id, draft, expected, actor.uid);
      await recordAudit(actor.uid, 'Academy-Programm-Entwurf geändert', master.code, `Arbeitsrevision ${draft.workingRevision} gespeichert.`);
      res.json({ draft });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/programs/:programId/publish', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyProgramMasterDoc>('academy_programs', req.params.programId);
      if (!master) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      if (!requireOwnerOrAdmin(actor, master.ownerUid, res)) return;
      const expected = isObject(req.body) ? revision(req.body.expectedRevision) : null;
      if (expected === null) { res.status(400).json({ error: 'ACADEMY_REVISION_INVALID' }); return; }
      const draft = await repository.getProgramDraft(master.id);
      if (!draft) { res.status(409).json({ error: 'ACADEMY_DRAFT_MISSING' }); return; }
      const now = new Date().toISOString();
      const versionNumber = master.latestVersionNumber + 1;
      const version: AcademyProgramVersionDoc = {
        id: `${master.id}__v${versionNumber}`, programId: master.id, versionNumber,
        title: draft.title, summary: draft.summary, learningObjectives: draft.learningObjectives,
        courseReferences: draft.courseReferences, publishedIso: now, publishedByUid: actor.uid,
        createdIso: now, createdByUid: actor.uid, workingRevision: expected
      };
      const nextMaster: AcademyProgramMasterDoc = {
        ...master, publicationStatus: 'published', currentPublishedVersionId: version.id,
        latestVersionNumber: versionNumber, updatedIso: now
      };
      await repository.publishProgramVersion(master.id, version, nextMaster, expected, actor.uid);
      await recordAudit(actor.uid, 'Academy-Programmversion veröffentlicht', master.code, `Version ${version.versionNumber} veröffentlicht.`);
      res.status(201).json({ master: nextMaster, version });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/programs/:programId/participations', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const participation = await repository.startProgramParticipation(actor.uid, req.params.programId, new Date().toISOString());
      await recordAudit(actor.uid, 'Academy-Programmteilnahme begonnen', req.params.programId,
        `Programmversion ${participation.programVersionId} begonnen; ${participation.requiredCoursePins.length} Pflichtkursversion(en) gepinnt.`, 'ACADEMY_PROGRESS');
      res.status(201).json({ participation });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/program-participations', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const participations = await repository.listOwnProgramParticipations(actor.uid);
      res.json({ participations });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/program-participations/:participationId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const participation = await repository.getProgramParticipation(req.params.participationId);
      if (!participation || participation.userUid !== actor.uid) {
        res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return;
      }
      const version = await repository.get<AcademyProgramVersionDoc>('academy_program_versions', participation.programVersionId);
      if (!version || version.programId !== participation.programId) {
        res.status(404).json({ error: 'ACADEMY_PINNED_VERSION_MISSING' }); return;
      }
      const requiredCourses = await Promise.all(participation.requiredCoursePins.map(async pin => {
        const [courseVersion, courseParticipation] = await Promise.all([
          repository.get<AcademyCourseVersionDoc>('academy_course_versions', pin.courseVersionId),
          repository.getCourseParticipation(pin.courseParticipationId)
        ]);
        if (!courseVersion || courseVersion.courseId !== pin.courseId ||
            (courseParticipation && (courseParticipation.userUid !== actor.uid ||
             courseParticipation.courseId !== pin.courseId || courseParticipation.courseVersionId !== pin.courseVersionId))) {
          throw new Error('ACADEMY_PROGRAM_PIN_INTEGRITY_ERROR');
        }
        return { pin, version: courseVersion, participation: courseParticipation };
      }));
      const completedCount = requiredCourses.filter(item => item.participation?.status === 'completed').length;
      const startedCount = requiredCourses.filter(item => Boolean(item.participation)).length;
      const progress = {
        requiredCourseCount: requiredCourses.length,
        startedRequiredCourseCount: startedCount,
        completedRequiredCourseCount: completedCount,
        completionPercentage: requiredCourses.length === 0 ? 100 : Math.round(completedCount / requiredCourses.length * 100),
        status: completedCount === requiredCourses.length ? 'completed' : startedCount === 0 ? 'not_started' : 'in_progress'
      };
      res.json({ participation, version, requiredCourses, progress });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/courses/:courseId/participations', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const participation = await repository.startCourseParticipation(actor.uid, req.params.courseId, new Date().toISOString());
      await recordAudit(actor.uid, 'Academy-Kursteilnahme begonnen', req.params.courseId, `Teilnahme an Kursversion ${participation.courseVersionId} begonnen.`, 'ACADEMY_PROGRESS');
      res.status(201).json({ participation });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/participations', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const participations = await repository.listOwnCourseParticipations(actor.uid);
      res.json({ participations });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/courses/:courseId/participations', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyCourseMasterDoc>('academy_courses', req.params.courseId);
      if (!master) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      if (!canManage(actor, master.ownerUid)) { res.status(403).json({ error: 'ACADEMY_RESOURCE_FORBIDDEN' }); return; }
      const participations = await repository.listCourseParticipations(master.id);
      res.json({ participations });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/participations/:participationId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const participation = await repository.getCourseParticipation(req.params.participationId);
      if (!participation) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      const master = await repository.get<AcademyCourseMasterDoc>('academy_courses', participation.courseId);
      const isOwner = participation.userUid === actor.uid;
      const isManager = Boolean(master && canManage(actor, master.ownerUid));
      if (!isOwner && !isManager) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      const [version, evidence, corrections] = await Promise.all([
        repository.get<AcademyCourseVersionDoc>('academy_course_versions', participation.courseVersionId),
        repository.listParticipationEvidence(participation.id),
        repository.listParticipationCorrections(participation.id)
      ]);
      res.json({ participation, version, evidence, corrections });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/participations/:participationId/evidence', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_EVIDENCE_BODY_INVALID' }); return; }
      const participation = await repository.getCourseParticipation(req.params.participationId);
      if (!participation) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      const master = await repository.get<AcademyCourseMasterDoc>('academy_courses', participation.courseId);
      const isOwner = participation.userUid === actor.uid;
      const isInstructor = Boolean(master && canManage(actor, master.ownerUid));
      if (!isOwner && !isInstructor) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      const version = await repository.get<AcademyCourseVersionDoc>('academy_course_versions', participation.courseVersionId);
      if (!version) { res.status(404).json({ error: 'ACADEMY_PINNED_VERSION_MISSING' }); return; }
      const requirementId = text(req.body.requirementId, 120);
      const requirement = version.completionRequirements.find(item => item.id === requirementId);
      if (!requirement) { res.status(404).json({ error: 'ACADEMY_COMPLETION_REQUIREMENT_NOT_FOUND' }); return; }
      if (requirement.type === 'required_assessment') {
        res.status(409).json({ error: 'ACADEMY_EVIDENCE_EXTERNAL_SOURCE_REQUIRED' }); return;
      }
      const selfEvidence = ['required_chapter', 'required_material', 'accepted_self_confirmation'].includes(requirement.type);
      const instructorEvidence = ['practical_task', 'instructor_confirmation'].includes(requirement.type);
      if (selfEvidence && !isOwner) { res.status(403).json({ error: 'ACADEMY_EVIDENCE_ACTOR_FORBIDDEN' }); return; }
      if (instructorEvidence && !isInstructor) { res.status(403).json({ error: 'ACADEMY_EVIDENCE_INSTRUCTOR_REQUIRED' }); return; }
      const now = new Date().toISOString();
      const evidence: Omit<AcademyProgressEvidenceDoc, 'id'> = {
        participationId: participation.id,
        requirementId: requirement.id,
        evidenceType: requirement.type,
        sourceId: requirement.targetId,
        recordedByUid: actor.uid,
        recordedIso: now,
        ...(req.body.details === undefined ? {} : { details: text(req.body.details, 2000) })
      };
      const result = await repository.recordProgressEvidence(participation.id, evidence, actor.uid, isInstructor);
      await recordAudit(actor.uid, 'Academy-Fortschrittsnachweis erfasst', master?.code || participation.courseId, `Nachweis für Abschlussbedingung ${requirement.id} erfasst.`, 'ACADEMY_PROGRESS');
      res.status(201).json(result);
    } catch (error) { fail(res, error, next); }
  });

  router.post('/participations/:participationId/correction', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      if (actor.role !== 'admin') { res.status(403).json({ error: 'ACADEMY_COMPLETION_CORRECTION_FORBIDDEN' }); return; }
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_CORRECTION_BODY_INVALID' }); return; }
      const expectedStatus = req.body.expectedStatus;
      const correctedStatus = req.body.correctedStatus;
      if (!['in_progress', 'completed'].includes(String(expectedStatus)) ||
          !['in_progress', 'completed'].includes(String(correctedStatus))) {
        res.status(400).json({ error: 'ACADEMY_COMPLETION_CORRECTION_STATUS_INVALID' }); return;
      }
      const participation = await repository.getCourseParticipation(req.params.participationId);
      if (!participation) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      const reason = text(req.body.reason, 1000);
      if (reason.length < 10) { res.status(400).json({ error: 'ACADEMY_COMPLETION_CORRECTION_REASON_REQUIRED' }); return; }
      if (req.body.invalidatedEvidenceIds !== undefined &&
          (!Array.isArray(req.body.invalidatedEvidenceIds) ||
           req.body.invalidatedEvidenceIds.some(value => typeof value !== 'string'))) {
        res.status(400).json({ error: 'ACADEMY_COMPLETION_CORRECTION_EVIDENCE_INVALID' }); return;
      }
      const now = new Date().toISOString();
      const correction: AcademyCompletionCorrectionDoc = {
        id: id('correction'),
        participationId: participation.id,
        previousStatus: expectedStatus as AcademyCompletionCorrectionDoc['previousStatus'],
        correctedStatus: correctedStatus as AcademyCompletionCorrectionDoc['correctedStatus'],
        reason,
        actorUid: actor.uid,
        correctedIso: now,
        ...(Array.isArray(req.body.invalidatedEvidenceIds)
          ? { invalidatedEvidenceIds: req.body.invalidatedEvidenceIds.filter((value): value is string => typeof value === 'string') }
          : {})
      };
      const updated = await repository.correctCourseParticipation(participation.id, correction, expectedStatus as 'in_progress' | 'completed');
      await recordAudit(actor.uid, 'Academy-Kursabschluss korrigiert', participation.courseId, `Teilnahme ${participation.id}: ${correction.previousStatus} → ${correction.correctedStatus}. Begründung: ${reason}`, 'ACADEMY_PROGRESS');
      res.json({ participation: updated, correction });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/notes', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const notes = await repository.listOwnPrivateNotes(actor.uid);
      res.json({ notes });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/notes', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_NOTE_BODY_INVALID' }); return; }
      const now = new Date().toISOString();
      const note: AcademyPrivateNoteDoc = {
        id: id('note'), ownerUid: actor.uid,
        materialId: text(req.body.materialId, 120), materialVersionId: text(req.body.materialVersionId, 160),
        kind: req.body.kind === 'bookmark' ? 'bookmark' : 'note',
        title: text(req.body.title, 200), content: text(req.body.content, 20000),
        tags: Array.isArray(req.body.tags) ? req.body.tags.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 20) : [],
        createdIso: now, updatedIso: now
      };
      await repository.saveOwnPrivateNote(actor.uid, note);
      res.status(201).json({ note });
    } catch (error) { fail(res, error, next); }
  });

  router.put('/notes/:noteId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_NOTE_BODY_INVALID' }); return; }
      const existing = await repository.getOwnPrivateNote(actor.uid, req.params.noteId);
      if (!existing) { res.status(404).json({ error: 'ACADEMY_NOTE_NOT_FOUND' }); return; }
      const note: AcademyPrivateNoteDoc = {
        ...existing,
        kind: req.body.kind === 'bookmark' ? 'bookmark' : req.body.kind === 'note' ? 'note' : existing.kind,
        title: req.body.title === undefined ? existing.title : text(req.body.title, 200),
        content: req.body.content === undefined ? existing.content : text(req.body.content, 20000),
        tags: req.body.tags === undefined ? existing.tags : Array.isArray(req.body.tags)
          ? req.body.tags.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 20)
          : existing.tags,
        updatedIso: new Date().toISOString()
      };
      await repository.saveOwnPrivateNote(actor.uid, note);
      res.json({ note });
    } catch (error) { fail(res, error, next); }
  });

  router.delete('/notes/:noteId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      await repository.deleteOwnPrivateNote(actor.uid, req.params.noteId);
      res.status(204).end();
    } catch (error) { fail(res, error, next); }
  });

  return router;
}
