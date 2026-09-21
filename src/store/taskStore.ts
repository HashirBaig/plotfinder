import { create } from "zustand";

type TYPE_TASK_INFO = {
  totalTask: number | null;
  remainingTask: number | null;
};

type TYPE_TASK_STATE = {
  totalTask: number | null;
  remainingTask: number | null;
  multipleSelection?: boolean;
  setTaskInfo: (params: TYPE_TASK_INFO) => void;
  setMultiSelect: (value: boolean) => void;
};

export const useTaskStore = create<TYPE_TASK_STATE>()((set) => ({
  totalTask: null,
  remainingTask: null,
  multipleSelection: false,

  setTaskInfo: (params) => {
    set(params);
  },
  setMultiSelect: (value) => {
    set({ multipleSelection: value });
  },
}));
