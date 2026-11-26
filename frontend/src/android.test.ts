import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DANCERS } from "./splash/dancers";

// The Android app's launcher icon follows the dancer (frontend/android). A
// dancer added here must also be added there, or the icon can't follow it.

const android = new URL("../android/app/src/main/", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, android), "utf8");
const ids = DANCERS.map((d) => d.id);

describe("the Android app's dancers", () => {
  it("has a launcher entry for every dancer, and snoop's is the one on at install", () => {
    const manifest = read("AndroidManifest.xml");
    const aliases = [...manifest.matchAll(/android:name="\.Icon_([a-z]+)"\s+android:enabled="(true|false)"/g)];
    expect(aliases.map((m) => m[1]).sort()).toEqual([...ids].sort());
    expect(aliases.filter((m) => m[2] === "true").map((m) => m[1])).toEqual(["snoop"]);
  });

  it("lists the same dancers in IconSwitcher.java", () => {
    const java = read("java/com/ethichadebe/atapp/IconSwitcher.java");
    const list = /DANCERS = Arrays\.asList\(([^)]*)\)/.exec(java)![1];
    expect([...list.matchAll(/"([a-z]+)"/g)].map((m) => m[1])).toEqual(ids);
  });

  it("ships a launcher icon for every dancer", () => {
    for (const id of ids) {
      expect(existsSync(new URL(`res/mipmap-anydpi-v26/ic_launcher_${id}.xml`, android)), id).toBe(true);
      expect(existsSync(new URL(`res/mipmap-xxxhdpi/ic_launcher_${id}_fg.png`, android)), id).toBe(true);
      expect(existsSync(new URL(`../../tools/android/launcher/${id}.png`, import.meta.url)), id).toBe(true);
    }
  });
});
