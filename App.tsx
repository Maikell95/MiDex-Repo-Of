import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import UpdateBanner from './src/components/UpdateBanner';
import CompetitiveDetailScreen from './src/screens/CompetitiveDetailScreen';
import CompetitiveListScreen from './src/screens/CompetitiveListScreen';
import DamageCalcScreen from './src/screens/DamageCalcScreen';
import PokedexTabIcon from './src/components/PokedexTabIcon';
import GmaxScreen from './src/screens/GmaxScreen';
import ItemsScreen from './src/screens/ItemsScreen';
import PokedexListScreen from './src/screens/PokedexListScreen';
import PokemonDetailScreen from './src/screens/PokemonDetailScreen';
import SpeedTiersScreen from './src/screens/SpeedTiersScreen';
import TeamBuilderScreen from './src/screens/TeamBuilderScreen';
import TeamListScreen from './src/screens/TeamListScreen';
import TeamMemberEditScreen from './src/screens/TeamMemberEditScreen';
import TeamPickerScreen from './src/screens/TeamPickerScreen';
import TeraTypesScreen from './src/screens/TeraTypesScreen';
import { colors } from './src/theme';
import type {
  CompetitiveStackParamList,
  RootStackParamList,
  TeamStackParamList,
} from './src/navigation';

const PokeStack = createNativeStackNavigator<RootStackParamList>();
const CompStack = createNativeStackNavigator<CompetitiveStackParamList>();
const TeamStack = createNativeStackNavigator<TeamStackParamList>();
const Tab = createMaterialTopTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTitleStyle: { fontWeight: '800' as const },
  headerTintColor: colors.text,
  animation: 'ios_from_right' as const,
  gestureEnabled: true,
  contentStyle: { backgroundColor: colors.bg },
};

function PokedexStack() {
  return (
    <PokeStack.Navigator screenOptions={stackScreenOptions}>
      <PokeStack.Screen name="Pokedex" component={PokedexListScreen} options={{ title: 'Pokédex' }} />
      <PokeStack.Screen
        name="Detalle"
        component={PokemonDetailScreen}
        options={({ route }) => ({ title: route.params.entry.name })}
      />
    </PokeStack.Navigator>
  );
}

function TeamStackScreen() {
  return (
    <TeamStack.Navigator screenOptions={stackScreenOptions}>
      <TeamStack.Screen name="Team" component={TeamListScreen} options={{ title: 'Mis equipos' }} />
      <TeamStack.Screen name="TeamEdit" component={TeamBuilderScreen} options={{ title: 'Editar equipo' }} />
      <TeamStack.Screen name="TeamPicker" component={TeamPickerScreen} options={{ title: 'Añadir Pokémon' }} />
      <TeamStack.Screen name="TeamMemberEdit" component={TeamMemberEditScreen} options={{ title: 'Set del Pokémon' }} />
    </TeamStack.Navigator>
  );
}

function CompetitiveStack() {
  return (
    <CompStack.Navigator screenOptions={stackScreenOptions}>
      <CompStack.Screen name="Meta" component={CompetitiveListScreen} options={{ title: 'Competitivo' }} />
      <CompStack.Screen
        name="CompetitiveDetail"
        component={CompetitiveDetailScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
      <CompStack.Screen
        name="TeraTypes"
        component={TeraTypesScreen}
        options={{ title: 'Teratipos' }}
      />
      <CompStack.Screen name="Items" component={ItemsScreen} options={{ title: 'Objetos' }} />
      <CompStack.Screen name="Gmax" component={GmaxScreen} options={{ title: 'Gigantamax' }} />
      <CompStack.Screen name="SpeedTiers" component={SpeedTiersScreen} options={{ title: 'Speed tiers' }} />
      <CompStack.Screen name="DamageCalc" component={DamageCalcScreen} options={{ title: 'Calculadora de daño' }} />
    </CompStack.Navigator>
  );
}

// Pestañas deslizables (swipe) con la barra abajo.
// Ruta raíz de cada pestaña. Solo permitimos deslizar entre pestañas cuando estamos
// en la raíz; en pantallas anidadas (p. ej. el detalle con su carrusel de shiny) el
// swipe nativo del PagerView robaría los gestos horizontales internos.
const ROOT_ROUTE: Record<string, string> = {
  PokedexTab: 'Pokedex',
  CompetitivoTab: 'Meta',
  EquipoTab: 'Team',
};

function RootTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={({ route }) => {
      const nested = getFocusedRouteNameFromRoute(route);
      const atRoot = nested === undefined || nested === ROOT_ROUTE[route.name];
      return {
        swipeEnabled: atRoot,
        tabBarShowIcon: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarPressColor: colors.accent + '22',
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
        },
        tabBarIndicatorStyle: { top: 0, height: 3, backgroundColor: colors.accent },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', textTransform: 'none', margin: 0 },
        tabBarIconStyle: { height: 26, marginBottom: 0 },
        tabBarIcon: ({ color }) => {
          if (route.name === 'PokedexTab') return <PokedexTabIcon size={22} color={color} />;
          const icon = route.name === 'EquipoTab' ? 'people' : 'stats-chart';
          return <Ionicons name={icon} size={22} color={color} />;
        },
      };
      }}
    >
      <Tab.Screen name="PokedexTab" component={PokedexStack} options={{ title: 'Pokédex' }} />
      <Tab.Screen name="CompetitivoTab" component={CompetitiveStack} options={{ title: 'Competitivo' }} />
      <Tab.Screen name="EquipoTab" component={TeamStackScreen} options={{ title: 'Equipo' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        <RootTabs />
      </NavigationContainer>
      <UpdateBanner />
    </SafeAreaProvider>
  );
}
