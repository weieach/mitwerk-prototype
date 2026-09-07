// Stage 1: prove the whole path from a plain Node process — connect to the remote
// Figma MCP server, sign in if needed, and write one annotation. No UI involved.
//
//   npm run spike
//   npm run spike -- "<figma design url>" "<frame name>"
import { annotateFrame } from '../server/annotate.mjs';

const DEFAULT_URL =
  'https://www.figma.com/design/30KWPrZ48jBMqozHlwSarX/Test--agent-annotation?node-id=0-1';
const DEFAULT_FRAME = 'Test frame';

const [, , urlArg, frameArg] = process.argv;
const fileUrl = urlArg ?? DEFAULT_URL;
const frameName = frameArg ?? DEFAULT_FRAME;

console.log(`file:  ${fileUrl}`);
console.log(`frame: ${frameName}`);
console.log('connecting to https://mcp.figma.com/mcp ...');

const result = await annotateFrame({ fileUrl, frameName });

console.log('');
console.log(result.ok ? 'OK  ' + result.message : 'FAIL  ' + result.message);
if (result.detail !== undefined) {
  console.log('detail:', typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail, null, 2));
}
process.exit(result.ok ? 0 : 1);
