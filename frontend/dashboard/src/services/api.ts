import axios from 'axios';
import type { YoloVersion, YoloVersionUpdate } from '../models/yolo';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getYoloVersions = () => apiClient.get<YoloVersion[]>('/yolo-versions/');

export const updateYoloVersion = (id: number, data: YoloVersionUpdate) => {
  return apiClient.put<YoloVersion>(`/yolo-versions/${id}`, data);
};

export default apiClient;
