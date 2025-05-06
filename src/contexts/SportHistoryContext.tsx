import React, { createContext, useContext, useState, ReactNode } from 'react';

// Định nghĩa kiểu dữ liệu cho SportDataItem
interface SportDataItem {
  sportCalorie: number;
  sportDistance: number;
  sportEndTime: string;
  sportStartTime: string;
  sportStep: number;
}

// Định nghĩa kiểu dữ liệu cho SportData
interface SportData {
  code: number;
  data: SportDataItem[];
  dataType: number;
}

// Định nghĩa kiểu dữ liệu cho context
interface SportHistoryContextType {
  sportHistoryData: SportData | null;
  setSportHistoryData: (data: SportData) => void;
  clearSportHistoryData: () => void;
}

// Tạo context với giá trị mặc định
const SportHistoryContext = createContext<SportHistoryContextType | undefined>(undefined);

// Hook để sử dụng context
export const useSportHistory = () => {
  const context = useContext(SportHistoryContext);
  if (!context) {
    throw new Error('useSportHistory phải được sử dụng trong SportHistoryProvider');
  }
  return context;
};

// Props cho Provider
interface SportHistoryProviderProps {
  children: ReactNode;
}

// Provider component
export const SportHistoryProvider: React.FC<SportHistoryProviderProps> = ({ children }) => {
  const [sportHistoryData, setSportHistoryData] = useState<SportData | null>(null);

  // Hàm xóa dữ liệu
  const clearSportHistoryData = () => {
    setSportHistoryData(null);
  };

  // Giá trị cung cấp cho context
  const value = {
    sportHistoryData,
    setSportHistoryData,
    clearSportHistoryData
  };

  return (
    <SportHistoryContext.Provider value={value}>
      {children}
    </SportHistoryContext.Provider>
  );
};
