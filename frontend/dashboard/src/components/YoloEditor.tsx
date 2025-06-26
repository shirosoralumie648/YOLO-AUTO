import { useState, useEffect, useRef, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
} from 'reactflow';
import type { Connection, Edge, Node } from 'reactflow';
import { Select, Button, Space, message, Input } from 'antd';
import yaml from 'js-yaml';
import { getYoloVersions, updateYoloVersion } from '../services/api';
import type { YoloVersion } from '../models/yolo';

import 'reactflow/dist/style.css';
import './YoloEditor.css';

// --- 1. Core Data Structures & Constants ---
interface NodeData {
  label: string;
  type?: string;
  args?: any[];
}

interface YoloArchitecture {
  nc: number;
  depth_multiple: number;
  width_multiple: number;
  backbone: [number | number[], number, string, any[]][];
  head: [number | number[], number, string, any[]][];
}

const yoloModules = [
  { type: 'Conv' },
  { type: 'C3' },
  { type: 'SPPF' },
  { type: 'Concat' },
  { type: 'Detect' },
];

const initialNodes: Node<NodeData>[] = [];

// --- 2. YAML Parsing & Conversion Logic ---
// --- Helper Functions ---
const formatNodeLabel = (type: string, args: any[]): string => {
  if (!Array.isArray(args) || args.length === 0) {
    return type;
  }
  const filteredArgs = args.filter(arg => arg !== null && arg !== undefined);
  return `${type}(${filteredArgs.join(', ')})`;
};

