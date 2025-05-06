import React, { createContext, useContext, useState, ReactNode } from 'react';

// Định nghĩa kiểu dữ liệu cho ComprehensiveDataItem
interface ComprehensiveDataItem {
  DBPValue: number;
  OOValue: number;
  SBPValue: number;
  cvrrValue: number;
  heartValue: number;
  hrvValue: number;
  respiratoryRateValue: number;
  startTime: string;
  stepValue: number;
  tempFloatValue: number;
  tempIntValue: number;
}

// Định nghĩa kiểu dữ liệu cho ComprehensiveOverview
interface ComprehensiveOverview {
  DBPValueAvg: number;
  OOValueAvg: number;
  SBPValueAvg: number;
  cvrrValueAvg: number;
  heartValueAvg: number;
  hrvValueAvg: number;
  respiratoryRateValueAvg: number;
  stepValueAvg: number;
  tempFloatValueAvg: number;
  tempIntValueAvg: number;
}

// Định nghĩa kiểu dữ liệu cho ComprehensiveData
interface ComprehensiveData {
  data: ComprehensiveDataItem[];
  dataType: number;
  overview: ComprehensiveOverview;
}

// Định nghĩa kiểu dữ liệu cho context
interface ComprehensiveHistoryContextType {
  comprehensiveHistoryData: ComprehensiveData | null;
  setComprehensiveHistoryData: (data: ComprehensiveData) => void;
  clearComprehensiveHistoryData: () => void;
}

// Tạo context với giá trị mặc định
const ComprehensiveHistoryContext = createContext<ComprehensiveHistoryContextType | undefined>(undefined);

// Hook để sử dụng context
export const useComprehensiveHistory = () => {
  const context = useContext(ComprehensiveHistoryContext);
  if (!context) {
    throw new Error('useComprehensiveHistory phải được sử dụng trong ComprehensiveHistoryProvider');
  }
  return context;
};

// Props cho Provider
interface ComprehensiveHistoryProviderProps {
  children: ReactNode;
}

// Provider component
export const ComprehensiveHistoryProvider: React.FC<ComprehensiveHistoryProviderProps> = ({ children }) => {
  const [comprehensiveHistoryData, setComprehensiveHistoryData] = useState<ComprehensiveData | null>(null);

  // Hàm xóa dữ liệu
  const clearComprehensiveHistoryData = () => {
    setComprehensiveHistoryData(null);
  };

  // Giá trị cung cấp cho context
  const value = {
    comprehensiveHistoryData,
    setComprehensiveHistoryData,
    clearComprehensiveHistoryData
  };

  return (
    <ComprehensiveHistoryContext.Provider value={value}>
      {children}
    </ComprehensiveHistoryContext.Provider>
  );
};
