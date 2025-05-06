import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import BleService from '../core/BleService';
import { Constants } from '../constants';

export class SportService {
  private static instance: SportService;
  private sportDataPackets: Array<Buffer> = [];
  private isReceivingSportData: boolean = false;
  private sportDataCallback: ((data: any[] | null) => void) | null = null;
  private dataTimeoutId: NodeJS.Timeout | null = null;
  
  private constructor() {}
  
  public static getInstance(): SportService {
    if (!SportService.instance) {
      SportService.instance = new SportService();
    }
    return SportService.instance;
  }
  
  public async getSportData(device: Device, callback: (data: any[] | null) => void): Promise<boolean> {
    if (!device || !device.isConnected) {
      callback(null);
      return false;
    }
    
    this.sportDataCallback = callback;
    this.sportDataPackets = [];
    this.isReceivingSportData = false;
    
    try {
      await BleService.getInstance().setupNotifications();
      
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
      
      const initCommand = Constants.COMMAND_BYTE.INIT_HEALTH_BLOCK;
      const finalInitCommand = ByteService.createCommandWithCRC(initCommand);
      
      console.log('Gửi lệnh khởi tạo:', ByteService.bufferToHexString(finalInitCommand), `(Độ dài: ${finalInitCommand.length} bytes)`)
      
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        finalInitCommand.toString('base64')
      );
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const sportCommand = Constants.COMMAND_BYTE.GET_SPORT_HISTORY;
      const finalSportCommand = ByteService.createCommandWithCRC(sportCommand);
      
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        finalSportCommand.toString('base64')
      );
      
      return true;
    } catch (error) {
      console.error('Lỗi khi gửi lệnh lấy dữ liệu thể thao:', error);
      callback(null);
      return false;
    }
  }

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
    if (characteristic.uuid.toLowerCase() === Constants.UUID.COMMAND_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói thông tin thể thao không (0x0502)
      if (buffer[0] === 0x05 && buffer[1] === 0x02) {
        console.log('Nhận được gói thông tin thể thao');
        this.isReceivingSportData = true;
        this.sportDataPackets = [];
      }
    }
    
    // Xử lý dữ liệu từ characteristic dữ liệu (DATA_CHARACTERISTIC)
    else if (characteristic.uuid.toLowerCase() === Constants.UUID.DATA_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói dữ liệu thể thao không (0x0511)
      if (buffer[0] === 0x05 && buffer[1] === 0x11 && this.isReceivingSportData) {
        console.log('Nhận được gói dữ liệu thể thao');
        
        // Lấy độ dài gói
        const length = (buffer[2] << 8) + buffer[3];
        
        // Lấy payload (bỏ header 4 byte và CRC 2 byte cuối)
        const payload = buffer.slice(4, buffer.length - 2);
        
        // Thêm vào mảng gói dữ liệu
        this.sportDataPackets.push(payload);
        
        // Bắt đầu bộ đếm timeout để kiểm tra khi nào dữ liệu hoàn tất
        this.startDataTimeoutCheck((data: any) => {
          if (this.sportDataCallback) {
            this.sportDataCallback(data);
          }
        });
      }
    }
  }
 
  private startDataTimeoutCheck(onMerge: (data: any) => any): void {
    if (this.dataTimeoutId) {
      clearTimeout(this.dataTimeoutId);
    }
    
    this.dataTimeoutId = setTimeout(() => {
      if (this.isReceivingSportData && this.sportDataPackets.length > 0) {
        console.log(`Đã nhận ${this.sportDataPackets.length} gói dữ liệu thể thao, tiến hành ghép dữ liệu`);
        
        this.sportDataPackets.forEach((packet, index) => {
          console.log(`Gói dữ liệu ${index + 1}: ${ByteService.bufferToHexString(packet)} (Độ dài: ${packet.length} bytes)`);
        });
        
        const combinedData = Buffer.concat(this.sportDataPackets);
        const convertToUnit8 = new Uint8Array(combinedData);
        console.log('Dữ liệu dạng Uint8Array:', convertToUnit8);
        onMerge(convertToUnit8);
        this.isReceivingSportData = false;
      }
    }, 1500); 
  }
}

export default SportService;
