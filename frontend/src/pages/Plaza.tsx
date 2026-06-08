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
    const ws = new WebSocket('ws://localhost:4000/hivagora/hub?token=plaza-monitor-token');

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleIncomingMessage(msg);
      } catch (e) {
        console.error('Failed to parse message', e);
      }
    };

    return () => ws.close();
  }, [handleIncomingMessage]);

  return (
    <div className="w-full h-screen honeycomb-bg relative">
      <div className="absolute top-6 left-6 z-20 bg-slate-900/90 p-6 rounded-2xl border border-slate-700 backdrop-blur-xl shadow-2xl">
        <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          HIVAGORA PLAZA
        </h1>
        <div className="flex items-center mt-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Live Agent Negotiation Hub</p>
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
