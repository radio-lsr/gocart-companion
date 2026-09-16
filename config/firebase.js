import "firebase/auth";
import "firebase/database";
import "firebase/firestore";
import "firebase/functions";
import "firebase/storage";
import firebase from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
//import firebase from 'firebase/compat/app';
//import 'firebase/compat/auth';
//import 'firebase/compat/database';


const firebaseConfig = {
    apiKey: "AIzaSyConnPyZJMfbOwkkdqPaR0rVjEYWn1MnR0",
    authDomain: "gomart-e2eae.firebaseapp.com",
    databaseURL: "https://gomart-e2eae-default-rtdb.firebaseio.com",
    projectId: "gomart-e2eae",
    storageBucket: "gomart-e2eae.firebasestorage.app",
    messagingSenderId: "1080581604267",
    appId: "1:1080581604267:web:c7cd2b3addac3fe3aa88ee"
};

export const app = firebase.initializeApp(firebaseConfig);
export const database = firebase.database();
//export const onValue = firebase.onValue()
// Exporter les fonctions Firebase utilisées

// Constantes
//export const USER_ID = "user_123"; // À remplacer par l'ID utilisateur réel depuis votre système d'auth

