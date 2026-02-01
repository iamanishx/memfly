import { ValidationError } from "./errors";

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format");
  }
}

export function validateDatabaseName(name: string): void {
  if (!name || name.length < 1 || name.length > 64) {
    throw new ValidationError("Database name must be between 1 and 64 characters");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new ValidationError("Database name can only contain letters, numbers, underscores, and hyphens");
  }
}

export function validateQuery(query: string, maxLength: number): void {
  if (!query || query.trim().length === 0) {
    throw new ValidationError("Query cannot be empty");
  }
  if (query.length > maxLength) {
    throw new ValidationError(`Query exceeds maximum length of ${maxLength} characters`);
  }
}

export function sanitizeIdentifier(identifier: string): string {
  return identifier.replace(/[^a-zA-Z0-9_]/g, "");
}

const forbiddenKeywords = [
  "ATTACH",
  "DETACH",
  "PRAGMA",
];

export function checkForbiddenQuery(query: string): void {
  const upperQuery = query.toUpperCase();
  for (const keyword of forbiddenKeywords) {
    if (upperQuery.includes(keyword)) {
      throw new ValidationError(`Query contains forbidden keyword: ${keyword}`);
    }
  }
}
