import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import { PermissionsAndroid } from 'react-native';

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

  // Thuật toán tính CRC16 (chuyển từ Java)
  private crc16_compute(data: Uint8Array, length: number): number {
    let crc = 0xFFFF; // Giá trị khởi tạo (-1 trong Java)
    
    for (let i = 0; i < length; i++) {
      // Đảo byte của CRC và XOR với byte dữ liệu hiện tại
      let tmp = (((crc << 8) & 0xFF00) | ((crc >> 8) & 0xFF)) ^ (data[i] & 0xFF);
      
      // XOR với byte cao dịch phải 4 bit
      tmp ^= ((tmp & 0xFF) >> 4);
      
      // Các phép biến đổi đặc biệt của thuật toán
      let tmp2 = tmp ^ ((tmp << 8) << 4);
      crc = tmp2 ^ (((tmp2 & 0xFF) << 4) << 1);
    }
    
    return crc & 0xFFFF;
  }

  // Kiểm tra CRC của gói dữ liệu
  private verifyPacketCRC(data: Buffer): boolean {
    const length = data.length;
    
    // Lấy CRC từ gói dữ liệu (2 byte cuối, byte thấp trước, byte cao sau)
    const receivedCRC = (data[length-1] << 8) | data[length-2];
    
    // Tính CRC cho phần dữ liệu (bỏ 2 byte CRC cuối)
    const calculatedCRC = this.crc16_compute(data.slice(0, length-2), length-2);
    
    return receivedCRC === calculatedCRC;
  }

  // Tạo gói lệnh có CRC
  private createCommandWithCRC(command: Uint8Array): Buffer {
    // Tính CRC16
    const crc = this.crc16_compute(command, command.length);
    const crcLow = crc & 0xFF;
    const crcHigh = (crc >> 8) & 0xFF;
    
    // Tạo buffer đầy đủ với CRC
    const fullCommand = Buffer.alloc(command.length + 2);
    command.forEach((byte, index) => {
      fullCommand[index] = byte;
    });
    fullCommand[command.length] = crcLow;
    fullCommand[command.length + 1] = crcHigh;
    
    return fullCommand;
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
      console.error('Lỗi khi nhận dữ liệu từ characteristic:', error);
      return;
    }
    
    if (!characteristic || !characteristic.value) return;
    
    // Giải mã dữ liệu Base64
    const data = Buffer.from(characteristic.value, 'base64');
    
    console.log(`Nhận dữ liệu từ ${characteristic.uuid}:`, this.bufferToHexString(data));
    
    // Kiểm tra CRC
    if (!this.verifyPacketCRC(data)) {
      console.error('Lỗi CRC trong gói dữ liệu');
      return;
    }
    
    // Nếu đây là characteristic gửi lệnh
    if (characteristic.uuid.toLowerCase() === COMMAND_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói thông tin giấc ngủ không (0x0504)
      if (data[0] === 0x05 && data[1] === 0x04) {
        console.log('Nhận được gói thông tin giấc ngủ');
        this.isReceivingSleepData = true;
        this.sleepDataPackets = [];
      }
    }
    
    // Nếu đây là characteristic dữ liệu chính
    if (characteristic.uuid.toLowerCase() === DATA_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói dữ liệu giấc ngủ không (0x0513)
      if (data[0] === 0x05 && data[1] === 0x13 && this.isReceivingSleepData) {
        console.log('Nhận được gói dữ liệu giấc ngủ');
        
        // Lấy độ dài gói
        const length = (data[2] << 8) + data[3];
        
        // Lấy payload (bỏ header 4 byte và checksum 2 byte)
        const payload = data.slice(4, length - 2);
        
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
        console.log(`Đã nhận ${this.sleepDataPackets.length} gói dữ liệu giấc ngủ, tiến hành phân tích`);
        
        // Kết hợp tất cả các gói lại
        const combinedData = Buffer.concat(this.sleepDataPackets);
        
        // Phân tích dữ liệu
        const sleepResults = this.parseSleepData(combinedData);
        
        // Đánh dấu đã xong
        this.isReceivingSleepData = false;
        
        // Gọi callback nếu có
        if (this.sleepDataCallback) {
          this.sleepDataCallback(sleepResults);
        }
      }
    }, 3000); // 3 giây không nhận được gói mới sẽ coi là đã xong
  }

  // Phân tích dữ liệu giấc ngủ từ buffer
  private parseSleepData(data: Buffer): SleepData[] {
    // Mảng kết quả
    const results: SleepData[] = [];
    
    // Ví dụ đơn giản về cách parse - cần điều chỉnh theo định dạng thực tế
    let offset = 0;
    
    while (offset < data.length) {
      // Tạo mẫu SleepData
      const sleepItem: SleepData = {
        deepSleepCount: 0,
        lightSleepCount: 0,
        startTime: 0,
        endTime: 0,
        deepSleepTotal: 0,
        lightSleepTotal: 0,
        rapidEyeMovementTotal: 0,
        sleepData: [],
        wakeCount: 0,
        wakeDuration: 0
      };
      
      // Parse dữ liệu - cần hiểu rõ cấu trúc dữ liệu thực tế
      // Đây là mẫu phỏng đoán dựa trên phân tích
      if (offset + 20 <= data.length) {
        // Lấy thời gian bắt đầu và kết thúc
        sleepItem.startTime = data.readUInt32LE(offset) * 1000; // Chuyển từ timestamp Unix sang JavaScript
        offset += 4;
        
        sleepItem.endTime = data.readUInt32LE(offset) * 1000;
        offset += 4;
        
        // Số chu kỳ ngủ sâu và ngủ nhẹ
        sleepItem.deepSleepCount = data.readUInt16LE(offset);
        offset += 2;
        
        sleepItem.lightSleepCount = data.readUInt16LE(offset);
        offset += 2;
        
        // Thời gian ngủ sâu và ngủ nhẹ (phút)
        sleepItem.deepSleepTotal = data.readUInt16LE(offset);
        offset += 2;
        
        sleepItem.lightSleepTotal = data.readUInt16LE(offset);
        offset += 2;
        
        // Thông tin về chu kỳ REM và thức giấc
        sleepItem.rapidEyeMovementTotal = data.readUInt16LE(offset);
        offset += 2;
        
        sleepItem.wakeCount = data.readUInt16LE(offset);
        offset += 2;
        
        sleepItem.wakeDuration = data.readUInt16LE(offset);
        offset += 2;
        
        // Phần còn lại của dữ liệu - chi tiết về các đoạn ngủ
        while (offset + 6 <= data.length) {
          const sleepSegment = {
            sleepStartTime: data.readUInt32LE(offset) * 1000,
            sleepLen: data.readUInt16LE(offset + 4),
            sleepType: data[offset + 6]
          };
          
          sleepItem.sleepData.push(sleepSegment);
          offset += 7; // Mỗi đoạn dài 7 byte
          
          // Kiểm tra nếu đã hết dữ liệu
          if (offset >= data.length) break;
        }
        
        results.push(sleepItem);
      } else {
        // Không đủ dữ liệu, thoát khỏi vòng lặp
        break;
      }
    }
    
    return results;
  }

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
      const finalInitCommand = this.createCommandWithCRC(initCommand);
      
      console.log('Gửi lệnh khởi tạo:', this.bufferToHexString(finalInitCommand));
      
      await this.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        COMMAND_CHARACTERISTIC_UUID,
        finalInitCommand.toString('base64')
      );
      
      // Đợi một chút
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Gửi lệnh lấy dữ liệu giấc ngủ
      const sleepCommand = new Uint8Array([0x05, 0x04, 0x06, 0x00]);
      const finalSleepCommand = this.createCommandWithCRC(sleepCommand);
      
      console.log('Gửi lệnh lấy dữ liệu giấc ngủ:', this.bufferToHexString(finalSleepCommand));
      
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
    return Array.from(buffer).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

export default BleService;
