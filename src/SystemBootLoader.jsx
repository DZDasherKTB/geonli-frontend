import React, { useState, useEffect } from 'react';
import { Server, Cpu, Database, Eye, CheckCircle, Terminal, Layers, Activity } from 'lucide-react';

const API_BASE_URL = "https://teamisrogeonli39--geonli-backend-flask-app.modal.run"; 

const SystemBootLoader = ({ onReady }) => {
  const [status, setStatus] = useState({ 
    message: "Establishing Uplink...", 
    detail: "Connecting to A100 Cluster...", 
    step: 0,
    total_steps: 5,
    ready: false
  });
  const [logs, setLogs] = useState(["> Handshake initiated..."]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/status`);
        const data = await res.json();
        
        setStatus(data);
        
        // Add log entry if detail changed
        if (logs[logs.length - 1] !== `> ${data.detail}`) {
            setLogs(prev => [...prev.slice(-6), `> ${data.detail}`]);
        }

        if (data.ready) {
          clearInterval(interval);
          // Wait 1.5s to show "Success" state before unmounting
          setTimeout(onReady, 1500); 
        }
      } catch (e) {
        // If server is cold, it might fail initially. Keep retrying.
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [logs]);

  // Step Icons
  const icons = [
    <Activity size={40} className="text-gray-400 animate-pulse" />, // 0
    <Terminal size={40} className="text-blue-400 animate-pulse" />, // 1 Parser
    <Cpu size={40} className="text-red-400 animate-pulse" />,       // 2 Detector
    <Layers size={40} className="text-yellow-400 animate-pulse" />, // 3 Segmenter
    <Eye size={40} className="text-purple-400 animate-pulse" />,    // 4 VQA
    <CheckCircle size={40} className="text-green-500" />            // 5 Done
  ];

  const percent = Math.min(100, Math.max(5, (status.step / 5) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f111a]/80 backdrop-blur-md transition-opacity duration-500">
      
      {/* Glass Card */}
      <div className="relative w-[500px] bg-[#151924] border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="h-10 bg-[#1a1f2e] border-b border-gray-700 flex items-center px-4 justify-between">
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
          </div>
          <span className="text-[10px] font-mono text-indigo-400 animate-pulse">
            {status.ready ? "SYSTEM ONLINE" : "INITIALIZING..."}
          </span>
        </div>

        {/* Body */}
        <div className="p-8 flex flex-col items-center">
          
          {/* Icon Circle */}
          <div className="relative w-20 h-20 flex items-center justify-center mb-6">
             {/* Spinner Ring */}
             <div className={`absolute inset-0 border-2 border-indigo-500/30 rounded-full ${!status.ready && 'animate-[spin_3s_linear_infinite]'}`}></div>
             <div className={`absolute inset-1 border-2 border-t-indigo-500 border-r-transparent border-b-indigo-500 border-l-transparent rounded-full ${!status.ready && 'animate-[spin_1.5s_linear_infinite]'}`}></div>
             
             <div className="z-10">
                {status.ready ? icons[5] : icons[status.step] || icons[0]}
             </div>
          </div>

          <h2 className="text-lg font-semibold text-white tracking-wide mb-1">
            {status.message}
          </h2>
          <p className="text-xs text-gray-400 mb-6 font-mono h-4">
            {status.detail}
          </p>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1] transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            ></div>
          </div>

          {/* Terminal Logs */}
          <div className="w-full bg-black/40 rounded border border-gray-800 p-3 font-mono text-[10px] text-gray-400 h-24 overflow-hidden flex flex-col justify-end">
            {logs.map((log, i) => (
              <div key={i} className="truncate">
                <span className="text-indigo-500 mr-1">➜</span> {log.replace('> ', '')}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default SystemBootLoader;