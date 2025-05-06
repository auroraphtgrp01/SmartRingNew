import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useComprehensiveHistory, useBloodPressureHistory, useSportHistory, useHeartHistory } from '../../contexts';

interface HealthStatsScreenProps {
  onBack: () => void;
}

type PeriodType = 'day' | 'week' | 'month' | 'year';

const HealthStatsScreen: React.FC<HealthStatsScreenProps> = ({ onBack }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('day');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Lấy dữ liệu từ các context
  const { comprehensiveHistoryData } = useComprehensiveHistory();
  const { bloodPressureHistoryData } = useBloodPressureHistory();
  const { sportHistoryData } = useSportHistory();
  const { heartHistoryData } = useHeartHistory();
  
  // Xử lý dữ liệu để hiển thị
  const [healthStats, setHealthStats] = useState({
    heartRate: { current: 0, min: 0, max: 0 },
    spo2: { current: 0, min: 0, max: 0 },
    bloodPressure: { systolic: 0, diastolic: 0 },
    steps: { current: 0, goal: 10000, percentage: 0 },
    calories: { current: 0, goal: 800, percentage: 0 }
  });
  
  // Xử lý dữ liệu khi các context thay đổi
  useEffect(() => {
    setIsLoading(true);
    
    try {
      // Xử lý dữ liệu nhịp tim
      if (heartHistoryData && heartHistoryData.data && heartHistoryData.data.length > 0) {
        const heartRateValues = heartHistoryData.data.map((item: any) => item.heartValue || 0);
        const current = heartRateValues[heartRateValues.length - 1];
        const min = Math.min(...heartRateValues.filter(Boolean));
        const max = Math.max(...heartRateValues);
        
        setHealthStats(prev => ({
          ...prev,
          heartRate: { current, min, max }
        }));
      }
      
      // Xử lý dữ liệu huyết áp
      if (bloodPressureHistoryData && bloodPressureHistoryData.averageData) {
        const { avgSBP, avgDBP } = bloodPressureHistoryData.averageData;
        
        setHealthStats(prev => ({
          ...prev,
          bloodPressure: { systolic: avgSBP, diastolic: avgDBP }
        }));
      }
      
      // Xử lý dữ liệu SpO2 và các thông số khác từ comprehensive data
      if (comprehensiveHistoryData && comprehensiveHistoryData.data && comprehensiveHistoryData.data.length > 0) {
        const lastItem = comprehensiveHistoryData.data[comprehensiveHistoryData.data.length - 1];
        const spo2Values = comprehensiveHistoryData.data.map((item: any) => item.OOValue || 0);
        const current = lastItem.OOValue || 0;
        const min = Math.min(...spo2Values.filter(Boolean));
        const max = Math.max(...spo2Values);
        
        setHealthStats(prev => ({
          ...prev,
          spo2: { current, min, max }
        }));
      }
      
      // Xử lý dữ liệu bước chân và calo từ sport data
      if (sportHistoryData && sportHistoryData.data && sportHistoryData.data.length > 0) {
        // Tính tổng số bước chân và calo
        let totalSteps = 0;
        let totalCalories = 0;
        
        sportHistoryData.data.forEach((item: any) => {
          totalSteps += item.sportStep || 0;
          totalCalories += item.sportCalorie || 0;
        });
        
        const stepsPercentage = Math.min(Math.round((totalSteps / 10000) * 100), 100);
        const caloriesPercentage = Math.min(Math.round((totalCalories / 800) * 100), 100);
        
        setHealthStats(prev => ({
          ...prev,
          steps: { current: totalSteps, goal: 10000, percentage: stepsPercentage },
          calories: { current: totalCalories, goal: 800, percentage: caloriesPercentage }
        }));
      }
    } catch (error) {
      console.error('Lỗi khi xử lý dữ liệu sức khỏe:', error);
    } finally {
      setIsLoading(false);
    }
  }, [comprehensiveHistoryData, bloodPressureHistoryData, sportHistoryData, heartHistoryData]);
  
  // Hàm chuyển đổi định dạng số
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  // Hàm xử lý khi thay đổi khoảng thời gian
  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
    // Có thể thêm logic để lọc dữ liệu theo khoảng thời gian ở đây
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thống kê sức khỏe</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#40A9FF" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Bộ chọn khoảng thời gian */}
          <View style={styles.dateSelector}>
            <TouchableOpacity 
              style={[styles.dateButton, selectedPeriod !== 'day' && styles.dateButtonInactive]}
              onPress={() => handlePeriodChange('day')}
            >
              <Text style={selectedPeriod === 'day' ? styles.dateButtonText : styles.dateButtonTextInactive}>
                Hôm nay
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dateButton, selectedPeriod !== 'week' && styles.dateButtonInactive]}
              onPress={() => handlePeriodChange('week')}
            >
              <Text style={selectedPeriod === 'week' ? styles.dateButtonText : styles.dateButtonTextInactive}>
                Tuần
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dateButton, selectedPeriod !== 'month' && styles.dateButtonInactive]}
              onPress={() => handlePeriodChange('month')}
            >
              <Text style={selectedPeriod === 'month' ? styles.dateButtonText : styles.dateButtonTextInactive}>
                Tháng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dateButton, selectedPeriod !== 'year' && styles.dateButtonInactive]}
              onPress={() => handlePeriodChange('year')}
            >
              <Text style={selectedPeriod === 'year' ? styles.dateButtonText : styles.dateButtonTextInactive}>
                Năm
              </Text>
            </TouchableOpacity>
          </View>

          {/* Thẻ nhịp tim */}
          <View style={[styles.statsCard, styles.heartRateCard]}>
            <View style={styles.statsHeader}>
              <MaterialCommunityIcons name="heart-pulse" size={24} color="#FB6F92" />
              <Text style={styles.statTitle}>Nhịp tim</Text>
            </View>
            
            <View style={styles.statValueContainer}>
              <Text style={[styles.statValue, { color: '#FB6F92' }]}>
                {healthStats.heartRate.current || '- -'}
              </Text>
              <Text style={styles.statUnit}>BPM</Text>
            </View>
            
            <View style={styles.statRangeContainer}>
              <Text style={styles.statRangeText}>Thấp: {healthStats.heartRate.min || '- -'}</Text>
              <Text style={styles.statRangeText}>Cao: {healthStats.heartRate.max || '- -'}</Text>
            </View>
          </View>

          {/* Thẻ huyết áp */}
          <View style={[styles.statsCard, styles.bloodPressureCard]}>
            <View style={styles.statsHeader}>
              <MaterialCommunityIcons name="blood-bag" size={24} color="#FF8FAB" />
              <Text style={styles.statTitle}>Huyết áp</Text>
            </View>
            
            <View style={styles.statValueContainer}>
              <Text style={[styles.statValue, { color: '#FF8FAB' }]}>
                {healthStats.bloodPressure.systolic || '- -'}/{healthStats.bloodPressure.diastolic || '- -'}
              </Text>
              <Text style={styles.statUnit}>mmHg</Text>
            </View>
            
            <View style={styles.statRangeContainer}>
              <Text style={styles.statRangeText}>Tâm thu: {healthStats.bloodPressure.systolic || '- -'}</Text>
              <Text style={styles.statRangeText}>Tâm trương: {healthStats.bloodPressure.diastolic || '- -'}</Text>
            </View>
          </View>

          {/* Thẻ SpO2 */}
          <View style={[styles.statsCard, styles.spo2Card]}>
            <View style={styles.statsHeader}>
              <MaterialCommunityIcons name="water-percent" size={24} color="#95DE64" />
              <Text style={styles.statTitle}>SpO2</Text>
            </View>
            
            <View style={styles.statValueContainer}>
              <Text style={[styles.statValue, { color: '#73D13D' }]}>
                {healthStats.spo2.current || '- -'}
              </Text>
              <Text style={styles.statUnit}>%</Text>
            </View>
            
            <View style={styles.statRangeContainer}>
              <Text style={styles.statRangeText}>Thấp: {healthStats.spo2.min || '- -'}</Text>
              <Text style={styles.statRangeText}>Cao: {healthStats.spo2.max || '- -'}</Text>
            </View>
          </View>

          {/* Thẻ bước chân */}
          <View style={[styles.statsCard, styles.stepsCard]}>
            <View style={styles.statsHeader}>
              <MaterialCommunityIcons name="shoe-print" size={24} color="#FFDC5C" />
              <Text style={styles.statTitle}>Bước chân</Text>
            </View>
            
            <View style={styles.statValueContainer}>
              <Text style={[styles.statValue, { color: '#FFC53D' }]}>
                {formatNumber(healthStats.steps.current) || '0'}
              </Text>
              <Text style={styles.statUnit}>bước</Text>
            </View>
            
            <View style={styles.goalProgress}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${healthStats.steps.percentage}%`, backgroundColor: '#FFDC5C' }]} />
              </View>
              <Text style={styles.goalText}>{healthStats.steps.percentage}% mục tiêu hàng ngày</Text>
            </View>
          </View>

          {/* Thẻ calo */}
          <View style={[styles.statsCard, styles.caloriesCard]}>
            <View style={styles.statsHeader}>
              <MaterialCommunityIcons name="fire" size={24} color="#FF7A45" />
              <Text style={styles.statTitle}>Calo</Text>
            </View>
            
            <View style={styles.statValueContainer}>
              <Text style={[styles.statValue, { color: '#FF7A45' }]}>
                {formatNumber(healthStats.calories.current) || '0'}
              </Text>
              <Text style={styles.statUnit}>kcal</Text>
            </View>
            
            <View style={styles.goalProgress}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${healthStats.calories.percentage}%`, backgroundColor: '#FF7A45' }]} />
              </View>
              <Text style={styles.goalText}>{healthStats.calories.percentage}% mục tiêu hàng ngày</Text>
            </View>
          </View>

          {/* Nút đồng bộ */}
          <TouchableOpacity style={styles.syncButton}>
            <MaterialCommunityIcons name="sync" size={22} color="white" />
            <Text style={styles.syncButtonText}>Đồng bộ dữ liệu sức khỏe</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dateSelector: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dateButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#40A9FF',
  },
  dateButtonInactive: {
    backgroundColor: '#F0F0F0',
  },
  dateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  dateButtonTextInactive: {
    color: '#666',
    fontWeight: '500',
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  heartRateCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FB6F92',
  },
  bloodPressureCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF8FAB',
  },
  spo2Card: {
    borderLeftWidth: 4,
    borderLeftColor: '#95DE64',
  },
  stepsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFDC5C',
  },
  caloriesCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF7A45',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  statUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
    marginBottom: 5,
  },
  statRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 8,
  },
  statRangeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  goalProgress: {
    marginTop: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFB980',
    borderRadius: 4,
  },
  goalText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: '#40A9FF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#40A9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default HealthStatsScreen;
