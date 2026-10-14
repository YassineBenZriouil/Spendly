import { common } from './common';
import { quickAdd } from './quickAdd';
import { onboarding } from './onboarding';
import { activity } from './activity';
import { expense } from './expense';
import { insights } from './insights';
import { exportCsv } from './exportCsv';
import { settings } from './settings';
import { categories } from './categories';
import { data } from './data';

/** English: the source catalog. Every key lives here first; other languages translate it. */
export const en = {
  ...common,
  ...quickAdd,
  ...onboarding,
  ...activity,
  ...expense,
  ...insights,
  ...exportCsv,
  ...settings,
  ...categories,
  ...data,
};

export type MessageKey = keyof typeof en;
