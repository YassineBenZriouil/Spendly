import type { Message } from '../../types';
import type { MessageKey } from '../en';

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

/** Arabic (right-to-left). Missing keys fall back to English; `i18n-test` checks that none are missing. */
export const ar: Record<MessageKey, Message> = {
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
