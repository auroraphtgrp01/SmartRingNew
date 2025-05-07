import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import { ByteService } from './ByteService';
import SleepService from '../services/SleepService';
import SportService from '../services/SportService';
import HeartHistoryService from '../services/HeartHistoryService';
import BloodPressureService from '../services/BloodPressureService';
import ComprehensiveService from '../services/ComprehensiveService';
import HealthSyncService from '../services/BaseHealthService';
import DeviceInfoService from '../services/DeviceInfoService';
import SpO2Service from '../services/SpO2Service';
import HeartRateService from '../services/HeartRateService';
import DeleteHealthService from '../services/DeleteHealthService';

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
  private commandSubscription: any = null;
  private dataSubscription: any = null;
  private serviceSubscriptions: any[] = [];

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
        
        // Hủy đăng ký lắng nghe thông báo trước khi đặt device = null
        this.cancelAllNotifications();
        
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
    if (!this.device) return false;

    try {
      // Hủy đăng ký lắng nghe thông báo trước khi ngắt kết nối
      this.cancelAllNotifications();
      
      await this.device.cancelConnection();
      this.device = null;
      this.isConnected = false;
      if (this.connectionCallback) {
        this.connectionCallback(false);
      }
      return true;
    } catch (error) {
      console.error('Lỗi khi ngắt kết nối thiết bị:', error);
      return false;
    }
  }

  /**
   * Ngắt kết nối tất cả thiết bị Bluetooth và reset trạng thái
   * @returns true nếu thành công, false nếu có lỗi
   */
  public async disconnectAllDevices(): Promise<boolean> {
    try {
      // Ngắt kết nối thiết bị hiện tại nếu có
      if (this.device) {
        // Hủy đăng ký lắng nghe thông báo trước khi ngắt kết nối
        this.cancelAllNotifications();
        
        await this.device.cancelConnection();
        this.device = null;
        this.isConnected = false;
        if (this.connectionCallback) {
          this.connectionCallback(false);
        }
      }

      // Dừng quét nếu đang quét
      if (this.isScanningDevices) {
        this.stopScan();
      }

      // Reset trạng thái của BleManager
      this.bleManager.destroy();
      this.bleManager = new BleManager();
      
      console.log('Đã ngắt kết nối tất cả thiết bị Bluetooth và reset trạng thái');
      return true;
    } catch (error) {
      console.error('Lỗi khi ngắt kết nối tất cả thiết bị:', error);
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
      this.commandSubscription = this.device.monitorCharacteristicForService(
        SERVICE_UUID,
        COMMAND_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this)
      );
      console.log('Đã bật thông báo cho Command Characteristic');
      
      // Bật thông báo cho DATA_CHARACTERISTIC
      this.dataSubscription = this.device.monitorCharacteristicForService(
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
    // Kiểm tra nếu thiết bị đã ngắt kết nối hoặc không còn kết nối
    if (!this.device || !this.isConnected) {
      return; // Không xử lý nếu không còn kết nối
    }
    
    if (error) {
      // Kiểm tra nếu lỗi là do thiết bị ngắt kết nối
      if (error.message && error.message.includes('disconnected')) {
        // Đã được xử lý bởi sự kiện onDisconnected, không cần log lỗi
        return;
      }
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

  public async getBloodPressureData(callback: (data: any[] | null) => void): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      callback(null);
      return false;
    }
    
    return await BloodPressureService.getInstance().getBloodPressureData(this.device, callback);
  }

  public async getComprehensiveData(callback: (data: any[] | null) => void): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      callback(null);
      return false;
    }
    
    return await ComprehensiveService.getInstance().getComprehensiveData(this.device, callback);
  }

  public async syncHealthData(
    onProgress?: (progress: number, currentService: string) => void,
    onComplete?: () => void
  ): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      return false;
    }
    
    return await HealthSyncService.getInstance().syncHealthData(this.device, onProgress, onComplete);
  }

  public async getDeviceInfo(callback: (data: any | null) => void): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      callback(null);
      return false;
    }
    
    return await DeviceInfoService.getInstance().getDeviceInfo(this.device, callback);
  }

  /**
   * Bắt đầu đo SPO2
   * @param callback Callback nhận dữ liệu SPO2
   * @returns true nếu gửi lệnh thành công, false nếu có lỗi
   */
  public async startSpo2(callback: (data: any | null) => void): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      callback(null);
      return false;
    }
    
    return await SpO2Service.getInstance().startSpo2(this.device, callback);
  }

  /**
   * Dừng đo SPO2
   * @returns true nếu gửi lệnh thành công, false nếu có lỗi
   */
  public async stopSpo2(): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      return false;
    }
    
    return await SpO2Service.getInstance().stopSpo2(this.device);
  }

  /**
   * Bắt đầu đo nhịp tim
   * @param callback Callback nhận dữ liệu nhịp tim
   * @returns true nếu gửi lệnh thành công, false nếu có lỗi
   */
  public async startHeartRate(callback: (data: any | null) => void): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      callback(null);
      return false;
    }
    
    return await HeartRateService.getInstance().startHeartRate(this.device, callback);
  }

  /**
   * Dừng đo nhịp tim
   * @returns true nếu gửi lệnh thành công, false nếu có lỗi
   */
  public async stopHeartRate(): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      return false;
    }
    
    return await HeartRateService.getInstance().stopHeartRate(this.device);
  }
  
  /**
   * Xóa tất cả lịch sử dữ liệu sức khỏe (tuần tự gọi 5 lệnh xóa, cách nhau 300ms)
   * @param progressCallback Callback theo dõi tiến trình xóa (từ 0-100)
   * @returns true nếu gửi tất cả lệnh thành công, false nếu có bất kỳ lỗi nào
   */
  public async deleteHealthData(progressCallback?: (progress: number) => void): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      return false;
    }
    
    return await DeleteHealthService.getInstance().deleteAllHealthData(this.device, progressCallback);
  }

  /**
   * Hủy đăng ký lắng nghe thông báo từ các characteristic của BleService
   */
  private cancelNotifications(): void {
    try {
      if (this.commandSubscription) {
        this.commandSubscription.remove();
        this.commandSubscription = null;
      }
      
      if (this.dataSubscription) {
        this.dataSubscription.remove();
        this.dataSubscription = null;
      }
      
      console.log('Đã hủy đăng ký lắng nghe thông báo từ các characteristic của BleService');
    } catch (error) {
      console.error('Lỗi khi hủy đăng ký lắng nghe thông báo:', error);
    }
  }
  
  /**
   * Hủy tất cả đăng ký lắng nghe thông báo, bao gồm cả từ các dịch vụ con
   * Gọi phương thức này trước khi ngắt kết nối thiết bị
   */
  private cancelAllNotifications(): void {
    try {
      // Hủy đăng ký của BleService
      this.cancelNotifications();
      
      // Hủy đăng ký từ các dịch vụ con
      for (const subscription of this.serviceSubscriptions) {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        }
      }
      
      // Đặt lại mảng đăng ký
      this.serviceSubscriptions = [];
      
      // Đặt lại trạng thái của các dịch vụ con
      this.resetServiceStates();
      
      console.log('Đã hủy tất cả đăng ký lắng nghe thông báo');
    } catch (error) {
      console.error('Lỗi khi hủy tất cả đăng ký lắng nghe thông báo:', error);
    }
  }
  
  /**
   * Đăng ký một subscription từ dịch vụ con
   * @param subscription Subscription cần đăng ký
   */
  public registerServiceSubscription(subscription: any): void {
    if (subscription) {
      this.serviceSubscriptions.push(subscription);
    }
  }
  
  /**
   * Đặt lại trạng thái của các dịch vụ con
   */
  private resetServiceStates(): void {
    try {
      // Đặt lại trạng thái của SpO2Service
      const spo2Service = require('../services/SpO2Service').default.getInstance();
      if (spo2Service && typeof spo2Service.resetState === 'function') {
        spo2Service.resetState();
      }
      
      // Đặt lại trạng thái của HeartRateService
      const heartRateService = require('../services/HeartRateService').default.getInstance();
      if (heartRateService && typeof heartRateService.resetState === 'function') {
        heartRateService.resetState();
      }
      
      console.log('Đã đặt lại trạng thái của các dịch vụ con');
    } catch (error) {
      console.error('Lỗi khi đặt lại trạng thái của các dịch vụ con:', error);
    }
  }
}

export default BleService;
