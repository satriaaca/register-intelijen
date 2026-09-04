import { describe, it, expect } from "vitest";

describe("batch delete selection & filtering helpers", () => {
  const sampleEntries = [
    { id: 101, nomorUrut: "1", registerCode: "R.IN.1" },
    { id: 102, nomorUrut: "2", registerCode: "R.IN.1" },
    { id: 103, nomorUrut: "3", registerCode: "R.IN.1" },
    { id: 104, nomorUrut: "4", registerCode: "R.IN.1" },
  ];

  it("should select all visible entry ids", () => {
    const allIds = sampleEntries.map((e) => e.id);
    expect(allIds).toEqual([101, 102, 103, 104]);
    expect(allIds.length).toBe(4);
  });

  it("should toggle single selection on and off", () => {
    let selected: number[] = [];

    // Toggle on
    const toggle = (id: number) => {
      selected = selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id];
    };

    toggle(102);
    expect(selected).toEqual([102]);

    toggle(103);
    expect(selected).toEqual([102, 103]);

    // Toggle off
    toggle(102);
    expect(selected).toEqual([103]);
  });

  it("should filter out deleted entries using id set", () => {
    const idsToDelete = [102, 104];
    const deleteSet = new Set(idsToDelete);

    const remaining = sampleEntries.filter((e) => !deleteSet.has(e.id));
    expect(remaining.map((e) => e.id)).toEqual([101, 103]);
  });

  it("should validate batch delete payload correctly", () => {
    const validateNumericIds = (ids: unknown) => {
      if (!Array.isArray(ids) || ids.length === 0) return [];
      return ids
        .map((v) => Number(v))
        .filter((num) => !isNaN(num) && num > 0);
    };

    expect(validateNumericIds([101, 102, "103"])).toEqual([101, 102, 103]);
    expect(validateNumericIds([])).toEqual([]);
    expect(validateNumericIds(["invalid", -5, 0, null])).toEqual([]);
  });
});
