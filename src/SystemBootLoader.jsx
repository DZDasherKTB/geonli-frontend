import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Eye, Target, Zap, CheckCircle } from 'lucide-react';
import './SystemBoot.css'; // Ensure you save the CSS above

const API_BASE_URL = "https://your-username--geonli-backend-flask-app-dev.modal.run"; 

const SystemBootLoader = ({ onReady }) => {
  const [status, setStatus] = useState({ message: "Connecting...", detail: "Handshake", step: 0 });
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/status`);
        const data = await res.json();
        
        setStatus(data);
        
        // Add to scrolling log
        if (logs[logs.length - 1] !== data.detail) {
            setLogs(prev => [...prev, `>> ${data.detail}... OK`].slice(-5));
        }

        if (data.ready) {
          clearInterval(interval);
          setTimeout(onReady, 1500); // Wait 1.5s to show "SUCCESS" before closing
        }
      } catch (e) {
        // If api fails, it might be starting up
        setStatus(prev => ({ ...prev, detail: "Waiting for server uplink..." }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [logs]);

  // Icons mapping
  const icons = [
    <Cpu size={64} className="text-blue-400 animate-bounce" />, // Init
    <Eye size={64} className="text-purple-500 animate-pulse" />, // VQA (Qwen)
    <Cpu size={64} className="text-green-400 animate-spin" />, // Parser
    <Target size={64} className="text-red-500 animate-ping" />, // Detector
    <Zap size={64} className="text-yellow-400 animate-bounce" />, // SAM
    <CheckCircle size={64} className="text-green-500 scale-150 transition-transform" /> // Done
  ];

  // Color mapping for "Fire" effect
  const colors = [
    "border-blue-500 shadow-blue-500/50",
    "border-purple-500 shadow-purple-500/50",
    "border-green-500 shadow-green-500/50",
    "border-red-500 shadow-red-500/50",
    "border-yellow-500 shadow-yellow-500/50",
    "border-green-500 shadow-green-500/50"
  ];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center font-mono text-green-500 overflow-hidden">
      {/* Background Matrix/Grid Effect */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 0, .3) 25%, rgba(0, 255, 0, .3) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .3) 75%, rgba(0, 255, 0, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 0, .3) 25%, rgba(0, 255, 0, .3) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .3) 75%, rgba(0, 255, 0, .3) 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}>
      </div>
      <div className="scanline"></div>

      {/* Main Loader Circle */}
      <div className={`relative w-64 h-64 rounded-full border-4 flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-500 ${colors[status.step] || colors[0]} ${status.ready ? '' : 'fire-ring'}`}>
        
        {/* Center Icon */}
        <div className="z-10">
          {icons[status.step] || icons[0]}
        </div>

        {/* Progress Ring */}
        <svg className="absolute inset-0 transform -rotate-90 w-full h-full">
          <circle
            cx="128" cy="128" r="120"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-gray-800"
          />
          <circle
            cx="128" cy="128" r="120"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 120}
            strokeDashoffset={2 * Math.PI * 120 * (1 - (status.step / 5))}
            className={`transition-all duration-1000 ease-out ${status.ready ? 'text-green-500' : 'text-white'}`}
          />
        </svg>
      </div>

      {/* Text Status */}
      <h1 className="mt-12 text-4xl font-bold tracking-widest uppercase glitch">
        {status.message}
      </h1>
      <p className="mt-2 text-xl text-gray-400 animate-pulse">
        [{status.detail}]
      </p>

      {/* Terminal Logs */}
      <div className="mt-8 w-96 bg-gray-900/80 p-4 rounded border border-green-900 font-mono text-xs text-green-400 h-32 overflow-hidden flex flex-col justify-end">
        {logs.map((log, i) => (
            <div key={i}>{log}</div>
        ))}
        <div className="animate-pulse">_</div>
      </div>
    </div>
  );
};

export default SystemBootLoader;