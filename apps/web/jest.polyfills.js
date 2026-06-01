// jsdom doesn't expose Node's TextEncoder/Decoder, which some libraries
// (including React 18's flight server) reach for. Install the Node
// built-ins onto globalThis before any test code runs.
//
// We deliberately stop here. If you re-enable MSW in `jest.setup.ts`, also
// add Fetch API polyfills (Request/Response/fetch/Headers/Blob/ReadableStream
// from undici + node:stream/web) so msw/node can boot.
const { TextEncoder, TextDecoder } = require('node:util');
Object.assign(globalThis, { TextEncoder, TextDecoder });
