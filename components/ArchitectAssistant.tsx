import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_CONFIG, JSON_SCHEMA_DOC, PYTHON_CLASS_STRUCTURE } from '../constants';

interface ArchitectAssistantProps {
  onClose: () => void;
  currentView: 'tdd' | 'prototype';
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export const ArchitectAssistant: React.FC<ArchitectAssistantProps> = ({ onClose, currentView }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'init', 
      role: 'model', 
      text: "Hello! I am your Whitebox Architect Assistant. I can help you refine prompts for the coding agent, plan your roadmap, or analyze your data structures. Enable 'Deep Reasoning' for complex architectural tasks." 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Select model based on toggle
      const modelName = useThinking ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
      
      // Construct System Context
      const systemContext = `
        You are the Whitebox Engine Architect Assistant. Your goal is to help the user design a modular, data-driven strategy game engine.
        
        CURRENT APP CONTEXT:
        - View: ${currentView}
        - Core Philosophy: "Ruthless Compression" & Data-Driven Design.
        - Tech Stack: React, Tailwind, Canvas/SVG for Prototype.
        
        GAME CONFIG SUMMARY:
        - Grid: ${DEFAULT_CONFIG.map.gridType} (${DEFAULT_CONFIG.map.width}x${DEFAULT_CONFIG.map.height})
        - Units: ${Object.keys(DEFAULT_CONFIG.units).join(', ')}
        - Techs: ${Object.keys(DEFAULT_CONFIG.techs).join(', ')}
        
        INSTRUCTIONS:
        - If asked to refine a prompt, provide a markdown code block with a clear, specific prompt the user can copy.
        - If asked for a roadmap, suggest logical steps following the "Shift Left" workflow (Plan -> Context -> Code).
        - Be concise but insightful.
      `;

      // Chat history to prompt context
      // Note: For simplicity in this specialized assistant, we'll recreate the chat chain or just send the last few messages + context
      // Ideally use ai.chats.create() but manual history construction allows easier context injection per turn if needed.
      
      const chat = ai.chats.create({
        model: modelName,
        config: {
          systemInstruction: systemContext,
          // Thinking Mode Configuration
          thinkingConfig: useThinking ? { thinkingBudget: 32768 } : undefined,
        }
      });

      // Replay history for the session context
      // We skip the first greeting message as it's client-side only usually, but let's include user messages
      const history = messages.filter(m => m.id !== 'init').map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));
      
      // We can't easily "inject" history into the object directly in the SDK without `history` prop in create
      // So we will just send the new message. The SDK `chat` object maintains state if we keep the instance, 
      // but here we recreate it. For a robust app, we'd persist the `chat` instance or pass `history` to create.
      // Let's pass history to create.
      
      const persistentChat = ai.chats.create({
          model: modelName,
          history: history,
          config: {
            systemInstruction: systemContext,
            thinkingConfig: useThinking ? { thinkingBudget: 32768 } : undefined,
          }
      });

      const result = await persistentChat.sendMessage({ message: userMsg.text });
      const responseText = result.text;

      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: responseText }]);

    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: "Error connecting to the Architect Matrix. Please check your connection or API key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-gray-900 border-l border-gray-700 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center space-x-2">
           <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-ping' : 'bg-green-400'}`}></div>
           <h2 className="font-bold text-white tracking-wide text-sm">ARCHITECT ASSISTANT</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-700 text-white rounded-br-none' 
                : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-none shadow-sm'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
             </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        {/* Thinking Toggle */}
        <div className="flex items-center justify-between mb-3 px-1">
            <label className="flex items-center cursor-pointer group">
                <div className="relative">
                    <input type="checkbox" className="sr-only" checked={useThinking} onChange={() => setUseThinking(!useThinking)} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${useThinking ? 'bg-purple-600' : 'bg-gray-600'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useThinking ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <div className="ml-3 text-xs font-bold text-gray-400 group-hover:text-white transition-colors">
                    Deep Reasoning {useThinking && <span className="text-purple-400">(Pro)</span>}
                </div>
            </label>
            <span className="text-[10px] text-gray-500 font-mono">
                {useThinking ? 'Gemini 3 Pro' : 'Gemini 2.5 Flash'}
            </span>
        </div>

        {/* Input */}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for roadmap, code refinement..."
            className="w-full bg-gray-900 text-white text-sm rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3 pr-10 resize-none h-24 scrollbar-thin scrollbar-thumb-gray-700"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute bottom-2 right-2 p-1.5 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
