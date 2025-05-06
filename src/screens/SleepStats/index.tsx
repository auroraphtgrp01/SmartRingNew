import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSleepHistory } from '../../contexts';
import { FinalSleepData, GroupedSleepStage, SleepOverview } from '../../types/SleepType';

interface SleepStatsScreenProps {
  onBack: () => void;
}

const SleepStatsScreen: React.FC<SleepStatsScreenProps> = ({ onBack }) => {
  // Lấy dữ liệu giấc ngủ từ context
  const { sleepHistoryData } = useSleepHistory();
  const [isLoading, setIsLoading] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Animation cho hiệu ứng pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      pulseAnim.stopAnimation();
    };
  }, []);

  // Tính toán thời gian ngủ từ dữ liệu
  const formatSleepTime = (minutes: number) => {
    if (!minutes && minutes !== 0) return '--- giờ --- phút';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours} giờ ${mins} phút`;
  };
  
  // Định dạng giờ từ chuỗi thời gian
  const formatTimeString = (timeString: string | undefined) => {
    if (!timeString) return '---';
    
    try {
      // Xử lý chuỗi định dạng "hh:mm dd/mm/yyyy"
      if (timeString.includes('/')) {
        const parts = timeString.split(' ');
        if (parts.length >= 1) {
          // Lấy phần giờ (hh:mm)
          return parts[0];
        }
      } else if (timeString.includes('T')) {
        // Xử lý định dạng ISO
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        }
      }
      
      return timeString;
    } catch (error) {
      console.log('Lỗi xử lý thời gian:', error);
      return '---';
    }
  };

  // Tính toán chất lượng giấc ngủ (dựa trên tỷ lệ ngủ sâu và REM)
  const calculateSleepQuality = () => {
    if (!sleepHistoryData || !sleepHistoryData.overview) return { score: 0, text: 'Không đủ dữ liệu' };
    
    const { totalDeepSleep, totalREM, totalSleepTime } = sleepHistoryData.overview;
    
    if (totalSleepTime === 0) return { score: 0, text: 'Không đủ dữ liệu' };
    
    // Tỷ lệ ngủ sâu và REM lý tưởng là khoảng 35-40% tổng thời gian ngủ
    const qualityRatio = ((totalDeepSleep + totalREM) / totalSleepTime) * 100;
    let score = Math.min(Math.round(qualityRatio * 2.5), 100);
    
    let text = 'Kém';
    if (score >= 85) text = 'Rất tốt';
    else if (score >= 70) text = 'Tốt';
    else if (score >= 50) text = 'Trung bình';
    
    return { score, text };
  };

  const sleepQuality = calculateSleepQuality();

  // Lấy ngày của dữ liệu giấc ngủ
  const getSleepDate = () => {
    if (!sleepHistoryData || !sleepHistoryData.overview || !sleepHistoryData.overview.endDate) {
      return 'Không có dữ liệu';
    }
    
    try {
      // Xử lý chuỗi định dạng "hh:mm dd/mm/yyyy"
      const dateStr = sleepHistoryData.overview.endDate;
      
      // Kiểm tra nếu chuỗi có định dạng "hh:mm dd/mm/yyyy"
      if (dateStr.includes('/')) {
        // Tách phần thời gian và ngày tháng
        const parts = dateStr.split(' ');
        if (parts.length >= 2) {
          // Lấy phần ngày tháng (dd/mm/yyyy)
          const datePart = parts[1];
          // Tách thành các phần dd, mm, yyyy
          const dateParts = datePart.split('/');
          if (dateParts.length === 3) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1; // Tháng trong JS bắt đầu từ 0
            const year = parseInt(dateParts[2], 10);
            
            // Định dạng ngày tháng theo tiếng Việt
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } as Intl.DateTimeFormatOptions;
            return new Date(year, month, day).toLocaleDateString('vi-VN', options);
          }
        }
        return dateStr; // Trả về chuỗi gốc nếu không thể phân tích
      } else {
        // Thử chuyển đổi chuỗi ISO hoặc định dạng khác
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', day: 'numeric' });
        }
        return dateStr; // Trả về chuỗi gốc nếu không thể chuyển đổi
      }
    } catch (error) {
      console.log('Lỗi xử lý ngày tháng:', error);
      return sleepHistoryData.overview.endDate || 'Ngày không hợp lệ';
    }
  };

  // Xử lý đồng bộ dữ liệu
  const handleSyncData = () => {
    setIsLoading(true);
    // Giả lập quá trình đồng bộ
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  // Kiểm tra xem có dữ liệu không
  const hasData = sleepHistoryData && sleepHistoryData.overview;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thống kê giấc ngủ</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Tổng quan giấc ngủ</Text>
          <View style={styles.sleepTimeContainer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <MaterialCommunityIcons name={"sleep" as any} size={32} color="#FF8FAB" />
            </Animated.View>
            <Text style={styles.sleepTimeText}>
              {hasData ? formatSleepTime(sleepHistoryData.overview.totalSleepTime) : '--- giờ --- phút'}
            </Text>
          </View>
          <Text style={styles.sleepDate}>{getSleepDate()}</Text>
        </View>
        
        <View style={styles.overviewCard}>
          <Text style={styles.cardTitle}>Chi tiết giấc ngủ</Text>
          
          {hasData ? (
            <>
              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <View style={styles.overviewIconContainer}>
                    <MaterialCommunityIcons name={"weather-sunset" as any} size={24} color="#FFB3C6" />
                  </View>
                  <View style={styles.overviewTextContainer}>
                    <Text style={styles.overviewLabel}>Giờ đi ngủ</Text>
                    <Text style={styles.overviewValue}>
                      {formatTimeString(sleepHistoryData.overview.startDate)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.overviewItem}>
                  <View style={styles.overviewIconContainer}>
                    <MaterialCommunityIcons name={"weather-sunset-up" as any} size={24} color="#FFB3C6" />
                  </View>
                  <View style={styles.overviewTextContainer}>
                    <Text style={styles.overviewLabel}>Giờ thức dậy</Text>
                    <Text style={styles.overviewValue}>
                      {formatTimeString(sleepHistoryData.overview.endDate)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <View style={styles.overviewIconContainer}>
                    <MaterialCommunityIcons name={"alert-circle-outline" as any} size={24} color="#FFB3C6" />
                  </View>
                  <View style={styles.overviewTextContainer}>
                    <Text style={styles.overviewLabel}>Số lần thức giấc</Text>
                    <Text style={styles.overviewValue}>
                      {sleepHistoryData.overview.wakeupCount || 0} lần
                    </Text>
                  </View>
                </View>
                
                <View style={styles.overviewItem}>
                  <View style={styles.overviewIconContainer}>
                    <MaterialCommunityIcons name={"chart-donut" as any} size={24} color="#FFB3C6" />
                  </View>
                  <View style={styles.overviewTextContainer}>
                    <Text style={styles.overviewLabel}>Hiệu suất</Text>
                    <Text style={styles.overviewValue}>
                      {hasData && sleepHistoryData.overview.totalSleepTime > 0 ? 
                        `${Math.round((sleepHistoryData.overview.totalDeepSleep + sleepHistoryData.overview.totalREM) / sleepHistoryData.overview.totalSleepTime * 100)}%` : 
                        '---'}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Không có dữ liệu chi tiết về giấc ngủ</Text>
            </View>
          )}
        </View>

        <View style={styles.sleepStagesCard}>
          <Text style={styles.cardTitle}>Các giai đoạn giấc ngủ</Text>
          
          {hasData ? (
            <>
              <View style={styles.stageItem}>
                <View style={styles.stageInfo}>
                  <View style={[styles.stageIndicator, { backgroundColor: '#73D13D' }]} />
                  <Text style={styles.stageText}>Ngủ nhẹ</Text>
                </View>
                <Text style={styles.stageDuration}>
                  {formatSleepTime(sleepHistoryData.overview.totalLightSleep)}
                </Text>
              </View>
              
              <View style={styles.stageItem}>
                <View style={styles.stageInfo}>
                  <View style={[styles.stageIndicator, { backgroundColor: '#36CFC9' }]} />
                  <Text style={styles.stageText}>Ngủ sâu</Text>
                </View>
                <Text style={styles.stageDuration}>
                  {formatSleepTime(sleepHistoryData.overview.totalDeepSleep)}
                </Text>
              </View>
              
              <View style={styles.stageItem}>
                <View style={styles.stageInfo}>
                  <View style={[styles.stageIndicator, { backgroundColor: '#40A9FF' }]} />
                  <Text style={styles.stageText}>Ngủ REM</Text>
                </View>
                <Text style={styles.stageDuration}>
                  {formatSleepTime(sleepHistoryData.overview.totalREM)}
                </Text>
              </View>
              
              <View style={styles.stageItem}>
                <View style={styles.stageInfo}>
                  <View style={[styles.stageIndicator, { backgroundColor: '#FFC53D' }]} />
                  <Text style={styles.stageText}>Thức giấc</Text>
                </View>
                <Text style={styles.stageDuration}>
                  {formatSleepTime(sleepHistoryData.overview.wakeupCount * 5)}
                </Text>
              </View>

              <View style={styles.sleepStagesBar}>
                {sleepHistoryData.overview.totalLightSleep > 0 && (
                  <View 
                    style={[styles.sleepStage, { 
                      backgroundColor: '#73D13D',
                      flex: sleepHistoryData.overview.totalLightSleep / sleepHistoryData.overview.totalSleepTime
                    }]} 
                  />
                )}
                {sleepHistoryData.overview.totalDeepSleep > 0 && (
                  <View 
                    style={[styles.sleepStage, { 
                      backgroundColor: '#36CFC9',
                      flex: sleepHistoryData.overview.totalDeepSleep / sleepHistoryData.overview.totalSleepTime
                    }]} 
                  />
                )}
                {sleepHistoryData.overview.totalREM > 0 && (
                  <View 
                    style={[styles.sleepStage, { 
                      backgroundColor: '#40A9FF',
                      flex: sleepHistoryData.overview.totalREM / sleepHistoryData.overview.totalSleepTime
                    }]} 
                  />
                )}
                {sleepHistoryData.overview.wakeupCount > 0 && (
                  <View 
                    style={[styles.sleepStage, { 
                      backgroundColor: '#FFC53D',
                      flex: (sleepHistoryData.overview.wakeupCount * 5) / sleepHistoryData.overview.totalSleepTime
                    }]} 
                  />
                )}
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Không có dữ liệu về các giai đoạn giấc ngủ</Text>
            </View>
          )}
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.cardTitle}>Lời khuyên</Text>
          <Text style={styles.tipText}>
            {hasData && sleepHistoryData.overview.totalSleepTime < 420 ?
              'Bạn đang ngủ ít hơn 7 giờ mỗi đêm. Hãy cố gắng đi ngủ sớm hơn và duy trì lịch trình ngủ đều đặn để cải thiện sức khỏe.' :
              'Duy trì lịch trình ngủ đều đặn và đảm bảo nghỉ ngơi đủ 7-8 giờ mỗi đêm sẽ giúp cải thiện sức khỏe và tinh thần.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  sleepTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  sleepTimeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  sleepDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  // Card tổng quan giấc ngủ
  overviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
  },
  overviewIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF1F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  overviewTextContainer: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sleepStagesLegendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sleepStagesLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  sleepStagesBarContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  sleepQualityCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  scoreCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E6F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6979F8',
  },
  scoreUnit: {
    fontSize: 16,
    color: '#6979F8',
    alignSelf: 'flex-start',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#52C41A',
  },
  sleepStagesCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  stageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  stageText: {
    fontSize: 14,
    color: '#333',
  },
  stageDuration: {
    fontSize: 14,
    color: '#666',
  },
  sleepStagesBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 8,
  },
  sleepStage: {
    height: '100%',
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#A3A3A3',
    textAlign: 'center',
  },
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  syncButton: {
    backgroundColor: '#FF8FAB',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#FF8FAB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  syncButtonDisabled: {
    backgroundColor: '#FFB3C6',
    shadowOpacity: 0.1,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default SleepStatsScreen;