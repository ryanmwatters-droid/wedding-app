// Maps each vendor category to its corresponding budget category by name.
// When a vendor is booked, a budget line item is auto-created in the mapped category.
export const VENDOR_TO_BUDGET_CATEGORY: Record<string, string> = {
  'Venue': 'Venue & Rentals',
  'Photography': 'Photo & Video',
  'Videography': 'Photo & Video',
  'Florals': 'Florals & Decor',
  'Catering': 'Food & Beverage',
  'Music & Entertainment': 'Music & Entertainment',
  'Officiant': 'Misc & Gifts',
  'Hair & Makeup': 'Attire & Beauty',
  'Cake / Dessert': 'Food & Beverage',
  'Rentals': 'Venue & Rentals',
  'Stationery': 'Stationery & Paper',
  'Transportation': 'Transportation & Lodging',
  'Planning / Coordination': 'Planning & Coordination',
  'Other': 'Misc & Gifts',
}
