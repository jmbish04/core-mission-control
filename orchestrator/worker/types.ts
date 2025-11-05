/**
 * Worker type definitions
 * 
 * The Env interface is declared globally in worker-configuration.d.ts
 * via: interface Env extends Cloudflare.Env {}
 * 
 * This file provides a convenient import point for the Env type
 * to ensure consistent typing across the worker codebase.
 * 
 * Since Env is declared globally, we reference it here for explicit imports.
 */

// Reference the globally declared Env interface
// This works because worker-configuration.d.ts declares: interface Env extends Cloudflare.Env {}
// TypeScript will automatically make this available in the global scope
export interface Env extends Cloudflare.Env {}

