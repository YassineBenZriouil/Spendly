import type { Message } from '../../types';

/** The first-launch introduction. */
export const onboarding = {
  'onboarding.title': 'Welcome to Spendly',
  'onboarding.skip.label': 'Skip',
  'onboarding.skip.hint': 'Closes the introduction',
  'onboarding.step.count': 'Step {step} of {total}',
  'onboarding.step.category.title': 'Tap a category',
  'onboarding.step.category.hint': 'Pick what you spent on.',
  'onboarding.step.amount.title': 'Set the amount',
  'onboarding.step.amount.hint': 'Drag the number up or down, or use − and +.',
  'onboarding.step.save.title': 'Tap Save',
  'onboarding.step.save.hint': 'That records it. Details like a note are optional.',
  'onboarding.done.count': 'Done',
  'onboarding.done.title': "That's all it takes",
  'onboarding.done.hint': 'This was practice, so nothing was saved. Your real expenses stay on this device.',
  'onboarding.done.announcement': 'Saved. You are ready to go.',
  'onboarding.decrease': 'Decrease amount',
  'onboarding.increase': 'Increase amount',
  'onboarding.save.label': 'Save',
  'onboarding.save.hint': 'Practice save of {amount}',
  'onboarding.start': 'Start using Spendly',
} as const satisfies Record<`onboarding.${string}`, Message>;
