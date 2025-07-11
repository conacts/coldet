# COLDETS - AI-Powered Debt Collection Platform

A modern, technology-driven debt collection platform built with Next.js that leverages AI automation to streamline debtor communications, payment processing, and compliance management.

## 🚀 Overview

COLDETS is a full-stack debt collection platform designed to maximize recovery rates while maintaining strict compliance with FDCPA/TCPA regulations. The platform combines automated email processing, intelligent AI-powered communications, and seamless payment integration to create an efficient, scalable debt collection workflow.

### Key Features

- **🤖 AI-Powered Communications** - Automated email responses using OpenAI/Claude with customizable AI collectors
- **💳 Seamless Payment Processing** - Stripe integration with one-click payment links, Apple Pay, and Google Pay
- **📧 Advanced Email Management** - AWS SES integration with webhook processing and email tracking
- **📊 Comprehensive Analytics** - Real-time dashboard with email engagement, payment metrics, and performance tracking
- **⚖️ Compliance-First Design** - Built-in FDCPA/TCPA compliance monitoring and audit trails
- **🏢 Multi-Organization Support** - Team management with role-based access control
- **📱 Mobile-Optimized** - Responsive design for mobile-first debt collection workflows

## 🏗️ Technology Stack

- **Frontend/Backend**: Next.js 15+ with TypeScript and App Router
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js with session management
- **Email Service**: AWS SES for sending/receiving emails
- **Payment Processing**: Stripe with webhook support
- **AI Integration**: OpenAI/Claude APIs for communication automation
- **Styling**: Tailwind CSS with shadcn/ui components
- **Testing**: Vitest with browser testing support
- **Code Quality**: Biome for linting and formatting

## 📋 Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- AWS account with SES configured
- Stripe account for payment processing
- OpenAI API key for AI features

## 🔧 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/coldets.git
   cd coldets
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Configure the following variables:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/coldets

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key

   # AWS SES
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   SES_FROM_EMAIL=noreply@yourdomain.com

   # Stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # OpenAI
   OPENAI_API_KEY=sk-...

   # Application
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

4. **Set up the database**
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

## 🎯 Core Features

### Email Management
- **Automated Processing**: Inbound email webhooks with database storage
- **AI Responses**: Intelligent email generation with compliance checking
- **Thread Management**: Conversation grouping and context preservation
- **Engagement Tracking**: Open rates, click tracking, and bounce monitoring

### Payment Processing
- **One-Click Payments**: Secure payment links with mobile optimization
- **Multiple Payment Methods**: Credit cards, Apple Pay, Google Pay
- **Payment Plans**: Flexible payment scheduling and management
- **Real-time Updates**: Instant payment confirmation and debt updates

### AI Collectors
- **Customizable Profiles**: Configure AI agents with specific personas and capabilities
- **Compliance Monitoring**: Built-in FDCPA/TCPA compliance validation
- **Escalation Management**: Automatic escalation to human agents when needed
- **Performance Analytics**: Track AI effectiveness and optimization metrics

### Organization Management
- **Multi-tenant Architecture**: Support for multiple collection agencies
- **Role-based Access**: Admin, manager, collector, and viewer roles
- **Team Collaboration**: Shared debtor management and communication history
- **Invitation System**: Secure team member onboarding

## 📊 Database Schema

The platform includes comprehensive data models for:

- **Organizations & Users**: Multi-tenant user management
- **Debtors & Debts**: Complete debtor profile and debt tracking
- **Communications**: Email threads, calls, and SMS history
- **Payments**: Transaction history and payment method tracking
- **AI Usage**: Token usage and cost tracking for AI operations
- **Compliance**: Audit trails and regulatory compliance monitoring

## 🔄 Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm dev:secure       # Start with HTTPS
pnpm dev:email        # Start email preview server

# Database
pnpm db:generate      # Generate database migrations
pnpm db:push          # Push schema changes to database
pnpm db:studio        # Open Drizzle Studio
pnpm db:migrate       # Run database migrations

# Testing
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage
pnpm test:browser     # Run browser tests

# Production
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run linting
pnpm format           # Format code
```

## 🏢 Business Model

COLDETS supports multiple revenue models:

- **Commission-Based Collections**: 30% commission on recovered amounts
- **Debt Portfolio Purchasing**: Purchase and collect on owned debt portfolios
- **Hybrid Model**: Combination of commission work and portfolio management

Target metrics:
- 25% collection rate (vs 20% industry average)
- $200K+ MRR potential
- 70-75% profit margins on commission work

## 📈 Performance & Analytics

### Key Metrics Tracked
- **Collection Rates**: Recovery percentage and timeline analytics
- **Email Engagement**: Open rates, click rates, and response times
- **Payment Conversion**: Click-to-pay rates and completion metrics
- **AI Performance**: Response quality and compliance scores
- **Financial Reporting**: Revenue, costs, and profitability tracking

### Compliance Features
- **FDCPA Compliance**: Automated validation of communication content
- **TCPA Compliance**: Consent tracking and call time restrictions
- **Audit Trails**: Complete interaction history and documentation
- **Reporting**: Compliance reports and regulatory filing support

## 🔐 Security & Compliance

- **Data Encryption**: All sensitive data encrypted at rest and in transit
- **Role-based Access**: Granular permissions and access control
- **Audit Logging**: Complete activity tracking and compliance reporting
- **PCI Compliance**: Secure payment processing with Stripe
- **GDPR Ready**: Data privacy controls and user consent management

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

- [Business Strategy](docs/BUSINESS_STRATEGY.md) - Financial planning and growth strategy
- [Technical Architecture](docs/PRODUCT_ARCHITECTURE.md) - System design and implementation
- [Database Schema](docs/DATABASE_SCHEMA.md) - Complete data model documentation
- [Legal Compliance](docs/LEGAL_COMPLIANCE.md) - Regulatory requirements and guidelines
- [Implementation Guide](docs/TECHNICAL_IMPLEMENTATION.md) - Development and deployment guide

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, questions, or business inquiries:
- Email: support@coldets.com
- Documentation: Check the `/docs` directory
- Issues: Use GitHub Issues for bug reports and feature requests

---

**Status**: ✅ Production Ready - Core features operational, actively collecting debt with AI automation

**Last Updated**: January 2025 - Version 0.1.0
