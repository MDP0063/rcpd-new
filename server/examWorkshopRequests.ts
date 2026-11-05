import type { ExamRepository } from './examRepository.ts';
import type { ExamDocument } from './examRepositoryTypes.ts';
import { newId } from './ids.ts';
import { getExamWorkshopDefinitionHash } from './examWorkshop.ts';

export interface ExamCommentDocument extends ExamDocument {
  examId: string;
  authorUid: string;
  authorName: string;
  body: string;
  createdIso: string;
}

export interface ExamPublicationRequestDocument extends ExamDocument {
  examId: string;
  requestedByUid: string;
  requestedByName: string;
  assessmentStage: 'test' | 'final_exam';
  requestKind: 'new' | 'update';
  status: 'pending' | 'published' | 'returned' | 'rejected' | 'archived';
  submittedRevision: number;
  submittedHash: string;
  createdIso: string;
  updatedIso: string;
  reviewedByUid?: string;
  reviewedByName?: string;
  reviewedAtIso?: string;
  reviewComment?: string;
  publishedVersionId?: string;
}

function currentRevision(master: ExamDocument): number {
  const revision = master.workingRevision === undefined ? 1 : master.workingRevision;
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1) {
    throw new Error('EXAM_WORKING_REVISION_INVALID');
  }
  return revision;
}

export async function listExamComments(repository: ExamRepository, examId: string): Promise<ExamCommentDocument[]> {
  const comments = await repository.list<ExamCommentDocument>('exam_comments', {
    where: [{ field: 'examId', value: examId }],
    limit: 500
  });
  return comments.sort((a, b) => a.createdIso.localeCompare(b.createdIso));
}

export async function addExamComment(
  repository: ExamRepository,
  examId: string,
  author: { uid: string; displayName: string },
  rawBody: unknown,
  nowIso = new Date().toISOString()
): Promise<ExamCommentDocument> {
  if (typeof rawBody !== 'string' || !rawBody.trim() || rawBody.length > 4000) {
    throw new Error('EXAM_COMMENT_INVALID');
  }
  if (!author.uid.trim() || !author.displayName.trim()) throw new Error('EXAM_COMMENT_INVALID');
  const comment: ExamCommentDocument = {
    id: newId('examcomment'),
    examId,
    authorUid: author.uid,
    authorName: author.displayName.trim().slice(0, 120),
    body: rawBody.trim(),
    createdIso: nowIso
  };
  await repository.runTransaction(async transaction => {
    const exam = await transaction.get('exam_masters', examId);
    if (!exam) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
    if (exam.status === 'archived') throw new Error('EXAM_MASTER_ARCHIVED');
    await transaction.create('exam_comments', comment.id, comment);
  });
  return comment;
}

export async function submitExamPublicationRequest(
  repository: ExamRepository,
  examId: string,
  requester: { uid: string; displayName: string },
  expectedRevision?: number,
  nowIso = new Date().toISOString()
): Promise<ExamPublicationRequestDocument> {
  return repository.runTransaction(async transaction => {
    const master = await transaction.get('exam_masters', examId);
    if (!master) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
    if (master.status === 'archived') throw new Error('EXAM_MASTER_ARCHIVED');
    if (master.assessmentStage !== 'test' && master.assessmentStage !== 'final_exam') {
      throw new Error('EXAM_ASSESSMENT_STAGE_INVALID');
    }
    const revision = currentRevision(master);
    if (expectedRevision !== undefined && expectedRevision !== revision) {
      throw new Error('EXAM_WORKING_REVISION_CONFLICT');
    }
    const pending = await transaction.list<ExamPublicationRequestDocument>('exam_publication_requests', {
      where: [
        { field: 'examId', value: examId },
        { field: 'status', value: 'pending' }
      ],
      limit: 2
    });
    if (pending.length > 1) throw new Error('EXAM_PUBLICATION_REQUEST_DUPLICATE_PENDING');
    if (pending.length === 1) throw new Error('EXAM_PUBLICATION_REQUEST_PENDING');

    const request: ExamPublicationRequestDocument = {
      id: newId('examreview'),
      examId,
      requestedByUid: requester.uid,
      requestedByName: requester.displayName.trim().slice(0, 120),
      assessmentStage: master.assessmentStage,
      requestKind: master.currentPublishedVersionId ? 'update' : 'new',
      status: 'pending',
      submittedRevision: revision,
      submittedHash: getExamWorkshopDefinitionHash(master),
      createdIso: nowIso,
      updatedIso: nowIso
    };
    await transaction.create('exam_publication_requests', request.id, request);
    return request;
  });
}

