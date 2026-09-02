import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCatalog, renderReadme } from "../src/catalog-generator.mjs";

const root = process.cwd();
const catalogPath = path.resolve(
  process.argv[2] ?? process.env.OPENINGS_CATALOG_PATH ??
  "../data-pipeline/src/modules/catalog/repositories.json",
);
const templatePath = path.join(root, "templates", "README.md");
const outputPath = path.join(root, "README.md");

const catalog = parseCatalog(JSON.parse(await readFile(catalogPath, "utf8")));
const nextReadme = renderReadme(await readFile(templatePath, "utf8"), catalog);
const currentReadme = await readFile(outputPath, "utf8").catch(() => "");

if (currentReadme !== nextReadme) {
  await writeFile(outputPath, nextReadme);
  console.log(`README updated with ${catalog.repositories.length} repositories.`);
} else {
  console.log(`README already current with ${catalog.repositories.length} repositories.`);
}
