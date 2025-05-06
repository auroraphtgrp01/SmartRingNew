import React, { createContext, useContext, useState, ReactNode } from 'react';

// Định nghĩa kiểu dữ liệu cho HeartRateItem
interface HeartRateItem {
  heartStartTime: string;
  heartValue: number;
}

// Định nghĩa kiểu dữ liệu cho HeartRateData
interface HeartRateData {
  avgHeartRate: number;
  data: HeartRateItem[];
}

// Định nghĩa kiểu dữ liệu cho context
interface HeartHistoryContextType {
  heartHistoryData: HeartRateData | null;
  setHeartHistoryData: (data: HeartRateData) => void;
  clearHeartHistoryData: () => void;
}

// Tạo context với giá trị mặc định
const HeartHistoryContext = createContext<HeartHistoryContextType | undefined>(undefined);

// Hook để sử dụng context
export const useHeartHistory = () => {
  const context = useContext(HeartHistoryContext);
  if (!context) {
    throw new Error('useHeartHistory phải được sử dụng trong HeartHistoryProvider');
  }
  return context;
};

// Props cho Provider
interface HeartHistoryProviderProps {
  children: ReactNode;
}

// Provider component
export const HeartHistoryProvider: React.FC<HeartHistoryProviderProps> = ({ children }) => {
  const [heartHistoryData, setHeartHistoryData] = useState<HeartRateData | null>(null);

  // Hàm xóa dữ liệu
  const clearHeartHistoryData = () => {
    setHeartHistoryData(null);
  };

  // Giá trị cung cấp cho context
  const value = {
    heartHistoryData,
    setHeartHistoryData,
    clearHeartHistoryData
  };

  return (
    <HeartHistoryContext.Provider value={value}>
      {children}
    </HeartHistoryContext.Provider>
  );
};