export async function listExamPublicationRequests(repository: ExamRepository): Promise<ExamPublicationRequestDocument[]> {
  const statuses: ExamPublicationRequestDocument['status'][] = [
    'pending',
    'published',
    'returned',
    'rejected',
    'archived'
  ];
  const groups = await Promise.all(statuses.map(status =>
    repository.list<ExamPublicationRequestDocument>('exam_publication_requests', {
      where: [{ field: 'status', value: status }],
      limit: 500
    })
  ));
  return groups.flat()
    .sort((a, b) => b.createdIso.localeCompare(a.createdIso))
    .slice(0, 500);
}

export async function listPendingExamPublicationRequests(repository: ExamRepository): Promise<ExamPublicationRequestDocument[]> {
  const requests = await repository.list<ExamPublicationRequestDocument>('exam_publication_requests', {
    where: [{ field: 'status', value: 'pending' }],
    limit: 500
  });
  return requests.sort((a, b) => a.createdIso.localeCompare(b.createdIso));
}

/** Admin edits during review deliberately bind the pending request to the newly edited revision. */
export async function refreshPendingExamPublicationRequest(
  repository: ExamRepository,
  examId: string,
  nowIso = new Date().toISOString()
): Promise<ExamPublicationRequestDocument | null> {
  return repository.runTransaction(async transaction => {
    const master = await transaction.get('exam_masters', examId);
    if (!master) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
    const pending = await transaction.list<ExamPublicationRequestDocument>('exam_publication_requests', {
      where: [
        { field: 'examId', value: examId },
        { field: 'status', value: 'pending' }
      ],
      limit: 2
    });
    if (pending.length > 1) throw new Error('EXAM_PUBLICATION_REQUEST_DUPLICATE_PENDING');
    const request = pending[0];
    if (!request) return null;
    const next: ExamPublicationRequestDocument = {
      ...request,
      submittedRevision: currentRevision(master),
      submittedHash: getExamWorkshopDefinitionHash(master),
      updatedIso: nowIso
    };
    await transaction.update('exam_publication_requests', request.id, next);
    return next;
  });
}

export async function updateExamPublicationRequestDecision(
  repository: ExamRepository,
  requestId: string,
  reviewer: { uid: string; displayName: string },
  decision: 'returned' | 'rejected' | 'archived',
  reviewComment: string,
  nowIso = new Date().toISOString()
): Promise<ExamPublicationRequestDocument> {
  return repository.runTransaction(async transaction => {
    const request = await transaction.get<ExamPublicationRequestDocument>('exam_publication_requests', requestId);
    if (!request) throw new Error('EXAM_PUBLICATION_REQUEST_NOT_FOUND');
    if (request.status !== 'pending') throw new Error('EXAM_PUBLICATION_REQUEST_NOT_PENDING');
    const master = await transaction.get('exam_masters', request.examId);
    if (!master) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
    const next: ExamPublicationRequestDocument = {
      ...request,
      status: decision,
      reviewedByUid: reviewer.uid,
      reviewedByName: reviewer.displayName.trim().slice(0, 120),
      reviewedAtIso: nowIso,
      reviewComment: reviewComment.trim().slice(0, 1000),
      updatedIso: nowIso
    };
    if (decision === 'archived') {
      await transaction.update('exam_masters', master.id, {
        ...master,
        status: 'archived',
        startable: false,
        archivedAtIso: nowIso,
        archivedByUid: reviewer.uid,
        archivedReason: reviewComment.trim().slice(0, 1000),
        updatedIso: nowIso
      });
    }
    await transaction.update('exam_publication_requests', requestId, next);
    return next;
  });
}

export async function archiveExamMaster(
  repository: ExamRepository,
  examId: string,
  reviewer: { uid: string; displayName: string },
  reason: string,
  nowIso = new Date().toISOString()
): Promise<ExamDocument> {
  const comment = reason.trim();
  if (comment.length < 3 || comment.length > 1000 || !reviewer.uid.trim() || !reviewer.displayName.trim()) {
    throw new Error('EXAM_ARCHIVE_REASON_INVALID');
  }
  return repository.runTransaction(async transaction => {
    const master = await transaction.get('exam_masters', examId);
    if (!master) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
    if (master.status === 'archived') throw new Error('EXAM_MASTER_ARCHIVED');
    const requests = await transaction.list<ExamPublicationRequestDocument>('exam_publication_requests', {
      where: [{ field: 'examId', value: examId }, { field: 'status', value: 'pending' }], limit: 500
    });
    const nextMaster: ExamDocument = {
      ...master, status: 'archived', startable: false, archivedAtIso: nowIso,
      archivedByUid: reviewer.uid, archivedReason: comment, updatedIso: nowIso
    };
    await transaction.update('exam_masters', examId, nextMaster);
    for (const request of requests) {
      await transaction.update('exam_publication_requests', request.id, {
        ...request, status: 'archived', reviewedByUid: reviewer.uid,
        reviewedByName: reviewer.displayName.trim().slice(0, 120), reviewedAtIso: nowIso,
        reviewComment: comment, updatedIso: nowIso
      });
    }
    return nextMaster;
  });
}
