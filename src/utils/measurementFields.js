/**
 * measurementFields.js
 * Defines the measurement fields per garment type.
 */

export const MEASUREMENT_FIELDS = {
  Shirt:  ['Chest', 'Shoulder', 'Sleeve', 'Length', 'Collar'],
  Pant:   ['Waist', 'Hip', 'Thigh', 'Length', 'Bottom'],
  Suit:   ['Chest', 'Shoulder', 'Sleeve', 'Length', 'Collar', 'Waist', 'Hip', 'Thigh', 'Pant Length', 'Bottom'],
  Kurta:  ['Chest', 'Shoulder', 'Sleeve', 'Length'],
  Blouse: ['Chest', 'Shoulder', 'Sleeve', 'Length', 'Back Length'],
  Coat:   ['Chest', 'Shoulder', 'Sleeve', 'Length', 'Collar'],
}

export const ITEM_TYPES = Object.keys(MEASUREMENT_FIELDS)

export const ORDER_STATUSES = [
  'Received',
  'Cutting',
  'First Fitting',
  'Alteration',
  'Ready',
  'Delivered',
]

export const STATUS_COLORS = {
  Received:       'bg-slate-100 text-slate-700',
  Cutting:        'bg-blue-100 text-blue-700',
  'First Fitting': 'bg-yellow-100 text-yellow-700',
  Alteration:     'bg-orange-100 text-orange-700',
  Ready:          'bg-green-100 text-green-700',
  Delivered:      'bg-teal-100 text-teal-700',
}

