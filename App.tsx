import React, { useState } from 'react';
import { Documentation } from './components/Documentation';
import { PrototypeView } from './components/PrototypeView';

type View = 'tdd' | 'prototype';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('tdd');

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 shadow-md z-10">
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
        
        <div className="text-xs text-gray-500 font-mono hidden sm:block">
          v0.1.0-alpha
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {currentView === 'tdd' ? <Documentation /> : <PrototypeView />}
      </main>
    </div>
  );
};

export default App;