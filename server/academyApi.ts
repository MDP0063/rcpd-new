import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type {
  AcademyCourseMasterDoc, AcademyCourseDraftDoc, AcademyCourseVersionDoc,
  AcademyProgramMasterDoc, AcademyProgramDraftDoc, AcademyProgramVersionDoc,
  AcademyPrivateNoteDoc
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
function id(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll('-', '')}`;
}
function statusFor(error: unknown): number {
  const code = error instanceof Error ? error.message : '';
  if (code.includes('NOT_FOUND')) return 404;
  if (code.includes('ACCESS_DENIED') || code.includes('OWNER_MISMATCH') || code.includes('ACTOR_MISMATCH')) return 403;
  if (code.includes('REVISION_CONFLICT') || code.includes('DRAFT_VERSION_MISMATCH') ||
      code.includes('ALREADY_EXISTS') || code.includes('ARCHIVED') || code.includes('APPEND_ONLY')) return 409;
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
  recordAudit: (actorUid: string, actionTitle: string, targetLabel: string, details: string) => Promise<void>
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
