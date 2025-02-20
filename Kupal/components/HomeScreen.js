import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Button, Text, FlatList } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage"; 
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';


const HomeScreen = () => {
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHomes = async () => {
    const token = await AsyncStorage.getItem("token"); 
    if (!token) {
      setError("Authentication token is missing. Please log in.");
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get("http://192.168.1.23:5000/api/display-homes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHomes(response.data.homes);
    } catch (error) {
      console.error("Error fetching homes:", error.response?.data || error.message);
      setError(error.response?.data?.message || "Failed to fetch homes.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHomes(); 

      const interval = setInterval(fetchHomes, 10000); // every 1000 is 1 second

      return () => clearInterval(interval); 
    }, [])
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      <FlatList
        data={homes}
        keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
        renderItem={({ item }) => (
          <View style={styles.homeItem}>
            <Text>Latitude: {item.latitude}</Text>
            <Text>Longitude: {item.longitude}</Text>
          </View>
        )}
      />
    </View>
  );
};


const MapScreen = () => {
  const [location, setLocation] = useState(null);
  const [homeLocation, setHomeLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to use this feature.');
        setLoading(false);
        return;
      }
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
      setLoading(false);
    })();
  }, []);

  const handleMapPress = (event) => {
    setHomeLocation(event.nativeEvent.coordinate);
  };

  const handleSetHome = async () => {
    const token = await AsyncStorage.getItem("token");
    try {
      const response = await axios.post("http://192.168.1.23:5000/api/add-home", {
        latitude: homeLocation.latitude,
        longitude: homeLocation.longitude
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if(response.status === 200){
        Alert.alert('Home Set', `Your home is now at: \nLat: ${homeLocation.latitude}, Lon: ${homeLocation.longitude}`);
      } else {
        Alert.alert('Error on saving home');
      }
    } catch (error) {
      console.error("Error setting home location:", error.response?.data || error.message);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : (
        <>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: location?.latitude || 10.6765,
              longitude: location?.longitude || 122.9509,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            showsUserLocation={true}
            onPress={handleMapPress}
          >
            {homeLocation && (
              <Marker
                coordinate={homeLocation}
                title="Home"
                description="Your selected home location"
              />
            )}
          </MapView>
          {homeLocation && (
            <View style={styles.buttonContainer}>
              <Button title="Set as Home" onPress={handleSetHome} color="#ff6347" />
            </View>
          )}
        </>
      )}
    </View>
  );
};

const ProfileScreen = () => {
  return <View style={styles.container}></View>;
};

const Tab = createBottomTabNavigator();

const BottomTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Maps') {
            iconName = 'map';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Maps" component={MapScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default BottomTabs;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: '20%',
    right: '20%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    elevation: 5,
  },
  homeItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});
