export enum Unit {
  ST = 'st',
  KG = 'kg',
  G = 'g',
  L = 'l',
  DL = 'dl',
  CL = 'cl',
  ML = 'ml',
  PKT = 'pkt'
}

export enum Category {
  FRUKT_GRONT = 'Frukt & Grönt',
  MEJERI = 'Mejeri',
  SKASSERI = 'Skafferi',
  FRYS = 'Frys',
  KYL = 'Kyl',
  DRYCK = 'Dryck',
  MEAT_FISH = 'Kött & Fisk',
  OTHER = 'Övrigt'
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit | string;
  category: Category | string;
  expiryDate: string; // YYYY-MM-DD
  priceInfo?: number; // Price per unit or total estimated price
  addedDate: string;
  source: 'scan' | 'receipt' | 'manual' | 'cooked_remainder' | 'barcode';
}

export interface ConsumptionLog {
  id: string;
  date: string;
  itemName: string;
  cost: number;
  quantityUsed: number;
  reason: 'cooked' | 'expired' | 'snack';
  dishName?: string;
}

export interface ScanResult {
  items: Omit<InventoryItem, 'id' | 'addedDate' | 'source'>[];
  totalCost?: number;
  detectedType: 'receipt' | 'food_object';
}

export interface DeductionSuggestion {
  itemId: string;
  name: string;
  currentQuantity: number;
  deductAmount: number;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  missingIngredients: string[];
  instructions: string[];
  cookTime: string;
}