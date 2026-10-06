import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AccountProvider } from './AccountContext';

function renderApp() {
  render(
    <BrowserRouter>
      <AccountProvider>
        <App />
      </AccountProvider>
    </BrowserRouter>
  );
}

test('renders the home page', () => {
  renderApp();
  // The hero title is typed in by a GSAP animation on mount, so assert on the
  // static call-to-action button instead.
  expect(screen.getByText(/Create a free account/i)).toBeInTheDocument();
});

test('shows the legal links and asks about analytics with two equal choices', () => {
  renderApp();
  expect(screen.getAllByRole('link', { name: /Privacy policy/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('link', { name: /Terms of service/i }).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: /Essential only/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Allow analytics/i })).toBeInTheDocument();
});
