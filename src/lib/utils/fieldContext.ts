export const FIELD_CONTEXT = Symbol('field');
export type FieldContext = {
    labelId: string;
    readonly descriptionId: string | undefined;
    readonly invalid: boolean;
};
