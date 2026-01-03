export type ProductType = 
  | 'switch_joycon_left'
  | 'switch_joycon_right'
  | 'ps5_dualsense'
  | 'switch_regular'
  | 'switch_oled'
  | 'switch_lite'
  | 'xbox_series'

export type Condition = 'als_nieuw' | 'licht_gebruikt' | 'gebruikt' | 'beschadigd'

export type Status = 'nieuw' | 'getest' | 'defect' | 'verkocht'

export type JoyConAction = 
  | 'analoge_stick'
  | 'r_button'
  | 'l_button'
  | 'zr_button'
  | 'zl_button'
  | 'buttons'
  | 'battery'
  | 'sl_sr'
  | 'housing'
  | 'rail'
  | 'crystal'
  | 'fuse'

export type SwitchAction =
  | 'm92'
  | 'p13'
  | 'usb_port'
  | 'battery'
  | 'rail_left'
  | 'rail_right'
  | 'touch'
  | 'lcd'
  | 'housing'
  | 'other'

export type DualSenseAction =
  | 'stick_left'
  | 'stick_right'
  | 'tmr_sticks'
  | 'battery'
  | 'buttons'
  | 'housing'

export type XboxAction =
  | 'stick_left'
  | 'stick_right'
  | 'tmr_sticks'
  | 'battery'
  | 'buttons'
  | 'housing'

export type Action = JoyConAction | SwitchAction | DualSenseAction | XboxAction

// Database record types
export interface ConditionRecord {
  id: number
  key: string
  label: string
  created_at: string
}

export interface StatusRecord {
  id: number
  key: string
  label: string
  created_at: string
}

export interface JoyconActionRecord {
  id: number
  key: string
  label: string
  created_at: string
}

export interface SwitchActionRecord {
  id: number
  key: string
  label: string
  created_at: string
}

export interface DualSenseActionRecord {
  id: number
  key: string
  label: string
  created_at: string
}

export interface XboxActionRecord {
  id: number
  key: string
  label: string
  created_at: string
}

export interface InventoryItem {
  id: number
  sku: string
  type: ProductType
  kleur: string
  kleur_hex?: string
  serienummer: string
  staat: Condition
  status: Status
  purchase_price?: number
  selling_price?: number
  purchase_date?: string
  purchase_invoice?: string
  source?: string
  selling_date?: string
  selling_invoice?: string
  buyer_name?: string
  defect_notes?: string
  notes?: string
  photo_urls?: string[]
  date_added?: string
  created_at?: string
}

export interface ActionRecord {
  id: number
  item_id: number
  action: Action
  other_action?: string
  date_added: string
  created_at?: string
}

export const PRODUCT_LABELS: Record<ProductType, string> = {
  'switch_joycon_left': 'Switch Joy-Con (Left)',
  'switch_joycon_right': 'Switch Joy-Con (Right)',
  'ps5_dualsense': 'PS5 DualSense Controller',
  'switch_regular': 'Switch Regular',
  'switch_oled': 'Switch OLED',
  'switch_lite': 'Switch Lite',
  'xbox_series': 'Xbox Series X/S Controller'
}

export const JOYCON_ACTIONS: Record<JoyConAction, string> = {
  'analoge_stick': 'Analoge stick vervangen',
  'r_button': 'R knop reparatie',
  'l_button': 'L knop reparatie',
  'zr_button': 'ZR knop reparatie',
  'zl_button': 'ZL knop reparatie',
  'buttons': 'Knoppen reparatie',
  'battery': 'Batterij vervangen',
  'sl_sr': 'SL/SR reparatie',
  'housing': 'Behuizing vervangen',
  'rail': 'Rail vervangen',
  'crystal': 'Crystal vervangen',
  'fuse': 'Fuse vervangen'
}

export const SWITCH_ACTIONS: Record<SwitchAction, string> = {
  'm92': 'M92 vervangen',
  'p13': 'P13 vervangen',
  'usb_port': 'USB poort vervangen',
  'battery': 'Batterij vervangen',
  'rail_left': 'Rail links vervangen',
  'rail_right': 'Rail rechts vervangen',
  'touch': 'Touch vervangen',
  'lcd': 'LCD vervangen',
  'housing': 'Behuizing vervangen',
  'other': 'Overig'
}

