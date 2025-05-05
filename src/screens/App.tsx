import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform, AppState, AppStateStatus, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { Device } from 'react-native-ble-plx';
import BleService, { SleepData } from '../services/BleService';

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isFetchingSleepData, setIsFetchingSleepData] = useState<boolean>(false);
  const [sleepData, setSleepData] = useState<SleepData[] | null>(null);
  const [appState, setAppState] = useState<string>(AppState.currentState);

  // Khởi tạo BleService
  const bleService = BleService.getInstance();

  // Xử lý thay đổi trạng thái ứng dụng (chuyển nền/trở lại)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

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

    // Dừng quét sau 5 giây
    setTimeout(() => {
      bleService.stopScan();
      setIsScanning(false);
    }, 5000);
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
    if (!connectedDevice) return;

    try {
      await bleService.disconnectFromDevice();
      setConnectedDevice(null);
      setSleepData(null);
    } catch (error) {
      console.error('Lỗi khi ngắt kết nối:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi ngắt kết nối thiết bị');
    }
  };

  // Lấy dữ liệu giấc ngủ
  const getSleepData = async () => {
    if (!connectedDevice) {
      Alert.alert('Lỗi', 'Vui lòng kết nối với thiết bị trước');
      return;
    }

    setIsFetchingSleepData(true);

    try {
      await bleService.getSleepData((data) => {
        setIsFetchingSleepData(false);
        if (data) {
          setSleepData(data);
          console.log('Dữ liệu giấc ngủ:', data);
        } else {
          Alert.alert('Không có dữ liệu', 'Không nhận được dữ liệu giấc ngủ từ thiết bị');
        }
      });
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu giấc ngủ:', error);
      setIsFetchingSleepData(false);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi lấy dữ liệu giấc ngủ');
    }
  };

  // Hàm định dạng thời gian
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Hàm định dạng thời gian phút thành giờ:phút
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Hiển thị loại giấc ngủ
  const getSleepTypeName = (sleepType: number) => {
    switch (sleepType) {
      case 241: return 'Ngủ sâu';
      case 242: return 'Ngủ nhẹ';
      case 243: return 'REM';
      case 244: return 'Thức giấc';
      default: return 'Không xác định';
    }
  };

  // Hiển thị danh sách thiết bị
  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item)}
      disabled={isConnecting}
    >
      <Text style={styles.deviceName}>{item.name}</Text>
      <Text style={styles.deviceId}>ID: {item.id}</Text>
    </TouchableOpacity>
  );

  // Hiển thị dữ liệu giấc ngủ
  const renderSleepData = () => {
    if (!sleepData || sleepData.length === 0) return null;

    return sleepData.map((item, index) => (
      <View key={index} style={styles.sleepDataItem}>
        <Text style={styles.sleepDataTitle}>Phiên ngủ #{index + 1}</Text>
        <Text>Bắt đầu: {formatDate(item.startTime)}</Text>
        <Text>Kết thúc: {formatDate(item.endTime)}</Text>
        <Text>Tổng thời gian ngủ sâu: {formatMinutes(item.deepSleepTotal)}</Text>
        <Text>Tổng thời gian ngủ nhẹ: {formatMinutes(item.lightSleepTotal)}</Text>
        <Text>Tổng thời gian REM: {formatMinutes(item.rapidEyeMovementTotal)}</Text>
        <Text>Số lần thức giấc: {item.wakeCount}</Text>
        <Text>Tổng thời gian thức giấc: {formatMinutes(item.wakeDuration)}</Text>
        
        <Text style={styles.sleepDetailTitle}>Chi tiết các giai đoạn:</Text>
        <ScrollView style={styles.sleepDetailContainer}>
          {item.sleepData.map((segment, segIndex) => (
            <View key={segIndex} style={styles.sleepSegment}>
              <Text>Thời gian: {formatDate(segment.sleepStartTime)}</Text>
              <Text>Thời lượng: {segment.sleepLen} phút</Text>
              <Text>Trạng thái: {getSleepTypeName(segment.sleepType)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ứng Dụng Theo Dõi Giấc Ngủ</Text>
      
      {/* Phần hiển thị thiết bị đã kết nối */}
      {connectedDevice ? (
        <View style={styles.connectedDeviceContainer}>
          <Text style={styles.sectionTitle}>Thiết bị đã kết nối</Text>
          <Text style={styles.deviceName}>{connectedDevice.name}</Text>
          <Text style={styles.deviceId}>ID: {connectedDevice.id}</Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={getSleepData}
            disabled={isFetchingSleepData}
          >
            {isFetchingSleepData ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Lấy Dữ Liệu Giấc Ngủ</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.buttonDisconnect} 
            onPress={disconnectFromDevice}
          >
            <Text style={styles.buttonText}>Ngắt Kết Nối</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Phần quét thiết bị */
        <View style={styles.scanContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={startScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Quét Thiết Bị</Text>
            )}
          </TouchableOpacity>
          
          {devices.length > 0 && (
            <View style={styles.deviceList}>
              <Text style={styles.sectionTitle}>Thiết bị đã tìm thấy</Text>
              <FlatList
                data={devices}
                renderItem={renderDeviceItem}
                keyExtractor={(item) => item.id}
              />
            </View>
          )}
        </View>
      )}
      
      {/* Hiển thị dữ liệu giấc ngủ */}
      {sleepData && sleepData.length > 0 && (
        <ScrollView style={styles.sleepDataContainer}>
          <Text style={styles.sectionTitle}>Dữ Liệu Giấc Ngủ</Text>
          {renderSleepData()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonDisconnect: {
    backgroundColor: '#607D8B',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 5,
  },
  scanContainer: {
    marginBottom: 20,
  },
  deviceList: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
    maxHeight: 200,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  deviceItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceId: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'normal',
  },
  connectedDeviceContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  sleepDataContainer: {
    flex: 1,
    marginTop: 10,
  },
  sleepDataItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  sleepDataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2196F3',
  },
  sleepDetailTitle: {
    marginTop: 10,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  sleepDetailContainer: {
    maxHeight: 200,
    marginTop: 5,
  },
  sleepSegment: {
    padding: 10,
    marginBottom: 5,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
});