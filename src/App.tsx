import React from "react";
import { GraphProvider } from "./store/GraphProvider";
import { DashboardLayout } from "./components/layout/DashboardLayout";

export const App: React.FC = () => {
  return (
    <GraphProvider>
      <DashboardLayout />
    </GraphProvider>
  );
};

export default App;
