// Prints the Instagram refresh status (same shape the panel shows) as JSON, from the scanner files synced to this Mac.
// The hourly job uploads it to the server: deploy/push-ig-status.sh.
//   IG_STATUS_DIR=…/09_instagram/posts_scan pnpm tsx scripts/app/ig-status-json.ts > ig-status.json
import { instagramFileStatus } from '../../src/server/services/instagram'

process.stdout.write(JSON.stringify(await instagramFileStatus()))
