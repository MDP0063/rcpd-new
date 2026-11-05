import type { ExamRepository } from './examRepository.ts';
import type { ExamDocument } from './examRepositoryTypes.ts';
import { newId } from './ids.ts';

export interface ExamWorkshopComment extends ExamDocument {
  id: string;
  examId: string;
  authorUid: string;
  authorName: string;
  body: string;
  createdIso: string;
}

export async function listExamWorkshopComments(
  repository: ExamRepository,
  examId: string
): Promise<ExamWorkshopComment[]> {
  const comments = await repository.list<ExamWorkshopComment>('exam_comments', {
    where: [{ field: 'examId', value: examId }],
    limit: 200
  });
  return comments.sort((a, b) => a.createdIso.localeCompare(b.createdIso));
}

export async function createExamWorkshopComment(
  repository: ExamRepository,
  input: { examId: string; authorUid: string; authorName: string; body: unknown },
  nowIso = new Date().toISOString()
): Promise<ExamWorkshopComment> {
  if (
    typeof input.examId !== 'string' || !input.examId.trim() ||
    typeof input.authorUid !== 'string' || !input.authorUid.trim() ||
    typeof input.authorName !== 'string' || !input.authorName.trim() ||
    typeof input.body !== 'string' || !input.body.trim() || input.body.length > 4000
  ) {
    throw new Error('EXAM_COMMENT_INPUT_INVALID');
  }
  const comment: ExamWorkshopComment = {
    id: newId('comment'),
    examId: input.examId,
    authorUid: input.authorUid,
    authorName: input.authorName.trim().slice(0, 120),
    body: input.body.trim(),
    createdIso: nowIso
  };
  await repository.create('exam_comments', comment.id, comment);
  return comment;
}
