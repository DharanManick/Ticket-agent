import React, { useState } from 'react';
import { CiCombination } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { 
  Plus, 
  Trash2, 
  Save, 
  Undo, 
  RefreshCw,
  Sliders,
  Sparkles,
  Search,
  ShieldCheck
} from 'lucide-react';

interface CiMatrixEditorProps {
  combinations: CiCombination[];
  onCombinationsSave: (newCombinations: CiCombination[]) => void;
  onResetToDefault: () => void;
  triggerPopup: (msg: string, type: 'success' | 'info' | 'warning') => void;
}

export default function CiMatrixEditor({ 
  combinations, 
  onCombinationsSave, 
  onResetToDefault,
  triggerPopup
}: CiMatrixEditorProps) {
  const [localCombos, setLocalCombos] = useState<CiCombination[]>([...combinations]);
  const [deletedCombosStack, setDeletedCombosStack] = useState<{ combo: CiCombination; originalIndex: number }[]>([]);
  const [comboIndexToDelete, setComboIndexToDelete] = useState<number | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  React.useEffect(() => {
    setLocalCombos([...combinations]);
  }, [combinations]);

  const handleFieldChange = (idx: number, key: keyof CiCombination, val: string) => {
    const updated = [...localCombos];
    updated[idx] = { ...updated[idx], [key]: val } as CiCombination;
    setLocalCombos(updated);
  };

  const handleAddRow = () => {
    const newCombo: CiCombination = {
      id: `ci_combo_manual_${Date.now()}`,
      affectedCi: 'new-service-ci',
      suspectedCi: 'new-service-ci',
      assignmentGroup: 'Service Desk Group',
      assigneeManager: 'Vikram Seth'
    };
    setLocalCombos([newCombo, ...localCombos]);
    triggerPopup('Empty CI combination added. Remember to customize and save.', 'info');
  };

  const handleDeleteRow = (idx: number) => {
    const deletedCombo = localCombos[idx];
    setDeletedCombosStack(prev => [...prev, { combo: deletedCombo, originalIndex: idx }]);
    
    const updated = localCombos.filter((_, i) => i !== idx);
    setLocalCombos(updated);
    triggerPopup(`Slated combination for "${deletedCombo.affectedCi}" for removal. You can undo this deletion.`, 'warning');
  };

  const handleUndoDelete = () => {
    if (deletedCombosStack.length === 0) return;
    const lastDeleted = deletedCombosStack[deletedCombosStack.length - 1];
    setDeletedCombosStack(prev => prev.slice(0, -1));
    
    const updated = [...localCombos];
    if (lastDeleted.originalIndex >= 0 && lastDeleted.originalIndex <= updated.length) {
      updated.splice(lastDeleted.originalIndex, 0, lastDeleted.combo);
    } else {
      updated.push(lastDeleted.combo);
    }
    setLocalCombos(updated);
    triggerPopup(`Restored combination for: "${lastDeleted.combo.affectedCi}"`, 'success');
  };

  const handleSaveChanges = async () => {
    onCombinationsSave(localCombos);
    triggerPopup('Commit Complete: Custom CI Combinations active!', 'success');
  };

  const triggerReset = () => {
    onResetToDefault();
    triggerPopup('Restored standard default CI compliance database.', 'info');
  };

  const filteredCombos = localCombos.filter(c => {
    const q = filterQuery.toLowerCase();
    return (
      c.affectedCi.toLowerCase().includes(q) ||
      c.suspectedCi.toLowerCase().includes(q) ||
      c.assignmentGroup.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn" id="ci-matrix-editor">
      {/* Informational Header Board */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-[#10B981]" />
          <h4 className="text-sm font-semibold text-white tracking-tight">CI &amp; Assignment Group Governance Mapping</h4>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Configure valid mapping couples of <strong className="text-emerald-400">Affected Service/CI</strong>, <strong className="text-slate-300">Suspect/Causal CI</strong>, and <strong className="text-blue-400">Assignment Group</strong>. 
          The Incident Auditor enforces these mappings dynamically: if the combination of Affected CI &amp; Assignment Group matches a rules row below, the ticket receives <strong>2/2 [PASS]</strong>, otherwise it receives <strong>0/2 [CRITICAL FAIL]</strong>.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search active combinations inside matrix..."
              className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-blue-500 rounded-lg pl-9 pr-4 py-2 text-xs text-white outline-none placeholder-gray-600 font-mono"
            />
          </div>
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="text-xs text-gray-400 hover:text-white font-mono underline shrink-0 cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Undo Delete Notice Banner */}
      {deletedCombosStack.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-xs text-amber-200 animate-slideUp gap-3">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 bg-amber-500/15 rounded-lg text-amber-400 border border-amber-500/20">
              <Trash2 className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-white">CI Coupling slated for deletion</p>
              <p className="text-gray-400 text-[11px] mt-0.5">
                Saved Combo CI: <strong className="text-amber-300 font-mono">"{deletedCombosStack[deletedCombosStack.length - 1].combo.affectedCi}"</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] cursor-pointer flex items-center space-x-1.5 transition-all shadow-md shadow-amber-950/20"
          >
            <Undo className="h-3 w-3" />
            <span>Undo Delete</span>
          </button>
        </div>
      )}

      {/* Combinations Matrix Table Container */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-[#1A1D24] border-b border-[#2A2D35] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-gray-400">CI &amp; AG MAPPING RELATIONSHIPS</h4>
            <p className="text-xs text-gray-500 mt-1">Authorized corporate combinations required to pass ServiceNow Quality Audits.</p>
          </div>
          
          <div className="flex flex-wrap gap-2 self-end lg:self-auto">
            <button
              onClick={handleAddRow}
              className="px-3 py-2 bg-[#0A0C0F] hover:bg-[#15171C] border border-[#2A2D35] text-xs text-slate-300 rounded-lg flex items-center space-x-1.5 cursor-pointer font-medium"
            >
              <Plus className="h-3 w-3" />
              <span>Add Custom Combination</span>
            </button>
            <button
              onClick={handleSaveChanges}
              className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-[#0A0C0F] text-xs font-black rounded-lg flex items-center space-x-1.5 cursor-pointer transition-all shadow-md"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Commit CI Matrix Configuration</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#2A2D35] bg-[#0A0C0F] text-gray-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="p-3">Affected Service / CI (Mandatory)</th>
                <th className="p-3">Suspect / Causal CI</th>
                <th className="p-3">Assignment Group</th>
                <th className="p-3">Assignee Manager</th>
                <th className="p-3 w-[65px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2D35]/55 text-xs text-gray-300">
              {filteredCombos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 italic font-medium">
                    No matching combinations identified in matrix cache.
                  </td>
                </tr>
              ) : (
                filteredCombos.map((combo, originalIdx) => {
                  // Find index in main state list to edit correctly
                  const globalIdx = localCombos.findIndex(c => c.id === combo.id);
                  return (
                    <tr key={combo.id} className="hover:bg-[#1A1D24]/40 transition-all">
                      <td className="p-3">
                        <input
                          type="text"
                          value={combo.affectedCi}
                          onChange={(e) => handleFieldChange(globalIdx, 'affectedCi', e.target.value)}
                          className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs text-emerald-400 font-semibold font-mono outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={combo.suspectedCi}
                          onChange={(e) => handleFieldChange(globalIdx, 'suspectedCi', e.target.value)}
                          className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs text-slate-300 outline-none font-mono"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={combo.assignmentGroup}
                          onChange={(e) => handleFieldChange(globalIdx, 'assignmentGroup', e.target.value)}
                          className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs text-blue-300 font-semibold font-mono outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={combo.assigneeManager || ''}
                          placeholder="e.g. Vikram Seth"
                          onChange={(e) => handleFieldChange(globalIdx, 'assigneeManager', e.target.value)}
                          className="w-full bg-[#0A0C0F] border border-[#2A2D35] focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs text-yellow-300 font-semibold font-mono outline-none"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setComboIndexToDelete(globalIdx)}
                          className="text-gray-500 hover:text-red-400 p-1.5 rounded hover:bg-[#1A1D24] transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CI Matrix Pairing Deletion Confirmation Modal */}
      <ConfirmationModal
        isOpen={comboIndexToDelete !== null}
        title="Delete CI Governance Pairing?"
        message={`Are you sure you want to delete this CI compliance matrix mapping combination for Affected CI "${comboIndexToDelete !== null ? localCombos[comboIndexToDelete]?.affectedCi : ''}"?`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        onConfirm={() => {
          if (comboIndexToDelete !== null) {
            handleDeleteRow(comboIndexToDelete);
            setComboIndexToDelete(null);
          }
        }}
        onCancel={() => setComboIndexToDelete(null)}
      />

    </div>
  );
}
