import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, ScanResult, Unit, Category, DeductionSuggestion, Recipe } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

// Helper to clean JSON strings if markdown block is included
const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const analyzeImage = async (base64Image: string): Promise<ScanResult> => {
  const prompt = `
    Analysera denna bild. Det är antingen ett kvitto från en mataffär eller ett foto på en eller flera matvaror.

    1. Om det är ett kvitto: Extrahera alla matvaror. Försök uppskatta "expiryDate" (bäst före) generöst baserat på produkttyp (t.ex. mjölk 7 dagar, konserver 1 år). Extrahera pris per vara.
    2. Om det är matvaror (foto): Identifiera vad det är, uppskatta mängd/vikt, och gissa bäst före datum. Uppskatta ett ca-pris i SEK.

    Returnera JSON enligt följande schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedType: { type: Type.STRING, enum: ["receipt", "food_object"] },
            totalCost: { type: Type.NUMBER, description: "Total cost found on receipt or estimated sum" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING, enum: Object.values(Unit) },
                  category: { type: Type.STRING, enum: Object.values(Category) },
                  expiryDate: { type: Type.STRING, description: "YYYY-MM-DD" },
                  priceInfo: { type: Type.NUMBER, description: "Price for this specific quantity" }
                },
                required: ["name", "quantity", "unit", "category", "expiryDate"]
              }
            }
          },
          required: ["detectedType", "items"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(cleanJson(response.text)) as ScanResult;
    }
    throw new Error("No data returned");
  } catch (error) {
    console.error("Gemini analysis error:", error);
    throw error;
  }
};

export const suggestIngredientsToDeduct = async (
  dishDescription: string,
  currentInventory: InventoryItem[]
): Promise<DeductionSuggestion[]> => {
  const inventoryContext = JSON.stringify(currentInventory.map(i => ({
    id: i.id,
    name: i.name,
    qty: i.quantity,
    unit: i.unit
  })));

  const prompt = `
    Jag har lagat följande: "${dishDescription}".
    Här är mitt nuvarande lager (Inventory): ${inventoryContext}.

    Uppgift:
    Identifiera vilka varor från lagret som troligen användes och hur mycket.
    Returnera en lista på objekt att minska saldot på.
    Var konservativ men realistisk. Om jag har 1kg pasta och lagar 2 port pasta, dra ca 200g.
    Om en ingrediens inte finns i lagret, ignorera den (jag kanske köpte den och använde direkt utan att scanna).
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              itemId: { type: Type.STRING, description: "The ID from the inventory list provided" },
              name: { type: Type.STRING },
              currentQuantity: { type: Type.NUMBER },
              deductAmount: { type: Type.NUMBER },
              unit: { type: Type.STRING }
            },
            required: ["itemId", "name", "deductAmount"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(cleanJson(response.text)) as DeductionSuggestion[];
    }
    return [];
  } catch (error) {
    console.error("Gemini cooking deduction error:", error);
    return [];
  }
};

export const suggestRecipes = async (inventory: InventoryItem[]): Promise<Recipe[]> => {
  const today = new Date();
  
  // Format inventory for context, flagging expiring items
  const inventoryContext = inventory.map(i => {
    const expiry = new Date(i.expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return {
      name: i.name,
      qty: `${i.quantity} ${i.unit}`,
      daysLeft: daysLeft
    };
  });

  const prompt = `
    Du är en kreativ kock. Föreslå 3 maträtter baserat på följande ingredienser jag har hemma.
    
    Lagerlista: ${JSON.stringify(inventoryContext)}
    
    Regler:
    1. Prioritera starkt ingredienser som har få "daysLeft" (håller på att gå ut).
    2. Det är okej att föreslå recept där jag saknar någon enstaka ingrediens (t.ex. kryddor eller basvaror), men lista dessa under "missingIngredients".
    3. Ge instruktioner på Svenska.
    
    Format: JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
              instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
              cookTime: { type: Type.STRING }
            },
            required: ["title", "ingredients", "instructions", "cookTime"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(cleanJson(response.text)) as Recipe[];
    }
    return [];
  } catch (error) {
    console.error("Gemini recipe suggestion error:", error);
    return [];
  }
};

export const lookupBarcode = async (barcode: string): Promise<InventoryItem | null> => {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 1) {
      const product = data.product;
      const productName = product.product_name_sv || product.product_name || "Okänd vara";
      
      // Attempt to guess category
      let category = Category.OTHER;
      const cats = (product.categories_tags || []).join(' ').toLowerCase();
      if (cats.includes('dairy') || cats.includes('milk') || cats.includes('cheese')) category = Category.MEJERI;
      else if (cats.includes('fruit') || cats.includes('vegetable')) category = Category.FRUKT_GRONT;
      else if (cats.includes('meat') || cats.includes('fish')) category = Category.MEAT_FISH;
      else if (cats.includes('beverage') || cats.includes('drink')) category = Category.DRYCK;
      else if (cats.includes('pantry') || cats.includes('pasta') || cats.includes('rice')) category = Category.SKASSERI;

      // Guess quantity (simple fallback)
      let quantity = 1;
      let unit = Unit.ST;
      if (product.quantity) {
        // Very basic parsing, OpenFoodFacts quantity strings are messy
        const qStr = product.quantity.toLowerCase();
        if (qStr.includes('kg')) { quantity = parseFloat(qStr); unit = Unit.KG; }
        else if (qStr.includes('g')) { quantity = parseFloat(qStr); unit = Unit.G; }
        else if (qStr.includes('l')) { quantity = parseFloat(qStr); unit = Unit.L; }
        else if (qStr.includes('ml')) { quantity = parseFloat(qStr); unit = Unit.ML; }
      }

      // Default expiry: 1 week from now (Safe default)
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const expiryDate = d.toISOString().split('T')[0];

      return {
        id: '', // Generated later
        name: productName,
        quantity,
        unit,
        category,
        expiryDate,
        addedDate: new Date().toISOString(),
        source: 'barcode',
        priceInfo: 0 // API doesn't provide price
      };
    }
    return null;
  } catch (e) {
    console.error("Barcode lookup failed", e);
    return null;
  }
};