export const DUALSENSE_ACTIONS: Record<DualSenseAction, string> = {
  'stick_left': 'Stick links reparatie',
  'stick_right': 'Stick rechts reparatie',
  'tmr_sticks': 'TMR sticks ingezet',
  'battery': 'Batterij vervangen',
  'buttons': 'Knoppen reparatie',
  'housing': 'Behuizing vervangen'
}

export const XBOX_ACTIONS: Record<XboxAction, string> = {
  'stick_left': 'Stick links reparatie',
  'stick_right': 'Stick rechts reparatie',
  'tmr_sticks': 'TMR sticks ingezet',
  'battery': 'Batterij vervangen',
  'buttons': 'Knoppen reparatie',
  'housing': 'Behuizing vervangen'
}

export const JOYCON_COLORS: Record<string, string> = {
  'Black': '#313131',
  'Gray': '#828282',
  'Neon Red': '#FF3C28',
  'Neon Blue': '#0AB9E6',
  'Neon Yellow': '#E6FF00',
  'Neon Green': '#1EDC00',
  'Neon Pink': '#FF3278',
  'Red': '#E10F00',
  'Blue': '#4655F5',
  'Neon Purple': '#B400E6',
  'Neon Orange': '#FAA005',
  'White': '#E6E6E6',
  'Pokemon Eevee Brown': '#C88C32',
  'Pokemon Pikachu Yellow': '#FFDC00',
  'Nintendo Labo Cardboard': '#D7AA73',
  'Dragon Quest Royal Blue': '#1473FA',
  'Disney Tsum Tsum Purple': '#B400E6',
  'Disney Tsum Tsum Pink': '#FF3278',
  'Animal Crossing Pastel Green': '#82FF96',
  'Animal Crossing Pastel Blue': '#96F5F5',
  'Fortnite Wildcat Yellow': '#FFCC00',
  'Fortnite Dark Blue': '#0084FF',
  'Mario Red': '#F04614',
  'Monster Hunter Gray': '#828282',
  'Zelda Skyward Sword Dark Blue': '#2D50F0',
  'Zelda Skyward Sword Dark Purple': '#500FC8'
}

export const DUALSENSE_COLORS: Record<string, string> = {
  'White': '#F5F5F5',
  'Midnight Black': '#0B0B0B',
  'Galactic Purple': '#2D1B69',
  'Starlight Blue': '#1A3A52',
  'Nova Pink': '#E994B8',
  'Freek Gray': '#7A7A7A',
  'Cobalt Blue': '#1E40AF',
  'Sterling Silver': '#C0C0C0',
  'Volcanic Gray': '#3D3D3D',
  'Gray Camouflage': '#6B7280',
  'Chroma Pearl': '#E8E8E8',
  'Chroma Indigo': '#4C1D95',
  'Chroma Cyan': '#06B6D4'
}

export const SWITCH_LITE_COLORS: Record<string, string> = {
  'Gray': '#878787',
  'Yellow': '#FFD60B',
  'Turquoise': '#00A8B5',
  'White': '#F0F0F0',
  'Coral': '#FF6B9D',
  'Green': '#00BB9C',
  'Pink': '#FF69B4',
  'Blue': '#0066BB',
  'Purple': '#8B5FBF'
}

export const XBOX_COLORS: Record<string, string> = {
  'White': '#F5F5F5',
  'Carbon Black': '#0B0B0B',
  'Midnight Black': '#1A1A1A',
  'Deep Purple': '#5B00FF',
  'Deep Red': '#C41E3A',
  'Deep Blue': '#00467F',
  'Emerald Green': '#4B8E0B',
  'Stellar Blade': '#1A1A2E',
  'Fortnite Purple': '#8B00FF',
  'Gears of War Black': '#1C1C1C'
}

export const CONDITION_LABELS: Record<Condition, string> = {
  'als_nieuw': 'Als nieuw',
  'licht_gebruikt': 'Licht gebruikt',
  'gebruikt': 'Gebruikt',
  'beschadigd': 'Beschadigd'
}

export const STATUS_LABELS: Record<Status, string> = {
  'nieuw': 'Nieuw',
  'getest': 'Getest',
  'defect': 'Defect',
  'verkocht': 'Verkocht'
}
