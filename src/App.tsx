import BowserApp from "./bowser/BowserApp";
import { ErrorBoundary } from "./bowser/components/ErrorBoundary";

const App = () => (
  <ErrorBoundary fallbackLevel="app">
    <BowserApp />
  </ErrorBoundary>
);

export default App;
