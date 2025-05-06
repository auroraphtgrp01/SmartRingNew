import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SleepStatsScreenProps {
  onBack: () => void;
}

const SleepStatsScreen: React.FC<SleepStatsScreenProps> = ({ onBack }) => {
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
            <MaterialCommunityIcons name={"sleep" as any} size={32} color="#6979F8" />
            <Text style={styles.sleepTimeText}>7 giờ 30 phút</Text>
          </View>
          <Text style={styles.sleepDate}>Đêm qua</Text>
        </View>

        <View style={styles.sleepQualityCard}>
          <Text style={styles.cardTitle}>Chất lượng giấc ngủ</Text>
          <View style={styles.scoreContainer}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>85</Text>
              <Text style={styles.scoreUnit}>%</Text>
            </View>
            <Text style={styles.scoreText}>Tốt</Text>
          </View>
        </View>

        <View style={styles.sleepStagesCard}>
          <Text style={styles.cardTitle}>Các giai đoạn giấc ngủ</Text>
          
          <View style={styles.stageItem}>
            <View style={styles.stageInfo}>
              <View style={[styles.stageIndicator, { backgroundColor: '#36CFC9' }]} />
              <Text style={styles.stageText}>Ngủ nhẹ</Text>
            </View>
            <Text style={styles.stageDuration}>4 giờ 15 phút</Text>
          </View>
          
          <View style={styles.stageItem}>
            <View style={styles.stageInfo}>
              <View style={[styles.stageIndicator, { backgroundColor: '#6979F8' }]} />
              <Text style={styles.stageText}>Ngủ sâu</Text>
            </View>
            <Text style={styles.stageDuration}>2 giờ 10 phút</Text>
          </View>
          
          <View style={styles.stageItem}>
            <View style={styles.stageInfo}>
              <View style={[styles.stageIndicator, { backgroundColor: '#FFB980' }]} />
              <Text style={styles.stageText}>Ngủ REM</Text>
            </View>
            <Text style={styles.stageDuration}>1 giờ 05 phút</Text>
          </View>
          
          <View style={styles.stageItem}>
            <View style={styles.stageInfo}>
              <View style={[styles.stageIndicator, { backgroundColor: '#D9D9D9' }]} />
              <Text style={styles.stageText}>Thức giấc</Text>
            </View>
            <Text style={styles.stageDuration}>10 phút</Text>
          </View>
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.cardTitle}>Lời khuyên</Text>
          <Text style={styles.tipText}>
            Duy trì lịch trình ngủ đều đặn và đảm bảo nghỉ ngơi đủ 7-8 giờ mỗi đêm sẽ giúp cải thiện sức khỏe và tinh thần.
          </Text>
        </View>

        <TouchableOpacity style={styles.syncButton}>
          <MaterialCommunityIcons name={"sync" as any} size={22} color="white" />
          <Text style={styles.syncButtonText}>Đồng bộ dữ liệu giấc ngủ</Text>
        </TouchableOpacity>
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
  tipsCard: {
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
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  syncButton: {
    backgroundColor: '#6979F8',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#6979F8',
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

export default SleepStatsScreen; 