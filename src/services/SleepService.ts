import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from './ByteService';
import BleService from './BleService';

// UUID của service và characteristics
const SERVICE_UUID = 'be940000-7333-be46-b7ae-689e71722bd5';
const COMMAND_CHARACTERISTIC_UUID = 'be940001-7333-be46-b7ae-689e71722bd5';
const DATA_CHARACTERISTIC_UUID = 'be940003-7333-be46-b7ae-689e71722bd5';

/**
 * Dịch vụ xử lý dữ liệu giấc ngủ từ thiết bị
 */
export class SleepService {
  private static instance: SleepService;
  private sleepDataPackets: Array<Buffer> = [];
  private isReceivingSleepData: boolean = false;
  private sleepDataCallback: ((data: any[] | null) => void) | null = null;
  private dataTimeoutId: NodeJS.Timeout | null = null;
  
  private constructor() {}
  
  /**
   * Lấy instance của service
   */
  public static getInstance(): SleepService {
    if (!SleepService.instance) {
      SleepService.instance = new SleepService();
    }
    return SleepService.instance;
  }
  
  /**
   * Gửi lệnh lấy dữ liệu giấc ngủ
   * @param device Thiết bị BLE đã kết nối
   * @param callback Callback nhận dữ liệu giấc ngủ
   * @returns true nếu gửi lệnh thành công, false nếu có lỗi
   */
  public async getSleepData(device: Device, callback: (data: any[] | null) => void): Promise<boolean> {
    if (!device || !device.isConnected) {
      callback(null);
      return false;
    }
    
    this.sleepDataCallback = callback;
    this.sleepDataPackets = [];
    this.isReceivingSleepData = false;
    
    try {
      // Sử dụng BleService để đăng ký lắng nghe sự kiện
      // Lưu ý: đây chỉ là để đăng ký lắng nghe các sự kiện chung
      // Các sự kiện liên quan đến dữ liệu giấc ngủ vẫn cần đăng ký riêng
      await BleService.getInstance().setupNotifications();
      
      // Đăng ký thêm các lắng nghe riêng cho dữ liệu giấc ngủ
      device.monitorCharacteristicForService(
        SERVICE_UUID,
        COMMAND_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this, device)
      );
      
      device.monitorCharacteristicForService(
        SERVICE_UUID,
        DATA_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this, device)
      );
      
      // Gửi lệnh khởi tạo
      const initCommand = new Uint8Array([0x05, 0x80, 0x07, 0x00, 0x00]);
      const finalInitCommand = ByteService.createCommandWithCRC(initCommand);
      
      console.log('Gửi lệnh khởi tạo:', ByteService.bufferToHexString(finalInitCommand), `(Độ dài: ${finalInitCommand.length} bytes)`)
      
      await device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        COMMAND_CHARACTERISTIC_UUID,
        finalInitCommand.toString('base64')
      );
      
      // Đợi một chút
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Gửi lệnh lấy dữ liệu giấc ngủ
      const sleepCommand = new Uint8Array([0x05, 0x04, 0x06, 0x00]);
      const finalSleepCommand = ByteService.createCommandWithCRC(sleepCommand);
      
      console.log('Gửi lệnh lấy dữ liệu giấc ngủ:', ByteService.bufferToHexString(finalSleepCommand), `(Độ dài: ${finalSleepCommand.length} bytes)`)
      
      await device.writeCharacteristicWithResponseForService(
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
  

  
  /**
   * Xử lý dữ liệu từ characteristic
   * @param device Thiết bị BLE đã kết nối
   * @param error Lỗi nếu có
   * @param characteristic Characteristic nhận được
   */
  private handleCharacteristicUpdate(device: Device, error: Error | null, characteristic: any | null): void {
    if (error) {
      console.error('Lỗi khi nhận dữ liệu:', error);
      return;
    }
    
    // Đảm bảo có dữ liệu
    if (!characteristic || !characteristic.value) return;
    
    // Giải mã giá trị nhận được từ Base64
    const buffer = Buffer.from(characteristic.value, 'base64');
    
    console.log(`Nhận dữ liệu từ ${characteristic.uuid}: ${ByteService.bufferToHexString(buffer)} (Độ dài: ${buffer.length} bytes)`);
    
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
        const payload = buffer.slice(4, buffer.length - 2);
        
        // Thêm vào mảng gói dữ liệu
        this.sleepDataPackets.push(payload);
        
        // Bắt đầu bộ đếm timeout để kiểm tra khi nào dữ liệu hoàn tất
        this.startDataTimeoutCheck();
      }
    }
  }
  
  /**
   * Bộ đếm timeout để kiểm tra khi nào dữ liệu hoàn tất
   */
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
          console.log(`Gói dữ liệu ${index + 1}: ${ByteService.bufferToHexString(packet)} (Độ dài: ${packet.length} bytes)`);
        });
        
        // Kết hợp tất cả các gói lại
        const combinedData = Buffer.concat(this.sleepDataPackets);
        console.log(`Dữ liệu sau khi ghép: ${ByteService.bufferToHexString(combinedData)} (Tổng độ dài: ${combinedData.length} bytes)`);
        
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
}

export default SleepService;
