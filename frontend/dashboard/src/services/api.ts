import axios from 'axios';
import type { YoloVersion } from '../models/yolo';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getYoloVersions = () => {
  return apiClient.get<YoloVersion[]>('/yolo-versions/');
};


export default apiClient;
