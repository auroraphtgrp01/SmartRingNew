import React, { ReactNode } from 'react';
import { SportHistoryProvider } from './SportHistoryContext';
import { SleepHistoryProvider } from './SleepHistoryContext';
import { HeartHistoryProvider } from './HeartHistoryContext';
import { BloodPressureHistoryProvider } from './BloodPressureHistoryContext';
import { ComprehensiveHistoryProvider } from './ComprehensiveHistoryContext';

interface HealthDataProviderProps {
  children: ReactNode;
}

/**
 * Provider tổng hợp cho tất cả các context dữ liệu sức khỏe
 * Bao gồm:
 * - SportHistoryProvider: Dữ liệu thể thao
 * - SleepHistoryProvider: Dữ liệu giấc ngủ
 * - HeartHistoryProvider: Dữ liệu nhịp tim
 * - BloodPressureHistoryProvider: Dữ liệu huyết áp
 * - ComprehensiveHistoryProvider: Dữ liệu đo tổng hợp
 */
export const HealthDataProvider: React.FC<HealthDataProviderProps> = ({ children }) => {
  return (
    <SportHistoryProvider>
      <SleepHistoryProvider>
        <HeartHistoryProvider>
          <BloodPressureHistoryProvider>
            <ComprehensiveHistoryProvider>
              {children}
            </ComprehensiveHistoryProvider>
          </BloodPressureHistoryProvider>
        </HeartHistoryProvider>
      </SleepHistoryProvider>
    </SportHistoryProvider>
  );
};
