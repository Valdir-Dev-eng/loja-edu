import { z, ZodObject, ZodTypeAny } from "zod";
import {
  ArrayFieldDefinition,
  BooleanFieldDefinition,
  DateFieldDefinition,
  FieldDefinition,
  NumberFieldDefinition,
  ObjectFieldDefinition,
  StringFieldDefinition,
} from "./IFieldsValidator";
import { ValidationError } from "../errors/ValidationError";
import { DTOBuilderAndValidator } from "./DTOBuilderAndValidator";

export class ZodDTOBuilderAndValidator extends DTOBuilderAndValidator {
  constructor() {
    super()
  }

  private internalSchema: ZodObject<any> | null = null;

  defineSchema(...fields: FieldDefinition[]): DTOBuilderAndValidator {
    const schemaFields: { [key: string]: ZodTypeAny } = {};

    for (const field of fields) {
      schemaFields[field.name] = this.buildSingleFieldSchema(field);
    }

    this.internalSchema = z.object(schemaFields);
    return this;
  }

  private buildSingleFieldSchema(
    field: FieldDefinition,
    forceOptional: boolean = false  
  ): ZodTypeAny {
    let zodType: ZodTypeAny;
    const baseMessage = field.message;

    switch (field.type) {
      case "string":
        const stringField = field as StringFieldDefinition;
let stringSchema = z.string({
  error: (issue: any) =>
    issue.input === undefined
      ? stringField.requiredMessage || baseMessage || `${stringField.name} é obrigatório.`
      : baseMessage || `${stringField.name} deve ser uma string.`,
} as any); // <--- O "as any" silencia o TS(2769)
        if (stringField.minLength !== undefined)
          stringSchema = stringSchema.min(
            stringField.minLength,
            stringField.minLengthMessage ||
              baseMessage ||
              `${stringField.name} deve ter no mínimo ${stringField.minLength} caracteres.`
          );
        if (stringField.maxLength !== undefined)
          stringSchema = stringSchema.max(
            stringField.maxLength,
            stringField.maxLengthMessage ||
              baseMessage ||
              `${stringField.name} deve ter no máximo ${stringField.maxLength} caracteres.`
          );
        if (stringField.pattern)
          stringSchema = stringSchema.regex(
            stringField.pattern,
            stringField.patternMessage ||
              baseMessage ||
              `${stringField.name} não segue o padrão esperado.`
          );
        if (stringField.email)
          stringSchema = stringSchema.email(
            stringField.emailMessage ||
              baseMessage ||
              `${stringField.name} deve ser um e-mail válido.`
          );
        if (stringField.url)
          stringSchema = stringSchema.url(
            stringField.urlMessage ||
              baseMessage ||
              `${stringField.name} deve ser uma URL válida.`
          );
        if (stringField.uuid)
          stringSchema = stringSchema.uuid(
            stringField.uuidMessage ||
              baseMessage ||
              `${stringField.name} deve ser um UUID válido.`
          );
        zodType = stringSchema;
        break;

      case "number":
        const numberField = field as NumberFieldDefinition;
        let numberSchema = z.number({
          error: (issue: any) =>
            issue.input === undefined
              ? numberField.requiredMessage || baseMessage || `${numberField.name} é obrigatório.`
              : baseMessage || `${numberField.name} deve ser um número.`,
        } as any);
        if (numberField.min !== undefined)
          numberSchema = numberSchema.min(
            numberField.min,
            numberField.minMessage ||
              baseMessage ||
              `${numberField.name} deve ser no mínimo ${numberField.min}.`
          );
        if (numberField.max !== undefined)
          numberSchema = numberSchema.max(
            numberField.max,
            numberField.maxMessage ||
              baseMessage ||
              `${numberField.name} deve ser no máximo ${numberField.max}.`
          );
        if (numberField.integer)
          numberSchema = numberSchema.int(
            numberField.integerMessage ||
              baseMessage ||
              `${numberField.name} deve ser um número inteiro.`
          );
        if (numberField.positive)
          numberSchema = numberSchema.positive(
            numberField.positiveMessage ||
              baseMessage ||
              `${numberField.name} deve ser um número positivo.`
          );
        if (numberField.nonNegative)
          numberSchema = numberSchema.nonnegative(
            numberField.nonNegativeMessage ||
              baseMessage ||
              `${numberField.name} deve ser um número não negativo.`
          );
        zodType = numberSchema;
        break;

      case "boolean":
        const booleanField = field as BooleanFieldDefinition;
        zodType = z.boolean({
          error: (issue: any) =>
            issue.input === undefined
              ? booleanField.requiredMessage || baseMessage || `${booleanField.name} é obrigatório.`
              : baseMessage || `${booleanField.name} deve ser um booleano.`,
        } as any);
        break;

      case "date":
        const dateField = field as DateFieldDefinition;
        let dateSchema = z.date({
          error: (issue: any) =>
            issue.input === undefined
              ? dateField.requiredMessage || baseMessage || `${dateField.name} é obrigatória.`
              : baseMessage || `${dateField.name} deve ser uma data válida.`,
        } as any);
        if (dateField.minDate)
          dateSchema = dateSchema.min(
            dateField.minDate,
            dateField.minDateMessage ||
              baseMessage ||
              `${
                dateField.name
              } deve ser igual ou posterior a ${dateField.minDate.toLocaleDateString()}.`
          );
        if (dateField.maxDate)
          dateSchema = dateSchema.max(
            dateField.maxDate,
            dateField.maxDateMessage ||
              baseMessage ||
              `${
                dateField.name
              } deve ser igual ou anterior a ${dateField.maxDate.toLocaleDateString()}.`
          );
        zodType = dateSchema;
        break;

      case "array":
        const arrayField = field as ArrayFieldDefinition;
        if (!arrayField.items) {
          throw new Error(
            `Definição de 'items' é obrigatória para campo array: ${arrayField.name}`
          );
        }
        const itemSchema = this.buildSingleFieldSchema(arrayField.items);
        let arraySchema = z.array(itemSchema, {
          error: (issue: any) =>
            issue.input === undefined
              ? arrayField.requiredMessage || baseMessage || `${arrayField.name} é obrigatório.`
              : baseMessage || `${arrayField.name} deve ser um array.`,
        } as any);
        if (arrayField.minItems !== undefined)
          arraySchema = arraySchema.min(
            arrayField.minItems,
            arrayField.minItemsMessage ||
              baseMessage ||
              `${arrayField.name} deve ter no mínimo ${arrayField.minItems} itens.`
          );
        if (arrayField.maxItems !== undefined)
          arraySchema = arraySchema.max(
            arrayField.maxItems,
            arrayField.maxItemsMessage ||
              baseMessage ||
              `${arrayField.name} deve ter no máximo ${arrayField.maxItems} itens.`
          );
        zodType = arraySchema;
        break;

      case "object":
        const objectField = field as ObjectFieldDefinition;
        if (!objectField.fields || objectField.fields.length === 0) {
          throw new Error(
            `Definição de 'fields' é obrigatória e não pode ser vazia para campo object: ${objectField.name}`
          );
        }
        const nestedSchemaFields: { [key: string]: ZodTypeAny } = {};
        for (const nestedField of objectField.fields) {
          nestedSchemaFields[nestedField.name] = this.buildSingleFieldSchema(
            nestedField,
            true
          );
        }
        zodType = z.object(nestedSchemaFields);
        break;

      case "any":
      default:
        zodType = z.any();
        break;
    }

    if (!field.required || forceOptional) {
      zodType = zodType.nullable().optional();
    }

    return zodType;
  }

  validate<T>(data: T): void {
    if (!this.internalSchema) {
      throw new Error(
        "O schema não foi definido. Chame 'defineSchema' primeiro."
      );
    }
    const result = this.internalSchema.safeParse(data) as any
    if (!result.success) {
      const errorDetails = result.error.errors.map((err:any) => ({
        path: err.path.join("."),
        message: err.message,
        code: err.code,
      }));
      throw new ValidationError("Erro de validação do DTO", errorDetails);
    }
  }

validateAndTransform<T>(data: T): T {
    if (!this.internalSchema) {
        throw new Error("O schema não foi definido.");
    }
    const result = this.internalSchema.safeParse(data);
    
    
    if (!result.success) {
        throw new ValidationError("Erro de validação do DTO", result.error?.format());
    }
    
    return result.data as T;
}

  getSchema(): ZodObject<any> {
    if (!this.internalSchema) {
      throw new Error(
        "O schema não foi definido. Chame 'defineSchema' primeiro."
      );
    }
    return this.internalSchema;
  }
}