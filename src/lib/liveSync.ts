/**
 * Echtzeit-Signal über Firestore.
 * Der Server schreibt nach jeder echten Änderung das Dokument sync/state. Der Browser meldet sich
 * mit einem vom Server ausgestellten Token an, lauscht darauf und lädt dann seine Daten über die
 * normale API neu. Rechte und Sichtbarkeit bleiben dadurch unverändert beim Server.
 * Firebase wird erst bei Bedarf geladen und nur, wenn die VITE_FIREBASE_*-Variablen gesetzt sind.
 */

interface LiveSyncConfig {
  apiKey: string;
  projectId: string;
  appId: string;
  authDomain?: string;
  databaseId?: string;
}

function readConfig(): LiveSyncConfig | null {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const appId = env.VITE_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    projectId,
    appId,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || undefined,
    databaseId: env.VITE_FIREBASE_DATABASE_ID || undefined
  };
}

export function isLiveSyncConfigured(): boolean {
  return readConfig() !== null;
}

/**
 * Startet das Lauschen. Gibt eine Funktion zurück, die es beendet und Firebase abmeldet.
 * onChange wird bei jeder Änderung aufgerufen, nicht beim ersten Lesen.
 */
export async function startLiveSync(
  fetchToken: () => Promise<string | null>,
  onChange: () => void,
  onStatus?: (connected: boolean) => void
): Promise<() => void> {
  const config = readConfig();
  if (!config) throw new Error('Echtzeit nicht konfiguriert.');

  const token = await fetchToken();
  if (!token) throw new Error('Kein Firebase-Token erhalten.');

  const [{ getApp, getApps, initializeApp }, { getAuth, signInWithCustomToken, signOut }, firestore] =
    await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore')
    ]);

  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: config.apiKey,
        projectId: config.projectId,
        appId: config.appId,
        authDomain: config.authDomain
      });
  const auth = getAuth(app);
  await signInWithCustomToken(auth, token);

  const db = config.databaseId
    ? firestore.getFirestore(app, config.databaseId)
    : firestore.getFirestore(app);

  let initialized = false;
  let lastValue: unknown;
  const unsubscribe = firestore.onSnapshot(
    firestore.doc(db, 'sync', 'state'),
    snapshot => {
      const value = snapshot.data()?.v;
      if (!initialized) {
        initialized = true;
        lastValue = value;
        onStatus?.(true);
        return;
      }
      if (value !== lastValue) {
        lastValue = value;
        onChange();
      }
    },
    () => onStatus?.(false)
  );

  return () => {
    unsubscribe();
    void signOut(auth).catch(() => undefined);
  };
}
