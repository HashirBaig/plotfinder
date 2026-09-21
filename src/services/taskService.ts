import api from "../lib/axios";
import { TASK } from "./apiUrls";

type TYPE_TASK_PAYLOAD = {
  id?: number;
  task?: string;
  isCompleted?: boolean;
};

type TYPE_GET_TASK_LIST_BY_USER = {
  filter: string;
  page?: number;
  limit?: number;
};

export const getTaskListByUser = (params: TYPE_GET_TASK_LIST_BY_USER) => {
  let url = `${TASK}`;

  if (params?.filter) url = url + `?task_type=${params?.filter}`;
  if (params?.filter && params?.page) url = url + `&page=${params?.page}`;
  if (params?.filter && params?.page && params?.limit)
    url = url + `&limit=${params?.limit}`;
  return api.get(url);
};

export const addTask = (payload: TYPE_TASK_PAYLOAD) => {
  return api.post(`${TASK}`, payload);
};

export const editTask = (payload: TYPE_TASK_PAYLOAD) => {
  return api.put(`${TASK}/${payload?.id}`, payload);
};

export const deleteTask = (payload: TYPE_TASK_PAYLOAD) => {
  return api.delete(`${TASK}/${payload?.id}`);
};
