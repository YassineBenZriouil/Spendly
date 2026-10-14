/** Plural forms (CLDR categories). English uses one/other; Arabic uses all six. `other` is always required. */
export type PluralForms = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };

/** A message: plain text, or plural forms chosen by the `count` parameter. `{name}` placeholders are filled in. */
export type Message = string | PluralForms;

/** Another language's version of a catalog: same keys, same kind (text or plural) for each. */
export type Translation<T> = { [K in keyof T]: T[K] extends string ? string : PluralForms };
