# rules.md — Development Rules

> What developers and AI MUST and MUST NOT do. Read before every task.

## 1. Workflow rules
DO
- Read `memory.md` first, then `phases.md`, then the relevant doc (PRD, architecture, database, design) before changing anything.
- Work one task at a time and confirm after each step.
- For small changes, share "replace this / add here" snippets with file name and location. Share a full file only when changes are widespread.
- Update `memory.md` and tick `phases.md` after each meaningful change.
- Document any architecture, schema, or design change before or with the change.

DON'T
- Don't start a new phase before the current phase completion criteria are met.
- Don't rewrite working files without a reason.
- Don't change the tech stack or the architecture silently.

## 2. Language rules
- All code, comments, strings, placeholders, commit messages and docs are in English only.
- Chat explanations with the AI can be Hinglish; never put Hindi/Hinglish inside code.

## 3. Coding standards
DO
- Use TypeScript in `client`, modern JavaScript (ES modules) in `server`.
- Keep functions small and single-purpose.
- Use `async/await` with try/catch (or a wrapper) on every async route.
- Use constants from `lib/constants.ts` (client) and `utils/constants.js` (server) for statuses and types.

DON'T
- Don't use `any` in TypeScript unless unavoidable and commented.
- Don't leave `console.log` debug lines in committed code.
- Don't duplicate logic that already exists in a util or service.

## 4. Naming conventions
| Item | Convention | Example |
|---|---|---|
| React components | PascalCase file and name | `IssueCard.tsx` |
| Hooks | `useX` | `useIssues.ts` |
| Functions, variables | camelCase | `getHotspots` |
| Constants | UPPER_SNAKE_CASE | `ISSUE_STATUSES` |
| Server files | camelCase | `issueService.js` |
| DB tables, columns | snake_case | `status_history` |
| API paths | kebab-case, plural nouns | `/api/issues` |
| Branches | `feat/...`, `fix/...`, `docs/...` | `feat/report-form` |

## 5. Folder and component conventions
DO
- Put reusable UI in `components/ui`, feature UI in its feature folder.
- Keep routes thin: validate, call service, return response.
- Put business logic in `services`.

DON'T
- Don't create a second component for something that exists (search first).
- Don't put database calls inside route files.

## 6. API conventions
- Always return the envelope `{ data, error }`.
- Status codes: 200, 201, 400 (validation), 401 (no/invalid token), 403 (wrong role), 404, 409 (conflict), 429 (rate limit), 500.
- Error codes are uppercase strings, e.g. `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`.
- Validate every body, query and param (use `zod`).
- Pagination: `limit` (max 100 default 50) and `offset`.

## 7. Database conventions
- Schema changes go in a new numbered SQL file (`004_...sql`) and are recorded in `database.md`.
- Never edit an already-applied SQL file; add a new one.
- Use parameterized queries or Supabase client methods; never string-concatenate SQL.

## 8. Security rules
DO
- Keep the Supabase service role key on the server only.
- Verify the token and role on the server for every protected route.
- Restrict CORS to `CLIENT_ORIGIN`.
- Use `helmet` and rate limiting.
- Validate upload type (jpg, png, webp) and size (max 2 MB).

DON'T
- Don't hardcode secrets or commit `.env` files.
- Don't expose the service role key to the client or in logs.
- Don't trust role information sent by the client.
- Don't show reporter email or phone anywhere.

## 9. Authentication rules
- Login happens through Supabase Auth on the client; the API only reads the Bearer token.
- Admin role is set manually in `profiles.role`. No endpoint may change roles.
- Protected pages redirect to `/login` and return after login.

## 10. Environment variables
- Every variable is listed in `.env.example` with a fake value.
- Client variables that must be public start with `NEXT_PUBLIC_`; nothing secret may use that prefix.
- Never commit `.env`, `.env.local`.

## 11. Error handling and validation
DO
- Use one central Express error handler.
- Show friendly messages in the UI; log details on the server.
- Show loading, empty, and error states on every data screen.

DON'T
- Don't return stack traces or raw database errors to the client.
- Don't swallow errors silently.

## 12. Responsive and accessibility rules
- Mobile-first; test at 360 px, 768 px, 1280 px.
- Touch targets at least 44 px.
- Every input has a label; images have alt text; color is never the only status indicator (use text in badges).
- Maintain AA contrast.

## 13. Git and GitHub rules
- Repo: `jalsaathi`. Branch `main` is always deployable.
- Small commits with clear messages: `feat: add report form`, `fix: map pin offset`.
- Tag the end of each phase: `phase-1-done`, `phase-2-done`, and so on.
- Never commit `node_modules`, `.next`, `.env*`.

## 14. Dependency rules
DO
- Install only what is needed and note why in the PR/commit.
- Approved list: `express, cors, helmet, dotenv, zod, multer, express-rate-limit, @supabase/supabase-js` (server); `next, react, tailwindcss, @supabase/supabase-js, leaflet, react-leaflet, chart.js, react-chartjs-2` (client).

DON'T
- Don't add a library for something that takes under 20 lines.
- Don't add a second library for a job an approved library already does.

## 15. Performance rules
- Map requests use bounding box and `limit`.
- Use database indexes listed in `database.md`.
- Compress images on upload limit (2 MB) and show thumbnails in lists.
- Lazy-load the map and charts.

## 16. Testing rules
- Run `sanity_checks.sql` after seed.
- Manually test each user journey in `PRD.md` before marking a phase done.
- Test every protected endpoint for 401 and 403.
- Before demo: test on a phone and on a slow network.

## 17. Documentation rules
- If two docs conflict: identify the conflict, state the correct choice, update the docs, then continue.
- Record decisions in `architecture.md` section 11.
