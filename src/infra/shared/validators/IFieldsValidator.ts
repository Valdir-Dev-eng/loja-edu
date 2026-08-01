
export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "array"
  | "object"
  | "any";

export interface BaseFieldDefinition {
  name: string;
  type: FieldType;
  message?: string;
  required?: boolean;
  requiredMessage?: string;
}

export interface StringFieldDefinition extends BaseFieldDefinition {
  type: "string";
  minLength?: number;
  minLengthMessage?: string;
  maxLength?: number;
  maxLengthMessage?: string;
  pattern?: RegExp;
  patternMessage?: string;
  email?: boolean;
  emailMessage?: string;
  url?: boolean;
  urlMessage?: string;
  uuid?: boolean;
  uuidMessage?: string;
}

export interface NumberFieldDefinition extends BaseFieldDefinition {
  type: "number";
  min?: number;
  minMessage?: string;
  max?: number;
  maxMessage?: string;
  integer?: boolean;
  integerMessage?: string;
  positive?: boolean;
  positiveMessage?: string;
  nonNegative?: boolean;
  nonNegativeMessage?: string;
}

export interface BooleanFieldDefinition extends BaseFieldDefinition {
  type: "boolean";
}

export interface DateFieldDefinition extends BaseFieldDefinition {
  type: "date";
  minDate?: Date;
  minDateMessage?: string;
  maxDate?: Date;
  maxDateMessage?: string;
}

export interface ArrayFieldDefinition extends BaseFieldDefinition {
  type: "array";
  minItems?: number;
  minItemsMessage?: string;
  maxItems?: number;
  maxItemsMessage?: string;
  items?: FieldDefinition;
}

export interface ObjectFieldDefinition extends BaseFieldDefinition {
  type: "object";
  fields: FieldDefinition[];
}

export type FieldDefinition =
  | StringFieldDefinition
  | NumberFieldDefinition
  | BooleanFieldDefinition
  | DateFieldDefinition
  | ArrayFieldDefinition
  | ObjectFieldDefinition
  | BaseFieldDefinition;