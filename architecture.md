# System Architecture Design - TrapHouseKitchen v2

## 1. Overview
TrapHouseKitchen v2 is a web-based restaurant application designed for two primary user roles: Chefs and Customers. The application is built as a Progressive Web App (PWA) to ensure mobile-first usability and "Home Screen" installation on iOS.

## 2. Technology Stack

### Frontend (Mobile & Web PWA)
- **Framework:** React Native with Expo (Managed Workflow)
- **Language:** TypeScript
- **Navigation:** Expo Router (File-based routing)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State Management:** React Query (TanStack Query) + Zustand
- **PWA Support:** Expo Web with PWA configuration (manifest.json, offline support)
- **Tooling:** Cursor + Sweetpad Extension

### Backend (API)
- **Runtime:** Node.js
- **Framework:** Express.js (TypeScript)
- **API Style:** RESTful API
- **Authentication:** JWT (JSON Web Tokens) with Role-Based Access Control (RBAC)
- **Validation:** Zod

### Database
- **Engine:** PostgreSQL
- **ORM:** Prisma (for type-safe database access)
- **Data Models:** Users, Roles, Dishes, Ingredients, Allergens, Orders, DishRequests, Votes

### Infrastructure & Deployment
- **Containerization:** Docker (Multi-stage builds)
- **Registry:** AWS Elastic Container Registry (ECR)
- **Orchestration:** Docker Compose (for local development)

## 3. Data Models (Schema Design)

### Users
- `id`: UUID
- `email`: String (Unique)
- `passwordHash`: String
- `role`: Enum (CHEF, CUSTOMER)
- `name`: String
- `createdAt`: DateTime

### CustomerProfile (Relation to User)
- `userId`: UUID
- `allergens`: String[] (Array of allergen IDs or names)
- `dietaryPreferences`: String[] (e.g., Vegan, Gluten-Free)

### Dishes
- `id`: UUID
- `name`: String
- `description`: String
- `price`: Decimal
- `imageUrl`: String
- `isAvailable`: Boolean
- `category`: String (e.g., Appetizer, Main, Dessert)
- `allergens`: String[] (Computed or related table)

### Ingredients
- `id`: UUID
- `name`: String
- `allergens`: String[]

### DishRequests (Community Voting)
- `id`: UUID
- `title`: String
- `description`: String
- `customerId`: UUID
- `upvotes`: Integer
- `downvotes`: Integer
- `createdAt`: DateTime

### Orders
- `id`: UUID
- `customerId`: UUID
- `items`: JSON (Snapshot of dishes at time of order)
- `status`: Enum (PENDING, PREPARING, READY, COMPLETED)
- `totalAmount`: Decimal
- `createdAt`: DateTime

## 4. Authentication Flow
1. **Sign Up/Login:** Users authenticate via email/password.
2. **Token Issue:** Backend validates credentials and issues a JWT containing `userId` and `role`.
3. **Session:** Frontend stores the JWT securely (SecureStore for mobile, HttpOnly cookie or LocalStorage for Web).
4. **Protection:** API middleware verifies JWT and checks roles (Chef vs. Customer) for protected routes.

## 5. Chef Dashboard Functionality
- Login/Logout
- **Menu Management:** Create, Read, Update, Delete (CRUD) dishes.
- **Toggle Availability:** Quickly mark dishes as "Sold Out".
- **Order View:** (Optional for V1) View incoming orders.

## 6. Customer Experience
- **Public Access:** Browse menu (Read-only) without login.
- **Profile:** Create account to save allergen preferences.
- **Ordering:** Add items to cart. System checks user's allergen profile against selected dish ingredients and warns/blocks if conflict exists.
- **Dish Requests:** Submit ideas, view list, upvote/downvote.

## 7. Deployment Pipeline
1. **Build:** GitHub Actions (or manual) triggers Docker build.
2. **Tag:** Images tagged with version/commit hash.
3. **Push:** Images pushed to AWS ECR.
4. **Deploy:** Container orchestration service (e.g., ECS, App Runner, or basic EC2 with Docker Compose) pulls from ECR.

## 8. Next Steps
1. Initialize Project Structure (Monorepo setup: `frontend`, `backend`).
2. Set up Expo with TypeScript.
3. Set up Express Backend with Prisma and Docker.

