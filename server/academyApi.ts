import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type {
  AcademyCourseMasterDoc, AcademyCourseDraftDoc, AcademyCourseVersionDoc,
  AcademyProgramMasterDoc, AcademyProgramDraftDoc, AcademyProgramVersionDoc,
  AcademyPrivateNoteDoc, AcademyPrivateNoteSource, AcademyCourseParticipationDoc, AcademyProgressEvidenceDoc, AcademyCompletionCorrectionDoc,
  AcademyMaterialCategoryDoc, AcademyMaterialDocumentTypeDoc,
  AcademyMaterialMasterDoc, AcademyMaterialDraftDoc, AcademyMaterialVersionDoc, AcademyMaterialVersionSummary, AcademyCourseMaterialReaderItem, AcademyMaterialReaderContent, AcademyPublicMaterialCatalogItem, AcademyPublicMaterialDetail
} from '../src/types/academy.ts';
import type { OfficerRole } from '../src/types/portal.ts';
import { canReadMaterialRole, courseVersionReferencesMaterial } from './academyMaterialReaderAccess.ts';
import { isAcademyEntryVisible } from './academyVisibility.ts';
import type { AcademyRepository } from './academyRepository.ts';

export interface AcademyAssessmentProof {
  attemptId: string;
  releasedAtIso: string;
  finalScoreBasisPoints: number;
}
type FinalExamProofResolver = (uid: string, examId: string, courseCode: string) => Promise<AcademyAssessmentProof | null>;

export interface AcademyApiActor {
  uid: string;
  role: OfficerRole;
  canGradeAssignedCourses?: boolean;
  assignedCourseCodes?: string[];
}

type ActorResolver = (uid: string) => AcademyApiActor | null;

const canCreate = (actor: AcademyApiActor) => actor.role === 'admin' || actor.role === 'colonel';
const canManage = (actor: AcademyApiActor, ownerUid: string) =>
  actor.role === 'admin' || (actor.role === 'colonel' && ownerUid === actor.uid);

