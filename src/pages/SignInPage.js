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
  Dimensions,
  Platform
} from "react-native";
import LottieView from 'lottie-react-native';
import { app, database, firebase } from '../../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Fonction responsive basée sur la hauteur et la largeur
const responsiveWidth = (size) => (size * SCREEN_WIDTH) / 375;
const responsiveHeight = (size) => (size * SCREEN_HEIGHT) / 812; // Référence iPhone X
const responsiveFont = (size) => Math.min(responsiveWidth(size), responsiveHeight(size) * 1.2);

export const SignInPage = ({ navigation }) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isPhoneLogin, setIsPhoneLogin] = useState(false);
  const [loginMethod, setLoginMethod] = useState('email');

  // Liste des rôles autorisés pour cette application (Companion)
  const allowedRoles = ['caissier', 'store_manager', 'admin'];

  const isEmail = (input) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  const isPhoneNumber = (input) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(input.replace(/\s/g, ''));
  };

  const getEmailFromPhone = async (phone) => {
    try {
      const usersRef = database.ref('users');
      const snapshot = await usersRef.orderByChild('phone').equalTo(phone).once('value');
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const userId = Object.keys(userData)[0];
        return userData[userId].email;
      }
      return null;
    } catch (error) {
      console.error('Error finding email from phone:', error);
      return null;
    }
  };

  const handleEmailSignIn = async (email, password) => {
    try {
      const userCredential = await app.auth().signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Vérifier le statut de l'utilisateur
      const userSnapshot = await database.ref('users/' + user.uid).once('value');
      const userData = userSnapshot.val();

      // Vérifier que l'utilisateur existe
      if (!userData) {
        await app.auth().signOut();
        Alert.alert("Erreur", "Utilisateur non trouvé dans la base de données");
        return null;
      }

      // ✅ Autoriser admin, store_manager et caissier
      if (!allowedRoles.includes(userData.role)) {
        await app.auth().signOut();
        Alert.alert("Accès refusé", "Cette application est réservée aux caissiers, gérants et administrateurs de supermarché");
        return null;
      }

      // Vérifier le statut de l'utilisateur
      if (userData.status !== 'approved') {
        await app.auth().signOut();
        Alert.alert(
          "Compte en attente", 
          "Votre compte est en attente de validation par un administrateur."
        );
        return null;
      }

      // Stocker l'ID du magasin associé (pour les caissiers/gérants)
      if (userData.storeId) {
        await AsyncStorage.setItem('@userStoreId', userData.storeId);
        await AsyncStorage.setItem('@userStoreName', userData.marketName || 'Mon magasin');
      }

      // Stocker le rôle
      await AsyncStorage.setItem('@userRole', userData.role);

      return userData;
    } catch (error) {
      throw error;
    }
  };

  const handlePhoneSignIn = async (phone) => {
    try {
      setIsPhoneLogin(true);
      const phoneProvider = new firebase.auth.PhoneAuthProvider();
      const verificationId = await phoneProvider.verifyPhoneNumber(
        phone,
        // recaptchaVerifier // À configurer pour le web
      );
      setVerificationId(verificationId);
      setShowVerificationModal(true);
    } catch (error) {
      throw error;
    }
  };

  const verifyPhoneCode = async () => {
    if (!verificationCode) {
      Alert.alert("Erreur", "Veuillez entrer le code de vérification");
      return;
    }

    setLoading(true);
    try {
      const credential = firebase.auth.PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );
      
      const userCredential = await firebase.auth().signInWithCredential(credential);
      const user = userCredential.user;

      // Vérifier le statut de l'utilisateur
      const userSnapshot = await database.ref('users/' + user.uid).once('value');
      const userData = userSnapshot.val();

      if (!userData) {
        await app.auth().signOut();
        Alert.alert("Erreur", "Utilisateur non trouvé dans la base de données");
        setLoading(false);
        setShowVerificationModal(false);
        return;
      }

      // ✅ Autoriser admin, store_manager et caissier
      if (!allowedRoles.includes(userData.role)) {
        await app.auth().signOut();
        Alert.alert("Accès refusé", "Cette application est réservée aux caissiers, gérants et administrateurs de supermarché");
        setLoading(false);
        setShowVerificationModal(false);
        return;
      }

      if (userData.status !== 'approved') {
        await app.auth().signOut();
        Alert.alert(
          "Compte en attente", 
          "Votre compte est en attente de validation par un administrateur."
        );
        setLoading(false);
        setShowVerificationModal(false);
        return;
      }

      // Stocker l'ID du magasin associé
      if (userData.storeId) {
        await AsyncStorage.setItem('@userStoreId', userData.storeId);
        await AsyncStorage.setItem('@userStoreName', userData.marketName || 'Mon magasin');
      }

      // Stocker le rôle
      await AsyncStorage.setItem('@userRole', userData.role);

      // Connexion réussie
      handleSuccessfulLogin(userData, user);
      
    } catch (error) {
      Alert.alert("Erreur", "Code de vérification invalide");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessfulLogin = (userData, user) => {
    const displayName = userData?.username || user.displayName || user.email || user.phoneNumber;
    const storeName = userData?.marketName || 'votre magasin';
    
    Alert.alert(
      "Connexion réussie!",
      `Bienvenue ${displayName} - Magasin: ${storeName}`,
      [
        {
          text: "OK",
          onPress: () => {
            setShowVerificationModal(false);
            navigation.reset({
              index: 0,
              routes: [{ name: "SKRT" }],
            });
          }
        }
      ]
    );
  };

  const handleSignIn = async () => {
    // Validation
    if (!identifier || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      if (loginMethod === 'email' || isEmail(identifier)) {
        // Connexion par email
        const email = identifier;
        const userData = await handleEmailSignIn(email, password);
        if (userData) {
          const user = app.auth().currentUser;
          handleSuccessfulLogin(userData, user);
        }
      } else if (loginMethod === 'phone' || isPhoneNumber(identifier)) {
        // Connexion par téléphone
        const phone = identifier;
        const email = await getEmailFromPhone(phone);
        
        if (email) {
          // Si on trouve un email associé, utiliser la connexion email/mot de passe
          const userData = await handleEmailSignIn(email, password);
          if (userData) {
            const user = app.auth().currentUser;
            handleSuccessfulLogin(userData, user);
          }
        } else {
          // Si pas d'email associé, utiliser l'authentification par SMS
          await handlePhoneSignIn(phone);
        }
      } else {
        Alert.alert("Erreur", "Veuillez entrer un email ou un numéro de téléphone valide");
      }

    } catch (error) {
      let errorMessage = "Une erreur est survenue lors de la connexion";
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "Aucun utilisateur trouvé avec cet identifiant";
          break;
        case 'auth/wrong-password':
          errorMessage = "Mot de passe incorrect";
          break;
        case 'auth/invalid-email':
          errorMessage = "Adresse email invalide";
          break;
        case 'auth/invalid-phone-number':
          errorMessage = "Numéro de téléphone invalide";
          break;
        case 'auth/user-disabled':
          errorMessage = "Ce compte a été désactivé";
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = "Un compte existe déjà avec un autre mode d'authentification";
          break;
        default:
          errorMessage = error.message;
      }
      
      Alert.alert("Erreur", errorMessage);
    } finally {
      if (!isPhoneLogin) {
        setLoading(false);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!identifier) {
      Alert.alert("Information", "Veuillez d'abord entrer votre email ou numéro de téléphone");
      return;
    }

    let emailToUse = identifier;

    // Si c'est un téléphone, chercher l'email associé
    if (isPhoneNumber(identifier)) {
      emailToUse = await getEmailFromPhone(identifier);
      if (!emailToUse) {
        Alert.alert("Erreur", "Aucun email trouvé pour ce numéro de téléphone");
        return;
      }
    }

    Alert.alert(
      "Réinitialisation du mot de passe",
      `Un email de réinitialisation sera envoyé à ${emailToUse}`,
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Envoyer",
          onPress: async () => {
            try {
              await app.auth().sendPasswordResetEmail(emailToUse);
              Alert.alert("Succès", "Email de réinitialisation envoyé!");
            } catch (error) {
              Alert.alert("Erreur", "Impossible d'envoyer l'email de réinitialisation");
            }
          }
        }
      ]
    );
  };

  // Calcul de l'espace disponible pour ajuster les marges
  const availableHeight = SCREEN_HEIGHT - responsiveHeight(300); // Hauteur après éléments fixes
  const dynamicMargin = Math.max(responsiveHeight(10), availableHeight * 0.05);

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

        <Text style={styles.title}>Connexion Supermarché</Text>

        {/* Sélecteur de méthode de connexion */}
        <View style={styles.methodSelector}>
          <TouchableOpacity 
            style={[styles.methodButton, loginMethod === 'email' && styles.methodButtonActive]}
            onPress={() => setLoginMethod('email')}
          >
            <Text style={[styles.methodButtonText, loginMethod === 'email' && styles.methodButtonTextActive]}>
              📧 Email
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.methodButton, loginMethod === 'phone' && styles.methodButtonActive]}
            onPress={() => setLoginMethod('phone')}
          >
            <Text style={[styles.methodButtonText, loginMethod === 'phone' && styles.methodButtonTextActive]}>
              📞 Téléphone
            </Text>
          </TouchableOpacity>
        </View>
    
        <View style={[styles.inputView, { marginBottom: dynamicMargin }]}>
          <TextInput
            style={styles.TextInput}
            placeholder={loginMethod === 'email' ? "Email" : "Numéro de téléphone"}
            placeholderTextColor="#003f5c"
            onChangeText={setIdentifier}
            value={identifier}
            keyboardType={loginMethod === 'email' ? "email-address" : "phone-pad"}
            autoCapitalize="none"
          />
        </View>

        <View style={[styles.inputView, { marginBottom: dynamicMargin * 0.8 }]}>
          <TextInput
            style={styles.TextInput}
            placeholder="Mot de passe"
            placeholderTextColor="#003f5c"
            secureTextEntry={true}
            onChangeText={setPassword}
            value={password}
          />
        </View>

        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={[styles.forgot_button, { marginBottom: dynamicMargin }]}>
            Mot de passe oublié ?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.loginBtn, loading && styles.disabledBtn]} 
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.loginText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
          <Text style={[styles.signupLink, { marginTop: dynamicMargin * 0.5 }]}>
            Pas de compte ? <Text style={styles.signupLinkBold}>S'inscrire</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal de vérification par SMS */}
      <Modal
        visible={showVerificationModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vérification par SMS</Text>
            <Text style={styles.modalSubtitle}>
              Un code de vérification a été envoyé à votre téléphone
            </Text>
            
            <View style={styles.inputView}>
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
                onPress={() => {
                  setShowVerificationModal(false);
                  setIsPhoneLogin(false);
                  setLoading(false);
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={verifyPhoneCode}
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
    marginBottom: responsiveHeight(20),
    textAlign: 'center',
  },
  methodSelector: {
    flexDirection: 'row',
    marginBottom: responsiveHeight(20),
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    padding: responsiveWidth(5),
    width: '100%',
    maxWidth: 400,
  },
  methodButton: {
    flex: 1,
    paddingVertical: responsiveHeight(10),
    paddingHorizontal: responsiveWidth(20),
    borderRadius: 20,
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#FF1493',
  },
  methodButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: responsiveFont(16),
  },
  methodButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  animationContainer: {
    width: '100%',
    alignItems: 'center',
    maxHeight: responsiveHeight(200),
    marginBottom: responsiveHeight(10),
  },
  cartAni: {
    width: '100%',
    height: responsiveHeight(200),
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
  forgot_button: {
    height: responsiveHeight(30),
    paddingTop: responsiveHeight(10),
    color: "#003f5c",
    fontSize: responsiveFont(14),
  },
  loginBtn: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 25,
    height: responsiveHeight(50),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF1493",
  },
  loginText: {
    color: "white",
    fontSize: responsiveFont(18),
    fontWeight: "bold",
  },
  disabledBtn: {
    backgroundColor: "#cccccc",
  },
  signupLink: {
    color: "#003f5c",
    fontSize: responsiveFont(16),
  },
  signupLinkBold: {
    fontWeight: "bold",
    color: "#FF1493",
  },
  roleInfo: {
    backgroundColor: '#f8f9fa',
    padding: responsiveHeight(15),
    borderRadius: 10,
    width: '100%',
    maxWidth: 400,
  },
  roleInfoTitle: {
    fontSize: responsiveFont(14),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: responsiveHeight(5),
  },
  roleInfoText: {
    fontSize: responsiveFont(12),
    color: '#666',
    marginBottom: 2,
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: responsiveHeight(20),
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
});

export default SignInPage;