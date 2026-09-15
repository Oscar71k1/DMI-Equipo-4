import { StatusBar } from 'expo-status-bar';

import { createCampusOps } from './src/composition/createCampusOps';
import { CampusOpsScreen } from './src/ui/CampusOpsScreen';

const campusOpsActions = createCampusOps();

export default function App() {
  return (
    <>
      <CampusOpsScreen actions={campusOpsActions} />
      <StatusBar style="auto" />
    </>
  );
}