import { describe, expect, it } from "vitest";
import { selectLeastLoadedSupportOperator } from "./routing";

describe("least-loaded support routing", () => {
  it("chooses the operator with the fewest open tickets", () => {
    expect(selectLeastLoadedSupportOperator(
      ["operator-a", "operator-b", "operator-c"],
      new Map([["operator-a", 3], ["operator-b", 1], ["operator-c", 2]]),
    )).toBe("operator-b");
  });

  it("uses stable identifier order for ties and returns null for an empty queue", () => {
    expect(selectLeastLoadedSupportOperator(
      ["operator-b", "operator-a"], new Map([["operator-a", 0], ["operator-b", 0]]),
    )).toBe("operator-a");
    expect(selectLeastLoadedSupportOperator([], new Map())).toBeNull();
  });
});
