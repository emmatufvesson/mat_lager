import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RecipeView from '../../components/RecipeView';
import { suggestRecipes } from '../../services/geminiService';
import type { InventoryItem, Recipe } from '../../types';

// Mock the suggestRecipes service
jest.mock('../../services/geminiService', () => ({
  suggestRecipes: jest.fn(),
}));

const mockSuggestRecipes = suggestRecipes as jest.MockedFunction<typeof suggestRecipes>;

// Mock window.alert
const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

const mockInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Mjölk',
    quantity: 1,
    unit: 'l',
    category: 'Mejeri',
    expiryDate: '2024-12-20',
    priceInfo: 15,
    addedDate: '2024-12-10',
    source: 'manual'
  },
  {
    id: '2',
    name: 'Ägg',
    quantity: 6,
    unit: 'st',
    category: 'Mejeri',
    expiryDate: '2024-12-18',
    priceInfo: 25,
    addedDate: '2024-12-10',
    source: 'manual'
  }
];

const mockRecipes: Recipe[] = [
  {
    id: 'recipe-1',
    title: 'Äggröra',
    description: 'Enkel och snabb frukosträtt',
    ingredients: ['4 ägg', '2 dl mjölk', 'Salt', 'Peppar'],
    missingIngredients: ['Salt', 'Peppar'],
    instructions: [
      'Vispa ihop ägg och mjölk',
      'Hetta upp en panna',
      'Häll i äggblandningen och rör om tills den stelnar',
      'Servera genast'
    ],
    cookTime: '10 min'
  },
  {
    id: 'recipe-2',
    title: 'Pannkakor',
    description: 'Klassiska pannkakor med mjölk',
    ingredients: ['2 dl mjöl', '2 dl mjölk', '2 ägg', '1 tsk bakpulver'],
    missingIngredients: ['Mjöl', 'Bakpulver'],
    instructions: [
      'Blanda torra ingredienser',
      'Vispa ihop väta och torra ingredienser',
      'Stek i smör på medelhög värme',
      'Vänd när bubblor bildas'
    ],
    cookTime: '20 min'
  }
];

