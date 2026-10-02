import fs from "fs";
import path from "path";
import { areaKm2, findRegion, labelPoint, pointInGeometry, regionLabel } from "./regions";

// The real shipped file, so these tests guard the data and not just the code.
const regions = JSON.parse(fs.readFileSync(path.join(__dirname, "../../public/data/namibia-regions.geojson"), "utf8"));

// Official areas (km2), 2023 census table.
const OFFICIAL = {
  Erongo: 63539, Hardap: 109781, "Kavango East": 23988, "Kavango West": 24591, Khomas: 36964, Kunene: 115260,
  Ohangwena: 10706, Omaheke: 84981, Omusati: 26551, Oshana: 8647, Oshikoto: 38685, Otjozondjupa: 105460,
  Zambezi: 14785, Karas: 161514,
};

describe("region data", () => {
  it("has exactly the 14 current regions", () => {
    expect(regions.features.map((f) => f.properties.name).sort()).toEqual(Object.keys(OFFICIAL).sort());
  });

  it.each(Object.entries(OFFICIAL))("%s area is within 3%% of the official figure", (name, official) => {
    const feature = regions.features.find((f) => f.properties.name === name);
    const km2 = areaKm2(feature.geometry);
    expect(Math.abs(km2 - official) / official).toBeLessThan(0.03);
  });

  const TOWNS = [
    ["Windhoek", 17.083, -22.57, "Khomas"], ["Oshakati", 15.699, -17.788, "Oshana"], ["Ongwediva", 15.767, -17.785, "Oshana"],
    ["Ondangwa", 15.97, -17.915, "Oshana"], ["Outapi", 14.82, -17.5, "Omusati"], ["Eenhana", 16.33, -17.47, "Ohangwena"],
    ["Tsumeb", 17.72, -19.24, "Oshikoto"], ["Rundu", 19.77, -17.93, "Kavango East"], ["Nkurenkuru", 18.6, -17.62, "Kavango West"],
    ["Katima Mulilo", 24.27, -17.5, "Zambezi"], ["Swakopmund", 14.53, -22.68, "Erongo"], ["Keetmanshoop", 18.13, -26.58, "Karas"],
    ["Mariental", 17.96, -24.63, "Hardap"], ["Gobabis", 18.97, -22.45, "Omaheke"], ["Otjiwarongo", 16.85, -20.46, "Otjozondjupa"],
    ["Opuwo", 13.84, -18.06, "Kunene"],
  ];

  it.each(TOWNS)("%s is inside %s", (_town, lng, lat, expected) => {
    expect(findRegion(lng, lat, regions)?.properties.name).toBe(expected);
  });

  it("finds no region for points outside Namibia", () => {
    expect(findRegion(-10, 0, regions)).toBeNull(); // Atlantic Ocean
    expect(findRegion(28.0, -26.0, regions)).toBeNull(); // South Africa
  });
});

describe("geometry helpers", () => {
  const square = { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] };
  const donut = { type: "Polygon", coordinates: [square.coordinates[0], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] };

  it("handles holes", () => {
    expect(pointInGeometry(2, 2, donut)).toBe(true);
    expect(pointInGeometry(5, 5, donut)).toBe(false);
  });

  it("places labels inside the shape, even for awkward ones", () => {
    for (const feature of regions.features) {
      const [lng, lat] = labelPoint(feature.geometry);
      expect(pointInGeometry(lng, lat, feature.geometry)).toBe(true);
    }
  });

  it("shows the proper name for ǁKaras", () => {
    expect(regionLabel("Karas")).toBe("ǁKaras");
    expect(regionLabel("Oshana")).toBe("Oshana");
  });
});
