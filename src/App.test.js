import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders the home page', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );

  // The hero title itself is typed in via a GSAP animation on mount, so
  // assert on the static call-to-action button instead.
  const cta = screen.getByText(/Get Started - Register Now/i);
  expect(cta).toBeInTheDocument();
});
