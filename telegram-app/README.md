# PoolMind Telegram Bot

A Telegram bot interface for the PoolMind Arbitrage Trading Platform, built with TypeScript and Telegraf.

## 🚀 Features

- **Real-time Trading Alerts**: Get instant notifications about arbitrage opportunities
- **Portfolio Management**: Monitor your trading positions and performance
- **Interactive Commands**: Easy-to-use commands for trading operations
- **Rate Limiting**: Built-in protection against spam and abuse
- **Redis Session Management**: Persistent user sessions and data storage
- **Comprehensive Logging**: Detailed logging with Winston
- **Error Handling**: Robust error handling and recovery mechanisms

## 📋 Prerequisites

- Node.js 20.x or higher
- Redis server
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- PoolMind API access

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd telegram-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   BOT_TOKEN=your_telegram_bot_token_here
   REDIS_URL=redis://localhost:6379
   API_BASE_URL=https://api.poolmind.com/v1
   API_KEY=your_api_key_here
   # ... other variables
   ```

4. **Start Redis server**
   ```bash
   # On Ubuntu/Debian
   sudo systemctl start redis-server
   
   # On macOS with Homebrew
   brew services start redis
   
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

5. **Run the application**
   ```bash
   # Development mode with hot reload
   npm run dev
   
   # Production build and start
   npm run build
   npm start
   ```

### Docker Deployment

1. **Build the Docker image**
   ```bash
   docker build -t poolmind-telegram-bot .
   ```

2. **Run with Docker Compose** (recommended)
   
   Create a `docker-compose.yml` file:
   ```yaml
   version: '3.8'
   
   services:
     telegram-bot:
       build: .
       environment:
         - BOT_TOKEN=${BOT_TOKEN}
         - REDIS_URL=redis://redis:6379
         - API_BASE_URL=${API_BASE_URL}
         - API_KEY=${API_KEY}
         - NODE_ENV=production
       depends_on:
         - redis
       restart: unless-stopped
   
     redis:
       image: redis:7-alpine
       restart: unless-stopped
       volumes:
         - redis_data:/data
   
   volumes:
     redis_data:
   ```
   
   Run with:
   ```bash
   docker-compose up -d
   ```

3. **Run standalone Docker container**
   ```bash
   docker run -d \
     --name poolmind-bot \
     -e BOT_TOKEN="your_bot_token" \
     -e REDIS_URL="redis://your-redis-host:6379" \
     -e API_BASE_URL="https://api.poolmind.com/v1" \
     -e API_KEY="your_api_key" \
     -p 3000:3000 \
     poolmind-telegram-bot
   ```

## 🏗️ Project Structure

```
src/
├── bot/                    # Bot implementation
│   ├── callbacks/         # Callback query handlers
│   ├── commands/          # Bot commands
│   ├── keyboards/         # Inline keyboards
│   ├── middleware/        # Bot middleware
│   └── scenes/           # Conversation scenes
├── config/               # Configuration files
├── services/             # External service integrations
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `BOT_TOKEN` | Telegram Bot API token | ✅ | - |
| `PORT` | Server port | ❌ | 3000 |
| `NODE_ENV` | Environment mode | ❌ | development |
| `REDIS_URL` | Redis connection URL | ✅ | - |
| `API_BASE_URL` | PoolMind API base URL | ✅ | - |
| `API_KEY` | PoolMind API key | ✅ | - |
| `JWT_SECRET` | JWT signing secret | ✅ | - |
| `ENCRYPTION_KEY` | Data encryption key | ✅ | - |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | ❌ | 900000 |
| `RATE_LIMIT_MAX` | Max requests per window | ❌ | 100 |
| `LOG_LEVEL` | Logging level | ❌ | info |
| `LOG_FILE_PATH` | Log file path | ❌ | ./logs/app.log |

## 🤖 Bot Commands

- `/start` - Initialize the bot and user registration
- `/help` - Display available commands and features
- `/portfolio` - View your current trading portfolio
- `/alerts` - Configure trading alerts and notifications
- `/settings` - Manage bot preferences and configurations
- `/status` - Check bot and API connection status

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the TypeScript project
- `npm start` - Start the production server
- `npm test` - Run test suite
- `npm run lint` - Lint TypeScript files
- `npm run lint:fix` - Fix linting issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Code Style

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Run `npm run lint:fix && npm run format` before committing.

## 📝 Logging

The application uses Winston for structured logging:

- **Console output**: Formatted logs in development
- **File output**: JSON logs written to `LOG_FILE_PATH`
- **Log levels**: error, warn, info, debug

## 🔒 Security Features

- **Rate limiting**: Prevents spam and abuse
- **Input validation**: Joi schema validation
- **Error handling**: Secure error messages
- **Session management**: Redis-based session storage
- **Environment isolation**: Separate configs per environment

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure Redis instance
- [ ] Set strong `JWT_SECRET` and `ENCRYPTION_KEY`
- [ ] Configure proper logging levels
- [ ] Set up monitoring and health checks
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set up SSL certificates
- [ ] Configure firewall rules

### Health Monitoring

The application includes health check endpoints and proper signal handling for graceful shutdowns.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Contact the PoolMind team
- Check the [documentation](https://docs.poolmind.com)

---

**PoolMind Team** - Building the future of arbitrage trading 