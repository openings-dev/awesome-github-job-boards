import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCatalog, serializeCatalog } from "../src/catalog-generator.mjs";

const root = process.cwd();
const catalogPath = path.resolve(
  process.argv[2] ?? process.env.OPENINGS_CATALOG_PATH ??
  "../data-pipeline/src/modules/catalog/repositories.json",
);
const outputDirectory = path.join(root, "_data");
const outputPath = path.join(outputDirectory, "catalog.json");

const source = JSON.parse(await readFile(catalogPath, "utf8"));
const nextCatalog = serializeCatalog(parseCatalog(source));
const currentCatalog = await readFile(outputPath, "utf8").catch(() => "");

if (currentCatalog === nextCatalog) {
  console.log("Catalog data is already current.");
} else {
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, nextCatalog);
  console.log("Catalog data updated.");
}
