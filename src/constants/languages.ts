export type SupportedLanguage =
  | "java"
  | "python"
  | "c"
  | "cpp"
  | "javascript"
  | "typescript"
  | "html"
  | "css"
  | "sql"
  | "go"
  | "rust"
  | "php"
  | "json";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  "java",
  "python",
  "c",
  "cpp",
  "javascript",
  "typescript",
  "html",
  "css",
  "sql",
  "go",
  "rust",
  "php",
  "json",
];

/** Monaco language id for each supported language. */
export const MONACO_LANGUAGE: Record<SupportedLanguage, string> = {
  java: "java",
  python: "python",
  c: "c",
  cpp: "cpp",
  javascript: "javascript",
  typescript: "typescript",
  html: "html",
  css: "css",
  sql: "sql",
  go: "go",
  rust: "rust",
  php: "php",
  json: "json",
};

/** Human readable labels in the language selector. */
export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  java: "Java",
  python: "Python",
  c: "C",
  cpp: "C++",
  javascript: "JavaScript",
  typescript: "TypeScript",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  go: "Go",
  rust: "Rust",
  php: "PHP",
  json: "JSON",
};
