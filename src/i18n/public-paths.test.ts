import { describe, expect, it } from "vitest";
import { publicPagePairs } from "../../scripts/public-routes.mjs";
import { localizedPublicPath, publicBasePaths } from "./public-paths";

describe("public paths", () => {
  it("mantiene sincronizados navegación, prerender y sitemap", () => {
    expect(publicBasePaths).toEqual(publicPagePairs.map((pair) => pair.es));
    for (const pair of publicPagePairs) {
      expect(localizedPublicPath(pair.es as (typeof publicBasePaths)[number], "es")).toBe(pair.es);
      expect(localizedPublicPath(pair.es as (typeof publicBasePaths)[number], "en")).toBe(pair.en);
    }
  });
});
