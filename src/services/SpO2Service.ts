import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import { Constants } from '../constants';

export class SpO2Service {
  private static instance: SpO2Service;
  private isMonitoring: boolean = false;
  private dataCallback: ((data: any | null) => void) | null = null;
  
  // Dữ liệu SPO2
  public spo2Data: {
    spo2Value: number;
    heartRate: number;
    timestamp: number;
    rawData: any[];
  } = {
    spo2Value: 0,
    heartRate: 0,
    timestamp: 0,
    rawData: [],
  };

  private constructor() {}
  
  public static getInstance(): SpO2Service {
    if (!SpO2Service.instance) {
      SpO2Service.instance = new SpO2Service();
    }
    return SpO2Service.instance;
  }
  
  /**
   * Bắt đầu đo SPO2
   * @param device Thiết bị BLE đã kết nối
   * @param callback Callback nhận dữ liệu SPO2
   * @returns true nếu gửi lệnh thành công, false nếu có lỗi
   */
  public async startSpo2(device: Device, callback: (data: any | null) => void): Promise<boolean> {
    if (!device || !device.isConnected) {
      callback(null);
      return false;
    }
    
    try {
      this.dataCallback = callback;
      this.isMonitoring = true;
      this.spo2Data.rawData = [];
      
      // Thiết lập lắng nghe thông báo từ các characteristic
      device.monitorCharacteristicForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this, device)
      );
      
      device.monitorCharacteristicForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.DATA_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this, device)
      );
      
      // Gửi lệnh chuẩn bị đo SPO2
      const prepareCommand = Buffer.from(Constants.COMMAND_BYTE.SPO2_PREPARE_COMMAND);
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        prepareCommand.toString('base64')
      );
      
      console.log('Đã gửi lệnh chuẩn bị đo SPO2');
      
      // Đợi 1 giây trước khi gửi lệnh bắt đầu đo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Gửi lệnh bắt đầu đo SPO2
      const startCommand = Buffer.from(Constants.COMMAND_BYTE.SPO2_START_COMMAND);
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        startCommand.toString('base64')
      );
      
      console.log('Đã gửi lệnh bắt đầu đo SPO2');
      return true;
    } catch (error) {
      console.error('Lỗi khi gửi lệnh đo SPO2:', error);
      callback(null);
      return false;
    }
  }
  
  /**
   * Dừng đo SPO2
   * @param device Thiết bị BLE đã kết nối
   * @returns true nếu gửi lệnh thành công, false nếu có lỗi
   */
  public async stopSpo2(device: Device): Promise<boolean> {
    if (!device || !device.isConnected) {
      return false;
    }
    
    try {
      // Gửi lệnh dừng đo SPO2
      const stopCommand = Buffer.from(Constants.COMMAND_BYTE.SPO2_STOP_COMMAND);
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        stopCommand.toString('base64')
      );
      
      console.log('Đã gửi lệnh dừng đo SPO2');
      
      this.isMonitoring = false;
      
      // Gửi kết quả cuối cùng nếu có callback
      if (this.dataCallback) {
        this.dataCallback({
          spo2Value: this.spo2Data.spo2Value,
          heartRate: this.spo2Data.heartRate,
          timestamp: this.spo2Data.timestamp,
          rawData: this.spo2Data.rawData
        });
        this.dataCallback = null;
      }
      
      return true;
    } catch (error) {
      console.error('Lỗi khi gửi lệnh dừng đo SPO2:', error);
      return false;
    }
  }
  
  /**
   * Xử lý dữ liệu từ characteristic
   * @param device Thiết bị BLE
   * @param error Lỗi (nếu có)
   * @param characteristic Characteristic nhận được
   */
  private handleCharacteristicUpdate(device: Device, error: Error | null, characteristic: any | null): void {
    if (error) {
      console.error('Lỗi khi nhận dữ liệu SPO2:', error);
      return;
    }
    
    // Đảm bảo có dữ liệu và đang trong quá trình đo
    if (!characteristic || !characteristic.value || !this.isMonitoring) return;
    
    // Giải mã giá trị nhận được từ Base64
    const buffer = Buffer.from(characteristic.value, 'base64');
    
    console.log(`Nhận dữ liệu SPO2 từ ${characteristic.uuid}: ${ByteService.bufferToHexString(buffer)} (Độ dài: ${buffer.length} bytes)`);
    
    // Xử lý dữ liệu SPO2
    this.parseSPO2Data(buffer);
  }
  
  /**
   * Phân tích dữ liệu SPO2
   * @param buffer Buffer dữ liệu nhận được
   */
  private parseSPO2Data(buffer: Buffer): void {
    try {
      // Kiểm tra CRC của gói dữ liệu
      if (!ByteService.verifyPacketCRC(buffer)) {
        console.error('CRC không hợp lệ! Bỏ qua gói dữ liệu SPO2');
        return;
      }
      
      // Lưu dữ liệu thô
      this.spo2Data.rawData.push(ByteService.bufferToHexString(buffer));
      
      // Kiểm tra xem có phải gói dữ liệu SPO2 không
      // Thông thường, gói dữ liệu SPO2 sẽ có định dạng riêng
      // Ví dụ: byte đầu tiên có thể là 0x03 hoặc 0x04 tùy theo thiết kế của thiết bị
      
      // Đây là ví dụ phân tích dữ liệu, cần điều chỉnh theo định dạng thực tế của thiết bị
      if (buffer.length >= 8) {
        // Giả sử byte thứ 4 là giá trị SPO2 và byte thứ 5 là nhịp tim
        // (Cần điều chỉnh vị trí này dựa trên định dạng thực tế của thiết bị)
        const spo2Value = buffer[4];
        const heartRate = buffer[5];
        
        // Chỉ cập nhật nếu giá trị hợp lệ
        if (spo2Value >= 0 && spo2Value <= 100) {
          this.spo2Data.spo2Value = spo2Value;
        }
        
        if (heartRate > 0 && heartRate < 255) {
          this.spo2Data.heartRate = heartRate;
        }
        
        this.spo2Data.timestamp = Date.now();
        
        // Gọi callback nếu có
        if (this.dataCallback) {
          this.dataCallback({
            spo2Value: this.spo2Data.spo2Value,
            heartRate: this.spo2Data.heartRate,
            timestamp: this.spo2Data.timestamp,
            rawData: this.spo2Data.rawData
          });
        }
      }
    } catch (error) {
      console.error('Lỗi khi phân tích dữ liệu SPO2:', error);
    }
  }
  
  /**
   * Lấy dữ liệu SPO2 đã lưu
   */
  public getSpo2Data(): any {
    return {
      spo2Value: this.spo2Data.spo2Value,
      heartRate: this.spo2Data.heartRate,
      timestamp: this.spo2Data.timestamp,
      rawData: this.spo2Data.rawData
    };
  }
}

export default SpO2Service;