// --- YAML Parsing and Layout Logic (Layout v4) ---
const parseYoloYaml = (yamlContent: string | undefined): { nodes: Node<NodeData>[], edges: Edge[], doc: YoloArchitecture | null } => {
  if (!yamlContent) return { nodes: [], edges: [], doc: null };

  try {
    const doc = yaml.load(yamlContent) as YoloArchitecture;
    if (!doc || !doc.backbone || !doc.head) {
      message.error('Invalid YOLO YAML structure: missing backbone or head.');
      return { nodes: [], edges: [], doc: null };
    }

    const nodes: Node<NodeData>[] = [];
    const edges: Edge[] = [];
    const moduleMap: { [key: number]: string } = {};

    // --- Partitioning and Node Creation ---
    const detectIndex = doc.head.findIndex(m => m[2] === 'Detect');
    const neckModules = detectIndex === -1 ? doc.head : doc.head.slice(0, detectIndex);
    const headModules = detectIndex === -1 ? [] : doc.head.slice(detectIndex);

    const createNodesForSection = (modules: any[], group: 'backbone' | 'neck' | 'head', offset: number) => {
      modules.forEach((module, index) => {
        const globalIndex = index + offset;
        const nodeId = `${group}-${index}`;
        const [, , type, args] = module;
        moduleMap[globalIndex] = nodeId;
        nodes.push({
          id: nodeId,
          type: 'default',
          position: { x: 0, y: 0 }, // Placeholder
          data: { label: formatNodeLabel(type, args), type, args },
          parentNode: `${group}-group`,
          extent: 'parent',
          style: { width: 'auto', minWidth: 180, height: 'auto', minHeight: 40, padding: '10px' },
        });
      });
    };

    nodes.push({ id: 'backbone-group', type: 'group', position: { x: 0, y: 0 }, data: { label: 'Backbone' }, style: { backgroundColor: 'rgba(255, 240, 240, 0.7)' } });
    createNodesForSection(doc.backbone, 'backbone', 0);

    nodes.push({ id: 'neck-group', type: 'group', position: { x: 450, y: 0 }, data: { label: 'Neck' }, style: { backgroundColor: 'rgba(240, 255, 240, 0.7)' } });
    createNodesForSection(neckModules, 'neck', doc.backbone.length);

    nodes.push({ id: 'head-group', type: 'group', position: { x: 1200, y: 0 }, data: { label: 'Head' }, style: { backgroundColor: 'rgba(240, 240, 255, 0.7)' } });
    createNodesForSection(headModules, 'head', doc.backbone.length + neckModules.length);

    // --- Edge Creation ---
    const allModules = [...doc.backbone, ...neckModules, ...headModules];
    allModules.forEach((module, globalIndex) => {
      const targetNodeId = moduleMap[globalIndex];
      let fromIndices = module[0];
      if (!Array.isArray(fromIndices)) fromIndices = [fromIndices];
      fromIndices.forEach((fromIndex: number) => {
        if (fromIndex > -1) {
          const sourceNodeId = moduleMap[fromIndex];
          if (sourceNodeId && targetNodeId) {
            edges.push({ id: `e-${sourceNodeId}-${targetNodeId}-${globalIndex}`, source: sourceNodeId, target: targetNodeId, markerEnd: { type: MarkerType.ArrowClosed } });
          }
        }
      });
    });

    // --- Positioning (Layout v5) ---
    const nodePositions: { [id: string]: { x: number, y: number } } = {};
    let yBackbone = 80;
    doc.backbone.forEach((_, index) => {
      nodePositions[`backbone-${index}`] = { x: 150, y: yBackbone };
      yBackbone += 90;
    });

    const neckNodeIds = neckModules.map((_, i) => `neck-${i}`);
    const nodeLevels: { [id: string]: number } = {};
    const calculateNodeLevel = (nodeId: string, path: Set<string> = new Set()): number => {
      if (path.has(nodeId)) return 0;
      if (nodeLevels[nodeId] !== undefined) return nodeLevels[nodeId];
      path.add(nodeId);

      const moduleIndexInNeck = parseInt(nodeId.split('-')[1]);
      const module = neckModules[moduleIndexInNeck];
      let fromIndices = module[0];
      if (!Array.isArray(fromIndices)) fromIndices = [fromIndices];

      let maxParentLevel = -1;
      for (const fromIndex of fromIndices) {
        if (fromIndex === -1) continue;
        const sourceNodeId = moduleMap[fromIndex];
        if (!sourceNodeId) continue;

        let parentLevel = -1;
        if (sourceNodeId.startsWith('backbone-')) {
          parentLevel = 0;
        } else if (sourceNodeId.startsWith('neck-')) {
          parentLevel = calculateNodeLevel(sourceNodeId, path);
        }
        maxParentLevel = Math.max(maxParentLevel, parentLevel);
      }
      path.delete(nodeId);
      return nodeLevels[nodeId] = maxParentLevel + 1;
    };
    neckNodeIds.forEach(id => calculateNodeLevel(id));

    const levels: { [level: number]: string[] } = {};
    neckNodeIds.forEach(id => {
      const level = nodeLevels[id] || 0;
      if (!levels[level]) levels[level] = [];
      levels[level].push(id);
    });

    const getMinFromIndex = (nodeId: string): number => {
        const moduleIndex = parseInt(nodeId.split('-')[1]);
        const module = neckModules[moduleIndex];
        let fromIndices = module[0];
        if (!Array.isArray(fromIndices)) fromIndices = [fromIndices];
        const validIndices = fromIndices.filter(i => i !== -1);
        return validIndices.length > 0 ? Math.min(...validIndices) : -1;
    };

    Object.values(levels).forEach(nodesOnLevel => {
        nodesOnLevel.sort((a, b) => getMinFromIndex(a) - getMinFromIndex(b));
    });

    Object.keys(levels).forEach(levelStr => {
      const level = parseInt(levelStr);
      const nodesOnLevel = levels[level];
      nodesOnLevel.forEach((nodeId, lane) => {
        nodePositions[nodeId] = { x: level * 280 + 150, y: lane * 100 + 80 };
      });
    });

    let yHead = 80;
    headModules.forEach((_, index) => {
      nodePositions[`head-${index}`] = { x: 150, y: yHead };
      yHead += 100;
    });

    nodes.forEach(node => { if (nodePositions[node.id]) node.position = nodePositions[node.id]; });

    // --- Dynamic Group Sizing ---
    ['backbone', 'neck', 'head'].forEach(group => {
      const groupNode = nodes.find(n => n.id === `${group}-group`);
      if (!groupNode) return;
      const childNodes = nodes.filter(n => n.parentNode === groupNode.id);
      if (childNodes.length === 0) {
        groupNode.style = { ...groupNode.style, display: 'none' };
        return;
      }
      const padding = 60;
      const minX = Math.min(...childNodes.map(n => n.position.x));
      const maxX = Math.max(...childNodes.map(n => n.position.x + (n.style?.minWidth as number || 180)));
      const minY = Math.min(...childNodes.map(n => n.position.y));
      const maxY = Math.max(...childNodes.map(n => n.position.y + (n.style?.minHeight as number || 40)));
      groupNode.style = { ...groupNode.style, width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 };
      childNodes.forEach(n => { n.position = { x: n.position.x - minX + padding, y: n.position.y - minY + padding } });
    });

    return { nodes, edges, doc };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    message.error(`Failed to parse YAML: ${errorMessage}`);
    return { nodes: [], edges: [], doc: null };
  }
};

