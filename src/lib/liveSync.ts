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

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

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
 * Bei terminalen Listener-/Tokenfehlern wird die Verbindung mit begrenztem Backoff neu aufgebaut.
 * Die erste Momentaufnahme dient nur zur Initialisierung; Änderungen während einer Unterbrechung
 * werden anhand des zuletzt bekannten Versionswerts nach dem Wiederverbinden erkannt.
 */
export async function startLiveSync(
  fetchToken: () => Promise<string | null>,
  onChange: () => void,
  onStatus?: (connected: boolean) => void
): Promise<() => void> {
  const config = readConfig();
  if (!config) throw new Error('Echtzeit nicht konfiguriert.');

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
  const db = config.databaseId
    ? firestore.getFirestore(app, config.databaseId)
    : firestore.getFirestore(app);

  let disposed = false;
  let connecting = false;
  let initialized = false;
  let lastValue: unknown;
  let generation = 0;
  let reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribe: (() => void) | null = null;

  const scheduleReconnect = () => {
    if (disposed || retryTimer) return;
    onStatus?.(false);
    const delay = reconnectDelayMs;
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void connect();
    }, delay);
  };

  const connect = async (): Promise<void> => {
    if (disposed || connecting) return;
    connecting = true;
    const currentGeneration = ++generation;
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Kein Firebase-Token erhalten.');
      await signInWithCustomToken(auth, token);
      if (disposed || currentGeneration !== generation) return;

      const nextUnsubscribe = firestore.onSnapshot(
        firestore.doc(db, 'sync', 'state'),
        snapshot => {
          if (disposed || currentGeneration !== generation) return;
          reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
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
          onStatus?.(true);
        },
        () => {
          if (disposed || currentGeneration !== generation) return;
          generation += 1;
          unsubscribe?.();
          unsubscribe = null;
          scheduleReconnect();
        }
      );

      if (disposed || currentGeneration !== generation) {
        nextUnsubscribe();
      } else {
        unsubscribe = nextUnsubscribe;
      }
    } catch {
      if (!disposed && currentGeneration === generation) scheduleReconnect();
    } finally {
      connecting = false;
    }
  };

  void connect();

  return () => {
    if (disposed) return;
    disposed = true;
    generation += 1;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    unsubscribe?.();
    unsubscribe = null;
    void signOut(auth).catch(() => undefined);
  };
}
