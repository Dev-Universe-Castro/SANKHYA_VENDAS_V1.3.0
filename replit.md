# Sankhya CRM - Replit Project

## Overview
This is a Next.js 14 application for managing leads and sales funnels, integrated with the Sankhya ERP system. The application was successfully migrated from Vercel to Replit on October 13, 2025.

## Recent Changes
- **January 20, 2026**: Implemented "Análise de Giro IA" for customer details
  - Created `/api/giro-cliente` endpoint to analyze customer purchases from last month
  - Created `ClienteDetalhesModal` component with collapsible cards (Dados Gerais, Endereço, Contato, Dados Fiscais, Análise de Giro IA)
  - Customer modal shows: avatar with initials, CPF/CNPJ formatted, bar chart of daily purchases, top 5 products bought
  - Removed "Novo Cliente" button - system is now view-only for customers
  - Standardized header layout for Clients page (desktop and mobile) following Pedidos pattern

- **January 19, 2026**: Implemented "Análise de Giro IA" feature for product details
  - Created `/api/giro-produto` endpoint to analyze product sales from last month
  - Refactored product details modal with collapsible cards for better UX
  - Added AI analysis section with bar chart (sales by day) and top 5 buyers table
  - KPIs include: Total Sales Value, Quantity Sold, Total Notes, and Ticket Médio
  - Uses Recharts for data visualization

- **October 13, 2025**: Successfully migrated from Vercel to Replit
  - Fixed JSX syntax error in `components/lead-modal.tsx` (removed extra closing div tag)
  - Configured Next.js to run on port 5000 with proper host settings (0.0.0.0)
  - Set up development workflow for automatic server restart
  - Environment variables configured in `.env.local`

## Project Architecture

### Tech Stack
- **Framework**: Next.js 14.2.25 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: React Hooks
- **API Integration**: Sankhya ERP REST API

### Key Features
- User authentication and authorization
- Lead management with kanban board view
- Sales funnel stages and pipeline tracking
- Partner/customer management (Parceiros)
- Product catalog with inventory
- Order management (Pedidos)
- Activity tracking and event history
- Real-time updates with React state

### Project Structure
```
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # Backend API endpoints
│   │   ├── auth/         # Authentication endpoints
│   │   ├── funis/        # Sales funnel management
│   │   ├── leads/        # Lead CRUD and tracking
│   │   └── sankhya/      # Sankhya ERP integration
│   └── dashboard/        # Main dashboard UI
├── components/            # React components
│   ├── ui/              # shadcn/ui base components
│   ├── dashboard-*.tsx  # Dashboard-specific components
│   ├── lead-*.tsx       # Lead management components
│   └── login-form.tsx   # Authentication UI
├── lib/                  # Business logic and services
│   ├── auth-service.ts
│   ├── leads-service.ts
│   ├── sankhya-api.ts
│   └── types.ts
└── styles/              # Global styles
    └── globals.css
```

## Environment Configuration

### Required Environment Variables
The following variables are configured in `.env.local`:

- `SANKHYA_TOKEN` - Authentication token for Sankhya API
- `SANKHYA_APPKEY` - Application key for Sankhya integration
- `SANKHYA_USERNAME` - Sankhya username
- `SANKHYA_PASSWORD` - Sankhya password
- `NEXT_PUBLIC_APP_URL` (optional) - Public URL for the application

**Note**: For production deployment, these should be moved to Replit Secrets for better security.

## Development

### Running the Application
The application runs automatically via the configured workflow:
- Command: `npm run dev`
- Port: 5000
- Host: 0.0.0.0 (required for Replit)

### Scripts
- `npm run dev` - Start development server on port 5000
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### API Routes
All API routes use dynamic rendering (not statically generated) because they interact with the Sankhya ERP system in real-time.

## Deployment

### Production Deployment
To deploy this application to production on Replit:
1. Ensure all environment variables are set in Replit Secrets
2. Configure deployment settings using the deployment tool
3. Use `npm run build` to create production bundle
4. Use `npm run start` to serve the production build

### Performance Considerations
- API routes use `request.url` for query parameters (dynamic routes)
- Images should use Next.js Image component with priority for LCP
- Consider implementing caching strategies for Sankhya API responses

## User Preferences
None recorded yet.

## Known Issues
- Some API routes show warnings during build about dynamic server usage (expected behavior)
- Minor hydration warnings in development mode (non-critical)
- Browser console shows autocomplete and image optimization suggestions (optional improvements)

## Next Steps
- [ ] Move environment variables from `.env.local` to Replit Secrets for production
- [ ] Implement proper error boundaries for better error handling
- [ ] Add loading states for better UX
- [ ] Optimize images with Next.js Image priority attribute
- [ ] Consider adding API response caching to reduce Sankhya API calls
