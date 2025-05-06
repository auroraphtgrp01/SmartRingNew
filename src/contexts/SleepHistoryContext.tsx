import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SleepData, FinalSleepData } from '../types/SleepType';

// Định nghĩa kiểu dữ liệu cho context
interface SleepHistoryContextType {
  sleepHistoryData: SleepData | FinalSleepData | null;
  setSleepHistoryData: (data: SleepData | FinalSleepData) => void;
  clearSleepHistoryData: () => void;
}

// Tạo context với giá trị mặc định
const SleepHistoryContext = createContext<SleepHistoryContextType | undefined>(undefined);

// Hook để sử dụng context
export const useSleepHistory = () => {
  const context = useContext(SleepHistoryContext);
  if (!context) {
    throw new Error('useSleepHistory phải được sử dụng trong SleepHistoryProvider');
  }
  return context;
};

// Props cho Provider
interface SleepHistoryProviderProps {
  children: ReactNode;
}

// Provider component
export const SleepHistoryProvider: React.FC<SleepHistoryProviderProps> = ({ children }) => {
  const [sleepHistoryData, setSleepHistoryData] = useState<SleepData | FinalSleepData | null>(null);

  // Hàm xóa dữ liệu
  const clearSleepHistoryData = () => {
    setSleepHistoryData(null);
  };

  // Giá trị cung cấp cho context
  const value = {
    sleepHistoryData,
    setSleepHistoryData,
    clearSleepHistoryData
  };

  return (
    <SleepHistoryContext.Provider value={value}>
      {children}
    </SleepHistoryContext.Provider>
  );
};
