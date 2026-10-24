import { describe, expect, it } from "vitest";
import { calculateConnectedOverlapSeconds, calculatePresenceSummary, type PresenceEvent } from "./livekit-usage";

const instant = (seconds: number) => new Date(seconds * 1000);
const event = (
  id: string, at: number, participantRole: PresenceEvent["participantRole"],
  participantUserId: string | null, kind: PresenceEvent["kind"],
): PresenceEvent => ({ id, occurredAt: instant(at), participantRole, participantUserId, kind });

describe("LiveKit billable overlap seconds", () => {
  it("counts each second once while student and at least one institute member overlap", () => {
    const events = [
      event("e0000001", 0, "student", "student-id", "joined"),
      event("e0000002", 10, "institute", "advisor-a", "joined"),
      event("e0000003", 20, "student", "student-id", "left"),
      event("e0000004", 25, "student", "student-id", "joined"),
      event("e0000005", 25, "institute", "advisor-b", "joined"),
      event("e0000006", 30, "institute", "advisor-a", "left"),
      event("e0000007", 40, "student", "student-id", "left"),
      event("e0000008", 50, "system", null, "room_finished"),
    ];
    expect(calculateConnectedOverlapSeconds(events.reverse())).toBe(25);
  });

  it("stops at room_finished and does not count a one-sided connection", () => {
    expect(calculateConnectedOverlapSeconds([
      event("e0000011", 0, "student", "student-id", "joined"),
      event("e0000012", 10, "institute", "advisor", "joined"),
      event("e0000013", 35, "system", null, "room_finished"),
      event("e0000014", 70, "student", "student-id", "left"),
    ])).toBe(25);
    expect(calculateConnectedOverlapSeconds([
      event("e0000021", 0, "student", "student-id", "joined"),
      event("e0000022", 90, "system", null, "room_finished"),
    ])).toBe(0);
  });

  it("reports a live overlap so the quota worker can calculate its exact deadline", () => {
    const summary = calculatePresenceSummary([
      event("e0000031", 100, "student", "student-id", "joined"),
      event("e0000032", 107, "institute", "advisor", "joined"),
    ]);
    expect(summary).toEqual({
      connectedSeconds: 0, activeOverlap: true, lastEventAt: instant(107),
    });
  });
});
