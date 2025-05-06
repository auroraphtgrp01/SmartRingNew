import React, { useEffect } from 'react';
import { 
  useSportHistory, 
  useSleepHistory, 
  useHeartHistory, 
  useBloodPressureHistory, 
  useComprehensiveHistory 
} from '../contexts';

// Biến toàn cục để lưu trữ các setter functions từ Context API
let _sportHistoryDataSetter: ((data: any) => void) | null = null;
let _sleepHistoryDataSetter: ((data: any) => void) | null = null;
let _heartHistoryDataSetter: ((data: any) => void) | null = null;
let _bloodPressureHistoryDataSetter: ((data: any) => void) | null = null;
let _comprehensiveHistoryDataSetter: ((data: any) => void) | null = null;

// Biến toàn cục để lưu trữ dữ liệu hiện tại
let _sportHistoryData: any = null;
let _sleepHistoryData: any = null;
let _heartHistoryData: any = null;
let _bloodPressureHistoryData: any = null;
let _comprehensiveHistoryData: any = null;

/**
 * Component React để đăng ký các setter functions từ Context API
 * Thêm component này vào App.tsx để kết nối Context API với SyncHealthDataIntoCloud
 */
export const ContextConnector: React.FC = () => {
  const { setSportHistoryData, sportHistoryData } = useSportHistory();
  const { setSleepHistoryData, sleepHistoryData } = useSleepHistory();
  const { setHeartHistoryData, heartHistoryData } = useHeartHistory();
  const { setBloodPressureHistoryData, bloodPressureHistoryData } = useBloodPressureHistory();
  const { setComprehensiveHistoryData, comprehensiveHistoryData } = useComprehensiveHistory();
  
  useEffect(() => {
    // Đăng ký các setter functions
    _sportHistoryDataSetter = setSportHistoryData;
    _sleepHistoryDataSetter = setSleepHistoryData;
    _heartHistoryDataSetter = setHeartHistoryData;
    _bloodPressureHistoryDataSetter = setBloodPressureHistoryData;
    _comprehensiveHistoryDataSetter = setComprehensiveHistoryData;
    
    // Đăng ký dữ liệu hiện tại
    _sportHistoryData = sportHistoryData;
    _sleepHistoryData = sleepHistoryData;
    _heartHistoryData = heartHistoryData;
    _bloodPressureHistoryData = bloodPressureHistoryData;
    _comprehensiveHistoryData = comprehensiveHistoryData;
    
    return () => {
      // Xóa đăng ký khi component unmount
      _sportHistoryDataSetter = null;
      _sleepHistoryDataSetter = null;
      _heartHistoryDataSetter = null;
      _bloodPressureHistoryDataSetter = null;
      _comprehensiveHistoryDataSetter = null;
    };
  }, [sportHistoryData, sleepHistoryData, heartHistoryData, bloodPressureHistoryData, comprehensiveHistoryData, 
      setSportHistoryData, setSleepHistoryData, setHeartHistoryData, setBloodPressureHistoryData, setComprehensiveHistoryData]);
  
  return null; // Component này không render gì cả
};

/**
 * Lớp SyncHealthDataIntoCloud
 * Sử dụng để đồng bộ dữ liệu sức khỏe vào cloud
 * Dữ liệu được lưu trữ trong các Context API store
 */
export class SyncHealthDataIntoCloud {
    private static instance: SyncHealthDataIntoCloud;

    private constructor() {}

    /**
     * Lấy instance của lớp SyncHealthDataIntoCloud (Singleton pattern)
     * @returns Instance của lớp SyncHealthDataIntoCloud
     */
    public static getInstance(): SyncHealthDataIntoCloud {
        if (!SyncHealthDataIntoCloud.instance) {
            SyncHealthDataIntoCloud.instance = new SyncHealthDataIntoCloud();
        }
        return SyncHealthDataIntoCloud.instance;
    }

    /**
     * Lưu dữ liệu vào Context API store trực tiếp
     * @param data Dữ liệu cần lưu
     * @param type Loại dữ liệu
     */
    public saveLocallyData(
        data: any, 
        type: string
    ) {
        switch (type) {
            case 'sportHistory':
                if (_sportHistoryDataSetter) {
                    _sportHistoryDataSetter(data);
                }
                _sportHistoryData = data;
                break;
            case 'sleepHistory':
                if (_sleepHistoryDataSetter) {
                    _sleepHistoryDataSetter(data);
                }
                _sleepHistoryData = data;
                break;
            case 'heartHistory':
                if (_heartHistoryDataSetter) {
                    _heartHistoryDataSetter(data);
                }
                _heartHistoryData = data;
                break;
            case 'bloodPressureHistory':
                if (_bloodPressureHistoryDataSetter) {
                    _bloodPressureHistoryDataSetter(data);
                }
                _bloodPressureHistoryData = data;
                break;
            case 'comprehensiveMeasurement':
                if (_comprehensiveHistoryDataSetter) {
                    _comprehensiveHistoryDataSetter(data);
                }
                _comprehensiveHistoryData = data;
                break;
        }
    }

    /**
     * Bắt đầu đồng bộ dữ liệu vào cloud
     * @param callback Hàm callback được gọi sau khi đồng bộ hoàn tất
     * @param contextData (Tùy chọn) Dữ liệu từ các Context API nếu được gọi từ component React
     */
    public startSync(
        callback: () => void,
        contextData?: {
            sportHistoryData: any;
            sleepHistoryData: any;
            heartHistoryData: any;
            bloodPressureHistoryData: any;
            comprehensiveHistoryData: any;
        }
    ) {
        console.log('Bắt đầu đồng bộ dữ liệu vào cloud');
        
        // Lấy dữ liệu từ biến toàn cục hoặc từ tham số contextData
        const data = contextData || {
            sportHistoryData: _sportHistoryData,
            sleepHistoryData: _sleepHistoryData,
            heartHistoryData: _heartHistoryData,
            bloodPressureHistoryData: _bloodPressureHistoryData,
            comprehensiveHistoryData: _comprehensiveHistoryData
        };
        
        console.log('Dữ liệu thể thao:', data.sportHistoryData);
        console.log('Dữ liệu giấc ngủ:', data.sleepHistoryData);
        console.log('Dữ liệu nhịp tim:', data.heartHistoryData);
        console.log('Dữ liệu huyết áp:', data.bloodPressureHistoryData);
        console.log('Dữ liệu đo tổng hợp:', data.comprehensiveHistoryData);
        
        // Ở đây bạn có thể thêm các logic để đồng bộ dữ liệu lên cloud
        // Ví dụ: gọi API để lưu dữ liệu
        
        // Sử dụng setTimeout để đảm bảo tất cả các log đã được xử lý trước khi gọi callback
        setTimeout(() => {
            callback();
        }, 0);
    }
}
