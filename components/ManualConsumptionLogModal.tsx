import React, { useState } from 'react';
import type { ConsumptionLog } from '../types';

interface ManualConsumptionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (log: Omit<ConsumptionLog, 'id'>) => Promise<void>;
  initialValues?: ConsumptionLog;
}

const defaultDate = () => new Date().toISOString().slice(0, 16);

const ManualConsumptionLogModal: React.FC<ManualConsumptionLogModalProps> = ({ isOpen, onClose, onSubmit, initialValues }) => {
  const [formValues, setFormValues] = useState<Omit<ConsumptionLog, 'id'>>(() => {
    if (initialValues) {
      return {
        date: initialValues.date,
        itemName: initialValues.itemName,
        cost: initialValues.cost,
        quantityUsed: initialValues.quantityUsed,
        reason: initialValues.reason,
        dishName: initialValues.dishName,
        unit: initialValues.unit,
        notes: initialValues.notes
      };
    }
    return {
      date: new Date().toISOString(),
      itemName: '',
      cost: 0,
      quantityUsed: 0,
      reason: 'snack',
      dishName: undefined,
      unit: undefined,
      notes: undefined
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleChange = (key: keyof Omit<ConsumptionLog, 'id'>, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [key]: key === 'cost' || key === 'quantityUsed' ? Number(value) : value || undefined
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formValues.itemName.trim()) {
      setError('Ange ett namn.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...formValues,
        date: formValues.date || new Date().toISOString()
      });
      onClose();
      setFormValues({
        date: new Date().toISOString(),
        itemName: '',
        cost: 0,
        quantityUsed: 0,
        reason: 'snack',
        dishName: undefined,
        unit: undefined,
        notes: undefined
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Kunde inte spara.');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">{initialValues ? 'Redigera logg' : 'Logga förbrukning'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700">
            Datum & tid
            <input
              type="datetime-local"
              defaultValue={initialValues ? new Date(initialValues.date).toISOString().slice(0, 16) : defaultDate()}
              onChange={event => handleChange('date', new Date(event.target.value).toISOString())}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Namn på vara eller rätt
            <input
              type="text"
              value={formValues.itemName}
              onChange={event => handleChange('itemName', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Ex. Potatissallad"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-gray-700">
              Kostnad (kr)
              <input
                type="number"
                min="0"
                step="0.1"
                value={formValues.cost}
                onChange={event => handleChange('cost', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Mängd
              <input
                type="number"
                min="0"
                step="0.1"
                value={formValues.quantityUsed}
                onChange={event => handleChange('quantityUsed', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700">
            Enhet
            <input
              type="text"
              value={formValues.unit ?? ''}
              onChange={event => handleChange('unit', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Ex. g, st"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Anledning
            <select
              value={formValues.reason}
              onChange={event => handleChange('reason', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="cooked">Matlagning</option>
              <option value="expired">Utgånget</option>
              <option value="snack">Annat</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Rätt
            <input
              type="text"
              value={formValues.dishName ?? ''}
              onChange={event => handleChange('dishName', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Ex. Middag med lax"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Anteckningar
            <textarea
              value={formValues.notes ?? ''}
              onChange={event => handleChange('notes', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              rows={2}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200">Avbryt</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-60">
              {submitting ? 'Sparar...' : 'Spara logg'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualConsumptionLogModal;
