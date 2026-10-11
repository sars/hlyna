// Which data/auth backend the site runs on during the move off Payload.
// Unset (default) = Payload, as in production today. DATA_BACKEND=app = the new Drizzle schema + Better Auth.
// Cutover flips this in the server .env; rollback flips it back (see deploy/cutover.sh).
export const appBackend = () => process.env.DATA_BACKEND === 'app'
