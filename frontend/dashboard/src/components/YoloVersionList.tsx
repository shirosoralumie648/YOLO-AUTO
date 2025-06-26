import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';
import 'prismjs/themes/prism.css'; //Example style, you can use another

import apiClient from '../services/api';
import type { YoloVersion } from '../models/yolo';

const YoloVersionList = () => {
  const [versions, setVersions] = useState<YoloVersion[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingVersion, setEditingVersion] = useState<YoloVersion | null>(null);
  const [architectureContent, setArchitectureContent] = useState('');
  const [form] = Form.useForm();

  const fetchVersions = async () => {
    try {
      const response = await apiClient.get('/yolo-versions/');
      setVersions(response.data);
    } catch (error) {
      message.error('Failed to fetch YOLO versions.');
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

    const handleAdd = () => {
    setEditingVersion(null);
    setArchitectureContent('');
    setIsModalVisible(true);
  };

    const handleEdit = (record: YoloVersion) => {
    setEditingVersion(record);
        setArchitectureContent(record.architecture || '');
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/yolo-versions/${id}`);
      message.success('YOLO version deleted successfully!');
      fetchVersions(); // Refresh the list
    } catch (error) {
      message.error('Failed to delete YOLO version.');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
            const data = { ...values, architecture: architectureContent };

      if (editingVersion) {
        // Update existing version
        await apiClient.put(`/yolo-versions/${editingVersion.id}`, data);
        message.success('YOLO version updated successfully!');
      } else {
        // Create new version
        await apiClient.post('/yolo-versions/', data);
        message.success('YOLO version added successfully!');
      }
      setIsModalVisible(false);
      fetchVersions(); // Refresh the list
    } catch (error) {
      message.error(`Failed to ${editingVersion ? 'update' : 'add'} YOLO version.`);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: YoloVersion) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleEdit(record)}>Edit</Button>
          <Popconfirm
            title="Delete the version"
            description="Are you sure to delete this version?"
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
        Add YOLO Version
      </Button>
      <Table columns={columns} dataSource={versions} rowKey="id" />
      <Modal 
        title={editingVersion ? 'Edit YOLO Version' : 'Add New YOLO Version'} 
        open={isModalVisible} 
        onOk={handleOk} 
        onCancel={handleCancel}
        destroyOnHidden // This will destroy the modal and its form states when closed
      >
                        <Form form={form} layout="vertical" name="form_in_modal" initialValues={editingVersion || {}}>
          <Form.Item name="name" label="Version Name" rules={[{ required: true, message: 'Please input the version name!' }]}>
            <Input />
          </Form.Item>
                    <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Architecture (YAML)">
            <Upload
              accept=".yaml,.yml"
              beforeUpload={(file) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const content = e.target?.result as string;
                  setArchitectureContent(content);
                };
                reader.readAsText(file);
                return false; // Prevent automatic upload
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>Upload YAML</Button>
            </Upload>
          </Form.Item>
                    <Form.Item
            label="Architecture (YAML)"
            required
            validateStatus={!architectureContent ? 'error' : ''}
            help={!architectureContent ? 'Please provide the architecture YAML!' : ''}
          >
            <Editor
              value={architectureContent}
              onValueChange={setArchitectureContent}
              highlight={code => Prism.highlight(code, Prism.languages.yaml, 'yaml')}
              padding={10}
              style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 12,
                border: '1px solid #ddd',
                borderRadius: '4px',
                minHeight: '200px',
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default YoloVersionList;
