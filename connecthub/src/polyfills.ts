/**
 * Polyfills for sockjs-client and other Node.js libraries in browser
 */

// Polyfill global for sockjs-client
(globalThis as any).global = globalThis;
