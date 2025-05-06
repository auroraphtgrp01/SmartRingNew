import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HealthStatsScreenProps {
  onBack: () => void;
}

const HealthStatsScreen: React.FC<HealthStatsScreenProps> = ({ onBack }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thống kê sức khỏe</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.dateSelector}>
          <TouchableOpacity style={styles.dateButton}>
            <Text style={styles.dateButtonText}>Hôm nay</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dateButton, styles.dateButtonInactive]}>
            <Text style={styles.dateButtonTextInactive}>Tuần</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dateButton, styles.dateButtonInactive]}>
            <Text style={styles.dateButtonTextInactive}>Tháng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dateButton, styles.dateButtonInactive]}>
            <Text style={styles.dateButtonTextInactive}>Năm</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <MaterialCommunityIcons name={"heart-pulse" as any} size={24} color="#FB6F92" />
            <Text style={styles.statTitle}>Nhịp tim</Text>
          </View>
          
          <View style={styles.statValueContainer}>
            <Text style={styles.statValue}>72</Text>
            <Text style={styles.statUnit}>BPM</Text>
          </View>
          
          <View style={styles.statRangeContainer}>
            <Text style={styles.statRangeText}>Thấp: 62</Text>
            <Text style={styles.statRangeText}>Cao: 98</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <MaterialCommunityIcons name={"water-percent" as any} size={24} color="#95DE64" />
            <Text style={styles.statTitle}>SpO2</Text>
          </View>
          
          <View style={styles.statValueContainer}>
            <Text style={styles.statValue}>98</Text>
            <Text style={styles.statUnit}>%</Text>
          </View>
          
          <View style={styles.statRangeContainer}>
            <Text style={styles.statRangeText}>Thấp: 97</Text>
            <Text style={styles.statRangeText}>Cao: 99</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <MaterialCommunityIcons name={"shoe-print" as any} size={24} color="#FFB980" />
            <Text style={styles.statTitle}>Bước chân</Text>
          </View>
          
          <View style={styles.statValueContainer}>
            <Text style={styles.statValue}>8,243</Text>
            <Text style={styles.statUnit}>bước</Text>
          </View>
          
          <View style={styles.goalProgress}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '82%' }]} />
            </View>
            <Text style={styles.goalText}>82% mục tiêu hàng ngày</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <MaterialCommunityIcons name={"fire" as any} size={24} color="#FF7A45" />
            <Text style={styles.statTitle}>Calo</Text>
          </View>
          
          <View style={styles.statValueContainer}>
            <Text style={styles.statValue}>412</Text>
            <Text style={styles.statUnit}>kcal</Text>
          </View>
          
          <View style={styles.goalProgress}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '45%', backgroundColor: '#FF7A45' }]} />
            </View>
            <Text style={styles.goalText}>45% mục tiêu hàng ngày</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.syncButton}>
          <MaterialCommunityIcons name={"sync" as any} size={22} color="white" />
          <Text style={styles.syncButtonText}>Đồng bộ dữ liệu sức khỏe</Text>
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
  dateSelector: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dateButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#40A9FF',
  },
  dateButtonInactive: {
    backgroundColor: '#F0F0F0',
  },
  dateButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  dateButtonTextInactive: {
    color: '#666',
    fontWeight: '500',
    fontSize: 14,
  },
  statsCard: {
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
    marginBottom: 3,
  },
  statRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statRangeText: {
    fontSize: 14,
    color: '#999',
  },
  goalProgress: {
    marginTop: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFB980',
    borderRadius: 3,
  },
  goalText: {
    fontSize: 14,
    color: '#666',
  },
  syncButton: {
    backgroundColor: '#40A9FF',
    borderRadius: 12,
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