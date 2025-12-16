import React from 'react';
import { CodeBlock } from './CodeBlock';
import { JSON_SCHEMA_DOC, PYTHON_CLASS_STRUCTURE } from '../constants';

export const Documentation: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto bg-gray-900 p-8 text-gray-300 max-w-5xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Technical Design Document (TDD)</h1>
        <p className="text-sm text-gray-500 font-mono mb-8">Project: Whitebox Strategy Framework | Phase: 2 (4X Mechanics)</p>
        
        <div className="p-6 bg-blue-900/20 border-l-4 border-blue-500 mb-10 rounded-r-lg">
           <h3 className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-2">Core Philosophy: Ruthless Compression</h3>
           <p className="text-gray-300 italic">
             "Do not build a single rigid game. Build a modular engine where game rules (map size, unit stats, turn limits) 
             are defined in external data structures, not hard-coded in scripts."
           </p>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
            <span className="w-8 h-8 rounded bg-gray-700 text-white flex items-center justify-center text-sm mr-3">1</span>
            MVP Scope & Mechanics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-5 rounded border border-gray-700">
               <strong className="block text-white mb-2">Economy Loop</strong>
               <ul className="list-disc list-inside text-sm space-y-1">
                 <li>Income is discrete (Start of Turn).</li>
                 <li><code className="text-yellow-500">Income = 5 + Sum(City Levels)</code>.</li>
                 <li>Cities capture tiles to expand territory.</li>
               </ul>
            </div>
            <div className="bg-gray-800 p-5 rounded border border-gray-700">
               <strong className="block text-white mb-2">Exploitation</strong>
               <ul className="list-disc list-inside text-sm space-y-1">
                 <li>Tiles have Terrain Types (Ground, Mountain).</li>
                 <li>Techs unlock Improvements (Farming -> Farm).</li>
                 <li>Improvements boost City Population.</li>
               </ul>
            </div>
             <div className="bg-gray-800 p-5 rounded border border-gray-700 md:col-span-2">
               <strong className="block text-white mb-2">Tech Tree</strong>
               <p className="text-sm text-gray-400 mb-2">
                 Techs are nodes in a Directed Acyclic Graph (DAG).
               </p>
               <div className="flex space-x-4 text-xs font-mono">
                 <span className="bg-gray-900 px-2 py-1 rounded text-purple-400">Riding -> Roads -> Trade</span>
                 <span className="bg-gray-900 px-2 py-1 rounded text-purple-400">Climbing -> Mining -> Smithery</span>
               </div>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
            <span className="w-8 h-8 rounded bg-gray-700 text-white flex items-center justify-center text-sm mr-3">2</span>
            System Architecture (Phase 2)
          </h2>
          
          <div className="space-y-4">
            <div className="border-l-2 border-green-500 pl-4 py-1">
              <h3 className="font-bold text-white">CityComponent</h3>
              <p className="text-sm">The core entity of the game. Handles Population (from resources) and Leveling (which increases income).</p>
            </div>
            <div className="border-l-2 border-yellow-500 pl-4 py-1">
              <h3 className="font-bold text-white">EconomyManager</h3>
              <p className="text-sm">Iterates through all Tribe cities at <code className="text-xs">ON_TURN_START</code> to calculate and award Stars.</p>
            </div>
            <div className="border-l-2 border-indigo-500 pl-4 py-1">
              <h3 className="font-bold text-white">FogSystem</h3>
              <p className="text-sm">Maintains a 2D bitmask per tribe. Updates dynamically when units move.</p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
             <span className="w-8 h-8 rounded bg-gray-700 text-white flex items-center justify-center text-sm mr-3">3</span>
             Architecture Update: Direct Construction
          </h2>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
             <h3 className="text-lg font-bold text-orange-400 mb-2">Pivot: No Worker Units</h3>
             <p className="text-sm text-gray-400 mb-4">
                 To streamline gameplay and reduce micromanagement in the prototype, we have opted for a "Direct Construction" model (similar to Millennia or Old World using resources) rather than moving individual Worker units.
             </p>
             <div className="grid grid-cols-2 gap-8 text-sm">
                 <div>
                    <h4 className="font-bold text-white mb-1">Worker Model (Rejected)</h4>
                    <ul className="list-disc list-inside text-gray-500">
                        <li>Build Worker Unit.</li>
                        <li>Move Worker to Tile.</li>
                        <li>Wait 1 turn.</li>
                        <li>Build Improvement.</li>
                        <li>Consumes Unit/Charges.</li>
                    </ul>
                 </div>
                 <div>
                    <h4 className="font-bold text-white mb-1">Direct Construction (Accepted)</h4>
                    <ul className="list-disc list-inside text-gray-300">
                        <li>Select Owned Tile.</li>
                        <li>Check Tech & Terrain requirements.</li>
                        <li>Pay Cost (Stars).</li>
                        <li>Improvement appears instantly.</li>
                        <li>City Population increases.</li>
                    </ul>
                 </div>
             </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
            <span className="w-8 h-8 rounded bg-gray-700 text-white flex items-center justify-center text-sm mr-3">4</span>
            Future Architecture: Verticality (Sky Layer)
          </h2>
          <div className="bg-indigo-900/20 border border-indigo-500/50 p-6 rounded-lg">
             <h3 className="text-lg font-bold text-indigo-400 mb-2">Concept: The Floating Layer</h3>
             <p className="text-sm text-gray-400 mb-4">
                 Future iterations will introduce a secondary grid (`z=1`) floating above the standard map (`z=0`).
             </p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="border-l-2 border-indigo-500 pl-4">
                    <strong className="text-white block mb-1">Data Structure Updates</strong>
                    <ul className="list-disc list-inside text-gray-400 space-y-1">
                        <li>Update <code className="text-xs bg-gray-800 px-1 rounded">Tile</code> to include `z: number`.</li>
                        <li>Engine currently initializes tiles with `z:0`.</li>
                        <li>Map generation will need a secondary noise pass for Sky Islands (sparser than ground).</li>
                    </ul>
                </div>
                <div className="border-l-2 border-indigo-500 pl-4">
                    <strong className="text-white block mb-1">Impasses & Mechanics</strong>
                    <ul className="list-disc list-inside text-gray-400 space-y-1">
                        <li><strong>The Void:</strong> Empty space in Sky Layer. Impassable to non-flying units.</li>
                        <li><strong>Beanstalks/Elevators:</strong> Special tiles allowing movement between Z=0 and Z=1.</li>
                        <li><strong>Parallax:</strong> Visual layer offset to create depth sensation.</li>
                    </ul>
                </div>
             </div>
          </div>
        </section>
        
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-4">Implementation Plan</h2>
          <p className="text-gray-400 mb-6 text-sm">
             The following schemas and class structures serve as the blueprint for the implementation.
          </p>
          
          <div className="space-y-8">
            <div>
                 <div className="flex justify-between items-end mb-2">
                    <h3 className="text-lg font-bold text-gray-200">JSON Configuration Schema</h3>
                    <span className="text-xs text-gray-500">schema.json</span>
                 </div>
                 <CodeBlock code={JSON_SCHEMA_DOC} language="json" />
            </div>
            <div>
                 <div className="flex justify-between items-end mb-2">
                    <h3 className="text-lg font-bold text-gray-200">Python Class Structure</h3>
                    <span className="text-xs text-gray-500">framework.py</span>
                 </div>
                 <CodeBlock code={PYTHON_CLASS_STRUCTURE} language="python" />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};