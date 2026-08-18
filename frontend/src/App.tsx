import { useState } from 'react';
import { HomePage } from './pages/Home';
import { RegisterPage } from './pages/Register';
import { CheckoutPage } from './pages/Checkout';
import { Toaster } from 'sonner';

type Page = 'home' | 'register' | 'checkout';

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <Toaster
        position="top-right"
        richColors
        theme="dark"
        toastOptions={{
          style: {
            background: '#13131A',
            border: '1px solid #1E293B',
            color: '#F1F5F9',
          },
        }}
      />
      {currentPage === 'home' ? (
        <HomePage onNavigate={setCurrentPage} />
      ) : currentPage === 'register' ? (
        <RegisterPage
          onNavigateToCheckout={() => setCurrentPage('checkout')}
          onNavigateHome={() => setCurrentPage('home')}
        />
      ) : (
        <CheckoutPage
          onNavigateToRegister={() => setCurrentPage('register')}
          onNavigateHome={() => setCurrentPage('home')}
        />
      )}
    </div>
  );
}

export default App;
