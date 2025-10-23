// Navigation types
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  ProfileSelection: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Chat: undefined;
  Stats: undefined;
  Brain: undefined;
  Settings: undefined;
};

export type ProfileSelectionScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ProfileSelection'
>;

export type MainScreenProps = NativeStackScreenProps<RootStackParamList, 'Main'>;
