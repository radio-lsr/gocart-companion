import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { app, database } from '../../config/firebase';

export const Profile = ({ navigation }) => {
  const [userData, setUserData] = useState({
    name: "goMart Pro",
    email: "kongodigital243@gmail.com",
    phone: "+243 840 724 925",
    location: "Kinshasa, RDC",
    marketName: "SuperMarché Principal",
    role: "admin",
    status: "approved"
  });
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState({
    ordersCount: 0,
    revenue: 0,
    growth: 0
  });
  const [storeId, setStoreId] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (permissions.viewStatistics && storeId) {
      loadTodayStats();
      const interval = setInterval(() => loadTodayStats(), 300000);
      return () => clearInterval(interval);
    }
  }, [permissions.viewStatistics, storeId]);

  const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const formatNumber = (num) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  const loadUserData = async () => {
    try {
      const user = app.auth().currentUser;
      if (user) {
        const userSnapshot = await database.ref('users/' + user.uid).once('value');
        const userDataFromDB = userSnapshot.val();
        
        const permissionsSnapshot = await database.ref('permissions/' + user.uid).once('value');
        const permissionsFromDB = permissionsSnapshot.val();

        setUserData(userDataFromDB);
        setPermissions(permissionsFromDB || {});
        setStoreId(userDataFromDB.storeId); // Récupération du storeId
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayStats = async () => {
    if (!storeId) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      const todayEnd = todayStart + 24 * 60 * 60 * 1000;

      const ordersSnapshot = await database.ref('orders').once('value');
      const orders = ordersSnapshot.val();
      
      if (!orders) {
        setTodayStats({ ordersCount: 0, revenue: 0, growth: 0 });
        return;
      }

      let todayOrdersCount = 0;
      let todayRevenue = 0;
      let yesterdayRevenue = 0;

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = yesterday.getTime();
      const yesterdayEnd = yesterdayStart + 24 * 60 * 60 * 1000;

      const getOrderTimestamp = (order) => {
        if (!order.createdAt) return null;
        if (typeof order.createdAt === 'string') return new Date(order.createdAt).getTime();
        if (order.createdAt._seconds) return order.createdAt._seconds * 1000;
        return order.createdAt;
      };

      const getOrderTotal = (order) => {
        if (order.total !== undefined && order.total !== null) return Number(order.total) || 0;
        if (order.cart && order.cart.total !== undefined) return Number(order.cart.total) || 0;
        return 0;
      };

      Object.keys(orders).forEach(orderId => {
        const order = orders[orderId];
        // Filtrer par storeId
        if (order.storeId !== storeId) return;

        const orderTimestamp = getOrderTimestamp(order);
        if (!orderTimestamp) return;

        const orderTotal = getOrderTotal(order);

        if (orderTimestamp >= todayStart && orderTimestamp < todayEnd) {
          todayOrdersCount++;
          todayRevenue += orderTotal;
        }
        if (orderTimestamp >= yesterdayStart && orderTimestamp < yesterdayEnd) {
          yesterdayRevenue += orderTotal;
        }
      });

      let growth = 0;
      if (yesterdayRevenue > 0) {
        growth = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
      } else if (todayRevenue > 0) {
        growth = 100;
      }

      setTodayStats({
        ordersCount: todayOrdersCount,
        revenue: todayRevenue,
        growth: Math.round(growth * 100) / 100
      });

    } catch (error) {
      console.error('Error loading today stats:', error);
      setTodayStats({ ordersCount: 0, revenue: 0, growth: 0 });
    }
  };

  const getMenuItems = () => {
    const baseItems = [
      {
        id: '1',
        title: 'Informations Personnelles',
        subtitle: 'Modifier vos informations',
        icon: 'person-outline',
        color: '#2196F3',
        onPress: () => navigation.navigate("Infos"),
        requiredPermission: null
      },
      {
        id: '2',
        title: 'Changer le Mot de Passe',
        subtitle: 'Modifier votre mot de passe',
        icon: 'lock-closed-outline',
        color: '#FF9800',
        onPress: () => navigation.navigate("ChangerMotDePasse"),
        requiredPermission: 'changePassword'
      }
    ];

    // Commandes : selon le rôle
    let ordersItem = {
      id: '3',
      title: 'Commandes Précédentes',
      subtitle: userData.role === 'admin' 
        ? 'Toutes les commandes du magasin' 
        : 'Commandes que vous avez traitées',
      icon: 'receipt-outline',
      color: '#4CAF50',
      onPress: () => {
        // Passer le storeId et éventuellement le rôle
        navigation.navigate("Commandes", { 
          storeId: storeId,
          role: userData.role,
          userId: app.auth().currentUser?.uid
        });
      },
      requiredPermission: 'viewOrders'
    };
    baseItems.push(ordersItem);

    // Items réservés aux administrateurs (shop manager)
    const adminItems = [
      {
        id: '4',
        title: 'Gestion des stocks',
        subtitle: 'Gérer les produits et stocks',
        icon: 'settings-outline',
        color: '#9C27B0',
        onPress: () => navigation.navigate("Admin"),
        requiredPermission: 'manageProducts'
      },
      {
        id: '5',
        title: 'Statistiques',
        subtitle: 'Analyses et performances',
        icon: 'stats-chart-outline',
        color: '#2196F3',
        onPress: () => navigation.navigate("Statistiques"),
        requiredPermission: 'viewStatistics'
      },
      {
        id: '6',
        title: 'Gestion des Caissiers',
        subtitle: 'Valider et gérer les caissiers',
        icon: 'people-outline',
        color: '#FF5722',
        onPress: () => navigation.navigate("Caissiers"),
        requiredPermission: 'manageCashiers'
      },
      {
        id: '7',
        title: 'Croissance des Ventes',
        subtitle: 'Analyser la performance commerciale',
        icon: 'trending-up-outline',
        color: '#4CAF50',
        onPress: () => navigation.navigate("Statistiques"),
        requiredPermission: 'viewSalesGrowth'
      }
    ];

    const logoutItem = {
      id: '8',
      title: 'Déconnexion',
      subtitle: 'Se déconnecter de l\'application',
      icon: 'log-out-outline',
      color: '#F44336',
      onPress: handleLogout,
      requiredPermission: null
    };

    let allItems = [...baseItems];
    if (userData.role === 'admin') {
      allItems = [...allItems, ...adminItems];
    }
    allItems.push(logoutItem);

    return allItems.filter(item => 
      item.requiredPermission === null || permissions[item.requiredPermission]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnexion",
          onPress: async () => {
            try {
              await app.auth().signOut();
              await AsyncStorage.clear();
              navigation.navigate("SignIn");
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const renderMenuItem = (item) => (
    <TouchableOpacity 
      key={item.id}
      style={styles.menuItem}
      onPress={item.onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
    </TouchableOpacity>
  );

  const getRoleDisplay = (role) => {
    const roles = { 'admin': 'Administrateur', 'caissier': 'Caissier' };
    return roles[role] || role;
  };

  const getStatusBadge = (status) => {
    const config = {
      'approved': { color: '#4CAF50', text: 'Validé' },
      'pending': { color: '#FF9800', text: 'En attente' },
      'rejected': { color: '#F44336', text: 'Rejeté' }
    };
    const c = config[status] || config.pending;
    return (
      <View style={[styles.statusBadge, { backgroundColor: c.color }]}>
        <Text style={styles.statusText}>{c.text}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{uri: 'https://i.imgur.com/wb6bDdA.jpeg'}}
              style={styles.avatar}
            />
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            </View>
          </View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.name}>{userData.username}</Text>
          <Text style={styles.marketName}>{userData.marketName}</Text>
          <View style={styles.badgesContainer}>
            <View style={styles.roleBadge}>
              <Ionicons 
                name={userData.role === 'admin' ? "shield-checkmark" : "person-outline"} 
                size={16} 
                color="#FFF" 
              />
              <Text style={styles.roleText}>{getRoleDisplay(userData.role)}</Text>
            </View>
            {getStatusBadge(userData.status)}
          </View>
          <View style={styles.contactInfo}>
            {userData.email && (
              <View style={styles.contactItem}>
                <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.contactText}>{userData.email}</Text>
              </View>
            )}
            {userData.phone && (
              <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.contactText}>{userData.phone}</Text>
              </View>
            )}
            <View style={styles.contactItem}>
              <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.contactText}>{userData.location || "Kinshasa, RDC"}</Text>
            </View>
          </View>
        </View>
      </View>

      {permissions.viewStatistics && (
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Aperçu du Jour</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="cart-outline" size={20} color="#2196F3" />
              </View>
              <Text style={styles.statNumber}>{formatNumber(todayStats.ordersCount)}</Text>
              <Text style={styles.statLabel}>Commandes</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#E8F5E8' }]}>
                <Ionicons name="cash-outline" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.statNumber}>{todayStats.revenue.toFixed(2)}$</Text>
              <Text style={styles.statLabel}>Chiffre d'affaires</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="trending-up-outline" size={20} color="#FF9800" />
              </View>
              <Text style={styles.statNumber}>
                {todayStats.growth > 0 ? '+' : ''}{todayStats.growth}%
              </Text>
              <Text style={styles.statLabel}>Croissance</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>
          {userData.role === 'admin' ? 'Administration' : 'Mon Compte'}
        </Text>
        <View style={styles.menuList}>
          {getMenuItems().map(renderMenuItem)}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { paddingBottom: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { height: 320 },
  headerBackground: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 320,
    backgroundColor: '#2196F3',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)' },
  verifiedBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'white', borderRadius: 10, padding: 2 },
  greeting: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 5 },
  name: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 5 },
  marketName: { fontSize: 18, color: 'white', fontWeight: '600', marginBottom: 10 },
  badgesContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  roleText: { color: 'white', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: 'white', fontSize: 10, fontWeight: '600' },
  contactInfo: { alignItems: 'center' },
  contactItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  contactText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginLeft: 8 },
  statsSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -40,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statsTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { alignItems: 'center', flex: 1 },
  statIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#666', textAlign: 'center' },
  menuSection: { marginTop: 20, paddingHorizontal: 20 },
  menuSectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  menuList: {},
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  menuSubtitle: { fontSize: 12, color: '#666' },
});

export default Profile;