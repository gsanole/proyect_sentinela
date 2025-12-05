import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme';
import api from '../services/api';

function ArtistEarningsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [sales, setSales] = useState([]);
  const [activeTab, setActiveTab] = useState('payouts'); // 'payouts' or 'sales'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [earningsRes, payoutsRes, salesRes] = await Promise.all([
        api.getArtistEarnings(),
        api.getArtistPayouts(),
        api.getArtistSales(),
      ]);
      
      setEarnings(earningsRes.data.data.earnings);
      setPayouts(payoutsRes.data.data.payouts);
      setSales(salesRes.data.data.sales);
    } catch (error) {
      console.error('Failed to load earnings data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processed':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      case 'failed':
        return theme.colors.error;
      default:
        return theme.colors.gray500;
    }
  };

  const EarningsCard = ({ title, amount, icon, color, subtitle }) => (
    <View style={[styles.earningsCard, { borderLeftColor: color }]}>
      <View style={[styles.earningsIcon, { backgroundColor: color + '15' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.earningsContent}>
        <Text style={styles.earningsTitle}>{title}</Text>
        <Text style={styles.earningsAmount}>${amount.toFixed(2)}</Text>
        {subtitle && <Text style={styles.earningsSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const renderPayout = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemHeader}>
        <Text style={styles.listItemDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.listItemAmount}>${parseFloat(item.amount).toFixed(2)}</Text>
      {item.processed_at && (
        <Text style={styles.listItemSubtext}>
          Processed: {new Date(item.processed_at).toLocaleDateString()}
        </Text>
      )}
    </View>
  );

  const renderSale = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemHeader}>
        <Text style={styles.listItemDate}>
          {new Date(item.order_date).toLocaleDateString()}
        </Text>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>
      <Text style={styles.listItemTitle}>{item.art_piece_title}</Text>
      <Text style={styles.listItemSubtext}>Buyer: {item.buyer_name}</Text>
      <Text style={styles.listItemAmount}>${parseFloat(item.sale_price).toFixed(2)}</Text>
    </View>
  );

  if (loading && !earnings) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading earnings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        stickyHeaderIndices={[2]}
      >
        {/* Earnings Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings Overview</Text>
          
          <EarningsCard
            title="Total Earnings"
            amount={earnings?.totalEarnings || 0}
            icon="currency-usd"
            color={theme.colors.primary}
            subtitle={`From ${earnings?.totalSales || 0} sales`}
          />

          <View style={styles.earningsGrid}>
            <View style={styles.earningsGridItem}>
              <EarningsCard
                title="Available"
                amount={earnings?.availableForPayout || 0}
                icon="cash"
                color={theme.colors.success}
              />
            </View>
            <View style={styles.earningsGridItem}>
              <EarningsCard
                title="Pending"
                amount={earnings?.pendingPayout || 0}
                icon="clock-outline"
                color={theme.colors.warning}
              />
            </View>
          </View>

          <EarningsCard
            title="Paid Out"
            amount={earnings?.paidOut || 0}
            icon="check-circle"
            color={theme.colors.magenta}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'payouts' && styles.tabActive]}
            onPress={() => setActiveTab('payouts')}
          >
            <Text style={[styles.tabText, activeTab === 'payouts' && styles.tabTextActive]}>
              Payouts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
            onPress={() => setActiveTab('sales')}
          >
            <Text style={[styles.tabText, activeTab === 'sales' && styles.tabTextActive]}>
              Sales
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.section}>
          {activeTab === 'payouts' ? (
            payouts.length > 0 ? (
              payouts.map((item) => <View key={item.id}>{renderPayout({ item })}</View>)
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="cash-off" size={64} color={theme.colors.gray400} />
                <Text style={styles.emptyText}>No payouts yet</Text>
              </View>
            )
          ) : (
            sales.length > 0 ? (
              sales.map((item, index) => (
                <View key={`${item.order_id}-${index}`}>{renderSale({ item })}</View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="cart-off" size={64} color={theme.colors.gray400} />
                <Text style={styles.emptyText}>No sales yet</Text>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray100,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  earningsCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    ...theme.shadow.sm,
  },
  earningsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  earningsContent: {
    flex: 1,
    justifyContent: 'center',
  },
  earningsTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  earningsAmount: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  earningsSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  earningsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  earningsGridItem: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    ...theme.shadow.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.white,
  },
  listItem: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadow.sm,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  listItemDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  listItemTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  listItemAmount: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
  listItemSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});

export default ArtistEarningsScreen;
