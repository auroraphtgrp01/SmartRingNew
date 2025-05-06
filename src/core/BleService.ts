import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import { ByteService } from './ByteService';
import SleepService from '../services/SleepService';
import SportService from '../services/SportService';
import HeartHistoryService from '../services/HeartHistoryService';

// UUID của service và characteristics
const SERVICE_UUID = 'be940000-7333-be46-b7ae-689e71722bd5';
const COMMAND_CHARACTERISTIC_UUID = 'be940001-7333-be46-b7ae-689e71722bd5';
const DATA_CHARACTERISTIC_UUID = 'be940003-7333-be46-b7ae-689e71722bd5';

// Lớp singleton quản lý kết nối BLE và xử lý dữ liệu
class BleService {
  private static instance: BleService;
  private bleManager: BleManager;
  private device: Device | null = null;
  private isConnected: boolean = false;
  private isScanningDevices: boolean = false;
  private connectionCallback: ((connected: boolean) => void) | null = null;

  private constructor() {
    this.bleManager = new BleManager();
  }

  // Lấy instance của service
  public static getInstance(): BleService {
    if (!BleService.instance) {
      BleService.instance = new BleService();
    }
    return BleService.instance;
  }

  // Yêu cầu quyền truy cập Bluetooth trên Android
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 31) { // Android 12+
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted' &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted' &&
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted'
        );
      } else { // Android < 12
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === 'granted';
      }
    } catch (error) {
      console.error('Lỗi khi yêu cầu quyền Bluetooth:', error);
      return false;
    }
  }

  // Bắt đầu quét thiết bị
  public startScan(callback: (devices: Device[]) => void): void {
    if (this.isScanningDevices) return;

    this.isScanningDevices = true;
    const devices: Device[] = [];

    // Xóa thiết bị đã quét trước đó
    this.bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Lỗi khi quét thiết bị:', error);
        this.isScanningDevices = false;
        return;
      }

      if (device) {
        // Lọc chỉ các thiết bị có tên và tên chứa "Ring" hoặc "R12"
        if (device.name && (device.name.includes('R12'))) {
          // Kiểm tra xem thiết bị đã tồn tại trong danh sách chưa
          const existingDeviceIndex = devices.findIndex(d => d.id === device.id);
          if (existingDeviceIndex === -1) {
            devices.push(device);
            callback([...devices]);
          }
        }
      }
    });

    // Dừng quét sau 5 giây
    setTimeout(() => {
      this.stopScan();
    }, 5000);
  }

  // Dừng quét thiết bị
  public stopScan(): void {
    this.bleManager.stopDeviceScan();
    this.isScanningDevices = false;
  }

  // Kết nối với thiết bị
  public async connectToDevice(deviceId: string, callback: (connected: boolean) => void): Promise<boolean> {
    this.connectionCallback = callback;
    try {
      this.stopScan();
      console.log('Đang kết nối với thiết bị:', deviceId);
      
      const device = await this.bleManager.connectToDevice(deviceId);
      console.log('Đã kết nối với thiết bị:', device.name);
      
      // Khám phá dịch vụ và đặc tính
      await device.discoverAllServicesAndCharacteristics();
      console.log('Đã khám phá dịch vụ và đặc tính');
      
      this.device = device;
      this.isConnected = true;
      
      // Theo dõi khi thiết bị bị ngắt kết nối
      device.onDisconnected(() => {
        console.log('Thiết bị đã ngắt kết nối');
        this.isConnected = false;
        this.device = null;
        if (this.connectionCallback) {
          this.connectionCallback(false);
        }
      });
      
      if (this.connectionCallback) {
        this.connectionCallback(true);
      }
      
      return true;
    } catch (error) {
      console.error('Lỗi khi kết nối với thiết bị:', error);
      this.isConnected = false;
      this.device = null;
      if (this.connectionCallback) {
        this.connectionCallback(false);
      }
      return false;
    }
  }

  // Ngắt kết nối với thiết bị
  public async disconnectFromDevice(): Promise<boolean> {
    if (!this.device || !this.isConnected) return false;
    
    try {
      await this.device.cancelConnection();
      this.isConnected = false;
      this.device = null;
      return true;
    } catch (error) {
      console.error('Lỗi khi ngắt kết nối thiết bị:', error);
      return false;
    }
  }



  /**
   * Bật lắng nghe thông báo từ các characteristic
   * @returns true nếu thiết lập thành công, false nếu có lỗi
   */
  public async setupNotifications(): Promise<boolean> {
    if (!this.device || !this.isConnected) return false;
    
    try {
      // Bật thông báo cho COMMAND_CHARACTERISTIC
      await this.device.monitorCharacteristicForService(
        SERVICE_UUID,
        COMMAND_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this)
      );
      console.log('Đã bật thông báo cho Command Characteristic');
      
      // Bật thông báo cho DATA_CHARACTERISTIC
      await this.device.monitorCharacteristicForService(
        SERVICE_UUID,
        DATA_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this)
      );
      console.log('Đã bật thông báo cho Data Characteristic');
      
      return true;
    } catch (error) {
      console.error('Lỗi khi bật thông báo:', error);
      return false;
    }
  }

  // Xử lý dữ liệu từ characteristic
  private handleCharacteristicUpdate(error: Error | null, characteristic: Characteristic | null): void {
    if (error) {
      console.error('Lỗi khi nhận dữ liệu:', error);
      return;
    }
    
    // Đảm bảo có dữ liệu
    if (!characteristic || !characteristic.value) return;
    
    // Giải mã giá trị nhận được từ Base64
    const buffer = Buffer.from(characteristic.value, 'base64');
    
    console.log(`Nhận dữ liệu từ ${characteristic.uuid}: ${ByteService.bufferToHexString(buffer)} (Độ dài: ${buffer.length} bytes)`);
  }
  
  /**
   * Gửi lệnh lấy dữ liệu giấc ngủ
   * @param callback Callback nhận dữ liệu giấc ngủ
   * @returns true nếu gửi lệnh thành công, false nếu có lỗi
   */
  public async getSleepData(callback: (data: any[] | null) => void): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      callback(null);
      return false;
    }
    
    return await SleepService.getInstance().getSleepData(this.device, callback);
  }

  public async getSportData(callback: (data: any[] | null) => void): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      callback(null);
      return false;
    }
    
    return await SportService.getInstance().getSportData(this.device, callback);
  }

  public async getHeartData(callback: (data: any[] | null) => void): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      callback(null);
      return false;
    }
    
    return await HeartHistoryService.getInstance().getHeartData(this.device, callback);
  }

}

export default BleService;
