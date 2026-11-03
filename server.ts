import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  AcademyExamDoc,
  OfficerRole,
  PortalBackupSnapshot,
  PortalDeploymentConfig,
  ROLE_HIERARCHY,
  TrainingModuleDoc,
  UserPrivateProfile,
  UserProgressDoc,
  UserPublicProfile,
  WhitelistApplicationDoc,
  WhitelistStatus
} from './src/types/portal';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StoredAccountRecord {
  uid: string;
  username: string;
  password: string;
  isOnline: boolean;
  lastSeenIso: string;
  publicProfile: UserPublicProfile;
  privateProfile: UserPrivateProfile;
}

export interface PortalDatabaseState {
  version: number;
  accounts: StoredAccountRecord[];
  applications: WhitelistApplicationDoc[];
  modules: TrainingModuleDoc[];
  exams: AcademyExamDoc[];
  progress: UserProgressDoc[];
  deploymentConfig?: PortalDeploymentConfig;
}

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'portal-db-v3.json');

// Online threshold: 45 seconds since last heartbeat or login
const ONLINE_THRESHOLD_MS = 45 * 1000;

function computeIsOnline(record: StoredAccountRecord): boolean {
  if (!record.isOnline || !record.lastSeenIso) return false;
  const diff = Date.now() - new Date(record.lastSeenIso).getTime();
  return diff <= ONLINE_THRESHOLD_MS;
}

function createInitialDatabase(): PortalDatabaseState {
  const nowIso = new Date().toISOString();

  // Only Admin1 is pre-created by default; no pre-programmed tests or textbooks!
  const initialAccounts: StoredAccountRecord[] = [
    {
      uid: 'usr_admin_1',
      username: 'Admin1',
      password: '1234',
      isOnline: false,
      lastSeenIso: nowIso,
      publicProfile: {
        uid: 'usr_admin_1',
        username: 'Admin1',
        displayName: 'Chief Administrator',
        badgeNumber: 'CA-0001',
        callsign: '1-ADMIN',
        rank: ROLE_HIERARCHY.admin.defaultRank,
        role: 'admin',
        clearanceLevel: 10,
        division: 'Office of the Chief of Police (Command Administration)',
        whitelistStatus: 'whitelisted',
        isOnline: false,
        lastSeenIso: nowIso,
        updatedIso: nowIso
      },
      privateProfile: {
        uid: 'usr_admin_1',
        email: 'admin1@post.ca.gov',
        discordTag: 'admin1#0001',
        steamHex: 'steam:11000010a000001',
        supervisorNotes: 'Master Administrator Account (Volle System-, Konten- & Rollenberechtigung).',
        updatedIso: nowIso
      }
    }
  ];

  return {
    version: 3,
    accounts: initialAccounts,
    applications: [],
    modules: [], // Empty by default so Admin/Colonel can upload PDFs / Textbooks dynamically
    exams: [],   // Empty by default so Admin/Colonel can add Tests & Final Exams as code dynamically
    progress: [],
    deploymentConfig: {
      githubRepoUrl: 'https://github.com/DEIN-BENUTZERNAME/ca-post-officer-portal.git',
      renderServiceUrl: '',
      renderDeployHookUrl: '',
      branchName: 'main',
      autoDeployEnabled: true,
      completedSteps: [],
      updatedIso: nowIso
    }
  };
}

function ensureDeploymentConfig(state: PortalDatabaseState): PortalDeploymentConfig {
  if (!state.deploymentConfig) {
    state.deploymentConfig = {
      githubRepoUrl: 'https://github.com/DEIN-BENUTZERNAME/ca-post-officer-portal.git',
      renderServiceUrl: '',
      renderDeployHookUrl: '',
      branchName: 'main',
      autoDeployEnabled: true,
      completedSteps: [],
      updatedIso: new Date().toISOString()
    };
  }
  return state.deploymentConfig;
}

