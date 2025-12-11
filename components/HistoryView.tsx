import React, { useState } from 'react';
import { ConsumptionLog } from '../types';
import { useConsumptionLogs } from '../hooks/useConsumptionLogs';
import { useCookingSessions } from '../hooks/useCookingSessions';
import ManualConsumptionLogModal from './ManualConsumptionLogModal';

interface HistoryViewProps {
  userId: string | null;
}

const HistoryView: React.FC<HistoryViewProps> = ({ userId }) => {
  const { logs, loading: logsLoading, error: logsError, deleteLog, updateLog } = useConsumptionLogs(userId);
  const { sessions, loading: sessionsLoading, error: sessionsError, getSessionWithItems } = useCookingSessions(userId);
  const [editingLog, setEditingLog] = useState<ConsumptionLog | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const loading = logsLoading || sessionsLoading;
  const error = logsError || sessionsError;

  const handleEdit = (log: ConsumptionLog) => {
    setEditingLog(log);
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Är du säker på att du vill ta bort denna logg?')) {
      try {
        await deleteLog(id);
      } catch (err) {
        alert('Kunde inte ta bort loggen: ' + (err as Error).message);
      }
    }
  };

  const handleUpdateLog = async (updatedLog: Omit<ConsumptionLog, 'id'>) => {
    if (!editingLog) return;
    try {
      await updateLog(editingLog.id, updatedLog);
      setShowEditModal(false);
      setEditingLog(null);
    } catch (err) {
      alert('Kunde inte uppdatera loggen: ' + (err as Error).message);
    }
  };

  const getReasonLabel = (reason: ConsumptionLog['reason']) => {
    switch (reason) {
      case 'cooked':
        return 'Matlagning';
      case 'expired':
        return 'Utgånget';
      case 'snack':
        return 'Annat';
      default:
        return reason;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        Hämtar historik...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-4 my-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Förbrukningshistorik</h2>
      {logs.length === 0 && sessions.length === 0 ? (
        <p className="text-gray-400 text-sm">Ingen historik än.</p>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <div key={session.id} className="bg-blue-50 p-4 rounded-2xl shadow-sm border border-blue-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{session.dishName}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(session.createdAt).toLocaleString()} • Kostnad: {session.totalCost} kr
                  </p>
                  {session.notes && <p className="text-sm text-gray-500 mt-1">{session.notes}</p>}
                  <button
                    onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                    className="text-sm text-blue-600 mt-2"
                  >
                    {expandedSession === session.id ? 'Dölj detaljer' : 'Visa detaljer'}
                  </button>
                  {expandedSession === session.id && (
                    <div className="mt-3 space-y-2">
                      {session.items.map(item => (
                        <div key={item.id} className="text-sm text-gray-600 bg-white p-2 rounded">
                          {item.itemName}: {item.quantityUsed} {item.unit} • {item.cost} kr
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {logs.map(log => (
            <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{log.itemName}</h3>
                  {log.dishName && <p className="text-sm text-gray-600">Rätt: {log.dishName}</p>}
                  <p className="text-sm text-gray-500">
                    {new Date(log.date).toLocaleString()} • {getReasonLabel(log.reason)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {log.quantityUsed} {log.unit} • {log.cost ? `${log.cost} kr` : 'Ingen kostnad'}
                  </p>
                  {log.notes && <p className="text-sm text-gray-500 mt-1">{log.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(log)}
                    className="text-sm text-emerald-600 hover:text-emerald-500"
                  >
                    Redigera
                  </button>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="text-sm text-red-600 hover:text-red-500"
                  >
                    Ta bort
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditModal && editingLog && (
        <ManualConsumptionLogModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingLog(null);
          }}
          onSubmit={handleUpdateLog}
          initialValues={editingLog}
        />
      )}
    </div>
  );
};

export default HistoryView;