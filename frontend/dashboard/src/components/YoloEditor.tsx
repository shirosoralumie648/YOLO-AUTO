import { useState, useEffect, useRef, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
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
  description?: string; // 节点详细描述信息
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

// 节点样式函数 - 根据模块类型获取合适的样式
const getNodeStyle = (moduleType: string) => {
  const baseStyle = {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    color: '#333',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  };
  
  switch(moduleType) {
    case 'Conv':
      return { ...baseStyle, backgroundColor: '#f0f5ff', borderColor: '#adc6ff' };
    case 'C3':
      return { ...baseStyle, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' };
    case 'SPPF':
      return { ...baseStyle, backgroundColor: '#e6f7ff', borderColor: '#91d5ff' };
    case 'Concat':
      return { ...baseStyle, backgroundColor: '#f9f0ff', borderColor: '#d3adf7' };
    case 'Detect':
      return { ...baseStyle, backgroundColor: '#fff7e6', borderColor: '#ffd591' };
    default:
      return baseStyle;
  }
};

// 获取模块描述信息的辅助函数
const getModuleDescription = (type: string, args: any[]): string => {
  switch (type) {
    case 'Conv':
      return `Convolutional Layer: ${args[0]} filters, kernel size ${args[1]}, stride ${args[2]}.`;
    case 'C3':
      return `C3 Module: ${args[0]} output channels, ${args[1]} repetitions.`;
    case 'SPPF':
      return `Spatial Pyramid Pooling Fast: ${args[0]} output channels, ${args[1]} kernel size.`;
    case 'Concat':
      return `Concatenation Layer: combines inputs.`;
    case 'Detect':
      return `Detection Head: for model output.`;
    default:
      return `Module type: ${type}, arguments: ${JSON.stringify(args)}`;
  }
};

// --- YAML Parsing & Conversion Logic ---

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


    
    const createNodesForSection = (modules: any[], sectionPrefix: string, startIndex: number) => {
      modules.forEach((module, localIndex) => {
        const globalIndex = startIndex + localIndex;
        const nodeId = `${sectionPrefix}-${localIndex}`;
        moduleMap[globalIndex] = nodeId;
        
        // 获取并格式化节点标题与详情
        const moduleType = module[2] as string;
        const moduleArgs = module[3] as any[];
        const moduleLabel = formatNodeLabel(moduleType, moduleArgs);
        const description = getModuleDescription(moduleType, moduleArgs);
        const style = getNodeStyle(moduleType);
        
        // 调试信息
        console.log(`Creating node ${nodeId} for module index ${globalIndex}, type ${moduleType}`);
        console.log(`Module input indices: ${JSON.stringify(module[0])}`);
        
        // 添加节点到节点数组
        nodes.push({
          id: nodeId,
          type: 'default',
          position: { x: 0, y: 0 }, // Placeholder, will be calculated later
          data: { 
            label: moduleLabel,
            type: moduleType, 
            args: moduleArgs,
            description,
          },
          parentNode: `${sectionPrefix}-group`,
          extent: 'parent',
          style,
        });
      });
    };
    
    // 获取模块描述信息的辅助函数
    const getModuleDescription = (type: string, args: any[]): string => {
      switch(type) {
        case 'Conv':
          return `卷积层: ${args[0]}x${args[0]}, 输出通道: ${args[1]}`;
        case 'C3':
          return `Cross Stage Partial: 输出通道: ${args[0]}`;
        case 'SPPF':
          return `空间金字塔池化: 核大小: ${args[0]}`;
        case 'Concat':
          return `特征融合: 维度: ${args[0] || 1}`;
        case 'Detect':
          return `检测层: 类别数: ${args[0]}`;
        default:
          return `${type}: ${args.join(', ')}`;
      }
    };

    nodes.push({ id: 'backbone-group', type: 'group', position: { x: 0, y: 0 }, data: { label: 'Backbone' }, style: { backgroundColor: 'rgba(255, 240, 240, 0.7)' } });
    createNodesForSection(doc.backbone, 'backbone', 0);

    nodes.push({ id: 'neck-group', type: 'group', position: { x: 450, y: 0 }, data: { label: 'Neck' }, style: { backgroundColor: 'rgba(240, 255, 240, 0.7)' } });
    createNodesForSection(neckModules, 'neck', doc.backbone.length);

    nodes.push({ id: 'head-group', type: 'group', position: { x: 1200, y: 0 }, data: { label: 'Head' }, style: { backgroundColor: 'rgba(240, 240, 255, 0.7)' } });
    createNodesForSection(headModules, 'head', doc.backbone.length + neckModules.length);

    // --- 边的生成与渲染 ---
    // 定义边的样式函数
    const getEdgeStyle = (_sourceType: string, targetType: string) => {
      // 根据连接的模块类型设置不同的边样式
      const baseStyle = {
        strokeWidth: 3,
        stroke: '#2563eb',
        opacity: 0.9,
        transition: '0.3s',
      };
      
      // 特殊连接的样式处理
      if (targetType === 'Concat') {
        return { ...baseStyle, stroke: '#722ed1', strokeWidth: 4 }; // 特殊强调Concat边
      } else if (targetType === 'Detect') {
        return { ...baseStyle, stroke: '#52c41a', strokeWidth: 4 }; // 特殊强调Detect边
      }
      
      return baseStyle;
    };
    
    // 边的创建
    const allModules = [...doc.backbone, ...neckModules, ...headModules];
    
    // 调试信息 - 进行边创建前检查模块映射
    console.log('Module mapping table:', moduleMap);
    console.log('Total modules:', allModules.length);
    
    // 保存所有模块类型的映射，用于边样式
    const moduleTypes: {[key: string]: string} = {};
    allModules.forEach((module, globalIndex) => {
      const nodeId = moduleMap[globalIndex];
      if (nodeId) {
        moduleTypes[nodeId] = module[2] as string;
      }
    });
    
    console.log('Module types:', moduleTypes);
    
    // 创建边
    allModules.forEach((module, globalIndex) => {
      const targetNodeId = moduleMap[globalIndex];
      const targetType = module[2] as string;
      let fromIndices = module[0];
      
      // 处理数据类型差异，确保不论是单个节点还是数组，都正确处理
      if (typeof fromIndices === 'number') {
        fromIndices = [fromIndices];
      } else if (!Array.isArray(fromIndices)) {
        console.warn(`Invalid fromIndices for module ${globalIndex}:`, fromIndices);
        fromIndices = [];
      }
      
      console.log(`Processing module ${globalIndex} (${targetType}) with target node ${targetNodeId}`);
      console.log(`Input indices:`, fromIndices);

      // 递归遍历所有输入节点创建边
      fromIndices.forEach((fromIndex: number) => {
        if (fromIndex === -1) {
          console.log(`Skipping -1 input for node ${targetNodeId}`);
          return; // Skip inputs from nowhere (-1)
        }
        
        const sourceNodeId = moduleMap[fromIndex];
        const sourceType = moduleTypes[sourceNodeId] || 'unknown';
        
        if (!sourceNodeId || !targetNodeId) {
          console.warn(`Missing node mapping for edge: source=${fromIndex}(${sourceNodeId}), target=${globalIndex}(${targetNodeId})`);
          return;
        }
        
        console.log(`Creating edge: ${sourceNodeId}(${sourceType}) -> ${targetNodeId}(${targetType})`);
        
        // 创建边并应用样式
        edges.push({
          id: `edge-${fromIndex}-${globalIndex}`,
          source: sourceNodeId,
          target: targetNodeId,
          type: 'smoothstep',
          style: getEdgeStyle(sourceType, targetType),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: sourceType === 'Concat' ? '#722ed1' : targetType === 'Detect' ? '#52c41a' : '#2563eb',
          },
          animated: true,
          zIndex: 1000, // 确保边在节点上方显示
        });
      });
    });

    // --- Positioning (Layout v6) - 论文级的分层分区布局 ---
    const nodePositions: { [id: string]: { x: number, y: number } } = {};
    
    // ----- 1. Calculate node levels and dependencies -----
    const calculateNodeLevel = (nodeId: string, visited: Set<string> = new Set<string>()): number => {
      // 避免循环依赖
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);
      
      // 获取进入当前节点的边
      const incomingEdges = edges.filter(e => e.target === nodeId);
      if (incomingEdges.length === 0) return 0;
      
      // 计算来源节点的最大层级
      const sourceLevels = incomingEdges.map(e => {
        return calculateNodeLevel(e.source, new Set(visited)) + 1;
      });
      
      return Math.max(...sourceLevels);
    };
    
    // ----- 2. Group nodes by section and level -----
    const nodeLevels: Record<string, number> = {};
    const backboneLevels: Record<number, string[]> = {};
    const neckLevels: Record<number, string[]> = {};
    const headLevels: Record<number, string[]> = {};

    // 计算节点层级并按层级分组
    nodes.forEach(node => {
      if (node.type === 'group') return; // Skip group nodes
      
      // 计算节点层级
      const level = calculateNodeLevel(node.id);
      nodeLevels[node.id] = level;
      
      // 分层分组
      if (node.parentNode === 'backbone-group') {
        if (!backboneLevels[level]) backboneLevels[level] = [];
        backboneLevels[level].push(node.id);
      } else if (node.parentNode === 'neck-group') {
        if (!neckLevels[level]) neckLevels[level] = [];
        neckLevels[level].push(node.id);
      } else if (node.parentNode === 'head-group') {
        if (!headLevels[level]) headLevels[level] = [];
        headLevels[level].push(node.id);
      }
    });
    
    // ----- 3. 优化节点水平排序 -----
    // 计算进出节点边数量
    const incomingEdgesCount: Record<string, number> = {};
    const outgoingEdgesCount: Record<string, number> = {};
    
    edges.forEach(edge => {
      incomingEdgesCount[edge.target] = (incomingEdgesCount[edge.target] || 0) + 1;
      outgoingEdgesCount[edge.source] = (outgoingEdgesCount[edge.source] || 0) + 1;
    });
    
    // 根据进入边源节点的Index计算排序权重
    const getSortWeight = (nodeId: string): number => {
      const incomingEdgesList = edges.filter(e => e.target === nodeId);
      if (incomingEdgesList.length === 0) return 0;
      
      const weights = incomingEdgesList.map(e => {
        // 提取源节点的索引
        const sourceIndex = parseInt(e.source.split('-')[1], 10);
        return isNaN(sourceIndex) ? 0 : sourceIndex;
      });
      
      // 返回最小权重值作为排序依据
      return weights.length > 0 ? Math.min(...weights) : 0;
    };
    
    // ----- 4. 计算节点在各自分组内的垂直位置 -----
    // 对每个层级的节点进行排序，计算垂直位置
    const calculateVerticalPosition = <T extends Record<number, string[]>>(levelGroups: T): Record<string, number> => {
      const positions: Record<string, number> = {};
      
      // 遍历每个层级
      Object.entries(levelGroups).forEach(([_, nodeIds]) => {
        // 根据权重排序
        const sortedNodeIds = [...nodeIds].sort((a, b) => getSortWeight(a) - getSortWeight(b));
        
        // 分配垂直位置
        sortedNodeIds.forEach((nodeId, index) => {
          positions[nodeId] = index;
        });
      });
      
      return positions;
    };
    
    const backboneVerticalPositions = calculateVerticalPosition(backboneLevels);
    const neckVerticalPositions = calculateVerticalPosition(neckLevels);
    const headVerticalPositions = calculateVerticalPosition(headLevels);
    
    // ----- 5. 应用布局坐标 -----
    // 计算每个节点的最终坐标
    nodes.forEach(node => {
      if (node.type === 'group') return; // 跳过组节点
      
      const section = node.parentNode?.split('-')[0] || '';
      const level = nodeLevels[node.id] || 0;
      let verticalPos = 0;
      let x = 0;
      let y = 0;
      
      // 根据分组计算位置
      switch (section) {
        case 'backbone':
          verticalPos = backboneVerticalPositions[node.id] || 0;
          x = 120 + level * 160; // Backbone从左到右排列
          y = 80 + verticalPos * 100;
          break;
        case 'neck':
          verticalPos = neckVerticalPositions[node.id] || 0;
          x = 500 + level * 160; // Neck在Backbone右侧
          y = 80 + verticalPos * 100;
          break;
        case 'head':
          verticalPos = headVerticalPositions[node.id] || 0;
          x = 900 + level * 160; // Head在Neck右侧
          y = 80 + verticalPos * 100;
          break;
      }
      
      // 更新节点位置
      nodePositions[node.id] = { x, y };
    });
    
    // ----- 6. 更新组节点大小和位置 -----
    // 计算组节点的大小和位置
    const groupNodes = nodes.filter(n => n.type === 'group');
    groupNodes.forEach(groupNode => {
      const groupId = groupNode.id;
      const childNodes = nodes.filter(n => n.parentNode === groupId);
      
      if (childNodes.length === 0) return;
      
      // 计算组的大小和位置边界
      const childPositions = childNodes.map(n => nodePositions[n.id] || { x: 0, y: 0 });
      const minX = Math.min(...childPositions.map(p => p.x)) - 80;
      const minY = Math.min(...childPositions.map(p => p.y)) - 50;
      const maxX = Math.max(...childPositions.map(p => p.x)) + 100;
      const maxY = Math.max(...childPositions.map(p => p.y)) + 50;
      
      // 设置组节点位置和大小
      const groupPos = { x: minX, y: minY };
      const groupSize = { width: maxX - minX, height: maxY - minY };
      
      // 更新组节点
      groupNode.position = groupPos;
      groupNode.style = { 
        ...groupNode.style, 
        width: groupSize.width, 
        height: groupSize.height
      };
    });

    // ----- 7. 应用计算好的坐标到子节点 -----
    nodes.forEach((node) => {
      if (node.type !== 'group' && nodePositions[node.id]) {
        node.position = nodePositions[node.id];
      }
    });

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
  if (!originalDoc) {
    console.error("convertToYaml called with null originalDoc.");
    return '';
  }

  const newDoc = JSON.parse(JSON.stringify(originalDoc)) as YoloArchitecture;

  const backboneNodes = nodes.filter(n => n.parentNode === 'backbone-group').sort((a, b) => a.position.y - b.position.y);
  const neckNodes = nodes.filter(n => n.parentNode === 'neck-group').sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
  const headNodes = nodes.filter(n => n.parentNode === 'head-group').sort((a, b) => a.position.y - b.position.y);

  const nodeIdToIndexMap: { [id: string]: number } = {};
  let currentIndex = 0;
  const allSortedNodes = [...backboneNodes, ...neckNodes, ...headNodes];
  allSortedNodes.forEach(n => {
    nodeIdToIndexMap[n.id] = currentIndex++;
  });

  const buildModuleList = (sectionNodes: Node<NodeData>[]): [number | number[], number, string, any[]][] => {
    return sectionNodes.map((node): [number | number[], number, string, any[]] => {
      const sourceIndices = edges
        .filter(e => e.target === node.id)
        .map(e => nodeIdToIndexMap[e.source])
        .filter((i): i is number => i !== undefined);

      sourceIndices.sort((a, b) => a - b);

      const from = sourceIndices.length === 1 ? sourceIndices[0] : (sourceIndices.length === 0 ? -1 : sourceIndices);
      const { type = 'Conv', args = [] } = node.data;
      
      const originalModule = [...(originalDoc.backbone || []), ...(originalDoc.head || [])].find(
        m => m[2] === type && JSON.stringify(m[3]) === JSON.stringify(args)
      );
      const moduleNumber = originalModule ? originalModule[1] : 1;

      return [from, moduleNumber, type, args];
    });
  };

  newDoc.backbone = buildModuleList(backboneNodes);
  newDoc.head = [...buildModuleList(neckNodes), ...buildModuleList(headNodes)];

  return yaml.dump(newDoc, { indent: 2, lineWidth: -1 });
};

