# V-TryOn - Virtual T-Shirt Try-On Application

## Overview

V-TryOn is a real-time augmented reality (AR) virtual try-on application that allows users to see how t-shirts look on them using their webcam. The app uses MediaPipe pose detection to track body landmarks and overlay t-shirt images in real-time. Users can switch between different shirt views (front, back, left, right), change colors, and save their favorite looks to a gallery.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme configuration
- **Design System**: Custom CSS variables for theming with Space Grotesk (display) and Inter (body) fonts

### AR/Pose Detection
- **MediaPipe Pose**: For real-time body landmark detection from webcam feed
- **MediaPipe Camera Utils**: For handling webcam input
- **MediaPipe Drawing Utils**: For visualizing pose landmarks (debugging)
- **react-webcam**: React component for webcam access
- **Canvas API**: HTML5 Canvas for t-shirt overlay and image manipulation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: REST API with typed routes defined in shared schema
- **Build**: esbuild for server bundling, Vite for client

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` - shared between client and server
- **Migrations**: Managed via Drizzle Kit (`drizzle-kit push`)
- **Image Storage**: Cloudinary for user try-on session photos

### Project Structure
```
├── client/           # React frontend application
│   └── src/
│       ├── components/   # UI components including Shadcn
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # Utility functions
│       └── pages/        # Route pages (LandingPage, Home, not-found)
├── server/           # Express backend
│   ├── db.ts         # Database connection
│   ├── routes.ts     # API route handlers
│   ├── storage.ts    # Data access layer
│   ├── static.ts     # Static file serving
│   └── cloudinary.ts # Cloudinary upload utility
├── shared/           # Shared code between client/server
│   ├── schema.ts     # Drizzle database schema
│   └── routes.ts     # API route definitions with Zod validation
└── migrations/       # Database migrations
```

### API Design
Routes are defined in `shared/routes.ts` with Zod schemas for input validation:
- `GET /api/looks` - List all saved looks
- `POST /api/looks` - Create a new saved look
- `DELETE /api/looks/:id` - Delete a saved look

### Key Design Decisions
1. **Shared Schema**: Database schema and API types are shared between frontend and backend for type safety
2. **MediaPipe CDN Loading**: Pose detection models load from CDN at runtime (large files)
3. **Canvas-based Rendering**: T-shirt overlay uses HTML5 Canvas for real-time image manipulation
4. **Storage Abstraction**: `IStorage` interface allows swapping storage implementations

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with `drizzle-orm/node-postgres`

### Frontend Libraries
- **MediaPipe**: Google's ML framework for pose detection (loaded from CDN)
  - `@mediapipe/pose` - Body landmark detection
  - `@mediapipe/camera_utils` - Camera feed handling
  - `@mediapipe/drawing_utils` - Landmark visualization
- **Radix UI**: Headless UI components (via Shadcn)
- **TanStack Query**: Data fetching and caching

### Build Tools
- **Vite**: Frontend development server and bundler
- **esbuild**: Server-side bundling for production
- **Drizzle Kit**: Database schema migrations

### Runtime Requirements
- Camera permissions required for AR functionality
- Modern browser with WebRTC support
- PostgreSQL database instance