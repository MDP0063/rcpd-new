# Security Specification (Phase 0 TDD) — San Andreas Highway Patrol & California POST Officer Portal

## 1. Data Invariants
1. **Master Gate & Role Integrity (`users/{userId}`)**:
   - Every authenticated user can create their initial public profile ONLY with `uid == request.auth.uid`.
   - Regular users cannot self-assign `role: 'admin'`, `role: 'supervisor'`, or `whitelistStatus: 'whitelisted'` unless they are the bootstrapped administrator (`marlon.xv0063@gmail.com` with `email_verified == true`) or already registered in `/admins/{uid}`.
   - Only an Admin can modify RBAC fields (`role`, `rank`, `clearanceLevel`, `division`, `whitelistStatus`, `badgeNumber`, `callsign`) on any user profile.
2. **PII Split Isolation (`users_private/{userId}`)**:
   - Contains sensitive fields (`email`, `discordTag`, `steamHex`, `supervisorNotes`).
   - Strictly readable ONLY by the document owner (`request.auth.uid == userId`) or `isAdmin()`. Blanket reads are impossible.
3. **Application Ownership & Terminal State Locking (`applications/{applicationId}`)**:
   - Created only by verified users where `incoming().applicantUid == request.auth.uid` and initial `status == 'pending'`.
   - Once an application reaches a terminal state (`accepted` or `rejected`), applicants cannot modify it (`existing().status in ['accepted', 'rejected']` blocks non-admin updates).
4. **Clearance-Gated Training Materials & Exams (`training_modules/{moduleId}`, `exams/{examId}`)**:
   - Only `isAdmin()` or instructors (`FTO`/`Supervisor` checked via `isAdmin()`) can create, update, or delete training modules and exams.
   - All string fields are strictly bounded by `.size()` checks to prevent Denial-of-Wallet storage exhaustion.
5. **Progress Tracking Integrity (`user_progress/{progressId}`)**:
   - Created and updated only by the owning officer (`incoming().userId == request.auth.uid`) or `isAdmin()`.
   - `createdAt` is immortal (`incoming().createdAt == existing().createdAt` on update) and validated against `request.time` on creation.

## 2. The "Dirty Dozen" Payloads
1. **Self-Privilege Escalation on Registration**: User attempts to create `/users/attacker1` with `role: "admin"`, `clearanceLevel: 5`, `whitelistStatus: "whitelisted"`. -> `PERMISSION_DENIED`
2. **Shadow Field Injection on User Update**: User updates `/users/user1` adding `"isSuperAdmin": true` alongside `displayName`. -> `PERMISSION_DENIED`
3. **Unverified Admin Email Spoof**: Attacker token has `email == "marlon.xv0063@gmail.com"` but `email_verified == false`. -> `PERMISSION_DENIED`
4. **Horizontal PII Scraping**: Authenticated user `user2` executes `get` or `list` on `/users_private/user1`. -> `PERMISSION_DENIED`
5. **ID Poisoning Attack**: User attempts to create `/applications/invalid$id!with*spaces` or a 500-char ID. -> `PERMISSION_DENIED`
6. **1MB String Resource Exhaustion (Denial of Wallet)**: Applicant sends 50,000-character string in `scenarioResponse` (limit 3,000). -> `PERMISSION_DENIED`
7. **Terminal State Bypass on Whitelist Application**: Applicant tries to edit `scenarioResponse` after `status` is already `'accepted'` or `'rejected'`. -> `PERMISSION_DENIED`
8. **Applicant Self-Approving Whitelist**: Applicant updates own `/applications/app1` setting `status: "accepted"`. -> `PERMISSION_DENIED`
9. **Unauthorized Curriculum Injection**: Standard Cadet attempts to `create` or `update` `/training_modules/mod1`. -> `PERMISSION_DENIED`
10. **Progress Spoofing for Another Officer**: User `user1` attempts to create `/user_progress/prog1` with `userId: "user2"`. -> `PERMISSION_DENIED`
11. **Immortal Timestamp Tampering**: User updates `/user_progress/prog1` and modifies `createdAt` to an earlier timestamp. -> `PERMISSION_DENIED`
12. **Client Timestamp Forgery**: User creates `/applications/app1` with a hardcoded past/future `createdAt` instead of `request.time`. -> `PERMISSION_DENIED`
