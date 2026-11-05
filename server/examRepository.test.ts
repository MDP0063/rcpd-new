import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';

async function withRepository(
  run: (repository: ReturnType<typeof createJsonExamRepository>, directory: string) => Promise<void>
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'rcpd-exam-repository-'));
  try {
    await run(createJsonExamRepository(directory), directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('JSON-Repository: Dokumente werden dauerhaft gespeichert und gezielt gefiltert gelesen', async () => {
  await withRepository(async (repository, directory) => {
    await repository.create('exam_masters', 'exam-1', {
      id: 'exam-1',
      title: 'Prüfung 1',
      status: 'draft'
    });
    await repository.create('exam_masters', 'exam-2', {
      id: 'exam-2',
      title: 'Prüfung 2',
      status: 'published'
    });

    const drafts = await repository.list('exam_masters', {
      where: [{ field: 'status', value: 'draft' }]
    });
    assert.deepEqual(drafts.map(document => document.id), ['exam-1']);

    const reopened = createJsonExamRepository(directory);
    assert.equal((await reopened.get('exam_masters', 'exam-2'))?.title, 'Prüfung 2');
  });
});

test('JSON-Repository: parallele Read-Modify-Write-Transaktionen verlieren keine Updates', async () => {
  await withRepository(async (repository, directory) => {
    await repository.create('exam_masters', 'counter', { id: 'counter', value: 0 });
    const secondRepository = createJsonExamRepository(directory);

    await Promise.all(Array.from({ length: 12 }, (_, index) =>
      (index % 2 === 0 ? repository : secondRepository).runTransaction(async transaction => {
        const current = await transaction.get('exam_masters', 'counter');
        assert.ok(current);
        await transaction.update('exam_masters', 'counter', {
          ...current,
          value: Number(current.value) + 1
        });
      })
    ));

    assert.equal((await repository.get('exam_masters', 'counter'))?.value, 12);
  });
});

test('JSON-Repository: fehlgeschlagene Transaktion verändert keine Daten und blockiert die Queue nicht', async () => {
  await withRepository(async repository => {
    await assert.rejects(
      repository.runTransaction(async transaction => {
        await transaction.create('exam_masters', 'aborted', { id: 'aborted' });
        throw new Error('Abbruch');
      }),
      /Abbruch/
    );

    assert.equal(await repository.get('exam_masters', 'aborted'), null);
    await repository.create('exam_masters', 'after-abort', { id: 'after-abort' });
    assert.ok(await repository.get('exam_masters', 'after-abort'));
  });
});

test('JSON-Repository: create ist create-only; veröffentlichte Versionen bleiben append-only', async () => {
  await withRepository(async repository => {
    await repository.create('exam_versions', 'exam-1__v1', {
      id: 'exam-1__v1',
      examId: 'exam-1',
      versionNumber: 1
    });

    await assert.rejects(
      repository.create('exam_versions', 'exam-1__v1', {
        id: 'exam-1__v1',
        examId: 'exam-1',
        versionNumber: 1
      }),
      /EXAM_DOCUMENT_ALREADY_EXISTS/
    );
    await assert.rejects(
      repository.update('exam_versions', 'exam-1__v1', {
        id: 'exam-1__v1',
        examId: 'exam-1',
        versionNumber: 1
      }),
      /EXAM_DOCUMENT_APPEND_ONLY/
    );
    await assert.rejects(
      repository.delete('exam_versions', 'exam-1__v1'),
      /EXAM_DOCUMENT_DELETE_FORBIDDEN/
    );
  });
});

test('JSON-Repository: Versuche und Legacy-Verifikationen können nicht gelöscht oder überschrieben werden', async () => {
  await withRepository(async repository => {
    await repository.create('exam_attempts', 'attempt-1', { id: 'attempt-1', status: 'in_progress' });
    await repository.create('exam_legacy_verifications', 'legacy_verification__legacy-1', {
      id: 'legacy_verification__legacy-1',
      legacyProgressId: 'legacy-1',
      userId: 'user-1',
      examId: 'exam-1',
      verifiedStatus: 'passed',
      verifiedScoreBasisPoints: 8800,
      verifiedByUid: 'admin-1',
      verifiedAtIso: '2026-11-05T12:00:00.000Z',
      reason: 'Historischen Nachweis geprüft'
    });

    await assert.rejects(
      repository.delete('exam_attempts', 'attempt-1'),
      /EXAM_DOCUMENT_DELETE_FORBIDDEN/
    );
    await assert.rejects(
      repository.update('exam_legacy_verifications', 'legacy_verification__legacy-1', {
        id: 'legacy_verification__legacy-1',
        legacyProgressId: 'legacy-1',
        userId: 'user-1',
        examId: 'exam-1',
        verifiedStatus: 'failed',
        verifiedByUid: 'admin-1',
        verifiedAtIso: '2026-11-05T12:00:00.000Z',
        reason: 'Historischen Nachweis geprüft'
      }),
      /EXAM_DOCUMENT_APPEND_ONLY/
    );
  });
});

test('JSON-Repository: eine doppelte ID wird abgelehnt', async () => {
  await withRepository(async repository => {
    await repository.create('exam_masters', 'exam-1', { id: 'exam-1' });
    await assert.rejects(
      repository.create('exam_masters', 'exam-1', { id: 'exam-1' }),
      /EXAM_DOCUMENT_ALREADY_EXISTS/
    );
  });
});

test('JSON-Repository: veröffentlichte Snapshots überschreiten das Anwendungsgrößenlimit nicht', async () => {
  await withRepository(async repository => {
    await assert.rejects(
      repository.create('exam_versions', 'exam-1__v1', {
        id: 'exam-1__v1',
        examId: 'exam-1',
        versionNumber: 1,
        payload: 'x'.repeat(500_001)
      }),
      /EXAM_SNAPSHOT_TOO_LARGE/
    );
    assert.equal(await repository.get('exam_versions', 'exam-1__v1'), null);
  });
});

test('JSON-Repository: Sonder-IDs können keine Objekt-Prototypen verändern', async () => {
  await withRepository(async repository => {
    await repository.create('exam_masters', '__proto__', {
      id: '__proto__',
      title: 'Sicherer Schlüssel'
    });
    assert.equal((await repository.get('exam_masters', '__proto__'))?.title, 'Sicherer Schlüssel');
    assert.equal(({} as Record<string, unknown>).title, undefined);
  });
});

test('JSON-Repository: unbeschränkte Historienabfragen werden abgelehnt', async () => {
  await withRepository(async repository => {
    await assert.rejects(
      repository.list('exam_attempts'),
      /EXAM_QUERY_FILTER_REQUIRED/
    );
    assert.deepEqual(await repository.list('exam_masters'), []);
  });
});

test('JSON-Repository: Transaktionen lesen vor dem ersten Schreibvorgang', async () => {
  await withRepository(async repository => {
    await assert.rejects(
      repository.runTransaction(async transaction => {
        await transaction.create('exam_masters', 'written', { id: 'written' });
        await transaction.get('exam_masters', 'written');
      }),
      /EXAM_TRANSACTION_READ_AFTER_WRITE/
    );
    assert.equal(await repository.get('exam_masters', 'written'), null);
  });
});

test('JSON-Repository: Update setzt ein vorhandenes Dokument voraus', async () => {
  await withRepository(async repository => {
    await assert.rejects(
      repository.update('exam_masters', 'missing', { id: 'missing' }),
      /EXAM_DOCUMENT_NOT_FOUND/
    );
  });
});

test('JSON-Repository: invalidated_by_admin kann nicht ohne Audit-Methode gesetzt werden', async () => {
  await withRepository(async repository => {
    await repository.create('exam_attempts', 'attempt-1', {
      id: 'attempt-1',
      status: 'in_progress'
    });
    await repository.update('exam_attempts', 'attempt-1', {
      id: 'attempt-1',
      status: 'passed'
    });
    await assert.rejects(
      repository.update('exam_attempts', 'attempt-1', {
        id: 'attempt-1',
        status: 'invalidated_by_admin'
      }),
      /EXAM_ATTEMPT_IMMUTABLE/
    );
  });
});

test('JSON-Repository: pending_review darf nicht zu in_progress zurückgesetzt werden', async () => {
  await withRepository(async repository => {
    await repository.create('exam_attempts', 'attempt-review', {
      id: 'attempt-review',
      status: 'in_progress'
    });
    await repository.update('exam_attempts', 'attempt-review', {
      id: 'attempt-review',
      status: 'pending_review'
    });
    await assert.rejects(
      repository.update('exam_attempts', 'attempt-review', {
        id: 'attempt-review',
        status: 'in_progress'
      }),
      /EXAM_ATTEMPT_STATUS_INVALID/
    );
  });
});

test('JSON-Repository: abgeschlossene Versuche sind unveränderlich', async () => {
  await withRepository(async repository => {
    await repository.create('exam_attempts', 'attempt-final', {
      id: 'attempt-final',
      status: 'in_progress',
      finalScoreBasisPoints: null
    });
    await repository.update('exam_attempts', 'attempt-final', {
      id: 'attempt-final',
      status: 'passed',
      finalScoreBasisPoints: 9000
    });
    await assert.rejects(
      repository.update('exam_attempts', 'attempt-final', {
        id: 'attempt-final',
        status: 'failed',
        finalScoreBasisPoints: 1000
      }),
      /EXAM_ATTEMPT_IMMUTABLE/
    );
    assert.equal((await repository.get('exam_attempts', 'attempt-final'))?.status, 'passed');
  });
});

test('JSON-Repository: laufende und offene Korrekturversuche können aktualisiert werden', async () => {
  await withRepository(async repository => {
    await repository.create('exam_attempts', 'attempt-running', {
      id: 'attempt-running',
      status: 'in_progress',
      currentRevision: 1
    });
    await repository.update('exam_attempts', 'attempt-running', {
      id: 'attempt-running',
      status: 'pending_review',
      currentRevision: 2
    });
    await repository.update('exam_attempts', 'attempt-running', {
      id: 'attempt-running',
      status: 'passed',
      currentRevision: 3
    });
    assert.equal((await repository.get('exam_attempts', 'attempt-running'))?.status, 'passed');
  });
});

test('JSON-Repository: Admin-Invalidierung ist explizit, protokolliert und idempotent geschützt', async () => {
  await withRepository(async repository => {
    await repository.create('exam_attempts', 'attempt-to-invalidate', {
      id: 'attempt-to-invalidate',
      status: 'in_progress',
      finalScoreBasisPoints: null
    });
    await repository.update('exam_attempts', 'attempt-to-invalidate', {
      id: 'attempt-to-invalidate',
      status: 'passed',
      finalScoreBasisPoints: 9000
    });
    await repository.invalidateAttempt('attempt-to-invalidate', {
      adminUid: 'admin-1',
      atIso: '2026-11-05T12:00:00.000Z',
      reason: 'Nachweislich unzulässige Hilfsmittel verwendet'
    });
    const invalidated = await repository.get('exam_attempts', 'attempt-to-invalidate');
    assert.equal(invalidated?.status, 'invalidated_by_admin');
    assert.equal(invalidated?.invalidatedByUid, 'admin-1');
    assert.equal(invalidated?.invalidatedAtIso, '2026-11-05T12:00:00.000Z');
    assert.equal(invalidated?.invalidationReason, 'Nachweislich unzulässige Hilfsmittel verwendet');
    await assert.rejects(
      repository.invalidateAttempt('attempt-to-invalidate', {
        adminUid: 'admin-1',
        atIso: '2026-11-05T12:01:00.000Z',
        reason: 'Zweiter Versuch'
      }),
      /EXAM_ATTEMPT_ALREADY_INVALIDATED/
    );
  });
});

test('JSON-Repository: Veröffentlichung legt Snapshot und Master-Zeiger atomar an', async () => {
  await withRepository(async repository => {
    await repository.create('exam_masters', 'exam-publish', {
      id: 'exam-publish',
      status: 'draft',
      latestVersionNumber: 0
    });
    const version = {
      id: 'exam-publish__v1',
      examId: 'exam-publish',
      versionNumber: 1,
      questionsSnapshot: [{ id: 'q1' }]
    };
    const master = {
      id: 'exam-publish',
      status: 'published',
      latestVersionNumber: 1,
      currentPublishedVersionId: 'exam-publish__v1'
    };

    await repository.publishVersion('exam-publish', version, master);
    assert.equal((await repository.get('exam_versions', version.id))?.versionNumber, 1);
    assert.equal((await repository.get('exam_masters', 'exam-publish'))?.currentPublishedVersionId, version.id);
  });
});

test('JSON-Repository: konkurrierte Veröffentlichung derselben Versionsnummer wird abgelehnt', async () => {
  await withRepository(async repository => {
    await repository.create('exam_masters', 'exam-race', {
      id: 'exam-race',
      status: 'draft',
      latestVersionNumber: 0
    });
    const version = { id: 'exam-race__v1', examId: 'exam-race', versionNumber: 1 };
    const master = {
      id: 'exam-race',
      status: 'published',
      latestVersionNumber: 1,
      currentPublishedVersionId: 'exam-race__v1'
    };
    const results = await Promise.allSettled([
      repository.publishVersion('exam-race', version, master),
      repository.publishVersion('exam-race', version, master)
    ]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected').length, 1);
    assert.equal((await repository.list('exam_versions', {
      where: [{ field: 'examId', value: 'exam-race' }]
    })).length, 1);
  });
});

test('JSON-Repository: neue Versuche müssen im Status in_progress angelegt werden', async () => {
  await withRepository(async repository => {
    await assert.rejects(
      repository.create('exam_attempts', 'attempt-invalid', {
        id: 'attempt-invalid',
        status: 'passed'
      }),
      /EXAM_ATTEMPT_MUST_START_IN_PROGRESS/
    );
  });
});

test('JSON-Repository: dedizierte Legacy-Verifikationsmethoden lesen und erstellen create-only', async () => {
  await withRepository(async repository => {
    const document = {
      id: 'legacy_verification__legacy-methods',
      legacyProgressId: 'legacy-methods',
      userId: 'user-1',
      examId: 'exam-1',
      verifiedStatus: 'passed' as const,
      verifiedScoreBasisPoints: 8800,
      verifiedByUid: 'admin-1',
      verifiedAtIso: '2026-11-05T12:00:00.000Z',
      reason: 'Historischen Nachweis geprüft'
    };
    assert.equal(await repository.getLegacyVerification('legacy-methods'), null);
    await repository.createLegacyVerification(document);
    assert.deepEqual(await repository.getLegacyVerification('legacy-methods'), document);
    await assert.rejects(
      repository.createLegacyVerification(document),
      /EXAM_DOCUMENT_ALREADY_EXISTS/
    );
  });
});

test('JSON-Repository: Legacy-Verifikationen verwenden eine deterministische Nachweis-ID', async () => {
  await withRepository(async repository => {
    await assert.rejects(
      repository.create('exam_legacy_verifications', 'random-id', {
        id: 'random-id',
        legacyProgressId: 'legacy-1',
        userId: 'u1',
        examId: 'exam-1',
        verifiedStatus: 'passed',
        verifiedScoreBasisPoints: 8800,
        verifiedByUid: 'admin-1',
        verifiedAtIso: '2026-11-05T12:00:00.000Z',
        reason: 'Historischen Nachweis geprüft'
      }),
      /EXAM_LEGACY_VERIFICATION_ID_INVALID/
    );
    await repository.create('exam_legacy_verifications', 'legacy_verification__legacy-1', {
      id: 'legacy_verification__legacy-1',
      legacyProgressId: 'legacy-1',
      userId: 'u1',
      examId: 'exam-1',
      verifiedStatus: 'passed',
      verifiedScoreBasisPoints: 8800,
      verifiedByUid: 'admin-1',
      verifiedAtIso: '2026-11-05T12:00:00.000Z',
      reason: 'Historischen Nachweis geprüft'
    });
  });
});


test('JSON-Repository: Exam-Snapshot exportiert alle Sammlungen und Restore ersetzt sie atomar', async () => {
  await withRepository(async repository => {
    await repository.create('exam_masters', 'old-exam', { id: 'old-exam', status: 'draft' });
    await repository.setMaintenanceMode(true);
    const exported = await repository.exportSnapshot();
    assert.equal(exported.formatVersion, 1);
    assert.equal(exported.collections.exam_masters.length, 1);
    assert.deepEqual(exported.collections.exam_attempts, []);

    const replacement = {
      formatVersion: 1 as const,
      collections: {
        exam_masters: [{ id: 'new-exam', status: 'draft' }],
        exam_versions: [],
        exam_attempts: [],
        exam_progress: [],
        exam_legacy_verifications: []
      }
    };
    await repository.restoreSnapshot(replacement);
    assert.equal(await repository.get('exam_masters', 'old-exam'), null);
    assert.ok(await repository.get('exam_masters', 'new-exam'));
    assert.equal(await repository.isMaintenanceMode(), true);

    await repository.setMaintenanceMode(false);
    assert.equal(await repository.isMaintenanceMode(), false);
  });
});

test('JSON-Repository: Snapshot-Export und Restore erfordern den Wartungsmodus', async () => {
  await withRepository(async repository => {
    await assert.rejects(repository.exportSnapshot(), /EXAM_MAINTENANCE_REQUIRED/);
    await assert.rejects(repository.restoreSnapshot({
      formatVersion: 1,
      collections: {
        exam_masters: [], exam_versions: [], exam_attempts: [], exam_progress: [], exam_legacy_verifications: []
      }
    }), /EXAM_MAINTENANCE_REQUIRED/);
  });
});

test('JSON-Repository: Wartungsmodus kann nicht versehentlich doppelt gestartet werden', async () => {
  await withRepository(async repository => {
    await repository.setMaintenanceMode(true);
    await assert.rejects(repository.setMaintenanceMode(true), /EXAM_MAINTENANCE_ALREADY_ACTIVE/);
    await repository.setMaintenanceMode(true, true);
    assert.equal(await repository.isMaintenanceMode(), true);
  });
});


test('Firestore-Repository: mehrere Updates verwenden vorgelesene Dokumente ohne Read-after-Write', async () => {
  const documents = new Map<string, Record<string, unknown>>();
  const key = (collection: string, id: string) => `${collection}/${id}`;
  const database = {
    collection: (collectionName: string) => ({
      doc: (id: string) => ({
        collectionName,
        id,
        get: async () => {
          const data = documents.get(`${collectionName}/${id}`);
          return {
            exists: Boolean(data),
            id,
            data: () => data ? structuredClone(data) : undefined
          };
        }
      })
    }),
    runTransaction: async <T>(operation: (transaction: {
      get: (reference: { collectionName: string; id: string }) => Promise<{
        exists: boolean;
        id: string;
        data: () => Record<string, unknown> | undefined;
      }>;
      create: (reference: { collectionName: string; id: string }, data: Record<string, unknown>) => void;
      set: (reference: { collectionName: string; id: string }, data: Record<string, unknown>) => void;
      delete: (reference: { collectionName: string; id: string }) => void;
    }) => Promise<T>): Promise<T> => {
      let hasWrites = false;
      return operation({
        get: async reference => {
          if (hasWrites) throw new Error('FAKE_FIRESTORE_READ_AFTER_WRITE');
          const data = documents.get(key(reference.collectionName, reference.id));
          return {
            exists: Boolean(data),
            id: reference.id,
            data: () => data ? structuredClone(data) : undefined
          };
        },
        create: (reference, data) => {
          const documentKey = key(reference.collectionName, reference.id);
          if (documents.has(documentKey)) throw new Error('FAKE_FIRESTORE_ALREADY_EXISTS');
          hasWrites = true;
          documents.set(documentKey, structuredClone(data));
        },
        set: (reference, data) => {
          hasWrites = true;
          documents.set(key(reference.collectionName, reference.id), structuredClone(data));
        },
        delete: reference => {
          hasWrites = true;
          documents.delete(key(reference.collectionName, reference.id));
        }
      });
    }
  };
  const { createFirestoreExamRepository } = await import('./examRepository.ts');
  const repository = createFirestoreExamRepository(database as never);

  await repository.create('exam_masters', 'exam-1', { id: 'exam-1', title: 'Entwurf' });
  await repository.create('exam_masters', 'exam-2', { id: 'exam-2', title: 'Zweiter Entwurf' });

  await repository.runTransaction(async transaction => {
    const first = await transaction.get('exam_masters', 'exam-1');
    const second = await transaction.get('exam_masters', 'exam-2');
    assert.ok(first);
    assert.ok(second);
    await transaction.update('exam_masters', 'exam-1', { ...first, title: 'Archiviert 1' });
    await transaction.update('exam_masters', 'exam-2', { ...second, title: 'Archiviert 2' });
  });

  assert.equal((await repository.get('exam_masters', 'exam-1'))?.title, 'Archiviert 1');
  assert.equal((await repository.get('exam_masters', 'exam-2'))?.title, 'Archiviert 2');
});

test('Firestore-Repository: einzelnes Repository-Update liest vor dem Schreiben', async () => {
  const documents = new Map<string, Record<string, unknown>>([
    ['exam_masters/exam-1', { id: 'exam-1', title: 'Vorher' }]
  ]);
  const database = {
    collection: (collectionName: string) => ({
      doc: (id: string) => ({
        collectionName,
        id,
        get: async () => {
          const data = documents.get(`${collectionName}/${id}`);
          return {
            exists: Boolean(data),
            id,
            data: () => data ? structuredClone(data) : undefined
          };
        }
      })
    }),
    runTransaction: async <T>(operation: (transaction: {
      get: (reference: { collectionName: string; id: string }) => Promise<{
        exists: boolean; id: string; data: () => Record<string, unknown> | undefined;
      }>;
      set: (reference: { collectionName: string; id: string }, data: Record<string, unknown>) => void;
      create: (reference: { collectionName: string; id: string }, data: Record<string, unknown>) => void;
      delete: (reference: { collectionName: string; id: string }) => void;
    }) => Promise<T>): Promise<T> => {
      let hasWrites = false;
      return operation({
        get: async reference => {
          if (hasWrites) throw new Error('FAKE_FIRESTORE_READ_AFTER_WRITE');
          const data = documents.get(`${reference.collectionName}/${reference.id}`);
          return { exists: Boolean(data), id: reference.id, data: () => data ? structuredClone(data) : undefined };
        },
        set: (reference, data) => { hasWrites = true; documents.set(`${reference.collectionName}/${reference.id}`, structuredClone(data)); },
        create: (reference, data) => { hasWrites = true; documents.set(`${reference.collectionName}/${reference.id}`, structuredClone(data)); },
        delete: reference => { hasWrites = true; documents.delete(`${reference.collectionName}/${reference.id}`); }
      });
    }
  };
  const { createFirestoreExamRepository } = await import('./examRepository.ts');
  const repository = createFirestoreExamRepository(database as never);
  await repository.update('exam_masters', 'exam-1', { id: 'exam-1', title: 'Nachher' });
  assert.equal(documents.get('exam_masters/exam-1')?.title, 'Nachher');
});
