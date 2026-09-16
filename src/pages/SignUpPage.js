import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions
} from "react-native";
import LottieView from 'lottie-react-native';
import { app, database, firebase } from '../../config/firebase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Fonctions responsives
const responsiveWidth = (size) => (size * SCREEN_WIDTH) / 375;
const responsiveHeight = (size) => (size * SCREEN_HEIGHT) / 812; // Référence iPhone X
const responsiveFont = (size) => Math.min(responsiveWidth(size), responsiveHeight(size) * 1.2);

export const SignUpPage = ({ navigation, route }) => {
  // Récupérer les paramètres optionnels (si l'utilisateur vient de CashierManagementScreen)
  const { storeId: presetStoreId, role: presetRole } = route.params || {};

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(presetRole || "admin"); // admin ou caissier
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isEmailVerification, setIsEmailVerification] = useState(true);
  
  // États pour la sélection du magasin
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [loadingStores, setLoadingStores] = useState(true);

  // Calcul de l'espace disponible pour ajuster les marges
  const availableHeight = SCREEN_HEIGHT - responsiveHeight(450); // Hauteur après éléments fixes
  const dynamicMargin = Math.max(responsiveHeight(8), availableHeight * 0.02);

  // Charger la liste des magasins au montage
  useEffect(() => {
    const storesRef = database.ref('stores');
    storesRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const storesList = Object.keys(data).map(key => ({
          id: key,
          name: data[key].name,
          address: data[key].address,
        }));
        setStores(storesList);
      }
      setLoadingStores(false);
    });
    return () => storesRef.off();
  }, []);

  // Si un storeId est prédéfini (depuis CashierManagementScreen), on sélectionne ce magasin automatiquement
  useEffect(() => {
    if (presetStoreId && stores.length > 0) {
      const store = stores.find(s => s.id === presetStoreId);
      if (store) {
        setSelectedStore(store);
      }
    }
  }, [presetStoreId, stores]);

  // Vérifier si c'est un email
  const isEmail = (input) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  const sendVerification = async () => {
    // Validation : username obligatoire, mot de passe, magasin
    if (!username || !password || !confirmPassword) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!selectedStore) {
      Alert.alert("Erreur", "Veuillez choisir un magasin");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    const identifier = email || phone;
    if (!identifier) {
      Alert.alert("Erreur", "Veuillez entrer un email ou un numéro de téléphone");
      return;
    }

    setLoading(true);

    try {
      if (isEmail(identifier)) {
        setIsEmailVerification(true);
        await handleFinalSignUp(identifier, 'email');
      } else {
        setIsEmailVerification(false);
        const auth = app.auth();
        const verificationId = await auth.verifyPhoneNumber(identifier);
        setVerificationId(verificationId);
        setShowVerificationModal(true);
      }
    } catch (error) {
      console.error('Error sending verification:', error);
      
      let errorMessage = "Erreur lors de l'envoi du code de vérification";
      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = "Numéro de téléphone invalide";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Trop de tentatives. Veuillez réessayer plus tard";
          break;
        case 'auth/quota-exceeded':
          errorMessage = "Quota SMS dépassé. Contactez l'administrateur";
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      Alert.alert("Erreur", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode) {
      Alert.alert("Erreur", "Veuillez entrer le code de vérification");
      return;
    }

    setLoading(true);
    try {
      const auth = app.auth();
      const credential = auth.PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );
      
      await auth.signInWithCredential(credential);
      await handleFinalSignUp(phone, 'phone');
      
    } catch (error) {
      console.error('Verification error:', error);
      let errorMessage = "Code de vérification invalide";
      
      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = "Code de vérification incorrect";
          break;
        case 'auth/session-expired':
          errorMessage = "La session a expiré. Veuillez redemander un code";
          break;
      }
      
      Alert.alert("Erreur", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSignUp = async (identifier, authMethod) => {
    try {
      let user;
      
      if (authMethod === 'email') {
        const userCredential = await app.auth().createUserWithEmailAndPassword(identifier, password);
        user = userCredential.user;
      } else {
        user = app.auth().currentUser;
        if (email) {
          await user.updateEmail(email);
        }
      }

      // Mettre à jour le profil avec le username
      await user.updateProfile({
        displayName: username
      });

      // Sauvegarder les données supplémentaires dans Realtime Database
      await database.ref('users/' + user.uid).set({
        username: username,
        email: email || null,
        phone: phone || null,
        marketName: selectedStore.name,
        storeId: selectedStore.id,
        role: role,
        status: role === 'admin' ? 'approved' : 'pending',
        createdAt: new Date().toISOString(),
        preferences: {
          theme: 'light',
          notifications: true
        }
      });

      // Sauvegarder les permissions basées sur le rôle
      await database.ref('permissions/' + user.uid).set(getPermissionsByRole(role));

      Alert.alert(
        "Inscription réussie!",
        role === 'admin' 
          ? "Votre compte administrateur a été créé avec succès" 
          : "Votre compte caissier est en attente de validation par un administrateur",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("SignIn")
          }
        ]
      );

      setShowVerificationModal(false);

    } catch (error) {
      let errorMessage = "Une erreur est survenue lors de l'inscription";
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "Cette adresse email est déjà utilisée";
          break;
        case 'auth/invalid-email':
          errorMessage = "Adresse email invalide";
          break;
        case 'auth/weak-password':
          errorMessage = "Le mot de passe est trop faible";
          break;
        case 'auth/phone-number-already-exists':
          errorMessage = "Ce numéro de téléphone est déjà utilisé";
          break;
        default:
          errorMessage = error.message;
      }
      
      Alert.alert("Erreur", errorMessage);
    }
  };

  const getPermissionsByRole = (role) => {
    const basePermissions = {
      viewProfile: true,
      changePassword: true,
      viewOrders: true
    };

    if (role === 'admin') {
      return {
        ...basePermissions,
        viewStatistics: true,
        manageProducts: true,
        managePrices: true,
        manageCashiers: true,
        viewSalesGrowth: true,
        validateCashiers: true,
        manageInventory: true
      };
    } else {
      return {
        ...basePermissions,
        viewStatistics: false,
        manageProducts: false,
        managePrices: false,
        manageCashiers: false,
        viewSalesGrowth: false,
        validateCashiers: false,
        manageInventory: false
      };
    }
  };

  const renderStoreItem = ({ item }) => (
    <TouchableOpacity
      style={styles.storeItem}
      onPress={() => {
        setSelectedStore(item);
        setShowStoreModal(false);
      }}
    >
      <Text style={styles.storeItemName}>{item.name}</Text>
      <Text style={styles.storeItemAddress}>{item.address}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Image 
          style={styles.image} 
          source={require("../../assets/goCart.png")} 
          resizeMode="contain"
        />
        
        <View style={styles.animationContainer}>
          <LottieView
            style={styles.cartAni}
            source={require("../../assets/41819-shopping-cart-icon")}
            autoPlay={true}
            loop={true}
          />
        </View>
        
        <StatusBar style="auto" />

        <Text style={styles.title}>Inscription Supermarché</Text>

        {/* Champ Nom d'utilisateur */}
        <View style={[styles.inputView, { marginBottom: dynamicMargin }]}>
          <TextInput
            style={styles.TextInput}
            placeholder="Nom d'utilisateur *"
            placeholderTextColor="#003f5c"
            onChangeText={setUsername}
            autoCapitalize="none"
            value={username}
          />
        </View>

        {/* Sélection du magasin - désactivée si un storeId est prédéfini */}
        {presetStoreId ? (
          <View style={[styles.storeSelector, { marginBottom: dynamicMargin }]}>
            <Text style={styles.storeSelectorText}>
              {selectedStore ? selectedStore.name : "Chargement..."}
            </Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.storeSelector, { marginBottom: dynamicMargin }]}
            onPress={() => setShowStoreModal(true)}
          >
            <Text style={styles.storeSelectorText}>
              {selectedStore ? selectedStore.name : "Choisir un magasin *"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Champ Email */}
        <View style={[styles.inputView, { marginBottom: dynamicMargin }]}>
          <TextInput
            style={styles.TextInput}
            placeholder="Email (optionnel)"
            placeholderTextColor="#003f5c"
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
          />
        </View>

        {/* Champ Téléphone */}
        <View style={[styles.inputView, { marginBottom: dynamicMargin }]}>
          <TextInput
            style={styles.TextInput}
            placeholder="Téléphone (optionnel)"
            placeholderTextColor="#003f5c"
            onChangeText={setPhone}
            keyboardType="phone-pad"
            value={phone}
          />
        </View>

        {/* Sélection du rôle - désactivée si un rôle est prédéfini */}
        {presetRole ? (
          <View style={[styles.roleContainer, { marginBottom: dynamicMargin }]}>
            <Text style={styles.roleLabel}>Rôle *</Text>
            <View style={styles.roleButtons}>
              <View style={[styles.roleButton, role === 'admin' && styles.roleButtonActive]}>
                <Text style={[styles.roleButtonText, role === 'admin' && styles.roleButtonTextActive]}>
                  Administrateur
                </Text>
              </View>
              <View style={[styles.roleButton, role === 'caissier' && styles.roleButtonActive]}>
                <Text style={[styles.roleButtonText, role === 'caissier' && styles.roleButtonTextActive]}>
                  Caissier
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.roleContainer, { marginBottom: dynamicMargin }]}>
            <Text style={styles.roleLabel}>Rôle *</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity 
                style={[styles.roleButton, role === 'admin' && styles.roleButtonActive]}
                onPress={() => setRole('admin')}
              >
                <Text style={[styles.roleButtonText, role === 'admin' && styles.roleButtonTextActive]}>
                  Administrateur
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.roleButton, role === 'caissier' && styles.roleButtonActive]}
                onPress={() => setRole('caissier')}
              >
                <Text style={[styles.roleButtonText, role === 'caissier' && styles.roleButtonTextActive]}>
                  Caissier
                </Text>
              </TouchableOpacity>
            </View>
            {role === 'caissier' && (
              <Text style={styles.roleHint}>
                Votre compte devra être validé par un administrateur
              </Text>
            )}
          </View>
        )}

        {/* Champ Mot de passe */}
        <View style={[styles.inputView, { marginBottom: dynamicMargin }]}>
          <TextInput
            style={styles.TextInput}
            placeholder="Mot de passe *"
            placeholderTextColor="#003f5c"
            secureTextEntry={true}
            onChangeText={setPassword}
            value={password}
          />
        </View>

        {/* Champ Confirmation mot de passe */}
        <View style={[styles.inputView, { marginBottom: dynamicMargin }]}>
          <TextInput
            style={styles.TextInput}
            placeholder="Confirmer le mot de passe *"
            placeholderTextColor="#003f5c"
            secureTextEntry={true}
            onChangeText={setConfirmPassword}
            value={confirmPassword}
          />
        </View>

        {/* Bouton d'inscription */}
        <TouchableOpacity 
          style={[styles.signupBtn, loading && styles.disabledBtn, { marginTop: dynamicMargin * 1.5 }]} 
          onPress={sendVerification}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.signupText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

        {/* Lien vers la page de connexion */}
        <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
          <Text style={[styles.loginLink, { marginTop: dynamicMargin }]}>
            Déjà un compte ? <Text style={styles.loginLinkBold}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal de sélection du magasin */}
      <Modal
        visible={showStoreModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir un magasin</Text>
            {loadingStores ? (
              <ActivityIndicator size="large" color="#FF1493" />
            ) : (
              <FlatList
                data={stores}
                renderItem={renderStoreItem}
                keyExtractor={(item) => item.id}
                style={styles.storeList}
              />
            )}
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => setShowStoreModal(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de vérification */}
      <Modal
        visible={showVerificationModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vérification</Text>
            <Text style={styles.modalSubtitle}>
              {isEmailVerification 
                ? "Un code de vérification a été envoyé à votre email" 
                : "Un SMS avec un code de vérification a été envoyé à votre téléphone"}
            </Text>
            
            <View style={[styles.inputView, styles.modalInput]}>
              <TextInput
                style={styles.TextInput}
                placeholder="Code de vérification"
                placeholderTextColor="#003f5c"
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                value={verificationCode}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowVerificationModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={verifyCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Vérifier</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: responsiveHeight(20),
    paddingHorizontal: responsiveWidth(20),
  },
  title: {
    fontSize: responsiveFont(24),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: responsiveHeight(15),
    textAlign: 'center',
  },
  animationContainer: {
    width: '100%',
    alignItems: 'center',
    maxHeight: responsiveHeight(150),
    marginBottom: responsiveHeight(10),
  },
  cartAni: {
    width: '100%',
    height: responsiveHeight(150),
    maxWidth: 400,
  },
  image: {
    width: '80%',
    height: responsiveHeight(80),
    maxWidth: 300,
    marginBottom: responsiveHeight(10),
  },
  inputView: {
    backgroundColor: "#ADD8E6",
    borderRadius: 30,
    width: '100%',
    maxWidth: 400,
    height: responsiveHeight(45),
    alignItems: "center",
    justifyContent: "center",
  },
  TextInput: {
    height: responsiveHeight(45),
    flex: 1,
    padding: responsiveWidth(10),
    textAlign: "center",
    width: "100%",
    fontSize: responsiveFont(16),
  },
  storeSelector: {
    backgroundColor: "#ADD8E6",
    borderRadius: 30,
    width: '100%',
    maxWidth: 400,
    height: responsiveHeight(45),
    alignItems: "center",
    justifyContent: "center",
  },
  storeSelectorText: {
    color: "#003f5c",
    fontSize: responsiveFont(16),
  },
  roleContainer: {
    width: '100%',
    maxWidth: 400,
  },
  roleLabel: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: responsiveHeight(8),
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButton: {
    flex: 1,
    padding: responsiveHeight(12),
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: responsiveWidth(5),
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#FF1493',
  },
  roleButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: responsiveFont(14),
  },
  roleButtonTextActive: {
    color: 'white',
  },
  roleHint: {
    fontSize: responsiveFont(12),
    color: '#666',
    marginTop: responsiveHeight(5),
    fontStyle: 'italic',
  },
  signupBtn: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 25,
    height: responsiveHeight(50),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF1493",
  },
  signupText: {
    color: "white",
    fontSize: responsiveFont(18),
    fontWeight: "bold",
  },
  loginLink: {
    color: "#003f5c",
    fontSize: responsiveFont(16),
  },
  loginLinkBold: {
    fontWeight: "bold",
    color: "#FF1493",
  },
  disabledBtn: {
    backgroundColor: "#cccccc",
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: responsiveWidth(20),
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: responsiveHeight(20),
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: responsiveFont(20),
    fontWeight: 'bold',
    marginBottom: responsiveHeight(10),
  },
  modalSubtitle: {
    fontSize: responsiveFont(14),
    color: '#666',
    textAlign: 'center',
    marginBottom: responsiveHeight(20),
  },
  modalInput: {
    marginBottom: responsiveHeight(20),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: responsiveHeight(10),
  },
  modalButton: {
    flex: 1,
    padding: responsiveHeight(12),
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: responsiveWidth(5),
  },
  modalButtonPrimary: {
    backgroundColor: '#FF1493',
  },
  modalButtonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonTextPrimary: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: responsiveFont(14),
  },
  modalButtonTextSecondary: {
    color: '#666',
    fontWeight: '500',
    fontSize: responsiveFont(14),
  },
  storeList: {
    width: '100%',
    marginBottom: responsiveHeight(15),
  },
  storeItem: {
    padding: responsiveHeight(15),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  storeItemName: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: '#333',
  },
  storeItemAddress: {
    fontSize: responsiveFont(14),
    color: '#666',
    marginTop: responsiveHeight(2),
  },
});

export default SignUpPage;