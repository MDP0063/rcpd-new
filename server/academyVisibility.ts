export function isAcademyEntryVisible(input: { publicationStatus: string; availability: string; isManager: boolean; hasParticipation: boolean }): boolean {
  return input.isManager || input.hasParticipation || (input.publicationStatus === 'published' && input.availability === 'available');
}
