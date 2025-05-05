import { Buffer } from 'buffer';

/**
 * ByteService - Dịch vụ xử lý byte trong giao tiếp với thiết bị
 */
export class ByteService {
  /**
   * Tính toán CRC16 cho dữ liệu đầu vào
   * @param data Mảng dữ liệu đầu vào
   * @param length Độ dài dữ liệu cần tính CRC
   * @returns Giá trị CRC16 (16 bit)
   */
  public static crc16_compute(data: Uint8Array, length: number): number {
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

  /**
   * Kiểm tra CRC của gói dữ liệu
   * @param data Buffer dữ liệu cần kiểm tra
   * @returns true nếu CRC hợp lệ, false nếu không hợp lệ
   */
  public static verifyPacketCRC(data: Buffer): boolean {
    const length = data.length;
    
    // Lấy CRC từ gói dữ liệu (2 byte cuối, byte thấp trước, byte cao sau)
    const receivedCRC = (data[length-1] << 8) | data[length-2];
    
    // Tính CRC cho phần dữ liệu (bỏ 2 byte CRC cuối)
    const calculatedCRC = this.crc16_compute(data.slice(0, length-2), length-2);
    
    return receivedCRC === calculatedCRC;
  }

  /**
   * Tạo gói lệnh có CRC
   * @param command Dữ liệu lệnh cần thêm CRC
   * @returns Buffer chứa lệnh đã được thêm CRC
   */
  public static createCommandWithCRC(command: Uint8Array): Buffer {
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
  
  /**
   * Chuyển Buffer thành chuỗi hex
   * @param buffer Buffer cần chuyển đổi
   * @returns Chuỗi hex với các byte cách nhau bởi dấu cách
   */
  public static bufferToHexString(buffer: Buffer): string {
    // Thêm khoảng cách giữa các byte và trả về cả độ dài của buffer
    return Array.from(buffer).map(byte => byte.toString(16).padStart(2, '0')).join(' ');
  }
}
