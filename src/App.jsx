import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Moon, 
  Sun, 
  Send, 
  Image as ImageIcon, 
  Trash2, 
  Plus, 
  MoreVertical, 
  Bot, 
  User, 
  Edit2
} from 'lucide-react';

// --- CUSTOM COMPONENTS ---
import ImageCanvas from './ImageCanvas';
import SystemBootLoader from './SystemBootLoader';

// --- CONFIGURATION ---
// The Modal Backend URL (A100 GPU Cluster)
const API_BASE_URL = "https://teamisrogeonli39--geonli-backend-flask-app.modal.run"; 
const UPLOAD_ENDPOINT = `${API_BASE_URL}/api/upload`;
const CHAT_ENDPOINT = `${API_BASE_URL}/api/chat`;

const WELCOME_MESSAGE = { 
  id: 'welcome', 
  sender: 'bot', 
  text: 'Welcome to geoNLI.\n1. Drop a satellite image to initialize the system.\n2. Ask questions to locate objects or describe the scene.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

const App = () => {
  // --- STATE ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showLoader, setShowLoader] = useState(false); // Controls the "Boom Boom" Loader

  const [sessions, setSessions] = useState([
    { 
      id: 1, 
      title: 'New Session', 
      messages: [WELCOME_MESSAGE],
      image: null,
      serverImageUrl: null,
      imageId: null
    }
  ]);
  
  const [currentSessionId, setCurrentSessionId] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [tempTitle, setTempTitle] = useState("");
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const renameInputRef = useRef(null);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  // Helper: Extract latest grounding boxes for the canvas
  // Looks at the most recent bot message that has data
  const latestGrounding = [...(currentSession.messages || [])]
    .reverse()
    .find(m => m.grounding && m.grounding.length > 0)
    ?.grounding || [];

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession.messages]);

  // Handle clicking outside menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (renameInputRef.current && renameInputRef.current.contains(e.target)) return;
      setActiveMenuId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // --- FILE UPLOAD HANDLER ---
  const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // 1. Immediate UI Update
      const localPreviewUrl = URL.createObjectURL(file);
      
      // 2. TRIGGER LOADER (Wakes up the backend)
      setShowLoader(true);

      const formData = new FormData();
      formData.append('file', file);

      try {
        // 3. Send to Backend
        const response = await fetch(UPLOAD_ENDPOINT, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();

        // 4. Update Session State
        setSessions(prevSessions => prevSessions.map(session => {
          if (session.id === currentSessionId) {
            const newTitle = session.title === 'New Session' ? file.name : session.title;
            return {
              ...session,
              title: newTitle,
              image: localPreviewUrl,
              serverImageUrl: `${API_BASE_URL}${data.url}`, // Store cloud path
              imageId: data.file_id,
              messages: [
                ...session.messages,
                {
                  id: Date.now(),
                  sender: 'bot',
                  text: `Image "${file.name}" uploaded. System Online & Ready.`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]
            };
          }
          return session;
        }));

        // NOTE: We do NOT set showLoader(false) here.
        // The SystemBootLoader component will poll /api/status and 
        // close itself only when the models are fully loaded.

      } catch (error) {
        console.error("Upload Error:", error);
        alert("Failed to upload image. Ensure backend is running.");
        setShowLoader(false); // Hide loader on failure
      }
  };

  // --- CHAT HANDLER ---
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // 1. Add User Message
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...s, messages: [...s.messages, userMessage] } : s
    ));

    const currentQueryText = inputText;
    setInputText('');
    setIsAnalyzing(true);

    try {
      const activeSession = sessions.find(s => s.id === currentSessionId);
      if (!activeSession || !activeSession.serverImageUrl) {
        throw new Error("Please upload a satellite image first.");
      }

      // 2. Send to Smart Agent
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentQueryText,
          image_url: activeSession.serverImageUrl,
          session_id: activeSession.id
        })
      });

      if (!response.ok) throw new Error("Backend processing failed");

      const result = await response.json();

      // 3. Handle Bot Response
      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: result.reply || "No response text generated.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        grounding: result.grounding // Boxes for ImageCanvas
      };

      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: [...s.messages, botMessage] } : s
      ));

    } catch (error) {
      console.error("Chat Error:", error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: `Error: ${error.message}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: [...s.messages, errorMessage] } : s
      ));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- SESSION MANAGEMENT HELPERS ---
  const createNewSession = () => {
    const newId = Date.now();
    setSessions(prev => [{
      id: newId, title: 'New Session', messages: [WELCOME_MESSAGE], image: null
    }, ...prev]);
    setCurrentSessionId(newId);
  };

  const startRenaming = (e, session) => {
    e.stopPropagation(); setEditingSessionId(session.id); setTempTitle(session.title); setActiveMenuId(null);
  };

  const saveRename = () => {
    if (editingSessionId && tempTitle.trim()) {
      setSessions(prev => prev.map(s => s.id === editingSessionId ? { ...s, title: tempTitle.trim() } : s));
    }
    setEditingSessionId(null);
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') saveRename();
    else if (e.key === 'Escape') setEditingSessionId(null);
  };

  const deleteSession = (e, idToDelete) => {
    e.stopPropagation(); 
    if (sessions.length <= 1) { setActiveMenuId(null); return; }
    const updatedSessions = sessions.filter(s => s.id !== idToDelete);
    setSessions(updatedSessions);
    if (idToDelete === currentSessionId) setCurrentSessionId(updatedSessions[0].id);
    setActiveMenuId(null);
  };

  const toggleMenu = (e, sessionId) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === sessionId ? null : sessionId);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`h-screen w-full flex flex-col ${isDarkMode ? 'bg-[#0f111a] text-gray-100' : 'bg-gray-50 text-gray-900'} font-sans transition-colors duration-500 overflow-hidden`}>
      
      {/* BOOTLOADER (Visible only during upload/startup) */}
      {showLoader && (
        <SystemBootLoader onReady={() => setShowLoader(false)} />
      )}

      {/* HEADER */}
      <header className={`h-16 border-b flex items-center justify-between px-6 transition-colors duration-500 ${isDarkMode ? 'bg-[#151924] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 px-3 py-1 rounded text-white font-bold tracking-wider text-sm shadow-lg">geoNLI</div>
          <div>
            <h1 className="font-semibold text-lg">geoNLI Image Chat</h1>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Describe and reason about satellite imagery.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
            <span className="text-xs font-medium mr-2">Theme</span>
            <button onClick={() => setIsDarkMode(false)} className={`p-1 rounded-full ${!isDarkMode ? 'bg-white text-yellow-500 shadow-sm' : 'text-gray-500'}`}><Sun size={14} /></button>
            <button onClick={() => setIsDarkMode(true)} className={`p-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-indigo-400 shadow-sm' : 'text-gray-500'}`}><Moon size={14} /></button>
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: SESSIONS */}
        <div className={`w-72 flex flex-col border-r ${isDarkMode ? 'bg-[#11141d] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
          <div className="p-4 border-b border-opacity-10 border-gray-500 flex justify-between items-center">
            <h2 className="font-semibold text-sm">Sessions</h2>
            <button onClick={createNewSession} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1 shadow-md">
              <Plus size={14} /> New
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-2">
            {sessions.map(session => (
              <div 
                key={session.id}
                onClick={() => setCurrentSessionId(session.id)}
                className={`p-3 rounded-lg cursor-pointer text-sm group relative border ${
                  session.id === currentSessionId 
                    ? (isDarkMode ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-white border-indigo-200 shadow-sm') 
                    : 'border-transparent hover:bg-gray-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="overflow-hidden w-full relative">
                    {editingSessionId === session.id ? (
                      <input 
                        ref={renameInputRef}
                        type="text" 
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onBlur={saveRename}
                        onKeyDown={handleRenameKeyDown}
                        className="w-full bg-transparent border-b outline-none text-sm font-medium"
                      />
                    ) : (
                      <>
                        <div className="font-medium truncate pr-6">{session.title}</div>
                        <div className="text-xs mt-1 truncate text-gray-500">{session.id === currentSessionId ? 'Active' : 'History'}</div>
                      </>
                    )}
                  </div>
                  {!editingSessionId && (
                    <button onClick={(e) => toggleMenu(e, session.id)} className={`absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-100 ${activeMenuId === session.id ? 'opacity-100' : ''}`}><MoreVertical size={14} /></button>
                  )}
                  {activeMenuId === session.id && (
                    <div className={`absolute right-0 top-8 z-50 w-32 rounded-md shadow-xl border py-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <button onClick={(e) => startRenaming(e, session)} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-indigo-500/10"><Edit2 size={12} /> Rename</button>
                      {sessions.length > 1 && <button onClick={(e) => deleteSession(e, session.id)} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-500/10 text-red-500"><Trash2 size={12} /> Delete</button>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MIDDLE: IMAGE PLAY AREA */}
        <div className={`flex-1 p-6 flex flex-col items-center justify-center relative ${isDarkMode ? 'bg-[#0b0d12]' : 'bg-gray-100'}`}>
          <div className="p-6 h-full flex flex-col justify-center items-center w-full">
            {currentSession.image ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black/20 rounded-xl overflow-hidden border border-gray-700/50 backdrop-blur-sm p-2">
                
                {/* === INTELLIGENT CANVAS === */}
                <ImageCanvas 
                  imageUrl={currentSession.image} 
                  groundingData={latestGrounding} 
                />
                
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/60 p-1.5 rounded-lg backdrop-blur-md border border-white/10">
                  <button onClick={() => setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, image: null } : s))} className="px-3 py-1.5 hover:bg-white/20 rounded text-white text-xs">Remove</button>
                  <button onClick={() => document.getElementById('image-upload').click()} className="px-3 py-1.5 hover:bg-white/20 rounded text-white text-xs">Change</button>
                </div>
              </div>
            ) : (
              // Empty State
              <div 
                className={`w-full max-w-lg aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center ${isDarkMode ? 'border-gray-800' : 'border-gray-300'}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if(e.dataTransfer.files[0]) handleFileUpload({ target: { files: e.dataTransfer.files } });
                }}
              >
                <ImageIcon size={32} className="text-indigo-500 mb-4" />
                <h3 className="font-semibold mb-2">Image play area</h3>
                <p className="text-gray-500 mb-6 max-w-xs mx-auto">Upload a satellite image to initialize the system.</p>
                <button onClick={() => fileInputRef.current.click()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium mt-2 shadow-lg shadow-indigo-500/20">Choose file</button>
              </div>
            )}
            <input type="file" ref={fileInputRef} id="image-upload" className="hidden" accept="image/*" onChange={handleFileUpload} />
          </div>
        </div>

        {/* RIGHT: CHAT */}
        <div className={`w-96 flex flex-col border-l ${isDarkMode ? 'bg-[#11141d] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {currentSession.messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                  {msg.sender === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                </div>
                <div className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-line ${
                    msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : (isDarkMode ? 'bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700' : 'bg-white text-gray-800 rounded-tl-sm border border-gray-200')
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] mt-1 px-1 text-gray-500">{msg.timestamp}</span>
                </div>
              </div>
            ))}
            {isAnalyzing && (
               <div className="flex gap-3">
                 <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"><Bot size={14} className="text-white" /></div>
                 <div className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                   <span className="animate-pulse">Analyzing...</span>
                 </div>
               </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-800 bg-[#151924]' : 'border-gray-200 bg-gray-50'}`}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}>
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about objects, counts, or descriptions..."
                className={`flex-1 bg-transparent outline-none text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}
              />
              <button onClick={handleSendMessage} disabled={!inputText.trim()} className={`p-1.5 rounded-md ${inputText.trim() ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;