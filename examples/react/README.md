# React + Nodash Analytics Example

**Complete React application with Nodash analytics integration**

This example demonstrates how to integrate Nodash analytics into a React application using modern hooks, context, and best practices.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Open http://localhost:3000
```

## 📦 What's Included

- **React 18** with hooks and functional components
- **TypeScript** for type safety
- **Nodash SDK** for analytics tracking
- **React Router** for navigation tracking
- **Material-UI** for component examples
- **Authentication** flow with user tracking

## 🎯 Analytics Features Demonstrated

### Automatic Tracking
- ✅ **Page views** - Automatic route tracking with React Router
- ✅ **Component interactions** - Button clicks, form submissions
- ✅ **User sessions** - Login/logout and session management
- ✅ **Error boundaries** - Automatic error capture and reporting

### Custom Events
- ✅ **E-commerce** - Product views, cart actions, purchases
- ✅ **User actions** - Search queries, filter applications
- ✅ **Content engagement** - Article reading, media consumption
- ✅ **Performance** - Load times and user experience metrics

## 🔧 Implementation Patterns

### 1. Provider Setup

```typescript
// App.tsx
import { NodashProvider } from '@nodash/integrations/react';

function App() {
  return (
    <NodashProvider 
      token={process.env.REACT_APP_NODASH_TOKEN}
      options={{
        debug: process.env.NODE_ENV === 'development',
        autoTrack: {
          pageViews: true,
          clicks: true,
          forms: true
        }
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Router>
    </NodashProvider>
  );
}
```

### 2. Hook Usage

```typescript
// components/ProductCard.tsx
import { useNodash } from '@nodash/integrations/react';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export function ProductCard({ product }: { product: Product }) {
  const { track, identify } = useNodash();

  const handleView = () => {
    track('Product Viewed', {
      productId: product.id,
      productName: product.name,
      price: product.price,
      category: product.category
    });
  };

  const handleAddToCart = () => {
    track('Product Added to Cart', {
      productId: product.id,
      price: product.price
    });
  };

  useEffect(() => {
    handleView();
  }, []);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{product.name}</Typography>
        <Typography variant="body2">${product.price}</Typography>
        <Button onClick={handleAddToCart}>
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 3. Authentication Integration

```typescript
// hooks/useAuth.ts
import { useNodash } from '@nodash/integrations/react';

export function useAuth() {
  const { identify, track } = useNodash();

  const login = async (email: string, password: string) => {
    try {
      const user = await authService.login(email, password);
      
      // Identify user for analytics
      identify(user.id, {
        email: user.email,
        name: user.name,
        plan: user.plan,
        signupDate: user.createdAt
      });

      // Track login event
      track('User Logged In', {
        method: 'email',
        timestamp: new Date().toISOString()
      });

      return user;
    } catch (error) {
      track('Login Failed', {
        error: error.message,
        email: email
      });
      throw error;
    }
  };

  return { login };
}
```

### 4. Form Tracking

```typescript
// components/ContactForm.tsx
import { useNodash } from '@nodash/integrations/react';

export function ContactForm() {
  const { track } = useNodash();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    track('Form Started', {
      formType: 'contact',
      fields: Object.keys(formData)
    });

    try {
      await submitForm(formData);
      
      track('Form Completed', {
        formType: 'contact',
        success: true
      });
    } catch (error) {
      track('Form Error', {
        formType: 'contact',
        error: error.message
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        onFocus={() => track('Form Field Focused', { field: 'name' })}
      />
      {/* More fields... */}
      <Button type="submit">Send Message</Button>
    </form>
  );
}
```

## 📊 Analytics Dashboard Integration

View your tracked events in the Nodash dashboard:

1. **User Events** - Registration, login, profile updates
2. **Product Analytics** - Views, cart actions, purchases
3. **Content Engagement** - Page views, time on site, interactions
4. **Performance Metrics** - Load times, error rates, user flows

## 🤖 AI Integration

This example works with the Nodash MCP server for AI-powered guidance:

```bash
# Ask your AI assistant:
# "Analyze the tracking in this React app"
# "How can I improve conversion tracking?"
# "What additional events should I track for e-commerce?"
```

## 🔧 Environment Setup

Create a `.env.local` file:

```bash
REACT_APP_NODASH_TOKEN=your_project_token_here
REACT_APP_API_URL=https://api.yourapp.com
```

## 📚 Key Files

- `src/App.tsx` - Provider setup and routing
- `src/hooks/useNodash.ts` - Custom analytics hooks
- `src/components/ProductCard.tsx` - E-commerce tracking example
- `src/pages/CheckoutPage.tsx` - Purchase funnel tracking
- `src/utils/analytics.ts` - Custom tracking utilities

## 🧪 Testing Analytics

```typescript
// src/utils/analytics.test.ts
import { render, fireEvent } from '@testing-library/react';
import { ProductCard } from '../components/ProductCard';

test('tracks product view on mount', () => {
  const mockTrack = jest.fn();
  
  render(
    <NodashProvider token="test" track={mockTrack}>
      <ProductCard product={mockProduct} />
    </NodashProvider>
  );

  expect(mockTrack).toHaveBeenCalledWith('Product Viewed', {
    productId: mockProduct.id,
    productName: mockProduct.name
  });
});
```

## 📖 Learn More

- [**Nodash React Guide**](https://docs.nodash.ai/integrations/react)
- [**React Hooks Documentation**](https://reactjs.org/docs/hooks-intro.html)
- [**TypeScript with React**](https://www.typescriptlang.org/docs/handbook/react.html)

---

**Next Steps**: Customize the tracking events for your specific use case and deploy to production! 