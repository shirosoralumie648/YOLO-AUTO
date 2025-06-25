import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import type { Connection, Edge, Node } from 'reactflow';
import { Select, Button, Space, message } from 'antd';
import yaml from 'js-yaml';
import { getYoloVersions, updateYoloVersion } from '../services/api';
import type { YoloVersion } from '../models/yolo';

import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  { id: 'placeholder-input', position: { x: 250, y: 5 }, data: { label: 'Select a YOLO version to see its architecture' } },
];

const parseYamlToFlow = (yamlContent: string): { nodes: Node[]; edges: Edge[] } | null => {
  try {
    const doc = yaml.load(yamlContent) as any;
    if (!doc || (!doc.backbone && !doc.head)) {
      message.error('Invalid YAML: Missing backbone or head section.');
      return null;
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let yPos = 0;
    const nodeHeight = 60;

    const moduleMap: { [key: number]: string } = {};

    // Process backbone
    doc.backbone.forEach((module: any[], index: number) => {
      const nodeId = `backbone-${index}`;
      moduleMap[index] = nodeId;
      const [, , moduleName, args] = module;
      const label = `${index}: ${moduleName} ${JSON.stringify(args)}`;
      nodes.push({ id: nodeId, position: { x: 150, y: yPos }, data: { label } });
      yPos += nodeHeight;
    });

    // Process head, starting after backbone
    const headStartIndex = doc.backbone.length;
    doc.head.forEach((module: any[], index: number) => {
      const absoluteIndex = headStartIndex + index;
      const nodeId = `head-${index}`;
      moduleMap[absoluteIndex] = nodeId;
      const [, , moduleName, args] = module;
      const label = `${absoluteIndex}: ${moduleName} ${JSON.stringify(args)}`;
      nodes.push({ id: nodeId, position: { x: 450, y: index * nodeHeight }, data: { label } });
    });

    // Create edges
    const allModules = [...doc.backbone, ...doc.head];
    allModules.forEach((module: any[], index: number) => {
      const targetNodeId = moduleMap[index];
      let fromIndices = module[0];
      if (!Array.isArray(fromIndices)) {
        fromIndices = [fromIndices];
      }

      fromIndices.forEach((fromIndex: number) => {
        const sourceIndex = fromIndex === -1 ? index - 1 : fromIndex;
        const sourceNodeId = moduleMap[sourceIndex];
        if (sourceNodeId && targetNodeId) {
          edges.push({
            id: `e-${sourceNodeId}-${targetNodeId}-${Math.random()}`,
            source: sourceNodeId,
            target: targetNodeId,
            animated: true,
          });
        }
      });
    });

    return { nodes, edges };
  } catch (e) {
    message.error('Failed to parse YAML content.');
    console.error(e);
    return null;
  }
};

const flowToYaml = (nodes: Node[], edges: Edge[], originalDoc: any): string | null => {
  try {
    const backbone = nodes
      .filter(n => n.id.startsWith('backbone-'))
      .sort((a, b) => a.position.y - b.position.y);

    const head = nodes
      .filter(n => n.id.startsWith('head-'))
      .sort((a, b) => a.position.y - b.position.y);

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const parseNodeLabel = (label: string): [string, any[]] => {
      const match = label.match(/^\d+: (\w+)(.*)$/);
      if (!match) return ['Unknown', []];
      const moduleName = match[1];
      const args = JSON.parse(match[2].trim());
      return [moduleName, args];
    };

    const getFromIndex = (sourceId: string): number => {
        const match = sourceId.match(/^(backbone|head)-(\d+)$/);
        if (!match) return -1;
        const type = match[1];
        const index = parseInt(match[2], 10);
        return type === 'backbone' ? index : backbone.length + index;
    }

    const buildModule = (node: Node) => {
      const incomingEdges = edges.filter(e => e.target === node.id);
      const fromIndices = incomingEdges.map(e => getFromIndex(e.source));
      const from = fromIndices.length === 1 ? fromIndices[0] : fromIndices.sort((a, b) => a - b);

      const [moduleName, args] = parseNodeLabel(node.data.label);
      const number = 1; // Assuming number is always 1 for simplicity, this can be enhanced

      return [from, number, moduleName, args];
    };

    const newBackbone = backbone.map(buildModule);
    const newHead = head.map(buildModule);

    const newDoc = {
      ...originalDoc,
      backbone: newBackbone,
      head: newHead,
    };

    return yaml.dump(newDoc);
  } catch (error) {
    console.error('Failed to convert flow to YAML:', error);
    message.error('Error converting architecture to YAML.');
    return null;
  }
};

const YoloEditor = () => {
  const [versions, setVersions] = useState<YoloVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [originalDoc, setOriginalDoc] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await getYoloVersions();
        setVersions(response.data);
      } catch (error) {
        message.error('Failed to fetch YOLO versions.');
      }
    };
    fetchVersions();
  }, []);

  const handleVersionChange = (value: number | null) => {
    setSelectedVersionId(value);
    if (value === null) {
      setNodes(initialNodes);
      setEdges([]);
      return;
    }

    const version = versions.find((v) => v.id === value);
    if (version && version.architecture) {
      try {
        const doc = yaml.load(version.architecture) as any;
        setOriginalDoc(doc);
        const flow = parseYamlToFlow(version.architecture);
        if (flow) {
          setNodes(flow.nodes);
          setEdges(flow.edges);
        }
      } catch (e) {
        message.error('Failed to parse YAML for the selected version.');
        setNodes(initialNodes);
        setEdges([]);
        setOriginalDoc(null);
      }
    } else {
      setNodes(initialNodes);
      setEdges([]);
      setOriginalDoc(null);
    }
  };

  const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const handleSave = async () => {
    if (selectedVersionId === null) {
      message.error('Please select a version first.');
      return;
    }
    if (!originalDoc) {
      message.error('No architecture loaded to save.');
      return;
    }

    const newYaml = flowToYaml(nodes, edges, originalDoc);
    const versionToUpdate = versions.find(v => v.id === selectedVersionId);

    if (newYaml && versionToUpdate) {
      try {
        await updateYoloVersion(selectedVersionId, { ...versionToUpdate, architecture: newYaml });
        message.success('Architecture saved successfully!');
      } catch (error) {
        message.error('Failed to save architecture.');
      }
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space>
        <Select<number | null>
          placeholder="Select a base YOLO version to start editing"
          style={{ width: 400 }}
          onChange={handleVersionChange}
          value={selectedVersionId}
          allowClear
        >
          {versions.map((version) => (
            <Select.Option key={version.id} value={version.id}>
              {version.name}
            </Select.Option>
          ))}
        </Select>
        <Button type="primary" onClick={handleSave} disabled={!selectedVersionId}>
          Save Architecture
        </Button>
      </Space>
      <div style={{ width: '100%', height: '75vh', border: '1px solid #eee' }}>
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

