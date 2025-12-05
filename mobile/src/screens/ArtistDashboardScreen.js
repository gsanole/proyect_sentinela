import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme';
import api from '../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

function ArtistDashboardScreen({ navigation }) {
  const user = useSelector(state => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, profileRes] = await Promise.all([
        api.getArtistDashboard(),
        api.getArtistProfile()
      ]);
      
      setStats(dashboardRes.data.data);
      setProfile(profileRes.data.data.profile);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statHeader}>
        <Icon name={icon} size={28} color={color} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const QuickAction = ({ title, icon, color, onPress }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  // Check if artist is pending approval
  if (profile?.approval_status === 'pending') {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.pendingContainer}>
            <Icon name="clock-outline" size={64} color={theme.colors.warning} />
            <Text style={styles.pendingTitle}>Application Pending</Text>
            <Text style={styles.pendingText}>
              Your artist application is currently under review. You'll receive
              a notification once it's been approved.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('ArtistProfile')}
            >
              <Text style={styles.primaryButtonText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Check if artist is rejected
  if (profile?.approval_status === 'rejected') {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.pendingContainer}>
            <Icon name="alert-circle-outline" size={64} color={theme.colors.error} />
            <Text style={styles.pendingTitle}>Application Not Approved</Text>
            <Text style={styles.pendingText}>
              Unfortunately, your artist application was not approved.
            </Text>
            {profile?.rejected_reason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonTitle}>Reason:</Text>
                <Text style={styles.reasonText}>{profile.rejected_reason}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('ArtistProfile')}
            >
              <Text style={styles.primaryButtonText}>Update & Reapply</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{profile?.full_name}</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Revenue"
            value={`$${stats?.overview.total_revenue || 0}`}
            icon="currency-usd"
            color={theme.colors.primary}
            onPress={() => navigation.navigate('ArtistEarnings')}
          />
          <StatCard
            title="Total Sales"
            value={stats?.overview.total_orders || 0}
            icon="cart"
            color={theme.colors.magenta}
            onPress={() => navigation.navigate('ArtistSales')}
          />
          <StatCard
            title="Art Pieces"
            value={stats?.overview.total_art_pieces || 0}
            icon="palette"
            color={theme.colors.deepPink}
            onPress={() => navigation.navigate('MyArtPieces')}
          />
          <StatCard
            title="Followers"
            value={stats?.overview.followers || 0}
            icon="account-heart"
            color={theme.colors.pink}
          />
        </View>

        {/* Pending Payout Alert */}
        {stats?.pendingPayout > 0 && (
          <TouchableOpacity
            style={styles.payoutAlert}
            onPress={() => navigation.navigate('ArtistEarnings')}
          >
            <Icon name="cash-clock" size={24} color={theme.colors.warning} />
            <View style={styles.payoutContent}>
              <Text style={styles.payoutTitle}>Pending Payout</Text>
              <Text style={styles.payoutAmount}>
                ${stats.pendingPayout.toFixed(2)}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={theme.colors.gray500} />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <QuickAction
              title="Add Art Piece"
              icon="plus-circle"
              color={theme.colors.primary}
              onPress={() => navigation.navigate('AddArtPiece')}
            />
            <QuickAction
              title="My Pieces"
              icon="palette"
              color={theme.colors.magenta}
              onPress={() => navigation.navigate('MyArtPieces')}
            />
            <QuickAction
              title="Sales History"
              icon="chart-line"
              color={theme.colors.deepPink}
              onPress={() => navigation.navigate('ArtistSales')}
            />
            <QuickAction
              title="Edit Profile"
              icon="account-edit"
              color={theme.colors.pink}
              onPress={() => navigation.navigate('ArtistProfile')}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Performance</Text>
          </View>
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Orders (30 days)</Text>
              <Text style={styles.activityValue}>{stats?.recentOrders || 0}</Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Approved Pieces</Text>
              <Text style={styles.activityValue}>
                {stats?.overview.approved_pieces || 0}
              </Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Pending Approval</Text>
              <Text style={[styles.activityValue, { color: theme.colors.warning }]}>
                {stats?.overview.pending_pieces || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Top Selling Pieces */}
        {stats?.topSellingPieces?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Selling Pieces</Text>
            {stats.topSellingPieces.map((piece, index) => (
              <View key={piece.id} style={styles.topPieceCard}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.topPieceContent}>
                  <Text style={styles.topPieceTitle}>{piece.title}</Text>
                  <Text style={styles.topPieceSales}>
                    {piece.sales_count} sales · ${parseFloat(piece.total_revenue).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
  header: {
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    margin: theme.spacing.xs,
    borderLeftWidth: 4,
    ...theme.shadow.md,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  payoutAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
    ...theme.shadow.sm,
  },
  payoutContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  payoutTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  payoutAmount: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  actionButton: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    margin: theme.spacing.xs,
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.sm,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  activityLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  activityValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  topPieceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  rankText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.white,
  },
  topPieceContent: {
    flex: 1,
  },
  topPieceTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  topPieceSales: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  pendingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  pendingTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  pendingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  reasonBox: {
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  reasonTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  reasonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  primaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.white,
  },
});

export default ArtistDashboardScreen;
