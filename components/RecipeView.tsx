import React, { useState } from 'react';
import { suggestRecipes } from '../services/geminiService';
import { InventoryItem, Recipe } from '../types';

interface Props {
  inventory: InventoryItem[];
}

const RecipeView: React.FC<Props> = ({ inventory }) => {
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGetSuggestions = async () => {
    setLoading(true);
    try {
      const result = await suggestRecipes(inventory);
      setRecipes(result);
      if (result.length > 0) setExpandedId(result[0].id);
    } catch (err) {
      console.error(err);
      alert("Kunde inte hämta recept just nu.");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Middagsförslag</h2>
        <p className="text-gray-500 text-sm">
          Låt AI:n föreslå recept baserat på vad du har hemma. Vi prioriterar varor som snart går ut!
        </p>
      </div>

      {!recipes && !loading && (
        <button
          onClick={handleGetSuggestions}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Hämta smarta recept
        </button>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-20 bg-gray-100 rounded w-full"></div>
            </div>
          ))}
          <p className="text-center text-gray-500 mt-4">Kock-AI funderar...</p>
        </div>
      )}

      {recipes && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-700">Förslag</h3>
            <button onClick={handleGetSuggestions} className="text-emerald-600 text-sm font-medium hover:underline">
              Hämta nya
            </button>
          </div>
          
          {recipes.length === 0 && <p>Inga recept hittades.</p>}

          {recipes.map(recipe => {
            const isExpanded = expandedId === recipe.id || (recipes.length === 1);
            return (
              <div key={recipe.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button 
                  onClick={() => toggleExpand(recipe.id)}
                  className="w-full p-4 flex justify-between items-center text-left bg-white hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">{recipe.title}</h4>
                    <p className="text-gray-500 text-sm flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {recipe.cookTime}
                    </p>
                  </div>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-gray-100">
                    <p className="text-gray-600 mb-4 italic text-sm mt-3">{recipe.description}</p>
                    
                    <div className="mb-4">
                      <h5 className="font-semibold text-sm text-gray-800 mb-2 uppercase tracking-wide">Ingredienser</h5>
                      <ul className="text-sm space-y-1 text-gray-700">
                        {recipe.ingredients.map((ing, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-1">•</span>
                            {ing}
                          </li>
                        ))}
                      </ul>
                      {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                        <div className="mt-2 bg-yellow-50 p-2 rounded text-xs text-yellow-800">
                          <strong>Saknas kanske:</strong> {recipe.missingIngredients.join(', ')}
                        </div>
                      )}
                    </div>

                    <div>
                      <h5 className="font-semibold text-sm text-gray-800 mb-2 uppercase tracking-wide">Gör så här</h5>
                      <ol className="text-sm space-y-3 text-gray-700">
                        {recipe.instructions.map((step, idx) => (
                          <li key={idx} className="flex gap-3">
                            <span className="flex-shrink-0 bg-gray-100 text-gray-500 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecipeView;