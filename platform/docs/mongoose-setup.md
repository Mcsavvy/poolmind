# Mongoose Setup for PoolMind Platform

This document provides an overview of the Mongoose setup and how to use it in your Next.js application.

## 📁 File Structure

```
lib/
├── database.ts          # Database connection utility
├── mongoose.ts          # Next.js specific connection handling
└── schemas/
    ├── index.ts         # Main exports
    ├── base.ts          # Base schema with common fields/methods
    ├── registry.ts      # Schema registry and utilities
    └── types.ts         # Common types and validators

models/
└── example-user.ts      # Example user model

app/api/
└── users/              # Example API routes
    ├── route.ts
    └── [id]/route.ts
```

## 🚀 Quick Start

1. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your MongoDB URI
   ```

2. **Basic Usage**
   ```typescript
   import { createModel, IBaseDocument } from '@/lib/schemas';
   import dbConnect from '@/lib/mongoose';

   // Define your interface
   interface IPost extends IBaseDocument {
     title: string;
     content: string;
     author: string;
   }

   // Create the model
   const Post = createModel<IPost>('Post', {
     title: { type: String, required: true },
     content: { type: String, required: true },
     author: { type: String, required: true }
   });

   // Use in API routes
   export async function POST(req: Request) {
     await dbConnect();
     const post = new Post(await req.json());
     await post.save();
     return Response.json(post);
   }
   ```

## 🛠️ Features

### Base Schema Benefits
- **Automatic timestamps**: `createdAt` and `updatedAt`
- **Soft delete**: `isActive` field with helper methods
- **Versioning**: Auto-incrementing version field
- **Common methods**: `softDelete()`, `restore()`, `incrementVersion()`
- **Common statics**: `findActive()`, `findInactive()`, `softDeleteById()`

### Schema Registry
- Centralized schema management
- Prevents duplicate registrations
- Easy model retrieval
- Hot-reload friendly

### Type Safety
- Full TypeScript support
- Type-safe model methods
- Validation helpers
- Common field definitions

## 📝 Creating Models

### Simple Model
```typescript
import { createModel, IBaseDocument } from '@/lib/schemas';

interface IProduct extends IBaseDocument {
  name: string;
  price: number;
}

const Product = createModel<IProduct>('Product', {
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 }
});
```

### Advanced Model with Custom Methods
```typescript
const User = createModel<IUser>('User', {
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true }
}, {
  additionalMethods: {
    getDisplayName() {
      return this.username || this.email;
    }
  },
  additionalStatics: {
    findByEmail(email: string) {
      return this.findOne({ email });
    }
  },
  middleware: {
    pre: [{
      hook: 'save',
      fn: function(next) {
        // Custom pre-save logic
        next();
      }
    }]
  }
});
```

## 🔌 Using in Next.js

### API Routes
```typescript
import { withDatabase } from '@/lib/mongoose';
import User from '@/models/example-user';

async function GET() {
  const users = await User.findActive();
  return Response.json(users);
}

export { withDatabase(GET) as GET };
```

### Server Components
```typescript
import dbConnect from '@/lib/mongoose';
import User from '@/models/example-user';

export default async function UsersPage() {
  await dbConnect();
  const users = await User.findActive();
  
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.username}</div>
      ))}
    </div>
  );
}
```

## 🔍 Common Patterns

### Pagination
```typescript
const page = 1;
const limit = 10;
const skip = (page - 1) * limit;

const users = await User.findActive()
  .skip(skip)
  .limit(limit)
  .sort({ createdAt: -1 });
```

### Population
```typescript
// If you have references to other models
const posts = await Post.find()
  .populate('author', 'username email')
  .exec();
```

### Validation
```typescript
import { validators } from '@/lib/schemas';

const userSchema = {
  email: {
    type: String,
    required: true,
    validate: validators.email
  }
};
```

## 🧪 Testing

```typescript
import { schemaRegistry } from '@/lib/schemas';

// Clear registry for clean tests
beforeEach(() => {
  schemaRegistry.clear();
});
```

## 🔧 Configuration

### Connection Options
Edit `lib/database.ts` to customize connection options:

```typescript
const db = await mongoose.connect(MONGODB_URI, {
  bufferCommands: false,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

## 📚 Available Utilities

### Common Fields
- `commonFields.title` - Standard title validation
- `commonFields.email` - Email with validation
- `commonFields.slug` - URL-friendly slug
- `commonFields.tags` - String array for tags
- `commonFields.status` - Status enum field

### Validators
- `validators.email` - Email validation
- `validators.strongPassword` - Strong password requirements
- `validators.phoneNumber` - Phone number validation
- `validators.url` - URL validation

### Enums
- `StatusEnum` - Common status values
- `PriorityEnum` - Priority levels

This setup provides a robust, type-safe, and scalable foundation for MongoDB integration in your Next.js application.