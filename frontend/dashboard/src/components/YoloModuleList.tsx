import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Select } from 'antd';
import apiClient from '../services/api';

// A simplified interface for YOLO versions, used in the selector.
interface YoloVersion {
  id: number;
  name: string;
}

interface YoloModule {
  id: number;
  name: string;
  module_type: string;
  config_path?: string;
  yolo_version_id: number;
}

const { Option } = Select;

const YoloModuleList = () => {
  const [modules, setModules] = useState<YoloModule[]>([]);
  const [versions, setVersions] = useState<YoloVersion[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingModule, setEditingModule] = useState<YoloModule | null>(null);
  const [form] = Form.useForm();

  const fetchModules = async () => {
    try {
      const response = await apiClient.get('/yolo-modules/');
      setModules(response.data);
    } catch (error) {
      message.error('Failed to fetch YOLO modules.');
    }
  };

  const fetchVersions = async () => {
    try {
      const response = await apiClient.get('/yolo-versions/');
      setVersions(response.data);
    } catch (error) {
      message.error('Failed to fetch YOLO versions for selector.');
    }
  };

  useEffect(() => {
    fetchModules();
    fetchVersions(); // Fetch versions for the dropdown
  }, []);

  const handleAdd = () => {
    setEditingModule(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: YoloModule) => {
    setEditingModule(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/yolo-modules/${id}`);
      message.success('YOLO module deleted successfully!');
      fetchModules(); // Refresh the list
    } catch (error) {
      message.error('Failed to delete YOLO module.');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingModule) {
        await apiClient.put(`/yolo-modules/${editingModule.id}`, values);
        message.success('YOLO module updated successfully!');
      } else {
        await apiClient.post('/yolo-modules/', values);
        message.success('YOLO module added successfully!');
      }
      setIsModalVisible(false);
      fetchModules(); // Refresh the list
    } catch (error) {
      message.error(`Failed to ${editingModule ? 'update' : 'add'} YOLO module.`);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Type', dataIndex: 'module_type', key: 'module_type' },
    { title: 'Config Path', dataIndex: 'config_path', key: 'config_path' },
    { title: 'Version ID', dataIndex: 'yolo_version_id', key: 'yolo_version_id' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: YoloModule) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleEdit(record)}>Edit</Button>
          <Popconfirm
            title="Delete the module"
            description="Are you sure to delete this module?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button onClick={handleAdd} type="primary" style={{ marginBottom: 16 }}>
        Add YOLO Module
      </Button>
      <Table columns={columns} dataSource={modules} rowKey="id" />
      <Modal
        title={editingModule ? 'Edit YOLO Module' : 'Add New YOLO Module'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        destroyOnClose
      >
        <Form form={form} layout="vertical" name="form_in_modal" initialValues={editingModule || {}}>
          <Form.Item name="name" label="Module Name" rules={[{ required: true, message: 'Please input the module name!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="module_type" label="Module Type" rules={[{ required: true, message: 'Please select a module type!' }]}>
             <Select placeholder="Select a type">
                <Option value="backbone">Backbone</Option>
                <Option value="neck">Neck</Option>
                <Option value="head">Head</Option>
              </Select>
          </Form.Item>
          <Form.Item name="config_path" label="Config Path">
            <Input />
          </Form.Item>
           <Form.Item name="yolo_version_id" label="Associated YOLO Version" rules={[{ required: true, message: 'Please select a YOLO version!' }]}>
            <Select placeholder="Select a version">
              {versions.map(version => (
                <Option key={version.id} value={version.id}>{version.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default YoloModuleList;
