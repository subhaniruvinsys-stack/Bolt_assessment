const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export interface User {
  firstName: string;
  lastName: string;
  email: string;
}

export interface RegisterResponse {
  code: string;
  email: string;
  expiresAt: string;
  message: string;
}

export interface RecognizeResponse {
  recognized: boolean;
  email: string;
}

export interface LoginResponse {
  authenticated: boolean;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ResendCodeResponse {
  code: string;
  expiresAt: string;
  message: string;
}

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageEmoji: string;
  stock: number;
}

export interface CheckoutResponse {
  orderId: string;
  status: string;
  message: string;
  duplicate?: boolean;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // include cookies
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.message || data.error || 'An unexpected error occurred';
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  register: (email: string, firstName: string, lastName: string) =>
    request<RegisterResponse>('/register', {
      method: 'POST',
      body: JSON.stringify({ email, firstName, lastName }),
    }),

  recognize: (email: string) =>
    request<RecognizeResponse>('/recognize', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  login: (email: string, code: string) =>
    request<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  resendCode: (email: string) =>
    request<ResendCodeResponse>('/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  me: () => request<LoginResponse>('/me', { method: 'GET' }),

  logout: () => request<{ message: string }>('/logout', { method: 'POST' }),

  checkout: (
    payload: {
      email: string;
      phone: string;
      shippingAddress: ShippingAddress;
      items?: { productId: string; name: string; price: number; quantity: number }[];
      razorpayPaymentId?: string;
      totalAmount?: number;
    },
    idempotencyKey: string
  ) =>
    request<CheckoutResponse>('/checkout', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    }),

  getProducts: () => request<{ products: Product[] }>('/products', { method: 'GET' }),

  createProduct: (payload: { name: string; description: string; price: number; category: string; imageEmoji: string; stock: number }) =>
    request<Product>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteProduct: (id: string) =>
    request<{ message: string }>(`/admin/products/${id}`, { method: 'DELETE' }),
};
