import { frameTimes, parseTimeExtent, satelliteTileUrl } from "./satellite";

// Trimmed from the real EUMETView capabilities response for msg_fes:ir108.
const CAPS = `<Layer queryable="1"><Name>msg_fes:ir108</Name>
<Dimension name="time" default="2026-10-02T10:45:00Z" units="ISO8601">2020-09-01T00:00:00.000Z/2026-10-02T10:45:00.000Z/PT15M</Dimension></Layer>`;

describe("parseTimeExtent", () => {
  it("reads the newest frame and the step", () => {
    const e = parseTimeExtent(CAPS);
    expect(new Date(e.latest).toISOString()).toBe("2026-10-02T10:45:00.000Z");
    expect(e.stepMs).toBe(15 * 60 * 1000);
  });

  it("uses the last range when several are listed", () => {
    const xml = `<Dimension name="time">2020-01-01T00:00:00Z/2020-02-01T00:00:00Z/PT5M,2026-10-01T00:00:00Z/2026-10-02T11:00:00Z/PT5M</Dimension>`;
    expect(new Date(parseTimeExtent(xml).latest).toISOString()).toBe("2026-10-02T11:00:00.000Z");
  });

  it("returns null when there is no time dimension", () => {
    expect(parseTimeExtent("<Layer><Name>x</Name></Layer>")).toBeNull();
  });
});

describe("frames and tile urls", () => {
  it("lists frames oldest first, ending at the newest", () => {
    const frames = frameTimes({ latest: 1_000_000_000, stepMs: 900_000 }, 4);
    expect(frames).toEqual([1_000_000_000 - 2_700_000, 1_000_000_000 - 1_800_000, 1_000_000_000 - 900_000, 1_000_000_000]);
  });

  it("builds a MapLibre template with the bbox placeholder and an exact time", () => {
    const url = satelliteTileUrl({ workspace: "msg_fes", layer: "ir108" }, Date.UTC(2026, 9, 2, 10, 45));
    expect(url).toContain("layers=msg_fes:ir108");
    expect(url).toContain("{bbox-epsg-3857}");
    expect(url).toContain("time=2026-10-02T10%3A45%3A00.000Z");
  });
});
