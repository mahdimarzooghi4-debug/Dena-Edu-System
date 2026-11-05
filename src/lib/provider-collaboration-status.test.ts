import { expect, test } from "vitest";
import { collaborationPhases } from "./provider-collaboration-status";
test("only Dena approval activates collaboration; acceptance alone stays pending", () => {
  expect(collaborationPhases("awaiting_dena")).toMatchObject({institute:"پذیرفته‌شده",dena:"در انتظار بررسی نهایی",approved:false});
  expect(collaborationPhases("approved").approved).toBe(true);
  for(const status of ["requested","institute_rejected","dena_rejected","withdrawn"] as const) expect(collaborationPhases(status).approved).toBe(false);
  expect(collaborationPhases("institute_rejected").dena).toBe("هنوز به این مرحله نرسیده");
  expect(collaborationPhases("dena_rejected").institute).toBe("پذیرفته‌شده");
});
