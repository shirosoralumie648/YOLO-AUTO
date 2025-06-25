import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm } from 'antd';
import apiClient from '../services/api';

interface YoloVersion {
  id: number;
  name: string;
  repo_url?: string;
  paper_url?: string;
}

const YoloVersionList = () => {
  const [versions, setVersions] = useState<YoloVersion[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingVersion, setEditingVersion] = useState<YoloVersion | null>(null);
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
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: YoloVersion) => {
    setEditingVersion(record);
    form.setFieldsValue(record);
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
      if (editingVersion) {
        // Update existing version
        await apiClient.put(`/yolo-versions/${editingVersion.id}`, values);
        message.success('YOLO version updated successfully!');
      } else {
        // Create new version
        await apiClient.post('/yolo-versions/', values);
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
    { title: 'Repo URL', dataIndex: 'repo_url', key: 'repo_url' },
    { title: 'Paper URL', dataIndex: 'paper_url', key: 'paper_url' },
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
        destroyOnClose // This will destroy the modal and its form states when closed
      >
        <Form form={form} layout="vertical" name="form_in_modal" initialValues={editingVersion || {}}>
          <Form.Item name="name" label="Version Name" rules={[{ required: true, message: 'Please input the version name!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="repo_url" label="Repository URL">
            <Input />
          </Form.Item>
          <Form.Item name="paper_url" label="Paper URL">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default YoloVersionList;
