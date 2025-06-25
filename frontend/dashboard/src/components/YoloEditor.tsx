import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import type { Connection, Edge } from 'reactflow';
import { Select, Space } from 'antd';
import { getYoloVersions } from '../services/api';
import type { YoloVersion } from '../models/yolo';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Input' } },
  { id: '2', position: { x: 0, y: 100 }, data: { label: 'Backbone' } },
  { id: '3', position: { x: 0, y: 200 }, data: { label: 'Neck' } },
  { id: '4', position: { x: 0, y: 300 }, data: { label: 'Head' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
  { id: 'e3-4', source: '3', target: '4' },
];

const YoloEditor = () => {
  const [versions, setVersions] = useState<YoloVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await getYoloVersions();
        setVersions(response.data);
      } catch (error) {
        console.error('Failed to fetch YOLO versions:', error);
      }
    };

    fetchVersions();
  }, []);

  const handleVersionChange = (value: string) => {
    setSelectedVersion(value);
    // TODO: Load the architecture for the selected version
    console.log('Selected version:', value);
  };
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Select
        placeholder="Select a base YOLO version to start editing"
        style={{ width: 400 }}
        onChange={handleVersionChange}
        value={selectedVersion}
        allowClear
      >
        {versions.map((version) => (
          <Select.Option key={version.id} value={String(version.id)}>
            {version.name}
          </Select.Option>
        ))}
      </Select>
      <div style={{ width: '100%', height: '75vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </Space>
  );
};

export default YoloEditor;
