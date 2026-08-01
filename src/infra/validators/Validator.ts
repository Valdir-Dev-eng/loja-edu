export abstract class Validator<T> {
  abstract validate(data: unknown): T;
  abstract formatError(error: unknown): Record<string, string[]>;
}