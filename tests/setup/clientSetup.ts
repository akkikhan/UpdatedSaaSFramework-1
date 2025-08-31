// Client-specific Jest setup for React testing
import "@testing-library/jest-dom";
import { config } from "dotenv";

// Load test environment
config({ path: ".env.test" });

// Mock window.matchMedia for React components that use media queries
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver for components that use it
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock window.location
delete (window as any).location;
window.location = {
  ...window.location,
  assign: jest.fn(),
  reload: jest.fn(),
  replace: jest.fn(),
};

// Suppress console errors for cleaner test output (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render is no longer supported")
    ) {
      return;
    }
    return originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

console.log("⚛️ Client Jest setup complete");
