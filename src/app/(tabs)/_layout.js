import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { ProvedorPedidos } from '../../componentes/ContextoPedidos';

// Layout das abas: desenha a barra de abas na parte de baixo da tela.
// Cada <Tabs.Screen> corresponde a um arquivo desta pasta (pelo "name").
// O ProvedorPedidos envolve as abas: assim Simular e Pedidos enxergam os mesmos pedidos.
export default function LayoutAbas() {
  return (
    <ProvedorPedidos>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#0B5CAD',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Simular',
            tabBarIcon: ({ color, size }) => <Ionicons name="airplane" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="pedidos"
          options={{
            title: 'Pedidos',
            tabBarIcon: ({ color, size }) => <Ionicons name="cube" color={color} size={size} />,
          }}
        />
      </Tabs>
    </ProvedorPedidos>
  );
}
