import { ROLE_HIERARCHY, type OfficerRole } from '../src/types/portal.ts';
import type { AcademyCourseVersionDoc } from '../src/types/academy.ts';

export function canReadMaterialRole(actorRole: OfficerRole, requiredRole?: OfficerRole): boolean {
  if (!requiredRole) return true;
  return ROLE_HIERARCHY[actorRole].rankOrder <= ROLE_HIERARCHY[requiredRole].rankOrder;
}
export function courseVersionReferencesMaterial(courseVersion: AcademyCourseVersionDoc, materialId: string, materialVersionId: string): boolean {
  return courseVersion.chapters.some(chapter => chapter.materialReferences.some(reference =>
    reference.materialId === materialId && reference.materialVersionId === materialVersionId
  ));
}
