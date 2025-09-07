import { sanitizeGuid, GUID_CANON } from "../utils/azure";

describe("Azure utility helpers", () => {
  it("sanitizes GUID strings", () => {
    const raw = " {ABCDEFAB-1234-5678-90AB-ABCDEFABCDEF} ";
    expect(sanitizeGuid(raw)).toBe("abcdefab-1234-5678-90ab-abcdefabcdef");
  });

  it("returns empty string for non-string input", () => {
    expect(sanitizeGuid(undefined)).toBe("");
    expect(sanitizeGuid(123 as unknown as string)).toBe("");
  });

  it("validates canonical GUIDs", () => {
    const guid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    expect(GUID_CANON.test(guid)).toBe(true);
    expect(GUID_CANON.test("not-a-guid")).toBe(false);
  });
});
