import { useState, useEffect } from 'react';
import { parse } from 'papaparse';
import * as XLSX from 'xlsx';
import { app, database } from '../../config/firebase';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Image, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export default function Admin() {
  const [data, setData] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts();
    
    // Écouter les changements en temps réel
    const productsRef = database.ref('products');
    const unsubscribe = productsRef.on('value', (snapshot) => {
      const productsData = snapshot.val();
      if (productsData) {
        const productsList = Object.keys(productsData).map(barcode => ({
          barcode: barcode,
          ...productsData[barcode]
        }));
        setProducts(productsList);
      } else {
        setProducts([]);
      }
    });

    // Désabonnement
    return () => productsRef.off('value', unsubscribe);
  }, [database]);

  const loadProducts = async () => {
    try {
      const snapshot = await database.ref('products').once('value');
      if (snapshot.exists()) {
        const productsData = snapshot.val();
        const productsList = Object.keys(productsData).map(barcode => ({
          barcode: barcode,
          ...productsData[barcode]
        }));
        setProducts(productsList);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      Alert.alert('Erreur', 'Impossible de charger les produits');
    }
  };

  // Upload de fichier complet
  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      });

      if (result.type === 'success') {
        setLoading(true);
        
        const { uri, name } = result;
        const fileExtension = name.split('.').pop().toLowerCase();
        
        let products = [];

        // Lecture du fichier selon son type
        if (fileExtension === 'csv') {
          products = await processCSVFile(uri);
        } else if (fileExtension === 'json') {
          products = await processJSONFile(uri);
        } else if (fileExtension === 'xlsx') {
          products = await processExcelFile(uri);
        } else {
          Alert.alert('Erreur', 'Format de fichier non supporté');
          return;
        }

        // Validation des données
        if (products.length === 0) {
          Alert.alert('Erreur', 'Aucun produit valide trouvé dans le fichier');
          return;
        }

        // Upload des produits vers Firebase
        await uploadProductsToFirebase(products);
        
        Alert.alert('Succès', `${products.length} produits importés avec succès!`);
      }
    } catch (error) {
      console.error('Erreur traitement fichier:', error);
      Alert.alert('Erreur', 'Impossible de traiter le fichier');
    } finally {
      setLoading(false);
    }
  };

  // Traitement des fichiers CSV
  const processCSVFile = async (uri) => {
    try {
      const fileContent = await FileSystem.readAsStringAsync(uri);
      
      return new Promise((resolve, reject) => {
        parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('Lignes brutes du CSV:', results.data.length);
            const products = results.data
              .filter(row => {
                const isValid = row.barcode && row.name;
                if (!isValid) {
                  console.log('Ligne ignorée - données manquantes:', row);
                }
                return isValid;
              })
              .map(row => ({
                barcode: row.barcode.toString().trim(),
                name: row.name.trim(),
                description: row.description?.trim() || '',
                price: parseFloat(row.price) || 0,
                category: row.category?.trim() || 'Général',
                stock: parseInt(row.stock) || 0,
                minStock: parseInt(row.minStock) || 10,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }));
            console.log('Produits valides après filtrage:', products.length);
            resolve(products);
          },
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      console.error('Erreur lecture CSV:', error);
      throw error;
    }
  };

  // Traitement des fichiers JSON
  const processJSONFile = async (uri) => {
    try {
      const fileContent = await FileSystem.readAsStringAsync(uri);
      const jsonData = JSON.parse(fileContent);
      
      // Supporter les tableaux ou les objets
      const productsArray = Array.isArray(jsonData) ? jsonData : Object.values(jsonData);
      
      return productsArray
        .filter(product => product.barcode && product.name)
        .map(product => ({
          barcode: product.barcode.toString().trim(),
          name: product.name.trim(),
          description: product.description?.trim() || '',
          price: parseFloat(product.price) || 0,
          category: product.category?.trim() || 'Général',
          stock: parseInt(product.stock) || 0,
          minStock: parseInt(product.minStock) || 10,
          isActive: product.isActive !== undefined ? product.isActive : true,
          createdAt: product.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
    } catch (error) {
      console.error('Erreur lecture JSON:', error);
      throw error;
    }
  };

  // Traitement des fichiers Excel
  const processExcelFile = async (uri) => {
    try {
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      return jsonData
      
        .filter(row => row.barcode && row.name)
        .map(row => ({
          barcode: row.barcode.toString().trim(),
          name: row.name.trim(),
          description: row.description?.trim() || '',
          price: parseFloat(row.price) || 0,
          category: row.category?.trim() || 'Général',
          stock: parseInt(row.stock) || 0,
          minStock: parseInt(row.minStock) || 10,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
    } catch (error) {
      console.error('Erreur lecture Excel:', error);
      throw error;
    }
  };

  // Upload vers Firebase
  const uploadProductsToFirebase = async (products) => {
    try {
      for (const product of products) {
        await database.ref(`products/${product.barcode}`).set(product);
      }
    } catch (error) {
      console.error('Erreur upload Firebase:', error);
      throw error;
    }
  };

  // Ajouter des produits d'exemple
  const addSampleProducts = async () => {
    setLoading(true);
    try {
      const sampleProducts = {
        '1234567890123': {
          name: 'Lait entier',
          description: 'Lait UHT entier 1L',
          price: 1.20,
          category: 'Épicerie',
          stock: 50,
          minStock: 10,
          isActive: true
        },
        
      };

      for (const [barcode, productData] of Object.entries(sampleProducts)) {
        await database.ref(`products/${barcode}`).set({
          ...productData,
          price: parseFloat(productData.price),
          stock: 50,
          minStock: 10,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      Alert.alert('Succès', 'Produits d\'exemple ajoutés avec succès!');
    } catch (error) {
      console.error('Erreur ajout produits:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'ajout des produits');
    } finally {
      setLoading(false);
    }
  };

  // Envoi vers Firebase Realtime Database
  const uploadToFirebase = async () => {
    if (!data.length) {
      Alert.alert('Info', 'Aucune donnée à importer');
      return;
    }

    setLoading(true);
    try {
      for (const item of data) {
        await database.ref(`products/${item.barcode}`).set({
          ...item,
          price: parseFloat(item.price),
          stock: parseInt(item.stock) || 0,
          minStock: parseInt(item.minStock) || 5,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      Alert.alert('Succès', `${data.length} produits ajoutés avec succès!`);
      setData([]);
    } catch (error) {
      console.error('Erreur upload:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'importation');
    } finally {
      setLoading(false);
    }
  };

  // Mise à jour du prix
  const updateProductPrice = async (barcode, newPrice) => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      Alert.alert('Erreur', 'Prix invalide');
      return;
    }

    try {
      await database.ref(`products/${barcode}`).update({
        price: parseFloat(newPrice),
        updatedAt: new Date().toISOString()
      });
      Alert.alert('Succès', 'Prix mis à jour avec succès!');
      setEditingProduct(null);
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      Alert.alert('Erreur', 'Erreur lors de la mise à jour');
    }
  };

  // Mise à jour du stock
  const updateProductStock = async (barcode, newStock) => {
    try {
      await database.ref(`products/${barcode}`).update({
        stock: parseInt(newStock) || 0,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur mise à jour stock:', error);
      Alert.alert('Erreur', 'Erreur lors de la mise à jour du stock');
    }
  };

  // Supprimer un produit
  const deleteProduct = async (barcode) => {
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer ce produit ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.ref(`products/${barcode}`).remove();
              Alert.alert('Succès', 'Produit supprimé avec succès!');
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert('Erreur', 'Erreur lors de la suppression');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 Administration Produits</Text>
        <Text style={styles.headerSubtitle}>Gérez votre inventaire de produits</Text>
      </View>

      {/* Section Import */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📤 Importation de produits</Text>
        
        <TouchableOpacity 
          style={[styles.uploadButton, loading && styles.disabledButton]} 
          onPress={handleFileUpload}
          disabled={loading}
        >
          <Text style={styles.uploadButtonText}>
            {loading ? '⏳ Traitement...' : '📎 Importer un fichier (CSV, JSON, Excel)'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.uploadInfo}>
          Formats supportés: CSV, JSON, Excel. Colonnes requises: barcode, name, price
        </Text>
        
        {data.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>
              Aperçu des données ({data.length} produits)
            </Text>
            
            <View style={styles.previewList}>
              {data.slice(0, 3).map((item, index) => (
                <View key={index} style={styles.previewItem}>
                  <Text style={styles.previewBarcode}>{item.barcode}</Text>
                  <Text style={styles.previewName}>{item.name}</Text>
                  <Text style={styles.previewPrice}>{item.price} €</Text>
                </View>
              ))}
            </View>
            
            {data.length > 3 && (
              <Text style={styles.moreText}>... et {data.length - 3} autres produits</Text>
            )}
            
            <TouchableOpacity 
              style={[styles.importButton, loading && styles.disabledButton]}
              onPress={uploadToFirebase}
              disabled={loading}
            >
              <Text style={styles.importButtonText}>
                {loading ? '⏳ Importation...' : `📦 Importer ${data.length} produits`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Section Liste des produits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          📋 Inventaire actuel ({products.length} produits)
        </Text>
        
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucun produit dans la base de données</Text>
            <Text style={styles.emptySubtext}>
              Utilisez l'import de fichier ou les produits d'exemple pour commencer
            </Text>
            <TouchableOpacity style={styles.sampleButton} onPress={addSampleProducts}>
              <Text style={styles.sampleButtonText}>Charger les produits d'exemple</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productsList}>
            {products.map((product) => (
              <View key={product.barcode} style={styles.productCard}>
                {/* Code-barres */}
                <View style={styles.barcodeSection}>
                  <Text style={styles.barcodeText}>📊 {product.barcode}</Text>
                </View>
                
                {/* Image du produit */}
                <View style={styles.productImage}>
                  {product.image ? (
                    <Image source={{ uri: product.image }} style={styles.image} />
                  ) : (
                    <View style={styles.noImage}>
                      <Text>🛒</Text>
                    </View>
                  )}
                </View>
                
                {/* Informations du produit */}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productCategory}>{product.category}</Text>
                  
                  {product.description && (
                    <Text style={styles.productDescription}>{product.description}</Text>
                  )}
                  
                  {/* Prix éditable */}
                  <View style={styles.priceContainer}>
                    {editingProduct === `${product.barcode}-price` ? (
                      <View style={styles.editContainer}>
                        <TextInput
                          style={styles.priceInput}
                          defaultValue={product.price.toString()}
                          keyboardType="numeric"
                          onBlur={(e) => updateProductPrice(product.barcode, e.nativeEvent.text)}
                          autoFocus
                        />
                        <Text style={styles.currency}>€</Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.priceDisplay}
                        onPress={() => setEditingProduct(`${product.barcode}-price`)}
                      >
                        <Text style={styles.priceText}>{product.price} €</Text>
                        <Text style={styles.editIcon}>✏️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* Stock éditable */}
                  <View style={styles.stockContainer}>
                    <Text style={styles.stockLabel}>Stock: </Text>
                    {editingProduct === `${product.barcode}-stock` ? (
                      <TextInput
                        style={styles.stockInput}
                        defaultValue={(product.stock || 0).toString()}
                        keyboardType="numeric"
                        onBlur={(e) => updateProductStock(product.barcode, e.nativeEvent.text)}
                        autoFocus
                      />
                    ) : (
                      <TouchableOpacity 
                        onPress={() => setEditingProduct(`${product.barcode}-stock`)}
                      >
                        <Text style={[
                          styles.stockText,
                          (product.stock || 0) <= (product.minStock || 5) && styles.lowStock
                        ]}>
                          {product.stock || 0} <Text style={styles.editIconSmall}>✏️</Text>
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* Dates */}
                  <View style={styles.datesContainer}>
                    {product.createdAt && (
                      <Text style={styles.dateText}>
                        Créé: {new Date(product.createdAt).toLocaleDateString()}
                      </Text>
                    )}
                    {product.updatedAt && (
                      <Text style={styles.dateText}>
                        Modifié: {new Date(product.updatedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
                
                {/* Bouton suppression */}
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => deleteProduct(product.barcode)}
                >
                  <Text>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#667eea',
    padding: 25,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  uploadButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  uploadInfo: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  disabledButton: {
    opacity: 0.6,
  },
  previewSection: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  previewList: {
    marginBottom: 10,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  previewBarcode: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
  },
  previewName: {
    flex: 2,
    fontSize: 14,
  },
  previewPrice: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  moreText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 15,
  },
  importButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 5,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginBottom: 20,
  },
  sampleButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  sampleButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  productsList: {
    marginTop: 10,
  },
  productCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  barcodeSection: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  barcodeText: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#333',
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    alignSelf: 'center',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
    textAlign: 'center',
  },
  productCategory: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
    fontWeight: '500',
    textAlign: 'center',
  },
  productDescription: {
    fontSize: 13,
    color: '#868e96',
    marginBottom: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  priceContainer: {
    marginBottom: 8,
    alignItems: 'center',
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 4,
    padding: 5,
    width: 80,
    fontSize: 16,
    textAlign: 'center',
  },
  currency: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    borderRadius: 4,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginRight: 10,
  },
  editIcon: {
    fontSize: 14,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'center',
  },
  stockLabel: {
    fontSize: 14,
    color: '#333',
  },
  stockInput: {
    borderWidth: 1,
    borderColor: '#667eea',
    borderRadius: 3,
    padding: 3,
    width: 60,
    fontSize: 14,
    textAlign: 'center',
  },
  stockText: {
    fontSize: 14,
    color: '#333',
  },
  lowStock: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  editIconSmall: {
    fontSize: 12,
  },
  datesContainer: {
    marginTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 11,
    color: '#868e96',
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    borderRadius: 4,
  },
});