function decodeTimestamp(timestamp: number): string {
  const utcDate = new Date(timestamp);
  
  // Lấy thời gian theo múi giờ Asia/Ho_Chi_Minh trực tiếp
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(utcDate);
  
  const hours = parts.find(p => p.type === 'hour')!.value;
  const minutes = parts.find(p => p.type === 'minute')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const year = parts.find(p => p.type === 'year')!.value;

  const formattedTime = `${hours}:${minutes} ${day}/${month}/${year}`;
  return formattedTime;
}

export default decodeTimestamp;