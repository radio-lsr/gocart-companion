// screens/OrderHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../../config/firebase';

export const OrderHistoryScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadOrders();
    
    // Écouter les changements en temps réel
    const ordersRef = database.ref('orders');
    const handleDataChange = (snapshot) => {
      if (snapshot.exists()) {
        const ordersData = snapshot.val();
        const ordersList = [];
        
        Object.keys(ordersData).forEach(orderId => {
          ordersList.push({
            id: orderId,
            ...ordersData[orderId]
          });
        });
        
        // Trier par date (plus récent en premier)
        ordersList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(ordersList);
      } else {
        setOrders([]);
      }
      setLoading(false);
      setRefreshing(false);
    };

    ordersRef.on('value', handleDataChange);

    return () => ordersRef.off('value', handleDataChange);
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersSnapshot = await database.ref('orders').once('value');
      
      if (ordersSnapshot.exists()) {
        const ordersData = ordersSnapshot.val();
        const ordersList = [];
        
        Object.keys(ordersData).forEach(orderId => {
          ordersList.push({
            id: orderId,
            ...ordersData[orderId]
          });
        });
        
        // Trier par date (plus récent en premier)
        ordersList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(ordersList);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateTotalItems = (cart) => {
    if (!cart) return 0;
      
    try {
        // Gère à la fois les tableaux et les objets
        const items = Array.isArray(cart) ? cart : Object.values(cart);
        return items.reduce((total, item) => total + (item.quantity || 0), 0);
    } catch (error) {
        console.error('Error calculating total items:', error);
        return 0;
    }
  };  

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FFA500',
      completed: '#4CAF50',
      cancelled: '#F44336',
    };
    return colors[status] || '#666';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'En attente',
      completed: 'Terminée',
      cancelled: 'Annulée',
    };
    return texts[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const getTotalRevenue = () => {
    return filteredOrders
      .filter(order => order.status === 'completed')
      .reduce((total, order) => total + (order.totalAmount || 0), 0)
      .toFixed(2);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Chargement des commandes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Commandes Précédentes</Text>
      </View>

      {/* Statistiques rapides */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{filteredOrders.length}</Text>
          <Text style={styles.statLabel}>Commandes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{getTotalRevenue()}€</Text>
          <Text style={styles.statLabel}>Revenu Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {orders.filter(o => o.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Terminées</Text>
        </View>
      </View>

      {/* Filtres */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {[
          { key: 'all', label: 'Toutes' },
          { key: 'pending', label: 'En attente' },
          { key: 'completed', label: 'Terminées' },
          { key: 'cancelled', label: 'Annulées' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.filterButton,
              filter === item.key && styles.filterButtonActive
            ]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[
              styles.filterText,
              filter === item.key && styles.filterTextActive
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.ordersContent}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateTitle}>Aucune commande</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'all' 
                ? "Aucune commande trouvée" 
                : `Aucune commande ${getStatusText(filter).toLowerCase()}`
              }
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <TouchableOpacity 
              key={order.id} 
              style={styles.orderCard}
              onPress={() => navigation.navigate('OrderDetail', { order })}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderNumber}>{order.orderNumber || `CMD-${order.id.slice(-6)}`}</Text>
                  <Text style={styles.customerName}>{order.userName || 'Client non renseigné'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>{formatDate(order.createdAt)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cart-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>
                      {order.cart ? `${calculateTotalItems(order.cart)} articles` : '0 article'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={16} color="#666" />
                  <Text style={styles.amount}>{(order.total || 0).toFixed(2)}$</Text>
                </View>
                {order.paymentMethod && (
                  <View style={styles.detailRow}>
                    <Ionicons name="card-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>{order.paymentMethod}</Text>
                  </View>
                )}
              </View>

              <View style={styles.orderFooter}>
                <TouchableOpacity 
                  style={styles.detailButton}
                  onPress={() => navigation.navigate('OrderDetail', { order })}
                >
                  <Text style={styles.detailButtonText}>Voir détails</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FF1493" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Les styles restent les mêmes...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 5,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#FF1493',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  ordersList: {
    flex: 1,
  },
  ordersContent: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailButtonText: {
    color: '#FF1493',
    fontWeight: '600',
  },
});

export default OrderHistoryScreen;