import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import { ByteService } from './ByteService';

// UUID của service và characteristics
const SERVICE_UUID = 'be940000-7333-be46-b7ae-689e71722bd5';
const COMMAND_CHARACTERISTIC_UUID = 'be940001-7333-be46-b7ae-689e71722bd5';
const DATA_CHARACTERISTIC_UUID = 'be940003-7333-be46-b7ae-689e71722bd5';

// Interface cho dữ liệu giấc ngủ
export interface SleepData {
  deepSleepCount: number;
  lightSleepCount: number;
  startTime: number;
  endTime: number;
  deepSleepTotal: number;
  lightSleepTotal: number;
  rapidEyeMovementTotal: number;
  sleepData: Array<{
    sleepStartTime: number;
    sleepLen: number;
    sleepType: number;
  }>;
  wakeCount: number;
  wakeDuration: number;
}

// Lớp singleton quản lý kết nối BLE và xử lý dữ liệu
class BleService {
  private static instance: BleService;
  private bleManager: BleManager;
  private device: Device | null = null;
  private isConnected: boolean = false;
  private isScanningDevices: boolean = false;
  private isReceivingSleepData: boolean = false;
  private sleepDataPackets: Array<Buffer> = [];
  private sleepDataCallback: ((data: SleepData[] | null) => void) | null = null;
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
        if (device.name && (device.name.includes('Ring') || device.name.includes('R12'))) {
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



  // Bật lắng nghe thông báo từ các characteristic
  private async setupNotifications(): Promise<boolean> {
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
    
    console.log(`Nhận dữ liệu từ ${characteristic.uuid}: ${this.bufferToHexString(buffer)} (Độ dài: ${buffer.length} bytes)`);
    
    // Kiểm tra CRC của gói dữ liệu
    if (!ByteService.verifyPacketCRC(buffer)) {
      console.error('CRC không hợp lệ! Bỏ qua gói dữ liệu');
      return;
    }
    
    // Xử lý dữ liệu từ characteristic lệnh (COMMAND_CHARACTERISTIC)
    if (characteristic.uuid.toLowerCase() === COMMAND_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói thông tin giấc ngủ không (0x0504)
      if (buffer[0] === 0x05 && buffer[1] === 0x04) {
        console.log('Nhận được gói thông tin giấc ngủ');
        this.isReceivingSleepData = true;
        this.sleepDataPackets = [];
        
        // Lấy thông tin từ gói thông tin giấc ngủ (nếu cần)
        // Có thể lưu thông tin này để sử dụng trong quá trình phân tích sau này
        // Ví dụ: số lượng bản ghi, thời gian bắt đầu/kết thúc, v.v.
      }
    }
    
    // Xử lý dữ liệu từ characteristic dữ liệu (DATA_CHARACTERISTIC)
    else if (characteristic.uuid.toLowerCase() === DATA_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói dữ liệu giấc ngủ không (0x0513)
      if (buffer[0] === 0x05 && buffer[1] === 0x13 && this.isReceivingSleepData) {
        console.log('Nhận được gói dữ liệu giấc ngủ');
        
        // Lấy độ dài gói
        const length = (buffer[2] << 8) + buffer[3];
        
        // Lấy payload (bỏ header 4 byte và CRC 2 byte cuối)
        // Chú ý: buffer.length - 2 là độ dài gói tính từ đầu, bỏ 2 byte CRC cuối
        const payload = buffer.slice(4, buffer.length - 2);
        
        // Thêm vào mảng gói dữ liệu
        this.sleepDataPackets.push(payload);
        
        // Bắt đầu bộ đếm timeout để kiểm tra khi nào dữ liệu hoàn tất
        this.startDataTimeoutCheck();
      }
    }
  }

  // Bộ đếm timeout để kiểm tra khi nào dữ liệu hoàn tất
  private dataTimeoutId: NodeJS.Timeout | null = null;
  
  private startDataTimeoutCheck(): void {
    // Xóa timeout hiện tại nếu có
    if (this.dataTimeoutId) {
      clearTimeout(this.dataTimeoutId);
    }
    
    // Đặt timeout mới - nếu không có gói mới trong 3 giây, coi như đã nhận đủ dữ liệu
    this.dataTimeoutId = setTimeout(() => {
      if (this.isReceivingSleepData && this.sleepDataPackets.length > 0) {
        console.log(`Đã nhận ${this.sleepDataPackets.length} gói dữ liệu giấc ngủ, tiến hành ghép dữ liệu`);
        
        // Log kích thước của mỗi gói dữ liệu
        this.sleepDataPackets.forEach((packet, index) => {
          console.log(`Gói dữ liệu ${index + 1}: ${this.bufferToHexString(packet)} (Độ dài: ${packet.length} bytes)`);
        });
        
        // Kết hợp tất cả các gói lại
        const combinedData = Buffer.concat(this.sleepDataPackets);
        console.log(`Dữ liệu sau khi ghép: ${this.bufferToHexString(combinedData)} (Tổng độ dài: ${combinedData.length} bytes)`);
        
        // Lưu trữ dữ liệu đã ghép để sử dụng sau (nếu cần)
        // Có thể thêm các bước phân tích dữ liệu sau này
        
        // Gọi callback với dữ liệu đã ghép hoặc null
        if (this.sleepDataCallback) {
          // Gọi với null vì chưa phân tích dữ liệu
          this.sleepDataCallback(null);
        }
        
        this.isReceivingSleepData = false;
      }
    }, 3000); // 3 giây không nhận được gói mới sẽ coi là đã xong
  }
  
  // Hàm mẫu để sau này phân tích dữ liệu giấc ngủ (chưa sử dụng trong phiên bản hiện tại)
  /*
  private parseSleepData(data: Buffer): SleepData | null {
    // Các bước phân tích dữ liệu giấc ngủ sẽ được thực hiện sau
    return null;
  }
  */

  // Gửi lệnh lấy dữ liệu giấc ngủ
  public async getSleepData(callback: (data: SleepData[] | null) => void): Promise<boolean> {
    if (!this.device || !this.isConnected) {
      callback(null);
      return false;
    }
    
    this.sleepDataCallback = callback;
    this.sleepDataPackets = [];
    this.isReceivingSleepData = false;
    
    try {
      // Bật lắng nghe thông báo
      await this.setupNotifications();
      
      // Gửi lệnh khởi tạo
      const initCommand = new Uint8Array([0x05, 0x80, 0x07, 0x00, 0x00]);
      const finalInitCommand = ByteService.createCommandWithCRC(initCommand);
      
      console.log('Gửi lệnh khởi tạo:', this.bufferToHexString(finalInitCommand), `(Độ dài: ${finalInitCommand.length} bytes)`)
      
      await this.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        COMMAND_CHARACTERISTIC_UUID,
        finalInitCommand.toString('base64')
      );
      
      // Đợi một chút
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Gửi lệnh lấy dữ liệu giấc ngủ
      const sleepCommand = new Uint8Array([0x05, 0x04, 0x06, 0x00]);
      const finalSleepCommand = ByteService.createCommandWithCRC(sleepCommand);
      
      console.log('Gửi lệnh lấy dữ liệu giấc ngủ:', this.bufferToHexString(finalSleepCommand), `(Độ dài: ${finalSleepCommand.length} bytes)`)
      
      await this.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        COMMAND_CHARACTERISTIC_UUID,
        finalSleepCommand.toString('base64')
      );
      
      console.log('Đã gửi lệnh lấy dữ liệu giấc ngủ, đang đợi phản hồi...');
      
      return true;
    } catch (error) {
      console.error('Lỗi khi gửi lệnh lấy dữ liệu giấc ngủ:', error);
      callback(null);
      return false;
    }
  }

  // Hàm tiện ích chuyển Buffer thành chuỗi hex
  private bufferToHexString(buffer: Buffer): string {
    // Thêm khoảng cách giữa các byte và trả về cả độ dài của buffer
    return Array.from(buffer).map(byte => byte.toString(16).padStart(2, '0')).join(' ');
  }
}

export default BleService;
