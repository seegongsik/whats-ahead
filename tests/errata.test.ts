import { describe, expect, it } from "vitest";
import { CLOSED, closed, leftOut, MISNAMED, misplaced, MISPLACED, rightName } from "../src/street/errata.js";

describe("places the data has in the wrong spot", () => {
  it("are known by name and where the data has them, not by a row number that changes each release", () => {
    const mall = MISPLACED[0];
    expect(misplaced({ name: "Palo Alto - Stanford Mall", point: { lat: 37.47490, lon: -122.13925 } })).toBe(true);
    expect(misplaced({ name: "palo alto – stanford mall", point: mall.at })).toBe(true);
    // The same name where a real place could stand, or another place at that spot, stays.
    expect(misplaced({ name: "Palo Alto - Stanford Mall", point: { lat: 37.4434, lon: -122.171 } })).toBe(false);
    expect(misplaced({ name: "Las Michoacanitas", point: mall.at })).toBe(false);
    expect(MISPLACED.every((m) => m.why.length > 20)).toBe(true);
    // SFMOMA on Market Street goes; the museum on Third Street, where it stands, stays.
    expect(misplaced({ name: "San Francisco Museum of Modern Art", point: { lat: 37.783474, lon: -122.408974 } })).toBe(true);
    expect(misplaced({ name: "San Francisco Museum of Modern Art", point: { lat: 37.7857, lon: -122.4011 } })).toBe(false);
  });

  it("give a place named by its web address its own name, there and nowhere else", () => {
    const theatre = { id: "ovt/2/1/1", name: "graumanschinese.org", point: { lat: 34.10177, lon: -118.34104 } };
    expect(rightName(theatre)).toEqual({ ...theatre, name: "TCL Chinese Theatre" });
    expect(rightName({ ...theatre, point: { lat: 40.7, lon: -74 } }).name).toBe("graumanschinese.org");
    expect(rightName({ ...theatre, name: "Musso & Frank Grill" }).name).toBe("Musso & Frank Grill");
    expect(MISNAMED.every((m) => m.why.length > 20 && m.as.length > 0)).toBe(true);
  });
});

describe("places the data still has open after they are gone", () => {
  it("are left out by name and position, and only there", () => {
    expect(closed({ name: "Hotel Pennsylvania", point: { lat: 40.74967, lon: -73.99147 } })).toBe(true);
    expect(closed({ name: "hotel pennsylvania", point: { lat: 40.7497, lon: -73.9915 } })).toBe(true);
    expect(leftOut({ name: "Barneys New York, Downtown", point: { lat: 40.73998, lon: -73.99824 } })).toBe(true);
    // The same name elsewhere, or another place there, stays.
    expect(closed({ name: "Hotel Pennsylvania", point: { lat: 40.7484, lon: -73.9857 } })).toBe(false);
    expect(closed({ name: "Penn Station", point: CLOSED[0].at })).toBe(false);
    expect(CLOSED.every((m) => m.why.length > 20)).toBe(true);
    // A misplaced place is left out as well.
    expect(leftOut({ name: MISPLACED[0].name, point: MISPLACED[0].at })).toBe(true);
  });
});
