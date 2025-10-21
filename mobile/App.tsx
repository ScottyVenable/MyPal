import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'react-native';
import nodejs from 'nodejs-mobile-react-native';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  const [serverStarted, setServerStarted] = useState(false);

  useEffect(() => {
    startNodeJsServer();
  }, []);

  const startNodeJsServer = () => {
    nodejs.start('main.js');
    
    nodejs.channel.addListener('server-started', () => {
      console.log('Node.js server started successfully');
      setServerStarted(true);
    });

    nodejs.channel.addListener('server-error', (error: string) => {
      console.error('Node.js server error:', error);
    });

    // Send message to Node.js
    nodejs.channel.post('init', 'Initializing server...');
  };

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar barStyle="dark-content" />
        <AppNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
