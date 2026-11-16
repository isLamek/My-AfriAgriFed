import { buildNavSections } from "./navConfig";

jest.mock("./firebaseConfig", () => ({ auth: { currentUser: { uid: "u1" } }, db: {} }));
jest.mock("./cart/cart", () => ({ readCart: () => [{}, {}] }));

const byId = (sections, id) => sections.find((s) => s.id === id);

describe("the sidebar menu", () => {
  const farmer = buildNavSections({ userType: "farmer", isAdmin: false, activePath: "/my-listings" });

  it("keeps the everyday things in view and folds the rest away", () => {
    expect(farmer.filter((s) => !s.menu).map((s) => s.id)).toEqual(["market", "activity", "learn", "insights"]);
    expect(byId(farmer, "market").collapsible).toBeFalsy();
    expect(byId(farmer, "activity").collapsible).toBeFalsy();
    expect(byId(farmer, "learn").collapsible).toBe(true);
    expect(byId(farmer, "insights").collapsible).toBe(true);
    // what is always visible stays short
    const alwaysVisible = farmer.filter((s) => !s.menu && !s.collapsible).flatMap((s) => s.items);
    expect(alwaysVisible.length).toBeLessThanOrEqual(8);
  });

  it("puts orders, messages and the basket together, with the basket count", () => {
    const activity = byId(farmer, "activity");
    expect(activity.items.map((i) => i.path)).toEqual(["/messages", "/track-orders", "/cart"]);
    expect(activity.items[2].badge).toBe(2);
  });

  it("moves personal pages out of the list and into the menu under the person's name", () => {
    const account = byId(farmer, "account");
    expect(account.menu).toBe(true);
    expect(account.items.map((i) => i.path)).toEqual(["/profile", "/my-orders", "/carrier"]);
    const inList = farmer.filter((s) => !s.menu).flatMap((s) => s.items.map((i) => i.path));
    for (const path of ["/profile", "/my-orders", "/carrier"]) expect(inList).not.toContain(path);
  });

  it("shows training and internships only to farmers and institutions, and never folds a group of one", () => {
    expect(byId(farmer, "learn").items.map((i) => i.path)).toEqual(["/research", "/training", "/internships"]);
    const consumer = buildNavSections({ userType: "consumer", isAdmin: false });
    expect(byId(consumer, "learn").items.map((i) => i.path)).toEqual(["/research"]);
    expect(byId(consumer, "learn").collapsible).toBe(false);
    expect(byId(consumer, "market").items.map((i) => i.path)).not.toContain("/my-listings");
  });

  it("gives the farmer My Listings and the institution its desk", () => {
    expect(byId(farmer, "market").items.map((i) => i.path)).toContain("/my-listings");
    const institution = buildNavSections({ userType: "institution", isAdmin: false });
    expect(byId(institution, "market").items[0].path).toBe("/institutiondashboard");
  });

  it("adds the admin pages only for admins", () => {
    expect(byId(farmer, "admin")).toBeUndefined();
    const admin = buildNavSections({ userType: "admin", isAdmin: true });
    expect(byId(admin, "admin").items.map((i) => i.path)).toEqual(["/admin/dashboard", "/admin"]);
  });

  it("marks the page you are on", () => {
    const active = farmer.flatMap((s) => s.items).filter((i) => i.active);
    expect(active.map((i) => i.path)).toEqual(["/my-listings"]);
  });
});
