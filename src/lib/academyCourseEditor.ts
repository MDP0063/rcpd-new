import type { AcademyCourseChapter, AcademyCourseCompletionRequirement } from '../types/academy.ts';

export function removeChapterMaterialReference(chapters: AcademyCourseChapter[], requirements: AcademyCourseCompletionRequirement[], chapterId: string, materialId: string) {
  const nextChapters = chapters.map(chapter => chapter.id !== chapterId ? chapter : { ...chapter, materialReferences: chapter.materialReferences.filter(reference => reference.materialId !== materialId).map((reference, index) => ({ ...reference, order: index })) });
  const stillReferenced = nextChapters.some(chapter => chapter.materialReferences.some(reference => reference.materialId === materialId));
  return { chapters: nextChapters, requirements: stillReferenced ? requirements : requirements.filter(requirement => !(requirement.type === 'required_material' && requirement.targetId === materialId)) };
}

export function removeCourseChapter(chapters: AcademyCourseChapter[], requirements: AcademyCourseCompletionRequirement[], chapterId: string) {
  const removed = chapters.find(chapter => chapter.id === chapterId);
  const removedMaterialIds = new Set(removed?.materialReferences.map(reference => reference.materialId) ?? []);
  const nextChapters = chapters.filter(chapter => chapter.id !== chapterId).map((chapter, index) => ({ ...chapter, order: index }));
  const stillReferenced = new Set(nextChapters.flatMap(chapter => chapter.materialReferences.map(reference => reference.materialId)));
  return { chapters: nextChapters, requirements: requirements.filter(requirement => {
    if (requirement.type === 'required_chapter' && requirement.targetId === chapterId) return false;
    if (requirement.type === 'required_material' && removedMaterialIds.has(requirement.targetId) && !stillReferenced.has(requirement.targetId)) return false;
    return true;
  }) };
}
