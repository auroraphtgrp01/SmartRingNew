import React, { createContext, useContext, useState, ReactNode } from 'react';

// Định nghĩa kiểu dữ liệu cho BloodPressureItem
interface BloodPressureItem {
  bloodDBP: number;
  bloodSBP: number;
  bloodStartTime: string;
}

// Định nghĩa kiểu dữ liệu cho AverageBloodPressure
interface AverageBloodPressure {
  avgDBP: number;
  avgSBP: number;
}

// Định nghĩa kiểu dữ liệu cho BloodPressureData
interface BloodPressureData {
  averageData: AverageBloodPressure;
  historyData: BloodPressureItem[];
}

// Định nghĩa kiểu dữ liệu cho context
interface BloodPressureHistoryContextType {
  bloodPressureHistoryData: BloodPressureData | null;
  setBloodPressureHistoryData: (data: BloodPressureData) => void;
  clearBloodPressureHistoryData: () => void;
}

// Tạo context với giá trị mặc định
const BloodPressureHistoryContext = createContext<BloodPressureHistoryContextType | undefined>(undefined);

// Hook để sử dụng context
export const useBloodPressureHistory = () => {
  const context = useContext(BloodPressureHistoryContext);
  if (!context) {
    throw new Error('useBloodPressureHistory phải được sử dụng trong BloodPressureHistoryProvider');
  }
  return context;
};

// Props cho Provider
interface BloodPressureHistoryProviderProps {
  children: ReactNode;
}

// Provider component
export const BloodPressureHistoryProvider: React.FC<BloodPressureHistoryProviderProps> = ({ children }) => {
  const [bloodPressureHistoryData, setBloodPressureHistoryData] = useState<BloodPressureData | null>(null);

  // Hàm xóa dữ liệu
  const clearBloodPressureHistoryData = () => {
    setBloodPressureHistoryData(null);
  };

  // Giá trị cung cấp cho context
  const value = {
    bloodPressureHistoryData,
    setBloodPressureHistoryData,
    clearBloodPressureHistoryData
  };

  return (
    <BloodPressureHistoryContext.Provider value={value}>
      {children}
    </BloodPressureHistoryContext.Provider>
  );
};
