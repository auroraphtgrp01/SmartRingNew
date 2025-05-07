import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, AppState, AppStateStatus, StatusBar, SafeAreaView } from 'react-native';
import { Device } from 'react-native-ble-plx';
import BleService from '../core/BleService';

// Import các component mới
// import EmptyState from '../components/EmptyState';
import DeviceScanner from '../components/DeviceScanner';
import HomeScreen from '../components/HomeScreen';
import HeartRateScreen from './HeartRate';
import SpO2Screen from './SpO2';
import SleepStatsScreen from './SleepStats';
import HealthStatsScreen from './HealthStats';
import CustomModal from '../components/CustomModal';
import { HealthDataProvider } from '../contexts/HealthDataProvider';
import { ContextConnector } from '../services/SyncHealthDataIntoCloud';

// Enum cho các màn hình
enum AppScreen {
  HOME,
  HEART_RATE,
  SPO2,
  SLEEP_STATS,
  HEALTH_STATS
}

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isFetchingData, setIsFetchingData] = useState<boolean>(false);
  const [sleepData, setSleepData] = useState<any[] | null>(null);
  const [appState, setAppState] = useState<string>(AppState.currentState);
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.HOME);

  // Khởi tạo BleService
  const bleService = BleService.getInstance();

  // Xử lý thay đổi trạng thái ứng dụng (chuyển nền/trở lại)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // Xử lý sự kiện khi bấm nút "Kết nối thiết bị"
  const handleConnectButtonPress = () => {
    console.log('Xử lý sự kiện kết nối thiết bị');
    setShowScanner(true);
  };

  // Hàm xử lý thay đổi trạng thái ứng dụng
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('Ứng dụng trở lại foreground');
      // Thực hiện kết nối lại nếu cần
    }
    setAppState(nextAppState);
  };

  // Yêu cầu quyền BLE
  const requestPermissions = async () => {
    const permissionsGranted = await bleService.requestPermissions();
    if (!permissionsGranted) {
      Alert.alert(
        'Quyền truy cập bị từ chối',
        'Vui lòng cấp quyền truy cập Bluetooth và vị trí để sử dụng ứng dụng.'
      );
    }
    return permissionsGranted;
  };

  // Bắt đầu quét thiết bị BLE
  const startScan = async () => {
    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) return;

    setIsScanning(true);
    setDevices([]);

    bleService.startScan((scannedDevices) => {
      setDevices(scannedDevices);
    });

    // Dừng quét sau 10 giây
    setTimeout(() => {
      bleService.stopScan();
      setIsScanning(false);
    }, 10000);
  };

  // Kết nối với thiết bị BLE
  const connectToDevice = async (device: Device) => {
    try {
      setIsConnecting(true);
      const connected = await bleService.connectToDevice(device.id, (connectionStatus) => {
        if (!connectionStatus) {
          setConnectedDevice(null);
          Alert.alert('Ngắt kết nối', 'Thiết bị đã ngắt kết nối');
        }
      });

      if (connected) {
        setConnectedDevice(device);
        setDevices([]);
        setShowScanner(false);
      } else {
        Alert.alert('Lỗi kết nối', 'Không thể kết nối với thiết bị');
      }
    } catch (error) {
      console.error('Lỗi khi kết nối:', error);
      Alert.alert('Lỗi kết nối', 'Đã xảy ra lỗi khi kết nối với thiết bị');
    } finally {
      setIsConnecting(false);
    }
  };

  // Ngắt kết nối với thiết bị
  const disconnectFromDevice = async () => {
    try {
      // Sử dụng phương thức mới để ngắt kết nối tất cả thiết bị và reset trạng thái
      await bleService.disconnectAllDevices();
      
      // Reset các state
      setConnectedDevice(null);
      setSleepData(null);
      setDevices([]);
      
      console.log('Đã ngắt kết nối tất cả thiết bị Bluetooth và reset trạng thái');
    } catch (error) {
      console.error('Lỗi khi ngắt kết nối:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi ngắt kết nối thiết bị');
    }
  };

  // Các hàm điều hướng màn hình
  const navigateToHome = () => setCurrentScreen(AppScreen.HOME);
  const navigateToHeartRate = () => setCurrentScreen(AppScreen.HEART_RATE);
  const navigateToSpO2 = () => setCurrentScreen(AppScreen.SPO2);
  const navigateToSleepStats = () => setCurrentScreen(AppScreen.SLEEP_STATS);
  const navigateToHealthStats = () => setCurrentScreen(AppScreen.HEALTH_STATS);

  // Các hàm xử lý lấy dữ liệu từ thiết bị
  const getSleepData = async () => {
    if (!connectedDevice) return;
    setIsFetchingData(true);
    try {
      await bleService.getSleepData((data) => {
        setIsFetchingData(false);
        if (data) {
          setSleepData(data);
          console.log('Dữ liệu giấc ngủ:', data);
        } else {
          Alert.alert('Không có dữ liệu', 'Không nhận được dữ liệu giấc ngủ từ thiết bị');
        }
      });
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu giấc ngủ:', error);
      setIsFetchingData(false);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi lấy dữ liệu giấc ngủ');
    }
  };

  const getSportData = async () => {
    if (!connectedDevice) return;
    setIsFetchingData(true);
    try {
      await bleService.getSportData((data) => {
        setIsFetchingData(false);
        if (data) {
          console.log('Dữ liệu thể thao:', data);
        } else {
          Alert.alert('Không có dữ liệu', 'Không nhận được dữ liệu thể thao từ thiết bị');
        }
      });
    } catch (error) {
      setIsFetchingData(false);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi lấy dữ liệu thể thao');
    }
  };

  const getHeartData = async () => {
    if (!connectedDevice) return;
    setIsFetchingData(true);
    try {
      await bleService.getHeartData((data) => {
        setIsFetchingData(false);
        if (data) {
          console.log('Dữ liệu nhịp tim:', data);
        } else {
          Alert.alert('Không có dữ liệu', 'Không nhận được dữ liệu nhịp tim từ thiết bị');
        }
      });
    } catch (error) {
      setIsFetchingData(false);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi lấy dữ liệu nhịp tim');
    }
  };

  const getBloodPressureData = async () => {
    if (!connectedDevice) return;
    setIsFetchingData(true);
    try {
      await bleService.getBloodPressureData((data) => {
        setIsFetchingData(false);
        if (data) {
          console.log('Dữ liệu huyết áp:', data);
        } else {
          Alert.alert('Không có dữ liệu', 'Không nhận được dữ liệu huyết áp từ thiết bị');
        }
      });
    } catch (error) {
      setIsFetchingData(false);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi lấy dữ liệu huyết áp');
    }
  };

  const startSpo2 = async () => {
    if (!connectedDevice) return;
    setIsFetchingData(true);
    try {
      await bleService.startSpo2((data) => {
        setIsFetchingData(false);
        if (data) {
          console.log('Dữ liệu spo2:', data);
        } else {
          Alert.alert('Không có dữ liệu', 'Không nhận được dữ liệu SpO2 từ thiết bị');
        }
      });
    } catch (error) {
      setIsFetchingData(false);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi lấy dữ liệu SpO2');
    }
  };

  const startHeartRate = async () => {
    if (!connectedDevice) return;
    setIsFetchingData(true);
    try {
      await bleService.startHeartRate((data) => {
        setIsFetchingData(false);
        if (data) {
          console.log('Dữ liệu nhịp tim:', data);
        } else {
          Alert.alert('Không có dữ liệu', 'Không nhận được dữ liệu nhịp tim từ thiết bị');
        }
      });
    } catch (error) {
      setIsFetchingData(false);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi lấy dữ liệu nhịp tim');
    }
  };

  const getDeviceInfo = async () => {
    if (!connectedDevice) return;
    setIsFetchingData(true);
    try {
      await bleService.getDeviceInfo((data) => {
        setIsFetchingData(false);
        if (data) {
          console.log('Thông tin thiết bị:', data);
        } else {
          Alert.alert('Không có dữ liệu', 'Không nhận được thông tin thiết bị');
        }
      });
    } catch (error) {
      setIsFetchingData(false);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi lấy thông tin thiết bị');
    }
  };

  const getComprehensiveData = async () => {
    if (!connectedDevice) return;
    setIsFetchingData(true);
    try {
      await bleService.getComprehensiveData((data) => {
        setIsFetchingData(false);
        if (data) {
          console.log('Dữ liệu tổng hợp:', data);
        } else {
          Alert.alert('Không có dữ liệu', 'Không nhận được dữ liệu tổng hợp từ thiết bị');
        }
      });
    } catch (error) {
      setIsFetchingData(false);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi lấy dữ liệu tổng hợp');
    }
  };

  // Render màn hình khi đã kết nối
  const renderConnectedScreens = () => {
    switch (currentScreen) {
      case AppScreen.HEART_RATE:
        return <HeartRateScreen onBack={navigateToHome} />;
      case AppScreen.SPO2:
        return <SpO2Screen onBack={navigateToHome} />;
      case AppScreen.SLEEP_STATS:
        return <SleepStatsScreen onBack={navigateToHome} />;
      case AppScreen.HEALTH_STATS:
        return <HealthStatsScreen onBack={navigateToHome} />;
      case AppScreen.HOME:
      default:
        return (
          <HomeScreen
            device={connectedDevice}
            onNavigateToHeartRate={navigateToHeartRate}
            onNavigateToSpO2={navigateToSpO2}
            onNavigateToSleepStats={navigateToSleepStats}
            onNavigateToHealthStats={navigateToHealthStats}
            onDisconnect={disconnectFromDevice}
            bleService={connectedDevice ? bleService : null}
            onConnect={handleConnectButtonPress}
          />
        );
    }
  };

  return (
    <HealthDataProvider>
      <ContextConnector />
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
        <View style={styles.container}>
          {renderConnectedScreens()}
        </View>
        
        {/* Modal để hiển thị DeviceScanner */}
        <CustomModal
          visible={showScanner}
          onClose={() => {
            console.log('Đóng CustomModal');
            setShowScanner(false);
          }}
        >
          <DeviceScanner
            isScanning={isScanning}
            devices={devices}
            onStartScan={startScan}
            onConnectDevice={connectToDevice}
            isConnecting={isConnecting}
            onBack={() => setShowScanner(false)}
            onDisconnectDevice={disconnectFromDevice}
          />
        </CustomModal>
      </SafeAreaView>
    </HealthDataProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});