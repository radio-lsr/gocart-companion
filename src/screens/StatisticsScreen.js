// screens/StatisticsScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const StatisticsScreen = ({ navigation }) => {
  const [timeRange, setTimeRange] = useState('day'); // day, week, month, year
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    setLoading(true);
    
    // Simuler un chargement de données
    setTimeout(() => {
      const mockStats = {
        totalRevenue: getRandomAmount(1000, 10000),
        totalOrders: getRandomNumber(50, 500),
        averageOrder: getRandomAmount(20, 200),
        growth: getRandomNumber(-15, 25),
        customerCount: getRandomNumber(30, 300),
        topProducts: [
          { name: 'Produit A', sales: 45, revenue: 450 },
          { name: 'Produit B', sales: 38, revenue: 380 },
          { name: 'Produit C', sales: 32, revenue: 320 },
          { name: 'Produit D', sales: 28, revenue: 280 },
          { name: 'Produit E', sales: 25, revenue: 250 },
        ],
        revenueData: generateRevenueData(timeRange),
        paymentMethods: [
          { method: 'Carte', percentage: 65, amount: 8450 },
          { method: 'Espèces', percentage: 25, amount: 3250 },
          { method: 'Mobile', percentage: 10, amount: 1300 },
        ]
      };
      
      setStats(mockStats);
      setLoading(false);
    }, 1500);
  };

  const getRandomAmount = (min, max) => {
    return (Math.random() * (max - min) + min).toFixed(2);
  };

  const getRandomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const generateRevenueData = (range) => {
    const data = [];
    let points = 7;
    
    switch (range) {
      case 'day':
        points = 24;
        break;
      case 'week':
        points = 7;
        break;
      case 'month':
        points = 30;
        break;
      case 'year':
        points = 12;
        break;
    }
    
    for (let i = 0; i < points; i++) {
      data.push({
        label: getLabel(i, range),
        value: getRandomAmount(100, 1000),
      });
    }
    
    return data;
  };

  const getLabel = (index, range) => {
    switch (range) {
      case 'day':
        return `${index}h`;
      case 'week':
        const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        return days[index];
      case 'month':
        return `${index + 1}`;
      case 'year':
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        return months[index];
      default:
        return `${index}`;
    }
  };

  const getTimeRangeTitle = () => {
    const titles = {
      day: 'Aujourd\'hui',
      week: 'Cette Semaine',
      month: 'Ce Mois',
      year: 'Cette Année',
    };
    return titles[timeRange] || 'Statistiques';
  };

  const getMaxRevenue = () => {
    if (!stats) return 1000;
    return Math.max(...stats.revenueData.map(item => parseFloat(item.value)));
  };

  if (loading || !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Chargement des statistiques...</Text>
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
        <Text style={styles.title}>Statistiques</Text>
      </View>

      {/* Sélecteur de période */}
      <View style={styles.periodSelector}>
        {[
          { key: 'day', label: 'Jour' },
          { key: 'week', label: 'Semaine' },
          { key: 'month', label: 'Mois' },
          { key: 'year', label: 'Année' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.periodButton,
              timeRange === item.key && styles.periodButtonActive
            ]}
            onPress={() => setTimeRange(item.key)}
          >
            <Text style={[
              styles.periodText,
              timeRange === item.key && styles.periodTextActive
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Titre de la période */}
        <Text style={styles.periodTitle}>{getTimeRangeTitle()}</Text>

        {/* Cartes de statistiques principales */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="cash-outline" size={24} color="#2196F3" />
            </View>
            <Text style={styles.statValue}>{stats.totalRevenue}€</Text>
            <Text style={styles.statLabel}>Chiffre d'affaires</Text>
            <View style={styles.statTrend}>
              <Ionicons 
                name={stats.growth >= 0 ? "trending-up" : "trending-down"} 
                size={16} 
                color={stats.growth >= 0 ? "#4CAF50" : "#F44336"} 
              />
              <Text style={[
                styles.trendText,
                { color: stats.growth >= 0 ? "#4CAF50" : "#F44336" }
              ]}>
                {stats.growth >= 0 ? '+' : ''}{stats.growth}%
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E8F5E8' }]}>
              <Ionicons name="cart-outline" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Commandes</Text>
            <Text style={styles.statSubtext}>
              Moyenne: {stats.averageOrder}€
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="people-outline" size={24} color="#FF9800" />
            </View>
            <Text style={styles.statValue}>{stats.customerCount}</Text>
            <Text style={styles.statLabel}>Clients</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="time-outline" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.statValue}>2.5 min</Text>
            <Text style={styles.statLabel}>Temps moyen</Text>
          </View>
        </View>

        {/* Graphique simplifié du chiffre d'affaires */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Chiffre d'affaires</Text>
            <Text style={styles.chartAmount}>{stats.totalRevenue}€</Text>
          </View>
          
          <View style={styles.chartContainer}>
            {stats.revenueData.map((item, index) => {
              const maxValue = getMaxRevenue();
              const heightPercentage = (parseFloat(item.value) / maxValue) * 100;
              
              return (
                <View key={index} style={styles.chartBarContainer}>
                  <View style={styles.chartBarWrapper}>
                    <View 
                      style={[
                        styles.chartBar,
                        { 
                          height: `${Math.max(heightPercentage, 10)}%`,
                          backgroundColor: index % 2 === 0 ? '#FF1493' : '#FF69B4'
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{item.label}</Text>
                  <Text style={styles.chartValue}>{parseFloat(item.value).toFixed(0)}€</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Produits les plus vendus */}
        <View style={styles.productsCard}>
          <Text style={styles.productsTitle}>Produits Populaires</Text>
          {stats.topProducts.map((product, index) => (
            <View key={index} style={styles.productItem}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productSales}>{product.sales} ventes • {product.revenue}€</Text>
              </View>
              <View style={styles.productBarContainer}>
                <View 
                  style={[
                    styles.productBar,
                    { width: `${(product.sales / 50) * 100}%` }
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Méthodes de paiement */}
        <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Méthodes de Paiement</Text>
          {stats.paymentMethods.map((method, index) => (
            <View key={index} style={styles.paymentItem}>
              <View style={styles.paymentMethod}>
                <Ionicons 
                  name={
                    method.method === 'Carte' ? 'card-outline' : 
                    method.method === 'Espèces' ? 'cash-outline' : 'phone-portrait-outline'
                  } 
                  size={20} 
                  color="#666" 
                />
                <Text style={styles.paymentText}>{method.method}</Text>
              </View>
              <View style={styles.paymentStats}>
                <Text style={styles.paymentPercentage}>{method.percentage}%</Text>
                <Text style={styles.paymentAmount}>{method.amount}€</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Résumé de performance */}
        <View style={styles.performanceCard}>
          <Text style={styles.performanceTitle}>Résumé de Performance</Text>
          <View style={styles.performanceItem}>
            <Ionicons name="trending-up" size={20} color="#4CAF50" />
            <View style={styles.performanceInfo}>
              <Text style={styles.performanceLabel}>Croissance du CA</Text>
              <Text style={[styles.performanceValue, { color: '#4CAF50' }]}>
                +{stats.growth}% ce mois
              </Text>
            </View>
          </View>
          
          <View style={styles.performanceItem}>
            <Ionicons name="time" size={20} color="#2196F3" />
            <View style={styles.performanceInfo}>
              <Text style={styles.performanceLabel}>Heure de pointe</Text>
              <Text style={styles.performanceValue}>14h-16h</Text>
            </View>
          </View>
          
          <View style={styles.performanceItem}>
            <Ionicons name="star" size={20} color="#FF9800" />
            <View style={styles.performanceInfo}>
              <Text style={styles.performanceLabel}>Produit star</Text>
              <Text style={styles.performanceValue}>Produit A (45 ventes)</Text>
            </View>
          </View>
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  periodButtonActive: {
    backgroundColor: '#FF1493',
  },
  periodText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statSubtext: {
    fontSize: 12,
    color: '#999',
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chartAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 200,
    paddingHorizontal: 10,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  chartBarWrapper: {
    height: 150,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  chartBar: {
    width: 12,
    borderRadius: 6,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 8,
  },
  chartValue: {
    fontSize: 8,
    color: '#999',
    marginTop: 2,
  },
  productsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  productSales: {
    fontSize: 12,
    color: '#666',
  },
  productBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginLeft: 10,
  },
  productBar: {
    height: '100%',
    backgroundColor: '#FF1493',
    borderRadius: 4,
  },
  paymentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  paymentStats: {
    alignItems: 'flex-end',
  },
  paymentPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentAmount: {
    fontSize: 12,
    color: '#666',
  },
  performanceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  performanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  performanceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default StatisticsScreen;