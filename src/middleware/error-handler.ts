import type { Context, Next } from "hono";
import { AppError } from "../utils/errors";

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    if (error instanceof AppError) {
      c.status(error.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500);
      return c.json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    
    console.error("Unexpected error:", error);
    
    c.status(500);
    return c.json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  }
}
