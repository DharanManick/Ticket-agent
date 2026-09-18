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
          <h4 className="text-sm font-semibold text-white tracking-tight">Resolution Description Mandatory Template &amp; Point Checkpoints</h4>
        </div>
        <div className="text-xs text-gray-400 leading-relaxed space-y-2">
          <p>
            ServiceNow engineering standards mandate that the <strong className="text-blue-400">Resolution Description</strong> field must provide extensive documentation conforming to corporate governance. 
            By default, a target score of 2/2 is verified by checking for <strong>8 strict procedural questions</strong> (or distinct bullet points resolving them) entered on the ServiceNow form.
          </p>
          <p>
            Edit your evaluation checklist points directly in the unified text-area below (one question or checkpoint per line). The Gemini AI model will dynamically evaluate uploaded incidents against these exact checkpoints.
          </p>
        </div>
      </div>

      {/* Unified Textbox Workspace */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-[#1A1D24] border-b border-[#2A2D35] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-gray-400">
              RESOLUTION MANDATORY TEXTCHECK FIELD ({detectedCount} Points Identified)
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Type or paste your checklist. Ensure every single requirement is on a separate line.
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
                <CheckCircle className={`h-3 w-3 ${detectedCount >= 8 ? 'text-emerald-400' : 'text-yellow-500'}`} />
                <span>Status: {detectedCount} active checkpoints parsed</span>
              </div>
              <span className="text-gray-400">Press ENTER for a new question line</span>
            </div>
          </div>
        </div>
      </div>

      {/* 📘 Visual Audit Guideline Diagram block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#15171C] border border-[#2A2D35] p-4 rounded-xl space-y-2">
          <p className="text-[10px] text-emerald-400 font-mono uppercase font-bold tracking-wider">MANDATORY FLOW HIERARCHY</p>
          <div className="text-xs text-gray-450 space-y-3.5 pt-1.5 text-gray-400">
            <div className="flex items-start space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <p>
                <strong>Resolution Description Controls:</strong> Keywords found here determine target mappings for (Closure Code &rarr; Closure Code 2 &rarr; Solution Code &rarr; Symptom Code).
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <p>
                <strong>Helper Inputs Integration:</strong> The Resolution Description is cross-checked to verify the factual context of <em>Short Description</em> and <em>Technical Description</em> fields.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#15171C] border border-[#2A2D35] p-4 rounded-xl space-y-2">
          <p className="text-[10px] text-blue-450 font-mono uppercase font-bold tracking-wider text-blue-400">CI OVER-REACH AUDITING</p>
          <div className="text-xs text-gray-450 space-y-3.5 pt-1.5 text-gray-400">
            <div className="flex items-start space-x-2">
              <span className="h-2 w-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <p>
                <strong>Assignment Group Mappings:</strong> Automatically validated against the authorized CI combination database.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="h-2 w-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <p>
                <strong>Causal Suspected CI Logic:</strong> External dependent delays must yield custom, distinct causal CIs. Infrastructure closures must revert precisely to local affected system CI definitions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
