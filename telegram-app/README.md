# PoolMind Telegram Bot

A comprehensive Telegram interface for the PoolMind Arbitrage Trading Platform. This bot provides both command-based and web app interfaces for users to participate in pooled cross-exchange arbitrage trading.

## 🌟 Features

### Dual Interface System
- **Command-Based Interface**: Traditional Telegram bot commands
- **Web App Interface**: Rich UI with charts, forms, and real-time updates

### Core Functionality
- **Pool Management**: Browse, join, and manage trading pool investments
- **Real-Time Trading**: Live arbitrage trade notifications and updates
- **Portfolio Tracking**: Comprehensive portfolio analytics and performance metrics
- **Financial Operations**: Secure contributions and withdrawals
- **Notifications**: Configurable alerts for trades, profits, and system updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Redis (for session storage)
- PostgreSQL (for data persistence)
- Telegram Bot Token

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd poolmind-telegram-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the bot**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here
WEBHOOK_URL=https://your-domain.com/webhook

# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://username:password@localhost:5432/poolmind

# API Configuration
API_BASE_URL=https://api.poolmind.com/v1
API_KEY=your_api_key_here

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# WebSocket Configuration
WS_PORT=3001

# Brand Colors (PoolMind)
PRIMARY_COLOR=#0B1F3A
SECONDARY_COLOR=#3AA6FF
ACCENT_COLOR=#D4AF37

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

## 🏗️ Architecture

### Project Structure
```
src/
├── bot/
│   ├── commands/           # Command handlers
│   ├── scenes/            # Multi-step interactions
│   ├── middleware/        # Authentication, logging
│   ├── keyboards/         # Inline keyboards
│   └── callbacks/         # Callback query handlers
├── webapp/
│   ├── components/        # React components
│   ├── pages/            # Main app pages
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utility functions
├── services/
│   ├── api.ts            # Backend API client
│   ├── websocket.ts      # Real-time connections
│   └── notifications.ts  # Push notifications
├── types/
│   └── index.ts          # TypeScript interfaces
├── config/
│   └── env.ts            # Environment configuration
└── utils/
    └── logger.ts         # Logging utilities
```

### Key Components

- **Bot Engine**: Built with Telegraf framework
- **Session Management**: Redis-backed session storage
- **Real-Time Updates**: WebSocket integration for live data
- **API Client**: Axios-based HTTP client with retry logic
- **Middleware Chain**: Authentication, rate limiting, error handling
- **Logging**: Winston-based structured logging

## 📱 Bot Commands

### User Commands
- `/start` - Welcome message and pool overview
- `/pools` - List available trading pools
- `/join <pool_id>` - Join a specific pool
- `/contribute <amount>` - Add funds to current pool
- `/balance` - Show portfolio and shares
- `/withdraw <amount>` - Request withdrawal
- `/performance` - Personal performance metrics
- `/pool_info <pool_id>` - Detailed pool information
- `/trades` - Recent trading activity
- `/settings` - User preferences and notifications
- `/help` - Command reference

### Admin Commands
- `/admin` - Admin panel access
- `/create_pool` - Create new trading pool
- `/configure <pool_id>` - Pool configuration
- `/analytics <pool_id>` - Pool analytics dashboard

## 🔐 Security Features

### Authentication & Authorization
- Telegram user verification
- Session-based authentication
- Role-based access control
- Rate limiting per user

### Data Protection
- Input validation and sanitization
- Encrypted data transmission
- Secure API key management
- CSRF protection for web components

## 📊 Real-Time Features

### WebSocket Integration
- Live trading notifications
- NAV updates
- Pool status changes
- Profit distributions
- System announcements

### Notification System
- Trade execution alerts
- Profit distribution notifications
- Pool updates
- System maintenance alerts
- Achievement notifications

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production with Docker
```bash
# Build image
docker build -t poolmind-telegram-bot .

# Run container
docker run -d \
  --name poolmind-bot \
  --env-file .env \
  -p 3000:3000 \
  poolmind-telegram-bot
```

### Production with PM2
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/index.js --name poolmind-bot

# Monitor
pm2 monit

# Auto-restart on server reboot
pm2 startup
pm2 save
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📈 Monitoring & Logging

### Logging Levels
- `error` - Error conditions
- `warn` - Warning conditions
- `info` - Informational messages
- `debug` - Debug messages

### Log Files
- `logs/error.log` - Error logs only
- `logs/combined.log` - All log levels
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Health Checks
- Bot responsiveness check every 5 minutes
- WebSocket connection monitoring
- API endpoint health validation
- Session store connectivity

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Write comprehensive tests
- Document public APIs
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](https://docs.poolmind.com/api)
- [Bot Commands Guide](https://docs.poolmind.com/bot)
- [Web App Guide](https://docs.poolmind.com/webapp)

### Contact
- 📧 Email: support@poolmind.com
- 💬 Telegram: @poolmind_support
- 🌐 Website: https://poolmind.com
- 📱 Status Page: https://status.poolmind.com

## 🎯 Roadmap

### Upcoming Features
- [ ] Advanced charting in Web App
- [ ] Multi-language support
- [ ] Voice command integration
- [ ] Mobile push notifications
- [ ] Advanced portfolio analytics
- [ ] Social trading features
- [ ] Automated trading strategies
- [ ] Integration with external wallets

### Version History
- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Web App integration
- **v1.2.0** - Real-time WebSocket updates
- **v1.3.0** - Advanced portfolio analytics

---

**Built with ❤️ by the PoolMind Team**

*Making arbitrage trading accessible to everyone.* 