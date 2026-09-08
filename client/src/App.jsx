import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './app/store.js';
import AuthBootstrap from './app/AuthBootstrap.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthBootstrap>
          <AppRoutes />
        </AuthBootstrap>
      </BrowserRouter>
    </Provider>
  );
}
