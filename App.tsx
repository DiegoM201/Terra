import React, { useState } from 'react';
import { Documentation } from './components/Documentation';
import { PrototypeView } from './components/PrototypeView';
import { ArchitectAssistant } from './components/ArchitectAssistant';

type View = 'tdd' | 'prototype';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('tdd');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 shadow-md z-10 shrink-0">
        <div className="flex items-center space-x-3">
           <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">W</div>
           <h1 className="text-lg font-bold tracking-tight text-white">Whitebox <span className="text-gray-400 font-normal">Architect</span></h1>
        </div>
        
        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
          <button 
            onClick={() => setCurrentView('tdd')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              currentView === 'tdd' 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Design Document
          </button>
          <button 
            onClick={() => setCurrentView('prototype')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              currentView === 'prototype' 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Engine Prototype
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
            <button 
                onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded border transition-all ${isAssistantOpen ? 'bg-purple-900/50 border-purple-500 text-purple-100' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'}`}
            >
                <span className="text-lg">✨</span>
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">AI Assist</span>
            </button>
            <div className="text-xs text-gray-500 font-mono hidden sm:block">
            v0.1.0-alpha
            </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="relative flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden relative w-full h-full">
            {currentView === 'tdd' ? <Documentation /> : <PrototypeView />}
        </main>
        
        {/* Assistant Overlay/Sidebar */}
        {isAssistantOpen && (
            <ArchitectAssistant onClose={() => setIsAssistantOpen(false)} currentView={currentView} />
        )}
      </div>
    </div>
  );
};

export default App;
