export class ValidationError extends Error {
  public details: any[];
  constructor(message: string, details: any) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}