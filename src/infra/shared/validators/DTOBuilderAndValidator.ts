import { FieldDefinition } from "./IFieldsValidator";

export abstract class DTOBuilderAndValidator {
  abstract defineSchema(...fields: FieldDefinition[]): DTOBuilderAndValidator;
  abstract validate<T>(data: T): void;
  abstract validateAndTransform<T>(data: T): T;
  abstract getSchema(): any;
}