// --- 3. Main YoloEditor Component ---
const YoloEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [versions, setVersions] = useState<YoloVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [originalDoc, setOriginalDoc] = useState<YoloArchitecture | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);
  
  const onNodeDataChange = (nodeId: string, newData: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const currentData = { ...node.data, ...newData };
          const newLabel = formatNodeLabel(currentData.type || '', currentData.args || []);
          const newDesc = getModuleDescription(currentData.type || '', currentData.args || []);
          const finalData = { ...currentData, label: newLabel, description: newDesc };
          return { ...node, data: finalData };
        }
        return node;
      })
    );

    if (selectedNode && selectedNode.id === nodeId) {
      const currentData = { ...selectedNode.data, ...newData };
      const newLabel = formatNodeLabel(currentData.type || '', currentData.args || []);
      const newDesc = getModuleDescription(currentData.type || '', currentData.args || []);
      const finalData = { ...currentData, label: newLabel, description: newDesc };
      setSelectedNode((sn) => ({ ...sn!, data: finalData }));
    }
  };

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return;
    const newNodes = nodes.filter((n) => n.id !== selectedNode.id);
    const newEdges = edges.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id);
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNode(null);
  }, [selectedNode, nodes, edges, setNodes, setEdges]);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
      event.preventDefault();
      handleDeleteNode();
    }
  }, [handleDeleteNode, selectedNode]);
  
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!reactFlowWrapper.current) return;
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const type = event.dataTransfer.getData('application/reactflow');
    if (typeof type === 'undefined' || !type) return;
    const position = project({ x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top });
    const newNode: Node<NodeData> = {
      id: `dndnode_${+new Date()}`,
      type: 'default',
      position,
      data: { label: `${type} Node`, type, args: [], description: getModuleDescription(type, []) },
      style: getNodeStyle(type),
    };
    setNodes((nds) => nds.concat(newNode));
  }, [project, setNodes]);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const fetchedVersions = await getYoloVersions();
        // The lint error indicates that getYoloVersions returns an AxiosResponse object.
        // The actual data is in the `data` property.
        setVersions(fetchedVersions.data);
      } catch (error) {
        message.error('Failed to fetch YOLO versions.');
        console.error("Error fetching versions:", error);
      }
    };
    fetchVersions();
  }, []);

  const handleVersionChange = (versionId: number) => {
    setSelectedVersionId(versionId);
    const version = versions.find((v) => v.id === versionId);
    if (version?.architecture) {
      const { nodes: newNodes, edges: newEdges, doc } = parseYoloYaml(version.architecture);
      setNodes(newNodes);
      setEdges(newEdges);
      setOriginalDoc(doc);
    } else {
      setNodes([]);
      setEdges([]);
      setOriginalDoc(null);
    }
    setSelectedNode(null);
  };
  
  const handleSave = async () => {
    if (!selectedVersionId || !originalDoc) {
      message.error('No version selected or original data missing.');
      return;
    }
    const yamlString = convertToYaml(nodes, edges, originalDoc);
    const version = versions.find(v => v.id === selectedVersionId);
    if (!version) {
      message.error('Selected version not found.');
      return;
    }
    try {
      await updateYoloVersion(selectedVersionId, { ...version, architecture: yamlString });
      message.success('Architecture saved successfully!');
    } catch (error) {
      message.error('Failed to save architecture.');
    }
  };
  
  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
        onKeyDown(event as unknown as KeyboardEvent);
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [onKeyDown]);

  return (
    <div className="yolo-editor-layout" onKeyDown={onKeyDown} tabIndex={-1}>
      <aside className="editor-sidebar">
        <div className="module-palette">
          <h3>模块面板</h3>
          <div className="description">从这里拖动模块到画布中</div>
          {yoloModules.map((module) => (
            <div key={module.type} className="dndnode" onDragStart={(event) => onDragStart(event, module.type)} draggable>
              {module.type}
            </div>
          ))}
        </div>
        <div className="param-editor">
          <h3>参数编辑器</h3>
          {selectedNode ? (
            <>
              <div className="param-group">
                <label>模块类型:</label>
                <Input value={selectedNode.data.type} disabled />
              </div>
              <div className="param-group">
                <label>模块名称:</label>
                <Input value={selectedNode.data.label} onChange={(e) => onNodeDataChange(selectedNode.id, { label: e.target.value })} />
              </div>
              <div className="param-group">
                <label>参数 (args):</label>
                {selectedNode.data.args?.map((arg, index) => (
                  <div key={index} className="arg-input">
                    <Input type="number" value={arg} onChange={(e) => {
                        const newArgs = [...(selectedNode.data.args || [])];
                        newArgs[index] = parseInt(e.target.value) || 0;
                        onNodeDataChange(selectedNode.id, { args: newArgs });
                      }}
                    />
                  </div>
                ))}
                <div className="arg-buttons">
                  <Button size="small" onClick={() => {
                      const newArgs = [...(selectedNode.data.args || []), 0];
                      onNodeDataChange(selectedNode.id, { args: newArgs });
                    }}>添加参数</Button>
                  <Button size="small" danger disabled={!selectedNode.data.args?.length} onClick={() => {
                      if (!selectedNode.data.args?.length) return;
                      const newArgs = selectedNode.data.args.slice(0, -1);
                      onNodeDataChange(selectedNode.id, { args: newArgs });
                    }}>删除参数</Button>
                </div>
              </div>
              <div className="param-group">
                <label>模块描述:</label>
                <Input.TextArea value={selectedNode.data.description} rows={3} onChange={(e) => onNodeDataChange(selectedNode.id, { description: e.target.value })} />
              </div>
              <Button danger onClick={handleDeleteNode} style={{ width: '100%', marginTop: '10px' }}>Delete Node</Button>
            </>
          ) : (
            <div className="description">选择一个节点来编辑其参数</div>
          )}
        </div>
      </aside>
      <div className="editor-main">
        <div className="editor-toolbar">
          <Space>
            <Select placeholder="Select a YOLO version to edit" style={{ width: 240 }} onChange={handleVersionChange} value={selectedVersionId}>
              {versions.map((v) => (<Select.Option key={v.id} value={v.id}>{v.name}</Select.Option>))}
            </Select>
            <Button onClick={handleSave} type="primary" disabled={!selectedVersionId}>Save Architecture</Button>
          </Space>
        </div>
        <div className="reactflow-wrapper" ref={reactFlowWrapper} onDragOver={onDragOver} onDrop={onDrop}>
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

// 使用 ReactFlowProvider 包装组件以便正确使用 useReactFlow hook
const YoloEditorWithProvider = () => (
  <ReactFlowProvider>
    <YoloEditor />
  </ReactFlowProvider>
);

export default YoloEditorWithProvider;
