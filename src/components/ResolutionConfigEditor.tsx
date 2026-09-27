import React, { useState, useEffect } from 'react';
import { 
  Save, 
  RotateCcw, 
  FileText,
  ListTodo,
  CheckCircle
} from 'lucide-react';

interface ResolutionConfigEditorProps {
  questions: string[];
  onSaveQuestions: (newQuestions: string[]) => void;
  onResetToDefault: () => void;
  triggerPopup: (msg: string, type: 'success' | 'info' | 'warning') => void;
}

export default function ResolutionConfigEditor({
  questions,
  onSaveQuestions,
  onResetToDefault,
  triggerPopup
}: ResolutionConfigEditorProps) {
  const [textValue, setTextValue] = useState('');

  useEffect(() => {
    if (questions && questions.length > 0) {
      setTextValue(questions.join('\n'));
    } else {
      setTextValue('');
    }
  }, [questions]);

  const handleSave = () => {
    // Split lines, filter out empty/blank lines
    const parsedLines = textValue
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (parsedLines.length === 0) {
      triggerPopup('You must provide at least 1 resolution checkpoint block.', 'warning');
      return;
    }

    if (parsedLines.length < 4) {
      triggerPopup('ServiceNow governance audits require at least 4 verification checkpoints.', 'warning');
    }

    onSaveQuestions(parsedLines);
    triggerPopup(`Committed ${parsedLines.length} Resolution checklist points successfully!`, 'success');
  };

  const handleReset = () => {
    onResetToDefault();
    triggerPopup('Reset configuration to standard 8 ServiceNow governance checkpoints.', 'info');
  };

  const detectedCount = textValue
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0).length;

  return (
    <div className="space-y-6 animate-fadeIn" id="resolution-config-panel">
      {/* Informational Governance Header */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center space-x-2.5">
          <ListTodo className="h-4.5 w-4.5 text-blue-400" />
          <h4 className="text-sm font-semibold text-white tracking-tight">Resolution Description Quality Checklist (Advisory Checkpoints)</h4>
        </div>
        <div className="text-xs text-gray-400 leading-relaxed space-y-2">
          <p>
            ServiceNow engineering standards recommend that the <strong className="text-blue-400">Resolution Description</strong> field provides thorough documentation conforming to corporate governance. 
            Under the ITIL human-auditor guidelines, the 8-point checklist is <strong className="text-amber-400">Advisory / Amber (1 mark)</strong> if not all checkpoints are formatted.
          </p>
          <p>
            The primary audit evaluation uses LLM semantic embeddings to read and cross-examine the substantive technical content against the fetched ServiceNow KB article, updated activity logs, short description, and technical description to grade validity like a human auditor (2/2 marks for comprehensive documentation).
          </p>
          <p className="text-[11px] text-gray-500">
            Customize your checklist questions below. You can add, remove, or modify questions (one per line).
          </p>
        </div>
      </div>

      {/* Unified Textbox Workspace */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-[#1A1D24] border-b border-[#2A2D35] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-gray-400">
              RESOLUTION CHECKLIST WORKSPACE ({detectedCount} Checkpoints Configured)
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Type or paste your checklist. Ensure every requirement is on a separate line.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleReset}
              className="px-3.5 py-1.5 bg-red-950/15 hover:bg-red-950/25 border border-red-900/30 text-red-400 hover:text-red-300 text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer font-bold transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to default 8 points</span>
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-lg flex items-center space-x-1.5 cursor-pointer transition-all shadow-md"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Checklist Configuration</span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-[#0D0F14]">
          <div className="relative rounded-lg border border-[#2A2D35] bg-[#07080B] overflow-hidden focus-within:border-blue-500/80 transition-colors">
            {/* Visual Line Number Trackers Helper */}
            <div className="flex select-none">
              <div className="w-10 bg-[#0A0C10] text-[#474B57] text-right pr-2 text-xs py-3 font-mono border-r border-[#2A2D35]/50 flex flex-col space-y-[4px]">
                {Array.from({ length: Math.max(12, textValue.split('\n').length + 1) }).map((_, i) => (
                  <div key={i} className="leading-5 h-5">{i + 1}</div>
                ))}
              </div>
              
              <textarea
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Enter each ServiceNow resolution question on a separate line..."
                rows={12}
                className="flex-1 bg-transparent text-xs text-slate-100 p-3 leading-5 resize-y focus:outline-none placeholder-gray-600 font-mono"
              />
            </div>
            
            {/* Footer Summary Bar */}
            <div className="bg-[#0A0C10] border-t border-[#2A2D35]/50 px-3 py-2 flex justify-between items-center text-[10px] text-gray-500 font-mono">
              <div className="flex items-center space-x-2">
                <CheckCircle className={`h-3 w-3 ${detectedCount >= 8 ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span>Status: {detectedCount} active checkpoints parsed (Advisory Amber if incomplete)</span>
              </div>
              <span className="text-gray-400">Press ENTER for a new question line</span>
            </div>
          </div>
        </div>
      </div>

      {/* 📘 Visual Audit Guideline Diagram block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#15171C] border border-[#2A2D35] p-4 rounded-xl space-y-3">
          <p className="text-[10px] text-emerald-400 font-mono uppercase font-bold tracking-wider">OFFICIAL AUDIT FLOWS (1 &amp; 2)</p>
          <div className="text-xs text-gray-400 space-y-3 pt-1">
            <div className="p-2.5 rounded-lg bg-[#0E1015] border border-[#22252C] space-y-1">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-[11px]">
                <span>Flow 1</span>
                <span className="text-gray-500 font-normal">Classification Correlation</span>
              </div>
              <p className="font-mono text-[11px] text-slate-300">
                Resolution Description &rarr; Closure Code &rarr; Closure Code 2 &rarr; Solution code &rarr; Symptom Code
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0E1015] border border-[#22252C] space-y-1">
              <div className="flex items-center space-x-2 text-blue-400 font-semibold text-[11px]">
                <span>Flow 2</span>
                <span className="text-gray-500 font-normal">Context Cross-Examination</span>
              </div>
              <p className="font-mono text-[11px] text-slate-300">
                Resolution Description &rarr; Short Description &rarr; Technical Impact Description
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#15171C] border border-[#2A2D35] p-4 rounded-xl space-y-3">
          <p className="text-[10px] text-blue-400 font-mono uppercase font-bold tracking-wider">OFFICIAL AUDIT FLOWS (3 &amp; 4)</p>
          <div className="text-xs text-gray-400 space-y-3 pt-1">
            <div className="p-2.5 rounded-lg bg-[#0E1015] border border-[#22252C] space-y-1">
              <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-[11px]">
                <span>Flow 3</span>
                <span className="text-gray-500 font-normal">Diagnostic Depth &amp; Fix</span>
              </div>
              <p className="font-mono text-[11px] text-slate-300">
                Resolution Description &rarr; Technical Impact Description
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0E1015] border border-[#22252C] space-y-1">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold text-[11px]">
                <span>Flow 4</span>
                <span className="text-gray-500 font-normal">CMDB Coupling</span>
              </div>
              <p className="font-mono text-[11px] text-slate-300">
                Assignment Group &rarr; Affected Service/CI
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
