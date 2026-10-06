import { ageOn } from "./registrationRules";

describe("ageOn", () => {
  const day = new Date(2026, 9, 6); // 6 October 2026

  it("counts whole years", () => {
    expect(ageOn("2000-01-01", day)).toBe(26);
  });

  it("turns 18 on the birthday, not the day before", () => {
    expect(ageOn("2008-10-06", day)).toBe(18);
    expect(ageOn("2008-10-07", day)).toBe(17);
  });

  it("returns NaN for anything that is not a date", () => {
    expect(ageOn("", day)).toBeNaN();
    expect(ageOn("06/10/2008", day)).toBeNaN();
  });
});
