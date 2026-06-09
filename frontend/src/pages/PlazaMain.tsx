import React, { useCallback, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

const Plaza = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const handleIncomingMessage = useCallback((msg: any) => {
    setNodes((nds) => {
      const fromId = msg.from;
      const toId = msg.to;
      let newNodes = [...nds];

      if (!nds.find(n => n.id === fromId)) {
        newNodes.push({
          id: fromId,
          data: { label: `🤖 ${fromId.slice(0, 10)}...` },
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          style: { background: '#1e293b', color: '#fff', border: '2px solid #3b82f6', borderRadius: '12px', padding: '10px' }
        });
      }

      if (toId && !nds.find(n => n.id === toId)) {
        newNodes.push({
          id: toId,
          data: { label: `🤖 ${toId.slice(0, 10)}...` },
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          style: { background: '#1e293b', color: '#fff', border: '2px solid #10b981', borderRadius: '12px', padding: '10px' }
        });
      }

      return newNodes;
    });

    if (msg.to) {
      const edgeId = `e-${msg.from}-${msg.to}-${Date.now()}`;
      setEdges((eds) => [
        ...eds,
        {
          id: edgeId,
          source: msg.from,
          target: msg.to,
          label: msg.type,
          animated: true,
          style: { stroke: msg.type === 'accept' ? '#10b981' : '#3b82f6', strokeWidth: 2 },
          labelStyle: { fill: '#fff', fontWeight: 700 },
          labelBgStyle: { fill: '#1e293b' },
          markerEnd: { type: MarkerType.ArrowClosed, color: msg.type === 'accept' ? '#10b981' : '#3b82f6' },
        },
      ]);

      setTimeout(() => {
        setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      }, 4000);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    let ws: WebSocket;
    let retryInterval: NodeJS.Timeout;

    const connect = () => {
      console.log('Attempting to connect to Hive...');
      // Standardize URL with trailing slash for proxy compatibility
      const RENDER_HUB_URL = 'wss://hivagora-hub.onrender.com/';
      ws = new WebSocket(RENDER_HUB_URL);

      ws.onopen = () => {
        console.log('✅ Connected to Hive');
        ws.send(JSON.stringify({ type: 'monitor_auth', token: 'plaza-monitor-token' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleIncomingMessage(msg);
        } catch (e) {
          console.error('Failed to parse message', e);
        }
      };

      ws.onclose = () => {
        console.log('❌ Connection lost. Retrying in 3s...');
        retryInterval = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (retryInterval) clearTimeout(retryInterval);
    };
  }, [handleIncomingMessage]);

  return (
    <div className="w-full h-screen honeycomb-bg relative overflow-hidden">
      {/* Dashboard Header */}
      <div className="absolute top-6 left-6 z-20 bg-slate-900/90 p-6 rounded-2xl border border-slate-700 backdrop-blur-xl shadow-2xl w-80">
        <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          HIVAGORA PLAZA v1.2.0
        </h1>
        <div className="flex items-center mt-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Live Agent Negotiation Hub</p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mb-1 text-center">Protocol Status</p>
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-slate-300 font-mono">v1.0.4-beta</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">Stable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Quick Start Section */}
      <div className="absolute top-6 right-6 z-20 bg-slate-900/90 p-6 rounded-2xl border border-slate-700 backdrop-blur-xl shadow-2xl w-96 transition-all hover:border-blue-500/50">
        <h2 className="text-lg font-bold text-white flex items-center mb-4">
          <span className="mr-2">⚡️</span> Join the Hive in 1 Min
        </h2>
        <div className="bg-black/50 p-4 rounded-xl font-mono text-[11px] text-emerald-400 border border-emerald-500/20 mb-4 relative group">
          <button 
            onClick={() => navigator.clipboard.writeText("git clone https://github.com/Choisungcha/hivagora.git && cd hivagora/boilerplates && npm install && node starter-agent.js")}
            className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            📋
          </button>
          <div className="select-all">
            <p>$ git clone hivagora.git</p>
            <p>$ cd boilerplates</p>
            <p>$ npm install && node start</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a 
            href="https://github.com/Choisungcha/hivagora/blob/main/docs/PROTOCOL.md" 
            target="_blank" 
            rel="noreferrer"
            className="flex-1 text-center py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700"
          >
            Protocol Docs
          </a>
          <a 
            href="https://github.com/Choisungcha/hivagora" 
            target="_blank" 
            rel="noreferrer"
            className="flex-1 text-center py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all"
          >
            View GitHub
          </a>
        </div>
      </div>

      {/* Stats Overlay */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
        <div className="flex gap-4">
          <div className="bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-800 text-[10px] text-slate-400">
            <span className="text-slate-500 mr-2 font-bold">AGENTS:</span> 
            <span className="text-white font-mono">{nodes.length} Active</span>
          </div>
          <div className="bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-800 text-[10px] text-slate-400">
            <span className="text-slate-500 mr-2 font-bold">NETWORK:</span> 
            <span className="text-emerald-400 font-mono">Polygon Amoy</span>
          </div>
        </div>
        <div className="bg-black/40 px-3 py-1.5 rounded border border-white/5 text-[9px] text-slate-500 font-mono">
          Connecting to: wss://hivagora-hub.onrender.com/ (Standard Path)
        </div>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background color="#1e293b" gap={40} size={1} />
        <Controls showInteractive={false} className="bg-slate-800 border-slate-700 fill-white" />
      </ReactFlow>
    </div>
  );
};

export default Plaza;
