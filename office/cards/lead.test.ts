import { describe, it, expect } from "vitest";
import { leadOf } from "./lead";

describe("leadOf", () => {
  it("takes the first three sentences of the first paragraph", () =>
    expect(leadOf(["One. Two! Three? Four.", "Other."])).toBe("One. Two! Three?"));
  it("stops early rather than run past maxChars", () => expect(leadOf(["A short one. " + "x".repeat(400) + "."])).toBe("A short one."));
  it("is empty for an empty intro", () => expect(leadOf([])).toBe(""));
});