const convertToYaml = (
  nodes: Node<NodeData>[],
  edges: Edge[],
  originalDoc: YoloArchitecture | null
): string => {
  if (!originalDoc) return '';

  const newDoc = JSON.parse(JSON.stringify(originalDoc)) as YoloArchitecture;

  // 1. Separate nodes into groups and sort them topologically/positionally
  const backboneNodes = nodes.filter(n => n.parentNode === 'backbone-group').sort((a, b) => a.position.y - b.position.y);
  const neckNodes = nodes.filter(n => n.parentNode === 'neck-group').sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
  const headNodes = nodes.filter(n => n.parentNode === 'head-group').sort((a, b) => a.position.y - b.position.y);

  // 2. Create the global index map based on the sorted order
  const nodeIdToIndexMap: { [id: string]: number } = {};
  let currentIndex = 0;
  backboneNodes.forEach(n => { nodeIdToIndexMap[n.id] = currentIndex++; });
  neckNodes.forEach(n => { nodeIdToIndexMap[n.id] = currentIndex++; });
  headNodes.forEach(n => { nodeIdToIndexMap[n.id] = currentIndex++; });

  // 3. Rebuild module lists using the global index map
  const buildModuleList = (sectionNodes: Node<NodeData>[]): [number | number[], number, string, any[]][] => {
    return sectionNodes.map((node): [number | number[], number, string, any[]] => {
      const sourceIndices = edges
        .filter(e => e.target === node.id)
        .map(e => nodeIdToIndexMap[e.source])
        .filter((i): i is number => i !== undefined);

      sourceIndices.sort((a, b) => a - b); // Ensure consistent order for multi-input modules

      const from = sourceIndices.length === 1 ? sourceIndices[0] : (sourceIndices.length === 0 ? -1 : sourceIndices);
      const { type = 'Conv', args = [] } = node.data;
      // The 'number' field (e.g., repetition count) is preserved from the original doc for now.
      // A more advanced editor would allow changing this.
      const originalModule = [...originalDoc.backbone, ...originalDoc.head].find(m => m[2] === type && JSON.stringify(m[3]) === JSON.stringify(args));
      const moduleNumber = originalModule ? originalModule[1] : 1;

      return [from, moduleNumber, type, args];
    });
  };

  const backboneModules = buildModuleList(backboneNodes);
  const neckModules = buildModuleList(neckNodes);
  const headModules = buildModuleList(headNodes);

  // 4. Assemble the final doc structure
  newDoc.backbone = backboneModules;
  newDoc.head = [...neckModules, ...headModules];

  // 5. Serialize to YAML
  return yaml.dump(newDoc, { indent: 2, noArrayIndent: true });
};

// --- 3. Main YoloEditor Component ---
const YoloEditor = () => {
  const [versions, setVersions] = useState<YoloVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [originalDoc, setOriginalDoc] = useState<YoloArchitecture | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const { setViewport } = useReactFlow();

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await getYoloVersions();
        setVersions(response.data);
      } catch (error) { message.error('Failed to fetch YOLO versions.'); }
    };
    fetchVersions();
  }, []);

  const handleVersionChange = (versionId: number) => {
    setSelectedVersionId(versionId);
    const version = versions.find((v) => v.id === versionId);
    if (version) {
      const { nodes: newNodes, edges: newEdges, doc } = parseYoloYaml(version.architecture);
      setNodes(newNodes);
      setEdges(newEdges);
      setOriginalDoc(doc);
      // Reset viewport to fit new nodes
      setTimeout(() => setViewport({ x: 0, y: 0, zoom: 1 }), 100);
    } else {
      setNodes([]);
      setEdges([]);
      setOriginalDoc(null);
    }
  };

  const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const onNodeDataChange = (nodeId: string, newData: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const data = { ...node.data, ...newData };
          return { ...node, data };
        }
        return node;
      })
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, ...newData } } : null);
  };

  const handleSave = async () => {
    if (selectedVersionId === null) return message.error('Please select a version first.');
    const version = versions.find((v) => v.id === selectedVersionId);
    if (!version) return message.error('Selected version not found.');

    const yamlString = convertToYaml(nodes, edges, originalDoc);
    try {
      await updateYoloVersion(selectedVersionId, { ...version, architecture: yamlString });
      message.success('Architecture saved successfully!');
    } catch (error) { message.error('Failed to save architecture.'); }
  };

  return (
    <div className="yolo-editor-layout">
      <aside className="editor-sidebar">
        <div className="module-palette">
          <h3>Module Palette</h3>
          {yoloModules.map((module) => (
            <div key={module.type} className="dndnode" draggable>
              {module.type}
            </div>
          ))}
        </div>
        <div className="parameter-editor">
          {selectedNode ? (
            <>
              <h3>Edit: {selectedNode.data.type}</h3>
              <label>Label:</label>
              <Input
                value={selectedNode.data.label}
                onChange={(e) => onNodeDataChange(selectedNode.id, { label: e.target.value })}
              />
              {/* More parameter inputs will go here */}
            </>
          ) : (
            <div className="description">Select a node to edit its parameters.</div>
          )}
        </div>
      </aside>
      <div className="editor-main">
        <div className="editor-toolbar">
          <Space>
            <Select
              placeholder="Select a YOLO version to edit"
              style={{ width: 240 }}
              onChange={handleVersionChange}
              value={selectedVersionId}
            >
              {versions.map((v) => (
                <Select.Option key={v.id} value={v.id}>{v.name}</Select.Option>
              ))}
            </Select>
            <Button onClick={handleSave} type="primary" disabled={!selectedVersionId}>
              Save Architecture
            </Button>
          </Space>
        </div>
        <div className="reactflow-wrapper" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              fitView
            >
              <Controls />
              <MiniMap />
              <Background />
            </ReactFlow>
        </div>
      </div>
    </div>
  );
};

// --- 4. Wrapper Component with ReactFlowProvider ---
const YoloEditorWrapper = () => (
  <ReactFlowProvider>
    <YoloEditor />
  </ReactFlowProvider>
);

export default YoloEditorWrapper;
