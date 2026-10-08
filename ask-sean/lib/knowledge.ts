import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Article, Catalog, Knowledge } from "./types";

export const KNOWLEDGE_DIR = path.resolve("knowledge");
export const ARTICLES_DIR = path.join(KNOWLEDGE_DIR, "articles");
export const ENRICH_DIR = path.join(KNOWLEDGE_DIR, "enrich");
export const MANIFEST_PATH = path.join(KNOWLEDGE_DIR, "manifest.json");
export const CATALOG_PATH = path.join(KNOWLEDGE_DIR, "catalog.json");
export const BUNDLE_PATH = path.join(KNOWLEDGE_DIR, "bundle.json");

export async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

export async function readJsonIfExists<T>(file: string): Promise<T | null> {
  try {
    return await readJson<T>(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeJson(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/** Short content hash. Objects must be built with a fixed key order to hash stably. */
export function hashOf(data: unknown): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 12);
}

export async function listJsonIds(dir: string): Promise<string[]> {
  try {
    const files = await readdir(dir);
    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.slice(0, -".json".length))
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function loadArticles(): Promise<Article[]> {
  const ids = await listJsonIds(ARTICLES_DIR);
  return Promise.all(ids.map((id) => readJson<Article>(path.join(ARTICLES_DIR, `${id}.json`))));
}

export async function loadCatalog(): Promise<Catalog> {
  const catalog = await readJsonIfExists<Catalog>(CATALOG_PATH);
  if (!catalog) throw new Error("knowledge/catalog.json not found. Run `npm run kb` first.");
  return catalog;
}

export async function loadKnowledge(): Promise<Knowledge> {
  const [catalog, articles] = await Promise.all([loadCatalog(), loadArticles()]);
  return { catalog, articles: new Map(articles.map((article) => [article.id, article])) };
}