describe('RecipeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial state with suggestion button', () => {
    render(<RecipeView inventory={mockInventory} />);

    expect(screen.getByText('Middagsförslag')).toBeInTheDocument();
    expect(screen.getByText('Låt AI:n föreslå recept baserat på vad du har hemma. Vi prioriterar varor som snart går ut!')).toBeInTheDocument();
    expect(screen.getByText('Hämta smarta recept')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hämta smarta recept/i })).toBeInTheDocument();
  });

  it('shows loading state when fetching suggestions', async () => {
    mockSuggestRecipes.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockRecipes), 100)));

    render(<RecipeView inventory={mockInventory} />);

    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    // Should show loading skeletons
    expect(screen.getByText('Kock-AI funderar...')).toBeInTheDocument();

    // Should show 3 skeleton placeholders
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3);

    await waitFor(() => {
      expect(mockSuggestRecipes).toHaveBeenCalledWith(mockInventory);
    });
  });

  it('displays recipes after successful fetch', async () => {
    mockSuggestRecipes.mockResolvedValueOnce(mockRecipes);

    render(<RecipeView inventory={mockInventory} />);

    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Äggröra')).toBeInTheDocument();
      expect(screen.getByText('Pannkakor')).toBeInTheDocument();
    });

    expect(screen.getByText('Förslag')).toBeInTheDocument();
    expect(screen.getByText('Hämta nya')).toBeInTheDocument();
  });

  it('auto-expands first recipe when multiple recipes are loaded', async () => {
    mockSuggestRecipes.mockResolvedValueOnce(mockRecipes);

    render(<RecipeView inventory={mockInventory} />);

    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Äggröra')).toBeInTheDocument();
    });

    // First recipe should be expanded by default
    expect(screen.getByText('Enkel och snabb frukosträtt')).toBeInTheDocument();
    expect(screen.getAllByText('4 ägg')).toHaveLength(1); // Should appear in ingredients
    expect(screen.getByText('Vispa ihop ägg och mjölk')).toBeInTheDocument();
  });

  it('auto-expands single recipe when only one is loaded', async () => {
    mockSuggestRecipes.mockResolvedValueOnce([mockRecipes[0]]);

    render(<RecipeView inventory={mockInventory} />);

    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Äggröra')).toBeInTheDocument();
    });

    // Single recipe should be expanded by default
    expect(screen.getByText('Enkel och snabb frukosträtt')).toBeInTheDocument();
    expect(screen.getAllByText('4 ägg')).toHaveLength(1);
  });

  it('toggles recipe expansion when clicked', async () => {
    mockSuggestRecipes.mockResolvedValueOnce(mockRecipes);

    render(<RecipeView inventory={mockInventory} />);

    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Äggröra')).toBeInTheDocument();
    });

    // First recipe is expanded by default
    expect(screen.getByText('Enkel och snabb frukosträtt')).toBeInTheDocument();

    // Click to collapse first recipe
    const firstRecipeButton = screen.getByText('Äggröra').closest('button');
    fireEvent.click(firstRecipeButton!);

    // Should be collapsed
    expect(screen.queryByText('Enkel och snabb frukosträtt')).not.toBeInTheDocument();

    // Click to expand second recipe
    const secondRecipeButton = screen.getByText('Pannkakor').closest('button');
    fireEvent.click(secondRecipeButton!);

    // Second recipe should be expanded
    expect(screen.getByText('Klassiska pannkakor med mjölk')).toBeInTheDocument();
    expect(screen.getByText('Blanda torra ingredienser')).toBeInTheDocument();
  });

  it('shows missing ingredients when present', async () => {
    mockSuggestRecipes.mockResolvedValueOnce(mockRecipes);

    render(<RecipeView inventory={mockInventory} />);

    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Äggröra')).toBeInTheDocument();
    });

    expect(screen.getByText('Saknas kanske:')).toBeInTheDocument();
    expect(screen.getByText('Salt, Peppar')).toBeInTheDocument();
  });

  it('shows cook time for each recipe', async () => {
    mockSuggestRecipes.mockResolvedValueOnce(mockRecipes);

    render(<RecipeView inventory={mockInventory} />);

    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Äggröra')).toBeInTheDocument();
    });

    expect(screen.getByText('10 min')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
  });

  it('shows numbered instructions', async () => {
    mockSuggestRecipes.mockResolvedValueOnce(mockRecipes);

    render(<RecipeView inventory={mockInventory} />);

    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Äggröra')).toBeInTheDocument();
    });

    // Check that instruction numbers are displayed
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows error message when API fails', async () => {
    mockSuggestRecipes.mockRejectedValueOnce(new Error('API Error'));

    render(<RecipeView inventory={mockInventory} />);

    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Kunde inte hämta recept just nu.');
    });

    expect(mockSuggestRecipes).toHaveBeenCalledWith(mockInventory);
  });

  it('allows getting new suggestions', async () => {
    mockSuggestRecipes.mockResolvedValueOnce(mockRecipes);

    render(<RecipeView inventory={mockInventory} />);

    // Get initial suggestions
    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Äggröra')).toBeInTheDocument();
    });

    // Click "Get new suggestions"
    const newSuggestionsButton = screen.getByText('Hämta nya');
    fireEvent.click(newSuggestionsButton);

    // Should call API again
    await waitFor(() => {
      expect(mockSuggestRecipes).toHaveBeenCalledTimes(2);
    });
  });

  it('shows empty state when no recipes found', async () => {
    mockSuggestRecipes.mockResolvedValueOnce([]);

    render(<RecipeView inventory={mockInventory} />);

    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Inga recept hittades.')).toBeInTheDocument();
    });
  });

  it('shows ingredients list correctly', async () => {
    mockSuggestRecipes.mockResolvedValueOnce([mockRecipes[0]]);

    render(<RecipeView inventory={mockInventory} />);

    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Äggröra')).toBeInTheDocument();
    });

    expect(screen.getByText('Ingredienser')).toBeInTheDocument();
    expect(screen.getByText('4 ägg')).toBeInTheDocument();
    expect(screen.getByText('2 dl mjölk')).toBeInTheDocument();
    expect(screen.getByText('Salt')).toBeInTheDocument();
    expect(screen.getByText('Peppar')).toBeInTheDocument();
  });

  it('shows instructions section correctly', async () => {
    mockSuggestRecipes.mockResolvedValueOnce([mockRecipes[0]]);

    render(<RecipeView inventory={mockInventory} />);

    const button = screen.getByText('Hämta smarta recept');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Äggröra')).toBeInTheDocument();
    });

    expect(screen.getByText('Gör så här')).toBeInTheDocument();
    expect(screen.getByText('Vispa ihop ägg och mjölk')).toBeInTheDocument();
    expect(screen.getByText('Hetta upp en panna')).toBeInTheDocument();
  });
});