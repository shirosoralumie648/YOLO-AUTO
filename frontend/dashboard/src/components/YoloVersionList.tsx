import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message } from 'antd';
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
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await apiClient.post('/yolo-versions/', values);
      message.success('YOLO version added successfully!');
      setIsModalVisible(false);
      fetchVersions(); // Refresh the list
      form.resetFields();
    } catch (error) {
      message.error('Failed to add YOLO version.');
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
  ];

  return (
    <div>
      <Button onClick={handleAdd} type="primary" style={{ marginBottom: 16 }}>
        Add YOLO Version
      </Button>
      <Table columns={columns} dataSource={versions} rowKey="id" />
      <Modal title="Add New YOLO Version" open={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
        <Form form={form} layout="vertical" name="form_in_modal">
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
