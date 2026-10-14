import type { ExpenseCategory } from '@/domain/category/category.types';
import { currencyExponent } from '@/domain/money/money.format';
import { parseTypedAmount } from '@/domain/money/money.parse';
import { categories as englishNames } from '@/i18n/locales/en/categories';
import { categories as arabicNames } from '@/i18n/locales/ar/categories';

/**
 * `spendly://add?amount=20&category=Food&currency=EUR&save=1`, the link behind the widget, the quick settings tile and
 * Siri / Shortcuts. `quick=1` means "the Quick log set up in Settings". Everything comes from outside the app, so
 * every value is checked here.
 */
export type AddLinkParams = Partial<Record<'amount' | 'currency' | 'category' | 'save' | 'quick', string | string[]>>;

/** The one-tap expense from Settings → Shortcuts, used by `quick=1`. */
export type QuickLog = { amountMinor: number; currencyCode: string; categoryId: string };

export const isQuickLog = (value: unknown): value is QuickLog => {
  if (!value || typeof value !== 'object') return false;
  const { amountMinor, currencyCode, categoryId } = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(amountMinor) &&
    (amountMinor as number) > 0 &&
    typeof currencyCode === 'string' &&
    /^[A-Z]{3}$/.test(currencyCode) &&
    typeof categoryId === 'string' &&
    categoryId.length > 0
  );
};

export type AddLinkRequest = {
  amountMinor?: number;
  currencyCode: string;
  categoryId?: string;
  /** Save at once (only when amount and category are both known). */
  save: boolean;
};

export type AddLinkProblem = 'amount' | 'currency' | 'category' | 'noQuickLog';

/** `request` always holds what could be read, so the app can pre-fill Add even when something was wrong. */
export type AddLinkResult = { request: AddLinkRequest; problem: AddLinkProblem | null };

type CategoryRef = Pick<ExpenseCategory, 'id' | 'name' | 'isBuiltIn'>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

/** Arabic-Indic and Persian digits as ASCII, so "٢٠" from Arabic Siri reads as 20. */
const asciiDigits = (text: string) =>
  text.replace(/[٠-٩۰-۹]/g, (digit) => String((digit.charCodeAt(0) & 0xf) % 10));

const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/** Major units ("20", "4,50", "٢٠") to minor units, read like an amount typed in the app; null if not a positive amount. */
export const parseAmount = (text: string, currencyCode: string) =>
  // U+066B is the Arabic decimal separator
  parseTypedAmount(asciiDigits(text).replace(/٫/g, '.'), currencyExponent(currencyCode));

const isCurrency = (code: string) => {
  if (!/^[A-Z]{3}$/.test(code)) return false;
  try {
    currencyExponent(code);
    return true;
  } catch {
    return false;
  }
};

/** A category by id, by its name as stored, or by a built-in's name in English or Arabic (any case). */
export function findCategory(text: string, categories: CategoryRef[]): string | undefined {
  const wanted = normalize(text);
  const builtInName = (lang: Record<string, unknown>, id: string) => {
    const name = lang[`categories.builtIn.${id}`];
    return typeof name === 'string' ? name : undefined;
  };
  return categories.find((category) => {
    const names: (string | undefined)[] = [category.id, category.name];
    if (category.isBuiltIn) names.push(builtInName(englishNames, category.id), builtInName(arabicNames, category.id));
    return names.some((name) => name !== undefined && normalize(name) === wanted);
  })?.id;
}

export function parseAddLink(
  params: AddLinkParams,
  { categories, defaultCurrency, quickLog }: { categories: CategoryRef[]; defaultCurrency: string; quickLog?: QuickLog },
): AddLinkResult {
  if (first(params.quick) === '1') {
    if (!quickLog) return { request: { currencyCode: defaultCurrency, save: false }, problem: 'noQuickLog' };
    const known = categories.some((category) => category.id === quickLog.categoryId);
    return {
      request: { ...quickLog, ...(known ? {} : { categoryId: undefined }), save: known },
      problem: known ? null : 'category',
    };
  }

  const currencyText = first(params.currency)?.toUpperCase();
  const currencyOk = currencyText === undefined || isCurrency(currencyText);
  const currencyCode = currencyText && currencyOk ? currencyText : defaultCurrency;
  const amountText = first(params.amount);
  const amountMinor = amountText === undefined ? undefined : (parseAmount(amountText, currencyCode) ?? undefined);
  const categoryText = first(params.category);
  const categoryId = categoryText === undefined ? undefined : findCategory(categoryText, categories);
  const wantsSave = ['1', 'true'].includes(first(params.save) ?? '');

  const problem: AddLinkProblem | null = !currencyOk
    ? 'currency'
    : amountText !== undefined && amountMinor === undefined
      ? 'amount'
      : categoryText !== undefined && categoryId === undefined
        ? 'category'
        : wantsSave && (amountMinor === undefined || categoryId === undefined)
          ? amountMinor === undefined
            ? 'amount'
            : 'category'
          : null;

  return {
    request: {
      ...(amountMinor !== undefined ? { amountMinor } : {}),
      currencyCode,
      ...(categoryId !== undefined ? { categoryId } : {}),
      save: wantsSave && problem === null,
    },
    problem,
  };
}

/** The link for a Quick log, as Siri / Shortcuts or a launcher would open it. */
export const quickLogLink = () => 'spendly://add?quick=1';
