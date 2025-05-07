import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import { Constants } from '../constants';
import { BaseHealthService } from './BaseHealthService';

export class ComprehensiveService extends BaseHealthService<any[]> {
  private static instance: ComprehensiveService;
  public static DATATYPE = 9
  
  private constructor() {
    super();
  }
  
  public static getInstance(): ComprehensiveService {
    if (!ComprehensiveService.instance) {
      ComprehensiveService.instance = new ComprehensiveService();
    }
    return ComprehensiveService.instance;
  }
  
  public async getComprehensiveData(device: Device, callback: (data: any[] | null) => void): Promise<boolean> {
    const comprehensiveCommand = Buffer.from(Constants.COMMAND_BYTE.GET_COMPREHENSIVE_MEASUREMENT);
    return this.getData(device, callback, comprehensiveCommand, 'đo tổng hợp', ComprehensiveService.DATATYPE);
  }

  protected handleCharacteristicUpdate(device: Device, error: Error | null, characteristic: any | null): void {
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
    
    // Kiểm tra độ dài gói dữ liệu, nếu nhỏ hơn 9 byte thì trả về ngay
    if (buffer.length < 9) {
      console.log(`Gói dữ liệu quá ngắn (${buffer.length} bytes), trả về ngay`);
      if (this.dataCallback && buffer[0] === 0x05 && buffer[1] === 0x09) {
        console.log('Gọi callback trực tiếp cho gói dữ liệu đo tổng hợp ngắn');
        this.dataCallback([]);
      }
      return;
    }
    
    // Xử lý dữ liệu từ characteristic lệnh (COMMAND_CHARACTERISTIC)
    if (characteristic.uuid.toLowerCase() === Constants.UUID.COMMAND_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói thông tin tổng hợp không (0x0509)
      if (buffer[0] === 0x05 && buffer[1] === 0x09) {
        console.log('Nhận được gói thông tin đo tổng hợp');
        this.isReceivingData = true;
        this.dataPackets = [];
      }
    }
    
    // Xử lý dữ liệu từ characteristic dữ liệu (DATA_CHARACTERISTIC)
    else if (characteristic.uuid.toLowerCase() === Constants.UUID.DATA_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói dữ liệu tổng hợp không (0x0518)
      if (buffer[0] === 0x05 && buffer[1] === 0x18 && this.isReceivingData) {
        console.log('Nhận được gói dữ liệu đo tổng hợp');
        
        // Lấy độ dài gói
        const length = (buffer[2] << 8) + buffer[3];
        
        // Lấy payload (bỏ header 4 byte và CRC 2 byte cuối)
        const payload = buffer.slice(4, buffer.length - 2);
        
        // Thêm vào mảng gói dữ liệu
        this.dataPackets.push(payload);
        
        // Bắt đầu bộ đếm timeout để kiểm tra khi nào dữ liệu hoàn tất
        // Sử dụng cơ chế hàng đợi xử lý dữ liệu mới, không đợi unpack
        this.startDataTimeoutCheck(this.isReceivingData, this.dataPackets, (data: any) => {
          if (this.dataCallback) {
            // Gọi callback ngay để tiếp tục quy trình đồng bộ, không đợi unpack
            this.dataCallback(data);
          }
        }, 'đo tổng hợp');
      }
    }
  }
 

}

export default ComprehensiveService;
