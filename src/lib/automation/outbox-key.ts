import "server-only";

/**
 * Canonical queue-mode outbox key contract.
 * Derived from immutable automation source event + approved purpose + rule version.
 * This is the only producer key for automation-driven customer communication.
 */
export function buildQueueOutboxKeyFromAutomationEvent(input: {
  automationEventId: string;
  purpose: string;
  ruleVersion: number;
}): string {
  return `auto:${String(input.automationEventId)}:purpose:${String(input.purpose)}:rv:${Math.max(
    1,
    Number(input.ruleVersion || 1),
  )}`;
}

/**
 * Compatibility key for legacy direct/manual application message paths.
 * Not used by queue-mode automation producer chain.
 */
export function buildLegacyApplicationOutboxKey(input: {
  applicationId: string;
  eventType: string;
  version?: number;
}): string {
  return `${String(input.applicationId)}:${String(input.eventType)}:${Math.max(1, Number(input.version ?? 1))}`;
}

