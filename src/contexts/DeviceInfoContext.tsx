import React, { createContext, useContext, useState, useEffect } from 'react';
import DeviceInfoService from '../services/DeviceInfoService';
import BleService from '../core/BleService';

// Sử dụng kiểu dữ liệu từ DeviceInfoService
type deviceInfo = {
  deviceBatteryState: number;
  deviceBatteryValue: number;
  deviceMainVersion: number;
  deviceSubVersion: number;
  deviceVersion: string;
  deviceId: number;
  devicetBindState: number;
  devicetSyncState: number;
};

// Định nghĩa kiểu dữ liệu cho context
interface DeviceInfoContextType {
  deviceInfo: deviceInfo;
  updateDeviceInfo: (data?: deviceInfo) => void;
  isUpdating: boolean;
}

// Giá trị mặc định cho context
const defaultDeviceInfo: deviceInfo = {
  deviceBatteryState: 0,
  deviceBatteryValue: 0,
  deviceId: 0,
  deviceMainVersion: 0,
  deviceSubVersion: 0,
  deviceVersion: '0.0',
  devicetBindState: 0,
  devicetSyncState: 0
};

// Tạo context
const DeviceInfoContext = createContext<DeviceInfoContextType>({
  deviceInfo: defaultDeviceInfo,
  updateDeviceInfo: (data?: deviceInfo) => {},
  isUpdating: false
});

export const useDeviceInfo = () => useContext(DeviceInfoContext);

export const DeviceInfoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceInfoState, setDeviceInfoState] = useState<deviceInfo>(defaultDeviceInfo);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Hàm cập nhật thông tin thiết bị từ service hoặc từ thiết bị BLE
  const updateDeviceInfo = (data?: deviceInfo) => {
    // Nếu có dữ liệu được truyền vào trực tiếp từ service, cập nhật state
    if (data) {
      console.log('Cập nhật thông tin thiết bị từ service:', data);
      setDeviceInfoState(data);
      return;
    }
    
    // Nếu không có dữ liệu, thực hiện truy vấn từ thiết bị
    const bleService = BleService.getInstance();
    if (!bleService) {
      console.log('Không có kết nối BLE');
      return;
    }

    setIsUpdating(true);
    try {
      console.log('Đang cập nhật thông tin thiết bị từ thiết bị...');
      bleService.getDeviceInfo((data) => {
        if (data) {
          console.log('Nhận được thông tin thiết bị:', data);
          // Dữ liệu sẽ được cập nhật tự động thông qua ContextConnector
        }
        setIsUpdating(false);
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật thông tin thiết bị:', error);
      setIsUpdating(false);
    }
  };

  // Giá trị context
  const contextValue: DeviceInfoContextType = {
    deviceInfo: deviceInfoState,
    updateDeviceInfo,
    isUpdating
  };

  return (
    <DeviceInfoContext.Provider value={contextValue}>
      {children}
    </DeviceInfoContext.Provider>
  );
};

export default DeviceInfoContext;
