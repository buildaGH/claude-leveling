/**
 * types.ts — Core types for the schema migration system.
 *
 * Migrations operate on `Record<string, unknown>` rather than typed state
 * interfaces. This is intentional: an old file on disk may not satisfy the
 * current TypeScript types, so the migration layer must handle arbitrary shapes
 * and only produce a typed value once all transforms have been applied.
 */

export type RawState = Record<string, unknown>;

export interface Migration {
  /** The schemaVersion this migration expects to receive. */
  fromVersion: string;
  /** The schemaVersion this migration produces. */
  toVersion: string;
  /**
   * Transform a state object from `fromVersion` shape to `toVersion` shape.
   * Must return a new object (not mutate the input).
   */
  up: (state: RawState) => RawState;
}