function loadDatabase(): PortalDatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as PortalDatabaseState;
    if (!parsed.accounts || parsed.accounts.length === 0) {
      const initial = createInitialDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    ensureDeploymentConfig(parsed);
    return parsed;
  } catch {
    const initial = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

function saveDatabase(state: PortalDatabaseState) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Increase payload limit to 25MB so Admin/Colonel can upload PDF textbooks directly
  app.use(express.json({ limit: '25mb' }));

  // Standardized CORS headers for cross-origin or Render deployments using VITE_API_BASE_URL
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // 1. Health Endpoint (Supports both /api/health and /api/v1/health)
  app.get(['/api/health', '/api/v1/health'], (_req, res) => {
    res.json({
      status: 'operational',
      agency: 'California Department of Justice — POST Officer Portal',
      environment: process.env.NODE_ENV || 'development',
      appUrl: process.env.APP_URL || `http://localhost:${PORT}`,
      timestamp: new Date().toISOString()
    });
  });

  // 2. Login Endpoint (No public self-registration — only Admin creates accounts)
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: 'Bitte Benutzername und Passwort eingeben.' });
      return;
    }

    const dbState = loadDatabase();
    const matched = dbState.accounts.find(
      a => a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password
    );

    if (!matched) {
      res.status(401).json({
        error: 'Ungültige Anmeldedaten. Neue Konten werden ausschließlich durch den Administrator vergeben.'
      });
      return;
    }

    if (
      matched.publicProfile.whitelistStatus === 'suspended' ||
      matched.publicProfile.whitelistStatus === 'revoked'
    ) {
      res.status(403).json({
        error: `Dieses Dienstkonto ist aktuell gesperrt (Status: ${matched.publicProfile.whitelistStatus.toUpperCase()}). Bitte wende dich an den Administrator.`
      });
      return;
    }

    const nowIso = new Date().toISOString();
    matched.isOnline = true;
    matched.lastSeenIso = nowIso;
    matched.publicProfile.isOnline = true;
    matched.publicProfile.lastSeenIso = nowIso;
    saveDatabase(dbState);

    res.json({
      user: matched.publicProfile,
      isAdmin: matched.publicProfile.role === 'admin'
    });
  });

  // 3. Logout Endpoint (Marks account offline immediately)
  app.post('/api/auth/logout', (req, res) => {
    const { uid } = req.body as { uid?: string };
    if (uid) {
      const dbState = loadDatabase();
      const target = dbState.accounts.find(a => a.uid === uid);
      if (target) {
        const nowIso = new Date().toISOString();
        target.isOnline = false;
        target.lastSeenIso = nowIso;
        target.publicProfile.isOnline = false;
        target.publicProfile.lastSeenIso = nowIso;
        saveDatabase(dbState);
      }
    }
    res.json({ ok: true });
  });

  // 4. Heartbeat & Real-Time State Sync
  app.get('/api/portal/state', (req, res) => {
    const callerUid = String(req.query.uid || '');
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === callerUid);

    if (!caller) {
      res.status(401).json({ error: 'Sitzung abgelaufen oder Konto wurde gelöscht.' });
      return;
    }

    if (
      caller.publicProfile.whitelistStatus === 'suspended' ||
      caller.publicProfile.whitelistStatus === 'revoked'
    ) {
      caller.isOnline = false;
      caller.publicProfile.isOnline = false;
      saveDatabase(dbState);
      res.status(403).json({ error: 'Dein Konto wurde durch den Administrator suspendiert.' });
      return;
    }

    // Update caller heartbeat
    const nowIso = new Date().toISOString();
    caller.isOnline = true;
    caller.lastSeenIso = nowIso;
    caller.publicProfile.isOnline = true;
    caller.publicProfile.lastSeenIso = nowIso;
    saveDatabase(dbState);

    const isAdmin = caller.publicProfile.role === 'admin';
    const isTrainee = caller.publicProfile.role === 'trainee';

    // Recompute live online flags for all accounts
    const publicRoster = dbState.accounts.map(a => ({
      ...a.publicProfile,
      isOnline: computeIsOnline(a),
      lastSeenIso: a.lastSeenIso
    }));

    // Filter out final_exam for trainees on the backend as well
    const visibleExams = isTrainee
      ? dbState.exams.filter(ex => ex.assessmentStage !== 'final_exam')
      : dbState.exams;

    res.json({
      currentUser: {
        ...caller.publicProfile,
        isOnline: true,
        lastSeenIso: nowIso
      },
      isAdmin,
      roster: publicRoster,
      // STRICTLY ADMIN ONLY: Full accounts list with passwords, online status, and private notes
      adminAccounts: isAdmin
        ? dbState.accounts.map(a => ({
            uid: a.uid,
            username: a.username,
            password: a.password,
            isOnline: computeIsOnline(a),
            lastSeenIso: a.lastSeenIso,
            publicProfile: {
              ...a.publicProfile,
              isOnline: computeIsOnline(a),
              lastSeenIso: a.lastSeenIso
            },
            privateProfile: a.privateProfile
          }))
        : [],
      applications: isAdmin
        ? dbState.applications
        : dbState.applications.filter(appItem => appItem.applicantUid === caller.uid),
      modules: dbState.modules,
      exams: visibleExams,
      progress: isAdmin || caller.publicProfile.role === 'colonel'
        ? dbState.progress
        : dbState.progress.filter(p => p.userId === caller.uid),
      deploymentConfig: isAdmin ? ensureDeploymentConfig(dbState) : undefined,
      dbStats: isAdmin
        ? {
            accountsCount: dbState.accounts.length,
            onlineCount: dbState.accounts.filter(a => computeIsOnline(a)).length,
            modulesCount: dbState.modules.length,
            examsCount: dbState.exams.length,
            applicationsCount: dbState.applications.length,
            progressCount: dbState.progress.length,
            sizeBytes: fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0
          }
        : undefined
    });
  });

  // 5. ADMIN ONLY: Create New Account (Defaults to 'trainee' unless specified)
  app.post('/api/admin/accounts', (req, res) => {
    const {
      adminUid,
      username,
      password,
      displayName,
      badgeNumber,
      callsign,
      role,
      rank,
      division,
      whitelistStatus,
      discordTag,
      supervisorNotes
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({
        error: 'Zugriff verweigert. Neue Benutzerkonten können ausschließlich vom Administrator angelegt werden.'
      });
      return;
    }

    if (!username || !password) {
      res.status(400).json({ error: 'Benutzername und Passwort sind Pflichtfelder.' });
      return;
    }

    if (dbState.accounts.some(a => a.username.toLowerCase() === String(username).trim().toLowerCase())) {
      res.status(409).json({ error: 'Dieser Benutzername existiert bereits.' });
      return;
    }

    const uid = `usr_${Date.now()}`;
    const nowIso = new Date().toISOString();
    // Default role is ALWAYS 'trainee' unless explicitly chosen otherwise by Admin
    const targetRole: OfficerRole = (role as OfficerRole) || 'trainee';
    const roleMeta = ROLE_HIERARCHY[targetRole] || ROLE_HIERARCHY.trainee;

    const newAccount: StoredAccountRecord = {
      uid,
      username: String(username).trim(),
      password: String(password),
      isOnline: false,
      lastSeenIso: nowIso,
      publicProfile: {
        uid,
        username: String(username).trim(),
        displayName: String(displayName || username).trim().slice(0, 80),
        badgeNumber: String(badgeNumber || `CA-${Math.floor(1000 + Math.random() * 8999)}`).toUpperCase().slice(0, 20),
        callsign: String(callsign || '10-TRN').trim().slice(0, 20),
        rank: String(rank || roleMeta.defaultRank).trim().slice(0, 50),
        role: targetRole,
        clearanceLevel: roleMeta.defaultClearance,
        division: String(division || 'Training & Evaluation Bureau').trim().slice(0, 60),
        whitelistStatus: (whitelistStatus as WhitelistStatus) || 'whitelisted',
        isOnline: false,
        lastSeenIso: nowIso,
        updatedIso: nowIso
      },
      privateProfile: {
        uid,
        email: `${String(username).trim().toLowerCase()}@post.ca.gov`,
        discordTag: String(discordTag || `${String(username).trim().toLowerCase()}#0001`).slice(0, 64),
        steamHex: 'steam:verified',
        supervisorNotes: String(supervisorNotes || 'Vom Administrator persönlich angelegt.').slice(0, 2000),
        updatedIso: nowIso
      }
    };

    dbState.accounts.push(newAccount);
    saveDatabase(dbState);
    res.json({ account: newAccount });
  });

  // 6. ADMIN ONLY: Update Any Account (Including Admin1's own username & password, role, status)
  app.put('/api/admin/accounts/:targetUid', (req, res) => {
    const { targetUid } = req.params;
    const {
      adminUid,
      username,
      password,
      displayName,
      badgeNumber,
      callsign,
      role,
      rank,
      division,
      whitelistStatus,
      discordTag,
      supervisorNotes
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({
        error: 'Zugriff verweigert. Rang- und Kontenbearbeitung ist ausschließlich dem Administrator erlaubt.'
      });
      return;
    }

    const accountIdx = dbState.accounts.findIndex(a => a.uid === targetUid);
    if (accountIdx === -1) {
      res.status(404).json({ error: 'Benutzerkonto nicht gefunden.' });
      return;
    }

    const target = dbState.accounts[accountIdx];
    const nextUsername = username ? String(username).trim() : target.username;

    if (
      dbState.accounts.some(
        a => a.uid !== targetUid && a.username.toLowerCase() === nextUsername.toLowerCase()
      )
    ) {
      res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
      return;
    }

    const nowIso = new Date().toISOString();
    target.username = nextUsername;
    if (password !== undefined && String(password).length > 0) {
      target.password = String(password);
    }

    const nextRole: OfficerRole = (role as OfficerRole) || target.publicProfile.role;
    const roleMeta = ROLE_HIERARCHY[nextRole] || ROLE_HIERARCHY.trainee;

    target.publicProfile = {
      ...target.publicProfile,
      username: nextUsername,
      displayName: displayName !== undefined ? String(displayName).trim() : target.publicProfile.displayName,
      badgeNumber: badgeNumber !== undefined ? String(badgeNumber).toUpperCase().trim() : target.publicProfile.badgeNumber,
      callsign: callsign !== undefined ? String(callsign).trim() : target.publicProfile.callsign,
      role: nextRole,
      rank: rank !== undefined ? String(rank).trim() : roleMeta.defaultRank,
      clearanceLevel: roleMeta.defaultClearance,
      division: division !== undefined ? String(division).trim() : target.publicProfile.division,
      whitelistStatus: (whitelistStatus as WhitelistStatus) || target.publicProfile.whitelistStatus,
      updatedIso: nowIso
    };

    target.privateProfile = {
      ...target.privateProfile,
      discordTag: discordTag !== undefined ? String(discordTag).trim() : target.privateProfile.discordTag,
      supervisorNotes: supervisorNotes !== undefined ? String(supervisorNotes) : target.privateProfile.supervisorNotes,
      updatedIso: nowIso
    };

    saveDatabase(dbState);
    res.json({ account: target });
  });

  // 7. ADMIN ONLY: Delete Account
  app.delete('/api/admin/accounts/:targetUid', (req, res) => {
    const { targetUid } = req.params;
    const adminUid = String(req.query.adminUid || '');
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);

    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({ error: 'Zugriff verweigert.' });
      return;
    }

    if (targetUid === caller.uid) {
      res.status(400).json({ error: 'Du kannst dein eigenes aktives Administratorkonto nicht löschen.' });
      return;
    }

    dbState.accounts = dbState.accounts.filter(a => a.uid !== targetUid);
    saveDatabase(dbState);
    res.json({ deleted: true });
  });

  // 8. Whitelist Applications Submit & Admin Review
  app.post('/api/applications', (req, res) => {
    const {
      applicantUid,
      characterName,
      dateOfBirth,
      discordTag,
      priorExperience,
      scenarioResponse,
      penalCodeAck
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === applicantUid);
    if (!caller) {
      res.status(401).json({ error: 'Ungültige Sitzung.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const existingIdx = dbState.applications.findIndex(a => a.applicantUid === applicantUid);

    if (existingIdx !== -1) {
      const existing = dbState.applications[existingIdx];
      if (existing.status === 'accepted' || existing.status === 'rejected') {
        res.status(400).json({ error: 'Abgeschlossene Bewerbungen sind schreibgeschützt.' });
        return;
      }
      dbState.applications[existingIdx] = {
        ...existing,
        characterName: String(characterName).trim(),
        dateOfBirth: String(dateOfBirth).trim(),
        discordTag: String(discordTag).trim(),
        priorExperience: String(priorExperience).trim(),
        scenarioResponse: String(scenarioResponse).trim(),
        penalCodeAck: Boolean(penalCodeAck),
        updatedIso: nowIso
      };
    } else {
      dbState.applications.unshift({
        id: `app_${Date.now()}`,
        applicantUid: caller.uid,
        applicantName: caller.publicProfile.displayName,
        characterName: String(characterName).trim(),
        dateOfBirth: String(dateOfBirth).trim(),
        discordTag: String(discordTag).trim(),
        priorExperience: String(priorExperience).trim(),
        scenarioResponse: String(scenarioResponse).trim(),
        penalCodeAck: Boolean(penalCodeAck),
        status: 'pending',
        reviewerUid: '',
        reviewerFeedback: '',
        updatedIso: nowIso
      });
    }

    saveDatabase(dbState);
    res.json({ ok: true });
  });

  app.put('/api/admin/applications/:appId', (req, res) => {
    const { appId } = req.params;
    const { adminUid, status, reviewerFeedback, promoteToRole } = req.body;
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({ error: 'Nur der Administrator darf über Bewerbungen und Rollen entscheiden.' });
      return;
    }

    const appItem = dbState.applications.find(a => a.id === appId);
    if (!appItem) {
      res.status(404).json({ error: 'Bewerbungsakte nicht gefunden.' });
      return;
    }

    const nowIso = new Date().toISOString();
    appItem.status = status;
    appItem.reviewerUid = caller.uid;
    appItem.reviewerFeedback = String(reviewerFeedback || '').trim();
    appItem.updatedIso = nowIso;

    const applicantAccount = dbState.accounts.find(a => a.uid === appItem.applicantUid);
    if (applicantAccount) {
      if (status === 'accepted') {
        const nextRole: OfficerRole = promoteToRole || 'trainee';
        const meta = ROLE_HIERARCHY[nextRole] || ROLE_HIERARCHY.trainee;
        applicantAccount.publicProfile.role = nextRole;
        applicantAccount.publicProfile.rank = meta.defaultRank;
        applicantAccount.publicProfile.clearanceLevel = meta.defaultClearance;
        applicantAccount.publicProfile.whitelistStatus = 'whitelisted';
      } else if (status === 'rejected') {
        applicantAccount.publicProfile.whitelistStatus = 'revoked';
      }
    }

    saveDatabase(dbState);
    res.json({ ok: true });
  });

  // 9. Academy Textbooks/PDFs & Code Tests/Final Exams (Editable by Admin AND Colonel)
  app.post('/api/academy/modules', (req, res) => {
    const {
      actorUid,
      title,
      code,
      category,
      requiredRole,
      embedType,
      contentMarkdown,
      externalUrl,
      pdfDataUrl,
      pdfFileName,
      interactiveCode,
      estimatedMinutes
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === actorUid);
    if (!caller || !ROLE_HIERARCHY[caller.publicProfile.role]?.canEditAcademy) {
      res.status(403).json({
        error: 'Zugriff verweigert. Nur Admin und Colonel dürfen Lehrmaterialien und Lehrbücher hinzufügen.'
      });
      return;
    }

    const reqRole: OfficerRole = requiredRole || 'trainee';
    const newMod: TrainingModuleDoc = {
      id: `mod_${Date.now()}`,
      title: String(title).trim(),
      code: String(code || 'SOP-01').trim(),
      category: category || 'SOP & Policy',
      minClearance: ROLE_HIERARCHY[reqRole]?.defaultClearance || 1,
      requiredRole: reqRole,
      embedType: embedType || 'pdf_upload',
      contentMarkdown: String(contentMarkdown || ''),
      externalUrl: String(externalUrl || ''),
      pdfDataUrl: String(pdfDataUrl || ''),
      pdfFileName: String(pdfFileName || ''),
      interactiveCode: String(interactiveCode || ''),
      estimatedMinutes: Number(estimatedMinutes) || 25,
      authorUid: caller.uid,
      updatedIso: new Date().toISOString()
    };

    dbState.modules.push(newMod);
    saveDatabase(dbState);
    res.json({ module: newMod });
  });

  app.put('/api/academy/modules/:modId', (req, res) => {
    const { modId } = req.params;
    const {
      actorUid,
      title,
      code,
      category,
      requiredRole,
      embedType,
      contentMarkdown,
      externalUrl,
      pdfDataUrl,
      pdfFileName,
      interactiveCode,
      estimatedMinutes
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === actorUid);
    if (!caller || !ROLE_HIERARCHY[caller.publicProfile.role]?.canEditAcademy) {
      res.status(403).json({ error: 'Zugriff verweigert.' });
      return;
    }

    const idx = dbState.modules.findIndex(m => m.id === modId);
    if (idx === -1) {
      res.status(404).json({ error: 'Lehrmaterial nicht gefunden.' });
      return;
    }

    const reqRole: OfficerRole = requiredRole || dbState.modules[idx].requiredRole;
    dbState.modules[idx] = {
      ...dbState.modules[idx],
      title: title !== undefined ? String(title).trim() : dbState.modules[idx].title,
      code: code !== undefined ? String(code).trim() : dbState.modules[idx].code,
      category: category || dbState.modules[idx].category,
      requiredRole: reqRole,
      minClearance: ROLE_HIERARCHY[reqRole]?.defaultClearance || 1,
      embedType: embedType || dbState.modules[idx].embedType,
      contentMarkdown: contentMarkdown !== undefined ? String(contentMarkdown) : dbState.modules[idx].contentMarkdown,
      externalUrl: externalUrl !== undefined ? String(externalUrl) : dbState.modules[idx].externalUrl,
      pdfDataUrl: pdfDataUrl !== undefined ? String(pdfDataUrl) : dbState.modules[idx].pdfDataUrl,
      pdfFileName: pdfFileName !== undefined ? String(pdfFileName) : dbState.modules[idx].pdfFileName,
      interactiveCode: interactiveCode !== undefined ? String(interactiveCode) : dbState.modules[idx].interactiveCode,
      estimatedMinutes: Number(estimatedMinutes) || dbState.modules[idx].estimatedMinutes,
      updatedIso: new Date().toISOString()
    };

    saveDatabase(dbState);
    res.json({ module: dbState.modules[idx] });
  });

  app.delete('/api/academy/modules/:modId', (req, res) => {
    const actorUid = String(req.query.actorUid || '');
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === actorUid);
    if (!caller || !ROLE_HIERARCHY[caller.publicProfile.role]?.canEditAcademy) {
      res.status(403).json({ error: 'Zugriff verweigert.' });
      return;
    }
    dbState.modules = dbState.modules.filter(m => m.id !== req.params.modId);
    saveDatabase(dbState);
    res.json({ deleted: true });
  });

  app.post('/api/academy/exams', (req, res) => {
    const {
      actorUid,
      title,
      moduleCode,
      assessmentStage,
      passingScore,
      timeLimitMinutes,
      examFormat,
      questionsPayload,
      interactiveWidgetCode
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === actorUid);
    if (!caller || !ROLE_HIERARCHY[caller.publicProfile.role]?.canEditAcademy) {
      res.status(403).json({
        error: 'Zugriff verweigert. Nur Admin und Colonel dürfen Tests und Prüfungen anlegen.'
      });
      return;
    }

    const stage = assessmentStage === 'final_exam' ? 'final_exam' : 'test';
    const newExam: AcademyExamDoc = {
      id: `exam_${Date.now()}`,
      title: String(title).trim(),
      moduleCode: String(moduleCode || 'TEST-01').trim(),
      assessmentStage: stage,
      minClearance: stage === 'final_exam' ? ROLE_HIERARCHY.rookie.defaultClearance : ROLE_HIERARCHY.trainee.defaultClearance,
      passingScore: Number(passingScore) || 75,
      timeLimitMinutes: Number(timeLimitMinutes) || 20,
      examFormat: examFormat || 'interactive_code',
      questionsPayload: String(questionsPayload || '[]'),
      interactiveWidgetCode: String(interactiveWidgetCode || ''),
      authorUid: caller.uid,
      updatedIso: new Date().toISOString()
    };

    dbState.exams.push(newExam);
    saveDatabase(dbState);
    res.json({ exam: newExam });
  });

  app.delete('/api/academy/exams/:examId', (req, res) => {
    const actorUid = String(req.query.actorUid || '');
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === actorUid);
    if (!caller || !ROLE_HIERARCHY[caller.publicProfile.role]?.canEditAcademy) {
      res.status(403).json({ error: 'Zugriff verweigert.' });
      return;
    }
    dbState.exams = dbState.exams.filter(e => e.id !== req.params.examId);
    saveDatabase(dbState);
    res.json({ deleted: true });
  });

  // 10. Progress Tracking
  app.post('/api/progress', (req, res) => {
    const { userId, targetId, targetType, targetTitle, status, scorePercent } = req.body;
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === userId);
    if (!caller) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }

    const existingIdx = dbState.progress.findIndex(
      p => p.userId === userId && p.targetId === targetId && p.targetType === targetType
    );

    const nowIso = new Date().toISOString();
    if (existingIdx !== -1) {
      dbState.progress[existingIdx] = {
        ...dbState.progress[existingIdx],
        status,
        scorePercent: Number(scorePercent),
        attempts: dbState.progress[existingIdx].attempts + 1,
        updatedIso: nowIso
      };
    } else {
      dbState.progress.unshift({
        id: `prog_${userId}_${targetId}`,
        userId: caller.uid,
        userName: caller.publicProfile.displayName,
        targetId,
        targetType,
        targetTitle,
        status,
        scorePercent: Number(scorePercent),
        attempts: 1,
        updatedIso: nowIso
      });
    }

    saveDatabase(dbState);
    res.json({ ok: true });
  });

  // External Game-Server Whitelist Verification Webhook / REST Endpoint
  app.get(['/api/v1/whitelist/verify', '/api/whitelist/verify'], (req, res) => {
    const { badge, username } = req.query;
    const dbState = loadDatabase();
    const found = dbState.accounts.find(
      a =>
        (badge && a.publicProfile.badgeNumber.toLowerCase() === String(badge).toLowerCase()) ||
        (username && a.username.toLowerCase() === String(username).toLowerCase())
    );

    if (!found) {
      res.json({
        protocol: 'CA-POST-RP-BRIDGE-v1',
        verifiedAt: new Date().toISOString(),
        whitelisted: false,
        reason: 'ACCOUNT_NOT_FOUND'
      });
      return;
    }

    res.json({
      protocol: 'CA-POST-RP-BRIDGE-v1',
      verifiedAt: new Date().toISOString(),
      officer: {
        username: found.username,
        displayName: found.publicProfile.displayName,
        badgeNumber: found.publicProfile.badgeNumber,
        callsign: found.publicProfile.callsign,
        rank: found.publicProfile.rank,
        role: found.publicProfile.role,
        clearanceLevel: found.publicProfile.clearanceLevel,
        whitelistStatus: found.publicProfile.whitelistStatus,
        isOnline: computeIsOnline(found)
      },
      whitelisted:
        found.publicProfile.whitelistStatus === 'whitelisted' ||
        found.publicProfile.whitelistStatus === 'probation'
    });
  });

  // Generate Render.com Blueprint (Free Tier + Auto-Deploy on main) & GitHub Actions CI/CD manifest
  app.get(['/api/v1/deployment/manifests', '/api/deployment/manifests'], (_req, res) => {
    const dbState = loadDatabase();
    const cfg = ensureDeploymentConfig(dbState);

    const renderYaml = `services:
  - type: web
    name: ca-post-officer-portal
    runtime: node
    plan: free
    region: frankfurt
    branch: ${cfg.branchName || 'main'}
    autoDeploy: true
    buildCommand: npm install && npm run build
    startCommand: npm run start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000`;

    const githubWorkflow = `name: Verify Build & Auto-Deploy to Render

on:
  push:
    branches: [ "${cfg.branchName || 'main'}" ]
  pull_request:
    branches: [ "${cfg.branchName || 'main'}" ]

jobs:
  build-and-verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install Dependencies
        run: npm install --legacy-peer-deps --no-audit --no-fund

      - name: TypeScript Check & Production Build
        run: npm run lint && npm run build

      - name: Optional Render Deploy Hook Trigger
        if: github.ref == 'refs/heads/${cfg.branchName || 'main'}'
        env:
          RENDER_DEPLOY_HOOK_URL: \${{ secrets.RENDER_DEPLOY_HOOK_URL }}
        run: |
          if [ -n "$RENDER_DEPLOY_HOOK_URL" ]; then
            curl -fsSL -X POST "$RENDER_DEPLOY_HOOK_URL"
          else
            echo "Kein RENDER_DEPLOY_HOOK_URL Secret gesetzt — Render Auto-Deploy ueber ${cfg.branchName || 'main'} Branch aktiv."
          fi`;

    res.json({
      renderYaml,
      githubWorkflow,
      deploymentConfig: cfg
    });
  });

  // ADMIN ONLY: Update GitHub Repository URL, Render Service URL & Setup Checklist Progress
  app.put('/api/admin/deployment-config', (req, res) => {
    const {
      adminUid,
      githubRepoUrl,
      renderServiceUrl,
      renderDeployHookUrl,
      branchName,
      autoDeployEnabled,
      completedSteps
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({ error: 'Nur der Administrator kann die Deployment-Konfiguration ändern.' });
      return;
    }

    const cfg = ensureDeploymentConfig(dbState);
    if (typeof githubRepoUrl === 'string') cfg.githubRepoUrl = githubRepoUrl.trim();
    if (typeof renderServiceUrl === 'string') cfg.renderServiceUrl = renderServiceUrl.trim();
    if (typeof renderDeployHookUrl === 'string') cfg.renderDeployHookUrl = renderDeployHookUrl.trim();
    if (typeof branchName === 'string' && branchName.trim()) cfg.branchName = branchName.trim();
    if (typeof autoDeployEnabled === 'boolean') cfg.autoDeployEnabled = autoDeployEnabled;
    if (Array.isArray(completedSteps)) cfg.completedSteps = completedSteps.map(String);
    cfg.updatedIso = new Date().toISOString();

    saveDatabase(dbState);
    res.json({ ok: true, deploymentConfig: cfg });
  });

  // ADMIN ONLY: 1-Click Full Database Backup Export (Accounts, Passwords, PDFs, Tests, Progress)
  app.get('/api/admin/backup', (req, res) => {
    const adminUid = String(req.query.adminUid || '');
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({ error: 'Zugriff verweigert. Nur der Administrator kann Datenbank-Backups exportieren.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const cfg = ensureDeploymentConfig(dbState);
    cfg.lastBackupExportIso = nowIso;
    cfg.updatedIso = nowIso;
    saveDatabase(dbState);

    const snapshot: PortalBackupSnapshot = {
      snapshotFormat: 'CA_POST_PORTAL_BACKUP_V3',
      exportedAtIso: nowIso,
      exportedByUsername: caller.username,
      summary: {
        accountsCount: dbState.accounts.length,
        modulesCount: dbState.modules.length,
        examsCount: dbState.exams.length,
        applicationsCount: dbState.applications.length,
        progressCount: dbState.progress.length
      },
      database: {
        version: dbState.version || 3,
        accounts: dbState.accounts,
        applications: dbState.applications,
        modules: dbState.modules,
        exams: dbState.exams,
        progress: dbState.progress,
        deploymentConfig: cfg
      }
    };

    res.json(snapshot);
  });

  // ADMIN ONLY: 1-Click Full Database Restore (Safeguards Admin access & restores all Accounts, PDFs, Tests)
  app.post('/api/admin/restore', (req, res) => {
    const { adminUid, snapshot } = req.body as {
      adminUid?: string;
      snapshot?: Partial<PortalBackupSnapshot> & Partial<PortalDatabaseState>;
    };

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({ error: 'Zugriff verweigert. Nur der Administrator kann ein Datenbank-Backup einspielen.' });
      return;
    }

    if (!snapshot || typeof snapshot !== 'object') {
      res.status(400).json({ error: 'Ungültige Backup-Datei.' });
      return;
    }

    // Accept either wrapped PortalBackupSnapshot ({ database: { ... } }) or raw PortalDatabaseState
    const rawDb = (snapshot.database ? snapshot.database : snapshot) as Partial<PortalDatabaseState>;
    if (!Array.isArray(rawDb.accounts) || rawDb.accounts.length === 0) {
      res.status(400).json({
        error: 'Die Backup-Datei enthält keine gültigen Benutzerkonten (accounts).'
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const restoredAccounts: StoredAccountRecord[] = rawDb.accounts.map(acc => ({
      ...acc,
      isOnline: acc.uid === caller.uid ? true : Boolean(acc.isOnline),
      lastSeenIso: acc.uid === caller.uid ? nowIso : acc.lastSeenIso || nowIso,
      publicProfile: {
        ...acc.publicProfile,
        isOnline: acc.uid === caller.uid ? true : Boolean(acc.publicProfile?.isOnline),
        lastSeenIso: acc.uid === caller.uid ? nowIso : acc.publicProfile?.lastSeenIso || nowIso
      }
    }));

    // Safety guarantee: Ensure the currently logged-in Admin account still exists so Admin never locks themselves out
    if (!restoredAccounts.some(a => a.uid === caller.uid)) {
      restoredAccounts.unshift({
        ...caller,
        isOnline: true,
        lastSeenIso: nowIso
      });
    }

    const currentCfg = ensureDeploymentConfig(dbState);
    const incomingCfg = rawDb.deploymentConfig || currentCfg;

    const nextState: PortalDatabaseState = {
      version: 3,
      accounts: restoredAccounts,
      applications: Array.isArray(rawDb.applications) ? rawDb.applications : [],
      modules: Array.isArray(rawDb.modules) ? rawDb.modules : [],
      exams: Array.isArray(rawDb.exams) ? rawDb.exams : [],
      progress: Array.isArray(rawDb.progress) ? rawDb.progress : [],
      deploymentConfig: {
        ...currentCfg,
        ...incomingCfg,
        lastBackupRestoreIso: nowIso,
        updatedIso: nowIso
      }
    };

    saveDatabase(nextState);

    res.json({
      ok: true,
      restoredAtIso: nowIso,
      summary: {
        accountsCount: nextState.accounts.length,
        modulesCount: nextState.modules.length,
        examsCount: nextState.exams.length,
        applicationsCount: nextState.applications.length,
        progressCount: nextState.progress.length
      }
    });
  });

  // ADMIN ONLY: Optional Render Deploy Hook Trigger
  app.post('/api/admin/trigger-deploy', async (req, res) => {
    const { adminUid, deployHookUrl } = req.body as { adminUid?: string; deployHookUrl?: string };
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({ error: 'Nur der Administrator kann einen Render-Deploy auslösen.' });
      return;
    }

    const cfg = ensureDeploymentConfig(dbState);
    const targetHook = (deployHookUrl || cfg.renderDeployHookUrl || '').trim();
    if (!targetHook || !targetHook.startsWith('https://api.render.com/deploy/')) {
      res.status(400).json({
        error: 'Bitte eine gültige Render Deploy Hook URL (beginnend mit https://api.render.com/deploy/...) hinterlegen.'
      });
      return;
    }

    try {
      const response = await fetch(targetHook, { method: 'POST' });
      if (!response.ok) {
        res.status(502).json({
          error: `Render hat den Deploy-Hook mit Status ${response.status} abgelehnt.`
        });
        return;
      }
      res.json({
        ok: true,
        triggeredAtIso: new Date().toISOString(),
        message: 'Render Deployment erfolgreich angestoßen.'
      });
    } catch {
      res.status(500).json({
        error: 'Verbindung zur Render Deploy Hook URL fehlgeschlagen.'
      });
    }
  });

  // Ensure unknown /api/* requests always return JSON 404 instead of SPA index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: `API-Endpunkt nicht gefunden: ${req.method} ${req.originalUrl}`
    });
  });

  const distPath = path.join(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CA-POST Officer Portal] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