/** Remove internal ownership and administrative archive metadata from participant-facing views. */
function participantCourseMasterView(master: AcademyCourseMasterDoc) {
  const {
    ownerUid: _ownerUid, archivedByUid: _archivedByUid,
    archiveReason: _archiveReason, materialReviewPending: _materialReviewPending,
    materialReviewVersionRequired: _materialReviewVersionRequired,
    materialReviewAwaitingActivation: _materialReviewAwaitingActivation, ...visible
  } = master;
  return visible;
}
function participantCourseVersionView(version: AcademyCourseVersionDoc) {
  const { createdByUid: _createdByUid, publishedByUid: _publishedByUid, ...visible } = version;
  return visible;
}
function participantProgramMasterView(master: AcademyProgramMasterDoc) {
  const { ownerUid: _ownerUid, archivedByUid: _archivedByUid, archiveReason: _archiveReason, ...visible } = master;
  return visible;
}
function participantProgramVersionView(version: AcademyProgramVersionDoc) {
  const { createdByUid: _createdByUid, publishedByUid: _publishedByUid, ...visible } = version;
  return visible;
}

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
  if (code === 'ACADEMY_MAINTENANCE_ACTIVE' || code === 'ACADEMY_MAINTENANCE_REQUIRED') return 503;
  if (code.includes('NOT_FOUND')) return 404;
  if (code.includes('ACCESS_DENIED') || code.includes('OWNER_MISMATCH') || code.includes('ACTOR_MISMATCH') || code.includes('EVIDENCE_ACTOR_FORBIDDEN') || code.includes('INSTRUCTOR_REQUIRED')) return 403;
  if (code.includes('REVISION_CONFLICT') || code.includes('DRAFT_VERSION_MISMATCH') ||
      code.includes('ALREADY_EXISTS') || code.includes('ARCHIVED') || code.includes('APPEND_ONLY') ||
      code.includes('NOT_STARTABLE') || code.includes('NOT_ACTIVE') || code.includes('CORRECTION_CONFLICT') ||
      code.includes('EVIDENCE_EXTERNAL_SOURCE_REQUIRED') || code.includes('CORRECTION_EVIDENCE_CONFLICT') ||
      code.includes('REQUIRES_EVIDENCE_INVALIDATION') || code.includes('CORRECTION_EVIDENCE_INCOMPLETE') || code.includes('PROGRAM_NOT_STARTABLE') || code.includes('PROGRAM_PARTICIPATION_ALREADY_EXISTS') || code.includes('PROGRAM_REQUIRED_COURSE_NOT_STARTABLE') || code.includes('PROGRAM_COURSE_VERSION_CONFLICT') || code.includes('PROGRAM_COURSE_PARTICIPATION_ENDED') || code.includes('PROGRAM_COURSE_VERSION_CONFLICT') || code.includes('CATEGORY_STATE_UNCHANGED') || code.includes('CATEGORY_IN_USE') || code.includes('DOCUMENT_TYPE_STATE_UNCHANGED') || code.includes('DOCUMENT_TYPE_IN_USE') || code.includes('MATERIAL_VERSION_NOT_PUBLISHED') || code.includes('MATERIAL_VERSION_ALREADY_EXISTS') || code.includes('DRAFT_ALREADY_PUBLISHED') ||
      code.includes('MATERIAL_REVIEW_PENDING') || code.includes('MATERIAL_REVIEW_NOT_FOUND') ||
      code.includes('MATERIAL_REVIEW_VERSION_REQUIRED') || code.includes('ARCHIVED_MATERIAL_NOT_STARTABLE')) return 409;
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
function normalizePrivateNoteSources(
  value: unknown,
  fallback: { materialId: string; materialVersionId: string }
): AcademyPrivateNoteSource[] {
  const input = value === undefined ? [fallback] : value;
  if (!Array.isArray(input) || input.length < 1 || input.length > 25) {
    throw new Error('ACADEMY_NOTE_SOURCES_INVALID');
  }
  const sources = input.map(source => {
    if (!isObject(source)) throw new Error('ACADEMY_NOTE_SOURCES_INVALID');
    const materialId = boundedText(source.materialId, 120);
    const materialVersionId = boundedText(source.materialVersionId, 160);
    if (!materialId || !materialVersionId) throw new Error('ACADEMY_NOTE_SOURCES_INVALID');
    const anchor = source.anchor;
    if (anchor !== undefined && !isObject(anchor)) throw new Error('ACADEMY_NOTE_SOURCES_INVALID');
    return {
      materialId,
      materialVersionId,
      ...(isObject(anchor) ? { anchor: {
        kind: anchor.kind,
        quote: anchor.quote,
        prefix: anchor.prefix,
        suffix: anchor.suffix,
        ...(anchor.headingPath === undefined ? {} : { headingPath: anchor.headingPath }),
        ...(anchor.startLine === undefined ? {} : { startLine: anchor.startLine }),
        ...(anchor.endLine === undefined ? {} : { endLine: anchor.endLine })
      } as AcademyPrivateNoteSource['anchor'] } : {})
    };
  });
  const keys = sources.map(source => `${source.materialId}::${source.materialVersionId}`);
  if (new Set(keys).size !== keys.length) throw new Error('ACADEMY_NOTE_SOURCES_INVALID');
  return sources;
}
function privateNoteWithNormalizedSources(note: AcademyPrivateNoteDoc): AcademyPrivateNoteDoc {
  return {
    ...note,
    sources: note.sources?.length ? note.sources : [{ materialId: note.materialId, materialVersionId: note.materialVersionId }]
  };
}
function revision(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 1 ? Number(value) : null;
}
const canManageMaterialCourse = (actor: AcademyApiActor, courseCode?: string) => {
  if (actor.role === 'admin' || actor.role === 'colonel') return true;
  if (actor.canGradeAssignedCourses !== true) return false;
  const assigned = Array.isArray(actor.assignedCourseCodes) ? actor.assignedCourseCodes : [];
  if (!courseCode) return assigned.includes('*');
  const normalized = courseCode.trim().toUpperCase();
  return assigned.includes('*') || assigned.some(code => code.toUpperCase() === normalized);
};
const canArchiveMaterials = (actor: AcademyApiActor) => actor.role === 'admin' || actor.role === 'colonel';
function materialDraftFromBody(
  materialId: string,
  body: Record<string, unknown>,
  workingRevision: number,
  actorUid: string,
  now: string,
  existing?: AcademyMaterialDraftDoc
): AcademyMaterialDraftDoc {
  const contentFormat = body.contentFormat === 'markdown' || body.contentFormat === 'code'
    ? body.contentFormat : '' as AcademyMaterialDraftDoc['contentFormat'];
  const requiredRole = body.requiredRole === undefined || body.requiredRole === ''
    ? undefined
    : body.requiredRole as OfficerRole;
  const description = body.description === undefined ? undefined : boundedText(body.description, 2000, true);
  if (body.description !== undefined && description === null) {
    throw new Error('ACADEMY_MATERIAL_DESCRIPTION_INVALID');
  }
  if (body.codeLanguage !== undefined && typeof body.codeLanguage !== 'string') {
    throw new Error('ACADEMY_MATERIAL_CODE_LANGUAGE_INVALID');
  }
  const codeLanguage = contentFormat === 'code' && typeof body.codeLanguage === 'string'
    ? body.codeLanguage.trim() || undefined : undefined;
  return {
    id: materialId,
    materialId,
    title: typeof body.title === 'string' ? body.title.trim() : '',
    ...(description == null || description === '' ? {} : { description }),
    categoryId: typeof body.categoryId === 'string' ? body.categoryId.trim() : '',
    documentTypeId: typeof body.documentTypeId === 'string' ? body.documentTypeId.trim() : '',
    ...(requiredRole === undefined ? {} : { requiredRole }),
    contentFormat,
    content: typeof body.content === 'string' ? body.content : '',
    ...(codeLanguage === undefined ? {} : { codeLanguage }),
    workingRevision,
    createdIso: existing?.createdIso ?? now,
    createdByUid: existing?.createdByUid ?? actorUid,
    updatedIso: now,
    updatedByUid: actorUid
  };
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

export async function resolveAcademyCourseCompletion(
  repository: AcademyRepository,
  participation: AcademyCourseParticipationDoc,
  resolveReleasedFinalExam?: FinalExamProofResolver,
  includeDetails = false
) {
  const version = await repository.get<AcademyCourseVersionDoc>('academy_course_versions', participation.courseVersionId);
  if (!version || version.courseId !== participation.courseId) throw new Error('ACADEMY_PINNED_VERSION_MISSING');
  const assessmentRequirements = version.completionRequirements.filter(item =>
    item.type === 'required_assessment' && (includeDetails || item.required)
  );
  const assessmentProofs: Record<string, AcademyAssessmentProof> = {};
  if (assessmentRequirements.length > 0 && resolveReleasedFinalExam) {
    const courseMaster = await repository.get<AcademyCourseMasterDoc>('academy_courses', participation.courseId);
    if (courseMaster) {
      for (const requirement of assessmentRequirements) {
        const proof = await resolveReleasedFinalExam(participation.userUid, requirement.targetId, courseMaster.code);
        if (proof) assessmentProofs[requirement.id] = proof;
      }
    }
  }
  const requiresLiveAssessment = version.completionRequirements.some(item =>
    item.required && item.type === 'required_assessment'
  );
  if (!requiresLiveAssessment) {
    if (!includeDetails) return { participation, version, evidence: [], corrections: [], assessmentProofs };
    const [evidence, corrections] = await Promise.all([
      repository.listParticipationEvidence(participation.id),
      repository.listParticipationCorrections(participation.id)
    ]);
    return { participation, version, evidence, corrections, assessmentProofs };
  }
  const [evidence, corrections] = await Promise.all([
    repository.listParticipationEvidence(participation.id),
    repository.listParticipationCorrections(participation.id)
  ]);
  const invalidated = new Set(corrections.flatMap(item => item.invalidatedEvidenceIds ?? []));
  const activeEvidence = evidence.filter(item => !invalidated.has(item.id));
  const required = version.completionRequirements.filter(item => item.required);
  const complete = required.length > 0 && required.every(requirement =>
    requirement.type === 'required_assessment'
      ? Boolean(assessmentProofs[requirement.id])
      : activeEvidence.some(item => item.requirementId === requirement.id)
  );
  if (complete) {
    const completionTimes = required.flatMap(requirement => {
      if (requirement.type === 'required_assessment') {
        const timestamp = assessmentProofs[requirement.id]?.releasedAtIso;
        return timestamp ? [timestamp] : [];
      }
      return activeEvidence.filter(item => item.requirementId === requirement.id).map(item => item.recordedIso);
    }).filter(value => Number.isFinite(Date.parse(value))).sort();
    const completedIso = completionTimes[completionTimes.length - 1] || participation.completedIso || participation.updatedIso;
    return {
      participation: { ...participation, status: 'completed' as const, completedIso },
      version, evidence, corrections, assessmentProofs
    };
  }
  if (participation.status === 'completed') {
    const { completedIso: _completedIso, ...inProgress } = participation;
    return {
      participation: { ...inProgress, status: 'in_progress' as const },
      version, evidence, corrections, assessmentProofs
    };
  }
  return { participation, version, evidence, corrections, assessmentProofs };
}

export function createAcademyApiRouter(
  repository: AcademyRepository,
  resolveActor: ActorResolver,
  recordAudit: (actorUid: string, actionTitle: string, targetLabel: string, details: string, category?: 'ACADEMY_DOC' | 'ACADEMY_PROGRESS') => Promise<void>,
  notifyMaterialReview?: (recipientUid: string, notificationId: string, title: string, message: string) => Promise<void>,
  resolveReleasedFinalExam?: FinalExamProofResolver
) {
  const router = Router();


  async function withPinnedMaterialLabels(draft: AcademyCourseDraftDoc): Promise<AcademyCourseDraftDoc> {
    const chapters = await Promise.all(draft.chapters.map(async chapter => {
      if (!Array.isArray(chapter.materialReferences)) return chapter;
      const materialReferences = await Promise.all(chapter.materialReferences.map(async reference => {
        if (typeof reference.materialId !== 'string' || typeof reference.materialVersionId !== 'string') return reference;
        const pinnedVersion = await repository.get<AcademyMaterialVersionDoc>('academy_material_versions', reference.materialVersionId);
        if (!pinnedVersion || pinnedVersion.materialId !== reference.materialId) {
          const { title: _title, versionNumber: _versionNumber, ...withoutSnapshot } = reference;
          return withoutSnapshot;
        }
        return { ...reference, title: pinnedVersion.title, versionNumber: pinnedVersion.versionNumber };
      }));
      return { ...chapter, materialReferences };
    }));
    return { ...draft, chapters };
  }

  async function dispatchPendingMaterialReviewNotifications(): Promise<void> {
    if (!notifyMaterialReview) return;
    try {
      const courses = await repository.listPendingMaterialReviewCourses();
      for (const course of courses) {
        for (const item of course.materialReviewPending ?? []) {
          if (item.notificationSentIso) continue;
          const notificationId = `academy-material-review-${course.id}-${item.materialVersionId}`;
          try {
            await notifyMaterialReview(
              course.ownerUid,
              notificationId,
              'Neue Materialfassung – Kursprüfung erforderlich',
              `Im Kurs ${course.code} wird das Material ${item.materialCode} (${item.materialTitle}, Version ${item.materialVersionNumber}) verwendet. Eine neue Materialfassung wurde veröffentlicht. Bitte prüfe, ob die bisherige Kursversion unverändert verfügbar bleiben kann oder aktualisiert werden muss.`
            );
            await repository.markMaterialReviewNotificationSent(
              course.id, item.materialId, item.materialVersionId, new Date().toISOString()
            );
          } catch {
            // The durable review marker remains pending; a later Academy request retries it.
          }
        }
      }
    } catch {
      // Notification lookup/delivery is best-effort and must never roll back or mask
      // the already committed material publication and precautionary course lock.
    }
  }

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
      const visibleCategories = categories.map(category => ({
        id: category.id,
        name: category.name,
        ...(category.description === undefined ? {} : { description: category.description }),
        status: category.status,
        revision: category.revision
      }));
      res.json({ categories: visibleCategories });
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

  router.delete('/materials/categories/:categoryId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!requireEditor(actor, res)) return;
      const expectedRevision = isObject(req.body) ? revision(req.body.expectedRevision) : null;
      if (expectedRevision === null) { res.status(400).json({ error: 'ACADEMY_MATERIAL_CATEGORY_REVISION_INVALID' }); return; }
      const deleted = await repository.deleteMaterialCategory(req.params.categoryId, expectedRevision, actor.uid);
      await recordAudit(actor.uid, 'Academy-Materialkategorie endgültig gelöscht', deleted.name,
        `Kategorie ${deleted.id} endgültig gelöscht; zum Löschzeitpunkt waren keine Materialzuordnungen vorhanden.`);
      res.status(204).end();
    } catch (error) { fail(res, error, next); }
  });

  router.get('/materials/document-types', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const documentTypes = await repository.listMaterialDocumentTypes();
      documentTypes.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return a.name.localeCompare(b.name, 'de-DE');
      });
      const visibleDocumentTypes = documentTypes.map(documentType => ({
        id: documentType.id,
        name: documentType.name,
        ...(documentType.description === undefined ? {} : { description: documentType.description }),
        status: documentType.status,
        revision: documentType.revision
      }));
      res.json({ documentTypes: visibleDocumentTypes });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/materials/document-types', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!requireEditor(actor, res)) return;
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_MATERIAL_DOCUMENT_TYPE_BODY_INVALID' }); return; }
      const name = boundedText(req.body.name, 80);
      const description = req.body.description === undefined ? undefined : boundedText(req.body.description, 300, true);
      if (name === null || (req.body.description !== undefined && description === null)) {
        res.status(400).json({ error: 'ACADEMY_MATERIAL_DOCUMENT_TYPE_INVALID' }); return;
      }
      const now = new Date().toISOString();
      const documentType: AcademyMaterialDocumentTypeDoc = {
        id: id('material_document_type'), name,
        ...(description == null ? {} : { description }),
        status: 'active', revision: 1,
        createdIso: now, createdByUid: actor.uid, updatedIso: now, updatedByUid: actor.uid
      };
      await repository.createMaterialDocumentType(documentType);
      await recordAudit(actor.uid, 'Academy-Dokumenttyp erstellt', documentType.name,
        `Dokumenttyp ${documentType.id} angelegt.`);
      res.status(201).json({ documentType });
    } catch (error) { fail(res, error, next); }
  });

  router.put('/materials/document-types/:documentTypeId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!requireEditor(actor, res)) return;
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_MATERIAL_DOCUMENT_TYPE_BODY_INVALID' }); return; }
      const existing = await repository.get<AcademyMaterialDocumentTypeDoc>('academy_material_document_types', req.params.documentTypeId);
      if (!existing) { res.status(404).json({ error: 'ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_FOUND' }); return; }
      const expectedRevision = revision(req.body.expectedRevision);
      if (expectedRevision === null) { res.status(400).json({ error: 'ACADEMY_MATERIAL_DOCUMENT_TYPE_REVISION_INVALID' }); return; }
      const name = req.body.name === undefined ? existing.name : boundedText(req.body.name, 80);
      const description = req.body.description === undefined ? existing.description : boundedText(req.body.description, 300, true);
      if (name === null || (req.body.description !== undefined && description === null)) {
        res.status(400).json({ error: 'ACADEMY_MATERIAL_DOCUMENT_TYPE_INVALID' }); return;
      }
      const documentType: AcademyMaterialDocumentTypeDoc = {
        ...existing, name,
        ...(description == null ? {} : { description }),
        revision: expectedRevision + 1, updatedIso: new Date().toISOString(), updatedByUid: actor.uid
      };
      await repository.updateMaterialDocumentType(documentType, expectedRevision, actor.uid);
      await recordAudit(actor.uid, 'Academy-Dokumenttyp geändert', documentType.name,
        `Dokumenttyp ${documentType.id}; Revision ${documentType.revision}.`);
      res.json({ documentType });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/materials/document-types/:documentTypeId/archive', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!requireEditor(actor, res)) return;
      const expectedRevision = isObject(req.body) ? revision(req.body.expectedRevision) : null;
      if (expectedRevision === null) { res.status(400).json({ error: 'ACADEMY_MATERIAL_DOCUMENT_TYPE_REVISION_INVALID' }); return; }
      const documentType = await repository.setMaterialDocumentTypeArchived(
        req.params.documentTypeId, true, expectedRevision, actor.uid, new Date().toISOString()
      );
      await recordAudit(actor.uid, 'Academy-Dokumenttyp archiviert', documentType.name,
        `Dokumenttyp ${documentType.id} archiviert; bestehende Referenzen bleiben erhalten.`);
      res.json({ documentType });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/materials/document-types/:documentTypeId/restore', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!requireEditor(actor, res)) return;
      const expectedRevision = isObject(req.body) ? revision(req.body.expectedRevision) : null;
      if (expectedRevision === null) { res.status(400).json({ error: 'ACADEMY_MATERIAL_DOCUMENT_TYPE_REVISION_INVALID' }); return; }
      const documentType = await repository.setMaterialDocumentTypeArchived(
        req.params.documentTypeId, false, expectedRevision, actor.uid, new Date().toISOString()
      );
      await recordAudit(actor.uid, 'Academy-Dokumenttyp reaktiviert', documentType.name,
        `Dokumenttyp ${documentType.id} reaktiviert.`);
      res.json({ documentType });
    } catch (error) { fail(res, error, next); }
  });

  router.delete('/materials/document-types/:documentTypeId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!requireEditor(actor, res)) return;
      const expectedRevision = isObject(req.body) ? revision(req.body.expectedRevision) : null;
      if (expectedRevision === null) { res.status(400).json({ error: 'ACADEMY_MATERIAL_DOCUMENT_TYPE_REVISION_INVALID' }); return; }
      const deleted = await repository.deleteMaterialDocumentType(req.params.documentTypeId, expectedRevision, actor.uid);
      await recordAudit(actor.uid, 'Academy-Dokumenttyp endgültig gelöscht', deleted.name,
        `Dokumenttyp ${deleted.id} endgültig gelöscht; zum Löschzeitpunkt waren keine Materialzuordnungen vorhanden.`);
      res.status(204).end();
    } catch (error) { fail(res, error, next); }
  });

  // Öffentlicher Lernbibliothekskatalog: ausschließlich freigegebene aktuelle Versionen.
  // Diese Routen bleiben bewusst getrennt von der administrativen Materialverwaltung.
  router.get('/materials/catalog', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const [masters, categories, documentTypes] = await Promise.all([
        repository.list<AcademyMaterialMasterDoc>('academy_materials'),
        repository.list<AcademyMaterialCategoryDoc>('academy_material_categories'),
        repository.list<AcademyMaterialDocumentTypeDoc>('academy_material_document_types')
      ]);
      const categoriesById = new Map(categories.map(category => [category.id, category]));
      const documentTypesById = new Map(documentTypes.map(documentType => [documentType.id, documentType]));
      const publishedMasters = masters.filter(master =>
        master.publicationStatus === 'published' && Boolean(master.currentPublishedVersionId)
      );
      const rows = await Promise.all(publishedMasters.map(async master => {
        const version = await repository.get<AcademyMaterialVersionDoc>(
          'academy_material_versions', master.currentPublishedVersionId!
        );
        if (!version || version.materialId !== master.id ||
            !canReadMaterialRole(actor.role, version.requiredRole)) return null;
        const category = categoriesById.get(version.categoryId);
        const documentType = documentTypesById.get(version.documentTypeId);
        const item: AcademyPublicMaterialCatalogItem = {
          id: master.id,
          code: master.code,
          title: version.title,
          ...(version.description === undefined ? {} : { description: version.description }),
          categoryId: version.categoryId,
          categoryName: category?.name || 'Kategorie nicht verfügbar',
          documentTypeId: version.documentTypeId,
          documentTypeName: documentType?.name || 'Dokumenttyp nicht verfügbar',
          ...(version.requiredRole === undefined ? {} : { requiredRole: version.requiredRole }),
          contentFormat: version.contentFormat,
          versionId: version.id,
          versionNumber: version.versionNumber,
          publishedIso: version.publishedIso
        };
        return item;
      }));
      const materials = rows.filter((item): item is AcademyPublicMaterialCatalogItem => item !== null);
      materials.sort((a, b) => a.title.localeCompare(b.title, 'de-DE'));
      res.json({ materials });
    } catch (error) { fail(res, error, next); }
  });

  // Der Reader lädt ausschließlich die vom Materialstammsatz referenzierte veröffentlichte Version.
  router.get('/materials/catalog/:materialId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyMaterialMasterDoc>('academy_materials', req.params.materialId);
      if (!master || master.publicationStatus !== 'published' || !master.currentPublishedVersionId) {
        res.status(404).json({ error: 'ACADEMY_MATERIAL_NOT_FOUND' }); return;
      }
      const version = await repository.get<AcademyMaterialVersionDoc>(
        'academy_material_versions', master.currentPublishedVersionId
      );
      if (!version || version.materialId !== master.id ||
          !canReadMaterialRole(actor.role, version.requiredRole)) {
        res.status(404).json({ error: 'ACADEMY_MATERIAL_NOT_FOUND' }); return;
      }
      const [category, documentType] = await Promise.all([
        repository.get<AcademyMaterialCategoryDoc>('academy_material_categories', version.categoryId),
        repository.get<AcademyMaterialDocumentTypeDoc>('academy_material_document_types', version.documentTypeId)
      ]);
      const material: AcademyPublicMaterialDetail = {
        id: master.id,
        code: master.code,
        title: version.title,
        ...(version.description === undefined ? {} : { description: version.description }),
        categoryId: version.categoryId,
        categoryName: category?.name || 'Kategorie nicht verfügbar',
        documentTypeId: version.documentTypeId,
        documentTypeName: documentType?.name || 'Dokumenttyp nicht verfügbar',
        ...(version.requiredRole === undefined ? {} : { requiredRole: version.requiredRole }),
        contentFormat: version.contentFormat,
        versionId: version.id,
        versionNumber: version.versionNumber,
        publishedIso: version.publishedIso,
        content: version.content,
        ...(version.codeLanguage === undefined ? {} : { codeLanguage: version.codeLanguage })
      };
      res.json({ material });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/materials', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const masters = await repository.list<AcademyMaterialMasterDoc>('academy_materials');
      const visible = masters.filter(master => canManageMaterialCourse(actor, master.responsibleCourseCode));
      const materials = await Promise.all(visible.map(async master => {
        const draft = await repository.getMaterialDraft(master.id);
        const version = master.currentPublishedVersionId
          ? await repository.get<AcademyMaterialVersionDoc>('academy_material_versions', master.currentPublishedVersionId)
          : null;
        const draftSummary = draft ? {
          title: draft.title, categoryId: draft.categoryId, documentTypeId: draft.documentTypeId,
          contentFormat: draft.contentFormat, workingRevision: draft.workingRevision, updatedIso: draft.updatedIso
        } : null;
        const versionSummary: AcademyMaterialVersionSummary | null = version ? {
          id: version.id, materialId: version.materialId, versionNumber: version.versionNumber,
          title: version.title, contentFormat: version.contentFormat,
          publishedIso: version.publishedIso, publishedByUid: version.publishedByUid
        } : null;
        return { master, draft: draftSummary, currentVersion: versionSummary };
      }));
      materials.sort((a, b) => b.master.updatedIso.localeCompare(a.master.updatedIso));
      res.json({ materials });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/materials', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_MATERIAL_BODY_INVALID' }); return; }
      const responsibleCourseCode = typeof req.body.responsibleCourseCode === 'string' && req.body.responsibleCourseCode.trim()
        ? req.body.responsibleCourseCode.trim().toUpperCase() : undefined;
      if (!canManageMaterialCourse(actor, responsibleCourseCode) ||
          (!responsibleCourseCode && actor.role !== 'admin' && actor.role !== 'colonel')) {
        res.status(403).json({ error: 'ACADEMY_MATERIAL_SCOPE_FORBIDDEN' }); return;
      }
      if (responsibleCourseCode && !/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(responsibleCourseCode)) {
        res.status(400).json({ error: 'ACADEMY_MATERIAL_COURSE_SCOPE_INVALID' }); return;
      }
      const now = new Date().toISOString();
      const materialId = id('material');
      const code = 'MAT-' + new Date().getUTCFullYear() + '-' + randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
      const master: AcademyMaterialMasterDoc = {
        id: materialId, code, ownerUid: actor.uid,
        ...(responsibleCourseCode ? { responsibleCourseCode } : {}),
        publicationStatus: 'draft', latestVersionNumber: 0, workingRevision: 1,
        createdIso: now, updatedIso: now
      };
      const draft = materialDraftFromBody(materialId, req.body, 1, actor.uid, now);
      await repository.createMaterialWithDraft(master, draft);
      await recordAudit(actor.uid, 'Academy-Materialentwurf erstellt', code,
        'Material ' + materialId + ' als Entwurf angelegt; Arbeitsrevision 1.');
      res.status(201).json({ master, draft });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/materials/:materialId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyMaterialMasterDoc>('academy_materials', req.params.materialId);
      if (!master) { res.status(404).json({ error: 'ACADEMY_MATERIAL_NOT_FOUND' }); return; }
      if (!canManageMaterialCourse(actor, master.responsibleCourseCode)) {
        res.status(403).json({ error: 'ACADEMY_MATERIAL_SCOPE_FORBIDDEN' }); return;
      }
      const rawOffset = req.query.offset;
      const offset = rawOffset === undefined ? 0 : Number(rawOffset);
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) { res.status(400).json({ error: 'ACADEMY_MATERIAL_HISTORY_OFFSET_INVALID' }); return; }
      const pageSize = 50;
      const [draft, versions] = await Promise.all([
        repository.getMaterialDraft(master.id),
        repository.list<AcademyMaterialVersionDoc>('academy_material_versions', { where: [{ field: 'materialId', value: master.id }], orderBy: 'versionNumber', orderDirection: 'desc', offset, limit: pageSize + 1 })
      ]);
      const hasMoreVersions = versions.length > pageSize;
      const page = versions.slice(0, pageSize);
      const currentVersion = master.currentPublishedVersionId ? await repository.get<AcademyMaterialVersionDoc>('academy_material_versions', master.currentPublishedVersionId) : null;
      const versionSummaries: AcademyMaterialVersionSummary[] = page.map(version => ({ id: version.id, materialId: version.materialId, versionNumber: version.versionNumber, title: version.title, contentFormat: version.contentFormat, publishedIso: version.publishedIso, publishedByUid: version.publishedByUid }));
      res.json({ master, draft, currentVersion, versions: versionSummaries, hasMoreVersions, nextVersionOffset: hasMoreVersions ? offset + pageSize : null });
    } catch (error) { fail(res, error, next); }
  });

  router.put('/materials/:materialId/draft', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyMaterialMasterDoc>('academy_materials', req.params.materialId);
      if (!master) { res.status(404).json({ error: 'ACADEMY_MATERIAL_NOT_FOUND' }); return; }
      if (!canManageMaterialCourse(actor, master.responsibleCourseCode)) {
        res.status(403).json({ error: 'ACADEMY_MATERIAL_SCOPE_FORBIDDEN' }); return;
      }
      if (!isObject(req.body) || !isObject(req.body.draft)) {
        res.status(400).json({ error: 'ACADEMY_MATERIAL_DRAFT_BODY_INVALID' }); return;
      }
      const expected = revision(req.body.expectedRevision);
      if (expected === null) { res.status(400).json({ error: 'ACADEMY_REVISION_INVALID' }); return; }
      const existing = await repository.getMaterialDraft(master.id);
      if (!existing) { res.status(404).json({ error: 'ACADEMY_MATERIAL_DRAFT_NOT_FOUND' }); return; }
      const draft = materialDraftFromBody(master.id, req.body.draft, expected + 1, actor.uid, new Date().toISOString(), existing);
      await repository.saveMaterialDraft(master.id, draft, expected, actor.uid);
      await recordAudit(actor.uid, 'Academy-Materialentwurf geändert', master.code,
        'Arbeitsrevision ' + draft.workingRevision + ' gespeichert.');
      res.json({ draft });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/materials/:materialId/publish', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyMaterialMasterDoc>('academy_materials', req.params.materialId);
      if (!master) { res.status(404).json({ error: 'ACADEMY_MATERIAL_NOT_FOUND' }); return; }
      if (!canManageMaterialCourse(actor, master.responsibleCourseCode)) {
        res.status(403).json({ error: 'ACADEMY_MATERIAL_SCOPE_FORBIDDEN' }); return;
      }
      const expected = isObject(req.body) ? revision(req.body.expectedRevision) : null;
      if (expected === null) { res.status(400).json({ error: 'ACADEMY_REVISION_INVALID' }); return; }
      const draft = await repository.getMaterialDraft(master.id);
      if (!draft) { res.status(409).json({ error: 'ACADEMY_MATERIAL_DRAFT_MISSING' }); return; }
      const now = new Date().toISOString();
      const versionNumber = master.latestVersionNumber + 1;
      const version: AcademyMaterialVersionDoc = {
        id: master.id + '__v' + versionNumber, materialId: master.id, versionNumber,
        title: draft.title, ...(draft.description === undefined ? {} : { description: draft.description }),
        categoryId: draft.categoryId, documentTypeId: draft.documentTypeId,
        ...(draft.requiredRole === undefined ? {} : { requiredRole: draft.requiredRole }),
        contentFormat: draft.contentFormat, content: draft.content,
        ...(draft.codeLanguage === undefined ? {} : { codeLanguage: draft.codeLanguage }),
        publishedIso: now, publishedByUid: actor.uid,
        createdIso: now, createdByUid: actor.uid, workingRevision: expected
      };
      const nextMaster: AcademyMaterialMasterDoc = {
        ...master, publicationStatus: 'published',
        currentPublishedVersionId: version.id, latestVersionNumber: versionNumber,
        lastPublishedWorkingRevision: expected, updatedIso: now
      };
      await repository.publishMaterialVersion(master.id, version, nextMaster, expected, actor.uid);
      await recordAudit(actor.uid, 'Academy-Materialversion veröffentlicht', master.code,
        'Version ' + version.versionNumber + ' veröffentlicht (' + version.id + ').');
      await dispatchPendingMaterialReviewNotifications();
      res.status(201).json({ master: nextMaster, version });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/materials/:materialId/archive', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      if (!canArchiveMaterials(actor)) { res.status(403).json({ error: 'ACADEMY_MATERIAL_ARCHIVE_FORBIDDEN' }); return; }
      const expected = isObject(req.body) ? revision(req.body.expectedRevision) : null;
      const reason = isObject(req.body) ? boundedText(req.body.reason, 1000) : null;
      if (expected === null || reason === null || reason.length < 10) {
        res.status(400).json({ error: 'ACADEMY_MATERIAL_ARCHIVE_REASON_INVALID' }); return;
      }
      const master = await repository.archiveMaterial(req.params.materialId, expected, actor.uid, reason, new Date().toISOString());
      await recordAudit(actor.uid, 'Academy-Material archiviert', master.code,
        'Material ' + master.id + ' archiviert. Begründung: ' + reason);
      res.json({ master });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/courses', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      await dispatchPendingMaterialReviewNotifications();
      const [masters, ownParticipations] = await Promise.all([
        repository.list<AcademyCourseMasterDoc>('academy_courses'),
        repository.listOwnCourseParticipations(actor.uid)
      ]);
      const participatedCourseIds = new Set(ownParticipations.map(item => item.courseId));
      const visible = masters.filter(master => isAcademyEntryVisible({
        publicationStatus: master.publicationStatus, availability: master.availability,
        isManager: canManage(actor, master.ownerUid), hasParticipation: participatedCourseIds.has(master.id)
      }));
      const courses = await Promise.all(visible.map(async master => {
        const manager = canManage(actor, master.ownerUid);
        const [version, storedDraft] = await Promise.all([
          master.currentPublishedVersionId ? repository.get<AcademyCourseVersionDoc>('academy_course_versions', master.currentPublishedVersionId) : Promise.resolve(null),
          manager ? repository.getCourseDraft(master.id) : Promise.resolve(null)
        ]);
        const draft = storedDraft ? {
          ...storedDraft,
          chapters: await Promise.all(storedDraft.chapters.map(async chapter => ({
            ...chapter,
            materialReferences: await Promise.all(chapter.materialReferences.map(async reference => {
              if (typeof reference.materialId !== 'string' || typeof reference.materialVersionId !== 'string') return reference;
              const pinnedVersion = await repository.get<AcademyMaterialVersionDoc>('academy_material_versions', reference.materialVersionId);
              if (!pinnedVersion || pinnedVersion.materialId !== reference.materialId) {
                const { title: _title, versionNumber: _versionNumber, ...withoutSnapshot } = reference;
                return withoutSnapshot;
              }
              return { ...reference, title: pinnedVersion.title, versionNumber: pinnedVersion.versionNumber };
            }))
          })))
        } : null;
        return {
          master: manager ? master : participantCourseMasterView(master),
          version: version && !manager ? participantCourseVersionView(version) : version,
          draft
        };
      }));
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
      const draft = await withPinnedMaterialLabels(makeCourseDraft(courseId, req.body, 1, actor.uid, now));
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
      const hasParticipation = !editor && (await repository.listOwnCourseParticipations(actor.uid)).some(item => item.courseId === master.id);
      if (!isAcademyEntryVisible({ publicationStatus: master.publicationStatus, availability: master.availability, isManager: editor, hasParticipation })) {
        res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return;
      }
      const version = master.currentPublishedVersionId
        ? await repository.get<AcademyCourseVersionDoc>('academy_course_versions', master.currentPublishedVersionId)
        : null;
      const storedDraft = editor ? await repository.getCourseDraft(master.id) : null;
      const draft = storedDraft ? await withPinnedMaterialLabels(storedDraft) : null;
      res.json({
        master: editor ? master : participantCourseMasterView(master),
        version: version && !editor ? participantCourseVersionView(version) : version,
        draft
      });
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
      const draft = await withPinnedMaterialLabels(makeCourseDraft(master.id, req.body.draft, expected + 1, actor.uid, new Date().toISOString()));
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
      const [masters, ownParticipations] = await Promise.all([
        repository.list<AcademyProgramMasterDoc>('academy_programs'),
        repository.listOwnProgramParticipations(actor.uid)
      ]);
      const participatedProgramIds = new Set(ownParticipations.map(item => item.programId));
      const visible = masters.filter(master => isAcademyEntryVisible({
        publicationStatus: master.publicationStatus, availability: master.availability,
        isManager: canManage(actor, master.ownerUid), hasParticipation: participatedProgramIds.has(master.id)
      }));
      const programs = await Promise.all(visible.map(async master => {
        const manager = canManage(actor, master.ownerUid);
        const version = master.currentPublishedVersionId
          ? await repository.get<AcademyProgramVersionDoc>('academy_program_versions', master.currentPublishedVersionId)
          : null;
        return {
          master: manager ? master : participantProgramMasterView(master),
          version: version && !manager ? participantProgramVersionView(version) : version,
          draft: manager ? await repository.getProgramDraft(master.id) : null
        };
      }));
      res.json({ programs });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/courses/:courseId/material-review', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyCourseMasterDoc>('academy_courses', req.params.courseId);
      if (!master) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      if (!requireOwnerOrAdmin(actor, master.ownerUid, res)) return;
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_MATERIAL_REVIEW_BODY_INVALID' }); return; }
      const materialId = boundedText(req.body.materialId, 160);
      const materialVersionId = boundedText(req.body.materialVersionId, 200);
      const decision = req.body.decision;
      if (!materialId || !materialVersionId ||
          (decision !== 'keep_available' && decision !== 'stay_offline')) {
        res.status(400).json({ error: 'ACADEMY_MATERIAL_REVIEW_DECISION_INVALID' }); return;
      }
      const updated = await repository.resolveMaterialReview(
        master.id, materialId, materialVersionId, decision, new Date().toISOString()
      );
      await recordAudit(actor.uid, 'Academy-Materialprüfung abgeschlossen', master.code,
        `Material ${materialId}, Fassung ${materialVersionId}; Entscheidung: ${decision === 'keep_available' ? 'bisherige Kursversion fachlich freigegeben; Reaktivierung nur ohne weitere Sperren' : 'Kurs bleibt offline; neue Kursversion erforderlich'}.`);
      res.json({ master: updated });
    } catch (error) { fail(res, error, next); }
  });

  router.put('/courses/:courseId/availability', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const master = await repository.get<AcademyCourseMasterDoc>('academy_courses', req.params.courseId);
      if (!master) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      if (!requireOwnerOrAdmin(actor, master.ownerUid, res)) return;
      if (!isObject(req.body) || (req.body.availability !== 'available' && req.body.availability !== 'unavailable')) {
        res.status(400).json({ error: 'ACADEMY_COURSE_AVAILABILITY_INVALID' }); return;
      }
      if (req.body.availability === 'available' && (master.materialReviewPending?.length ?? 0) > 0) {
        res.status(409).json({ error: 'ACADEMY_COURSE_MATERIAL_REVIEW_PENDING' }); return;
      }
      if (req.body.availability === 'available' && (master.materialReviewVersionRequired?.length ?? 0) > 0) {
        res.status(409).json({ error: 'ACADEMY_COURSE_MATERIAL_REVIEW_VERSION_REQUIRED' }); return;
      }
      const updated = await repository.setCourseAvailability(
        master.id, req.body.availability, new Date().toISOString()
      );
      await recordAudit(actor.uid, 'Academy-Kursverfügbarkeit geändert', master.code,
        `Verfügbarkeit: ${updated.availability}.`);
      res.json({ master: updated });
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
      const hasParticipation = !editor && (await repository.listOwnProgramParticipations(actor.uid)).some(item => item.programId === master.id);
      if (!isAcademyEntryVisible({ publicationStatus: master.publicationStatus, availability: master.availability, isManager: editor, hasParticipation })) {
        res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return;
      }
      const version = master.currentPublishedVersionId
        ? await repository.get<AcademyProgramVersionDoc>('academy_program_versions', master.currentPublishedVersionId)
        : null;
      const draft = editor ? await repository.getProgramDraft(master.id) : null;
      res.json({
        master: editor ? master : participantProgramMasterView(master),
        version: version && !editor ? participantProgramVersionView(version) : version,
        draft
      });
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
        const currentParticipation = courseParticipation
          ? (await resolveAcademyCourseCompletion(repository, courseParticipation, resolveReleasedFinalExam)).participation
          : null;
        return { pin, version: courseVersion, participation: currentParticipation };
      }));
      const completedCount = requiredCourses.filter(item => item.participation?.status === 'completed').length;
      const startedCount = requiredCourses.filter(item => Boolean(item.participation)).length;
      const progress = {
        requiredCourseCount: requiredCourses.length,
        startedRequiredCourseCount: startedCount,
        completedRequiredCourseCount: completedCount,
        completionPercentage: requiredCourses.length === 0 ? 0 : Math.round(completedCount / requiredCourses.length * 100),
        status: requiredCourses.length > 0 && completedCount === requiredCourses.length
          ? 'completed'
          : startedCount === 0 ? 'not_started' : 'in_progress'
      };
      const participantVersion = participantProgramVersionView(version);
      const participantRequiredCourses = requiredCourses.map(item => ({
        ...item,
        version: participantCourseVersionView(item.version)
      }));
      res.json({ participation, version: participantVersion, requiredCourses: participantRequiredCourses, progress });
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
      const storedParticipations = await repository.listOwnCourseParticipations(actor.uid);
      const participations = await Promise.all(storedParticipations.map(async item =>
        (await resolveAcademyCourseCompletion(repository, item, resolveReleasedFinalExam)).participation
      ));
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
      const storedParticipations = await repository.listCourseParticipations(master.id);
      const participations = await Promise.all(storedParticipations.map(async item =>
        (await resolveAcademyCourseCompletion(repository, item, resolveReleasedFinalExam)).participation
      ));
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
      const completion = await resolveAcademyCourseCompletion(repository, participation, resolveReleasedFinalExam, true);
      const { participation: currentParticipation, version, evidence, corrections, assessmentProofs } = completion;
      const references = version.chapters.flatMap(chapter => chapter.materialReferences.map(reference => ({ ...reference, chapterId: chapter.id, chapterTitle: chapter.title, chapterOrder: chapter.order })));
      const materials: AcademyCourseMaterialReaderItem[] = await Promise.all(references.map(async reference => {
        const [master, materialVersion] = await Promise.all([
          repository.get<AcademyMaterialMasterDoc>('academy_materials', reference.materialId),
          repository.get<AcademyMaterialVersionDoc>('academy_material_versions', reference.materialVersionId)
        ]);
        const baseItem = { chapterId: reference.chapterId, chapterTitle: reference.chapterTitle, chapterOrder: reference.chapterOrder,
          materialId: reference.materialId, materialVersionId: reference.materialVersionId, required: reference.required, order: reference.order };
        if (!master || !materialVersion || materialVersion.id !== reference.materialVersionId || materialVersion.materialId !== reference.materialId ||
            !materialVersion.publishedIso || !materialVersion.publishedByUid) return { ...baseItem, accessStatus: 'unavailable' as const };
        if (!canReadMaterialRole(actor.role, materialVersion.requiredRole)) return { ...baseItem, accessStatus: 'restricted' as const };
        return { ...baseItem, accessStatus: 'available' as const, materialCode: master.code, title: materialVersion.title,
          versionNumber: materialVersion.versionNumber, contentFormat: materialVersion.contentFormat };
      }));
      const visibleEvidence = isManager ? evidence : evidence.map(item => {
        const { recordedByUid, ...visible } = item;
        return { ...visible, recordedByParticipant: recordedByUid === actor.uid };
      });
      const visibleCorrections = isManager ? corrections : corrections.map(correction => ({
        id: correction.id,
        participationId: correction.participationId,
        previousStatus: correction.previousStatus,
        correctedStatus: correction.correctedStatus,
        correctedIso: correction.correctedIso,
        ...(correction.invalidatedEvidenceIds ? { invalidatedEvidenceIds: correction.invalidatedEvidenceIds } : {})
      }));
      res.json({
        participation: currentParticipation,
        version: isManager ? version : participantCourseVersionView(version),
        evidence: visibleEvidence,
        corrections: visibleCorrections,
        assessmentProofs,
        materials
      });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/participations/:participationId/materials/:materialId/versions/:materialVersionId', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const participation = await repository.getCourseParticipation(req.params.participationId);
      if (!participation) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      const courseMaster = await repository.get<AcademyCourseMasterDoc>('academy_courses', participation.courseId);
      const isOwner = participation.userUid === actor.uid;
      const isManager = Boolean(courseMaster && canManage(actor, courseMaster.ownerUid));
      if (!isOwner && !isManager) { res.status(404).json({ error: 'ACADEMY_DOCUMENT_NOT_FOUND' }); return; }
      const courseVersion = await repository.get<AcademyCourseVersionDoc>('academy_course_versions', participation.courseVersionId);
      if (!courseVersion || !courseVersionReferencesMaterial(courseVersion, req.params.materialId, req.params.materialVersionId)) {
        res.status(404).json({ error: 'ACADEMY_MATERIAL_NOT_IN_PINNED_COURSE_VERSION' }); return;
      }
      const [master, materialVersion] = await Promise.all([
        repository.get<AcademyMaterialMasterDoc>('academy_materials', req.params.materialId),
        repository.get<AcademyMaterialVersionDoc>('academy_material_versions', req.params.materialVersionId)
      ]);
      if (!master || !materialVersion || materialVersion.materialId !== master.id || materialVersion.id !== req.params.materialVersionId ||
          !materialVersion.publishedIso || !materialVersion.publishedByUid) { res.status(404).json({ error: 'ACADEMY_MATERIAL_VERSION_NOT_FOUND' }); return; }
      if (!canReadMaterialRole(actor.role, materialVersion.requiredRole)) { res.status(404).json({ error: 'ACADEMY_MATERIAL_NOT_FOUND' }); return; }
      const material: AcademyMaterialReaderContent = {
        title: materialVersion.title,
        description: materialVersion.description,
        contentFormat: materialVersion.contentFormat,
        content: materialVersion.content,
        codeLanguage: materialVersion.codeLanguage
      };
      res.json({ material });
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
      const completion = await resolveAcademyCourseCompletion(repository, result.participation, resolveReleasedFinalExam, true);
      await recordAudit(actor.uid, 'Academy-Fortschrittsnachweis erfasst', master?.code || participation.courseId, `Nachweis für Abschlussbedingung ${requirement.id} erfasst.`, 'ACADEMY_PROGRESS');
      res.status(201).json({ ...result, participation: completion.participation, assessmentProofs: completion.assessmentProofs });
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

  // Statusprüfung ist pro privater Notiz begrenzt (max. 25 Quellen) und owner-isoliert.
  // Die Quellenreferenz selbst gewährt keinen Zugriff auf Materialinhalte.
  router.get('/notes/:noteId/source-status', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const note = await repository.getOwnPrivateNote(actor.uid, req.params.noteId);
      if (!note) { res.status(404).json({ error: 'ACADEMY_NOTE_NOT_FOUND' }); return; }
      const sources = privateNoteWithNormalizedSources(note).sources || [];
      const statuses = await Promise.all(sources.map(async source => {
        const [master, version] = await Promise.all([
          repository.get<AcademyMaterialMasterDoc>('academy_materials', source.materialId),
          repository.get<AcademyMaterialVersionDoc>('academy_material_versions', source.materialVersionId)
        ]);
        const exists = Boolean(master && version && version.id === source.materialVersionId &&
          version.materialId === source.materialId && version.publishedIso && version.publishedByUid);
        if (!exists) return { ...source, status: 'unavailable' as const };
        if (!canReadMaterialRole(actor.role, version!.requiredRole)) {
          return { ...source, status: 'restricted' as const };
        }
        return { ...source, status: 'available' as const };
      }));
      res.json({ sources: statuses });
    } catch (error) { fail(res, error, next); }
  });

  router.get('/notes', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const notes = await repository.listOwnPrivateNotes(actor.uid);
      res.json({ notes: notes.map(privateNoteWithNormalizedSources) });
    } catch (error) { fail(res, error, next); }
  });

  router.post('/notes', async (req, res, next) => {
    try {
      const actor = getActor(req, res);
      if (!actor) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      if (!isObject(req.body)) { res.status(400).json({ error: 'ACADEMY_NOTE_BODY_INVALID' }); return; }
      const now = new Date().toISOString();
      const requestedKind = req.body.kind === 'bookmark' ? 'bookmark' : 'note';
      const requestedMaterialId = text(req.body.materialId, 120);
      const requestedMaterialVersionId = text(req.body.materialVersionId, 160);
      const sources = normalizePrivateNoteSources(req.body.sources, {
        materialId: requestedMaterialId,
        materialVersionId: requestedMaterialVersionId
      });
      const note: AcademyPrivateNoteDoc = {
        id: id('note'), ownerUid: actor.uid, revision: 1,
        materialId: requestedMaterialId || sources[0].materialId,
        materialVersionId: requestedMaterialVersionId || sources[0].materialVersionId,
        kind: requestedKind,
        title: text(req.body.title, 200), content: text(req.body.content, 20000),
        tags: Array.isArray(req.body.tags) ? req.body.tags.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 20) : [],
        sources,
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
      const expectedRevision = revision(req.body.expectedRevision);
      if (expectedRevision === null) { res.status(400).json({ error: 'ACADEMY_NOTE_REVISION_INVALID' }); return; }
      const note: AcademyPrivateNoteDoc = {
        ...existing,
        revision: expectedRevision + 1,
        kind: req.body.kind === 'bookmark' ? 'bookmark' : req.body.kind === 'note' ? 'note' : existing.kind,
        title: req.body.title === undefined ? existing.title : text(req.body.title, 200),
        content: req.body.content === undefined ? existing.content : text(req.body.content, 20000),
        tags: req.body.tags === undefined ? existing.tags : Array.isArray(req.body.tags)
          ? req.body.tags.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 20)
          : existing.tags,
        sources: normalizePrivateNoteSources(
          req.body.sources === undefined ? existing.sources : req.body.sources,
          { materialId: existing.materialId, materialVersionId: existing.materialVersionId }
        ),
        updatedIso: new Date().toISOString()
      };
      await repository.updateOwnPrivateNote(actor.uid, note, expectedRevision);
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
