import type { Message } from '../../types';

/** CSV export: screen texts and the file's column headers. */
export const exportCsv = {
  'exportCsv.range.label': 'Date range',
  'exportCsv.range.month': 'This month',
  'exportCsv.range.quarter': 'Last 3 months',
  'exportCsv.range.year': 'This year',
  'exportCsv.range.all': 'All time',
  'exportCsv.range.from': 'From {date} to today.',
  'exportCsv.count.none': 'No expenses in this range',
  'exportCsv.count.willExport': { one: '{count} expense will be exported', other: '{count} expenses will be exported' },
  'exportCsv.fields.title': 'Fields included',
  'exportCsv.fields.note':
    "Amounts use a dot as the decimal separator; dates and times are in this device's time zone. Each expense keeps its own currency.",
  'exportCsv.destination.title': 'Where it goes',
  'exportCsv.destination.note':
    'Spendly writes a CSV file on this device and opens the share sheet. The file only goes where you send it, such as Files, email or a spreadsheet app. Nothing is uploaded by Spendly.',
  'exportCsv.shareTitle': 'Export expenses',
  'exportCsv.success': { one: 'Exported {count} expense.', other: 'Exported {count} expenses.' },
  'exportCsv.error': "Couldn't export. Nothing was shared; try again.",
  'exportCsv.button': 'Export CSV',

  'exportCsv.column.date': 'Date',
  'exportCsv.column.time': 'Time',
  'exportCsv.column.amount': 'Amount',
  'exportCsv.column.currency': 'Currency',
  'exportCsv.column.category': 'Category',
  'exportCsv.column.title': 'Title',
  'exportCsv.column.note': 'Note',
  'exportCsv.column.paymentMethod': 'Payment method',
  'exportCsv.column.occurredAt': 'Occurred at (UTC)',
  'exportCsv.column.type': "Type",
  'exportCsv.type.expense': "Expense",
  'exportCsv.type.income': "Income",
} as const satisfies Record<`exportCsv.${string}`, Message>;
