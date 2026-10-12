import { describe, expect, it } from "vitest";
import {
  addIranBusinessMinutes, iranBusinessMinutesBetween, SUPPORT_SLA_MINUTES,
} from "./sla";

describe("Iran support business-time clock", () => {
  it("keeps the approved first-response and resolution targets", () => {
    expect(SUPPORT_SLA_MINUTES).toEqual({
      urgent: { firstResponse: 120, resolution: 480 },
      high: { firstResponse: 480, resolution: 960 },
      normal: { firstResponse: 480, resolution: 1440 },
      low: { firstResponse: 960, resolution: 2400 },
    });
  });

  it("counts Saturday through Thursday from 09:00 to 17:00 Tehran", () => {
    const fridayAtNineTehran = new Date("2026-10-02T05:30:00.000Z");
    expect(addIranBusinessMinutes(fridayAtNineTehran, 60).toISOString())
      .toBe("2026-10-03T06:30:00.000Z");
  });

  it("skips overnight and Friday time when adding an SLA duration", () => {
    const thursdayAt1630Tehran = new Date("2026-10-01T13:00:00.000Z");
    expect(addIranBusinessMinutes(thursdayAt1630Tehran, 120).toISOString())
      .toBe("2026-10-03T07:00:00.000Z");
  });

  it("measures the business minutes that elapsed while a ticket awaited its requester", () => {
    const thursdayAt16Tehran = new Date("2026-10-01T12:30:00.000Z");
    const saturdayAt10Tehran = new Date("2026-10-03T06:30:00.000Z");
    expect(iranBusinessMinutesBetween(thursdayAt16Tehran, saturdayAt10Tehran)).toBe(120);
  });
});
