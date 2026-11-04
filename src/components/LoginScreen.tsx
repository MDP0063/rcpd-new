import React, { useState } from 'react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import {
  Shield,
  LogIn,
  CheckCircle2,
  KeyRound,
  UserCheck,
  Sun,
  Moon,
  Eye,
  EyeOff,
  X,
  AlertTriangle
} from 'lucide-react';

interface LoginScreenProps {
  themeMode: 'light' | 'dark';
  onToggleThemeMode: () => void;
  statusToast: string | null;
  onDismissToast: () => void;
  authError: string | null;
  authLoading: boolean;
  onLogin: (username: string, password: string) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  themeMode,
  onToggleThemeMode,
  statusToast,
  onDismissToast,
  authError,
  authLoading,
  onLogin
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('adminRecovery') || ''
  );
  const [showRecoveryRequest, setShowRecoveryRequest] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const requestAdminRecovery = async () => {
    setRecoveryLoading(true);
    setRecoveryMessage(null);
    setRecoveryError(null);
    const result = await apiFetch<{ message?: string }>(API_ENDPOINTS.AUTH_RECOVERY_REQUEST, {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (result.ok) setRecoveryMessage(result.data?.message || 'Falls die Wiederherstellung verfügbar ist, erhält der Administrator eine E-Mail.');
    else setRecoveryError(result.error || 'Die Anfrage konnte nicht verarbeitet werden.');
    setRecoveryLoading(false);
  };

  const submitAdminRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryMessage(null);
    setRecoveryError(null);
    if (newPassword !== confirmNewPassword) {
      setRecoveryError('Die beiden Passwörter stimmen nicht überein.');
      return;
    }
    setRecoveryLoading(true);
    const result = await apiFetch<{ message?: string }>(API_ENDPOINTS.AUTH_RECOVERY_RESET, {
      method: 'POST',
      body: JSON.stringify({ token: recoveryToken, password: newPassword })
    });
    if (result.ok) {
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState({}, '', url.toString());
      setRecoveryToken('');
      setShowRecoveryRequest(false);
      setNewPassword('');
      setConfirmNewPassword('');
      setRecoveryMessage(result.data?.message || 'Passwort zurückgesetzt. Du kannst dich jetzt anmelden.');
    } else {
      setRecoveryError(result.error || 'Das Passwort konnte nicht zurückgesetzt werden.');
    }
    setRecoveryLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      {/* Floating Top-Right Toast Notification on Login Screen */}
      {statusToast && (
        <div className="fixed top-16 right-6 z-50 max-w-md w-full bg-slate-900 text-white border border-sky-500/50 rounded-lg p-4 shadow-2xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <span>{statusToast}</span>
          </div>
          <button
            type="button"
            onClick={onDismissToast}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Institutional Bar */}
      <header className="flex items-center justify-between gap-4 px-6 py-3.5 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800">
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <Shield className="w-5 h-5 text-sky-400" />
          <span className="text-sm font-semibold tracking-tight">
            State of California · Department of Justice &amp; POST
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs text-slate-400">
          <span>Internes Dienst- und Ausbildungsportal</span>
          <span>·</span>
          <span>Zugang nur für autorisiertes Personal</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleThemeMode}
            aria-label={
              themeMode === 'dark'
                ? 'Zum hellen Design wechseln'
                : 'Zum dunklen Design wechseln'
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border bg-slate-800 dark:bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {themeMode === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Hell</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-300" />
                <span>Dunkel</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Centered Compact Single-Card Login Form */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 shadow-sm transition-colors">
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Dienst- &amp; Ausbildungsportal
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                Anmeldung
              </h1>
            </div>

            {authError && (
              <div
                role="alert"
                className="p-3.5 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-semibold">Anmeldehinweis</div>
                  <div>{authError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Dienstnummer / Benutzername
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 text-sm rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 dark:focus:border-sky-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Passwort
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 text-sm rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 dark:focus:border-sky-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? 'Passwort verbergen' : 'Passwort einblenden'}
                    title={showPassword ? 'Passwort verbergen' : 'Passwort einblenden'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  {authLoading ? 'Anmeldung wird geprüft...' : 'Anmelden'}
                </button>
              </div>
            </form>

            {recoveryMessage && (
              <div role="status" className="rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                {recoveryMessage}
              </div>
            )}
            {recoveryError && (
              <div role="alert" className="rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-200">
                {recoveryError}
              </div>
            )}

            {recoveryToken ? (
              <form onSubmit={submitAdminRecovery} className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div>
                  <h2 className="text-sm font-semibold">Administrator-Passwort zurücksetzen</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Der einmalige Link ist nur 15 Minuten gültig. Wähle ein neues Passwort mit mindestens 8 Zeichen.</p>
                </div>
                <input type="password" required minLength={8} maxLength={200} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Neues Passwort" className="w-full px-3.5 py-2 text-sm rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                <input type="password" required minLength={8} maxLength={200} autoComplete="new-password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Neues Passwort wiederholen" className="w-full px-3.5 py-2 text-sm rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                <button type="submit" disabled={recoveryLoading} className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md disabled:opacity-50">{recoveryLoading ? 'Wird gespeichert...' : 'Passwort sicher zurücksetzen'}</button>
              </form>
            ) : showRecoveryRequest ? (
              <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div>
                  <h2 className="text-sm font-semibold">Administrator-Zugang wiederherstellen</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Wenn die Funktion eingerichtet ist, wird ein einmaliger Link an die fest hinterlegte Administrator-E-Mail gesendet.</p>
                </div>
                <button type="button" onClick={requestAdminRecovery} disabled={recoveryLoading} className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md disabled:opacity-50">{recoveryLoading ? 'Anfrage wird gesendet...' : 'Wiederherstellungs-E-Mail anfordern'}</button>
                <button type="button" onClick={() => { setShowRecoveryRequest(false); setRecoveryError(null); }} className="w-full px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300">Zurück zur Anmeldung</button>
              </div>
            ) : (
              <button type="button" onClick={() => { setShowRecoveryRequest(true); setRecoveryMessage(null); setRecoveryError(null); }} className="w-full border-t border-slate-200 dark:border-slate-800 pt-4 text-xs text-sky-700 dark:text-sky-400 hover:underline">
                Administrator-Zugang wiederherstellen
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="px-6 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        State of California Department of Justice · Commission on Peace Officer Standards and
        Training
      </footer>
    </div>
  );
};
