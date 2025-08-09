import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@ApiTags('Health')
@Controller()
@Public()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns a simple greeting to verify the service is running',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  getHello(): string {
    this.logger.debug('Health check endpoint called');
    return this.appService.getHello();
  }

  @Get('health/database')
  @ApiOperation({
    summary: 'Database health check',
    description:
      'Checks the database connection status and returns detailed information',
  })
  @ApiResponse({
    status: 200,
    description: 'Database connection status',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['connected', 'disconnected', 'connecting', 'disconnecting'],
        },
        database: { type: 'string' },
        host: { type: 'string' },
        port: { type: 'number' },
        readyState: { type: 'number' },
        collections: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getDatabaseHealth() {
    this.logger.debug('Database health check requested');
    
    try {
      const readyState = this.connection.readyState;
      const status = this.getConnectionStatus(readyState);

      this.logger.debug(`Database connection status: ${status} (readyState: ${readyState})`);

      let collections: string[] = [];
      let operationTest: {
        collectionsListed: number;
        pingTime: string;
        type?: string;
        error?: string;
        status: string;
      } | null = null;
      const connectionDetails = {
        name: this.connection.name || 'unknown',
        host: this.connection.host || 'unknown',
        port: this.connection.port || 0,
        readyState,
        models: Object.keys(this.connection.models),
      };

      if (readyState === 1) {
        // Test basic database operations with timeout
        try {
          // Test 1: List collections with timeout
          const listPromise = this.connection.db?.listCollections().toArray();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('List collections timeout')),
              5000,
            ),
          );

          const collectionList = await Promise.race([
            listPromise,
            timeoutPromise,
          ]);
          collections = (collectionList as any)?.map((c: any) => c.name) || [];

          // Test 2: Simple ping operation
          const pingStart = Date.now();
          await this.connection.db?.admin().ping();
          const pingTime = Date.now() - pingStart;

          operationTest = {
            collectionsListed: collections.length,
            pingTime: `${pingTime}ms`,
            type: 'ping',
            error: '',
            status: 'success',
          };

          this.logger.debug(`✓ Database operations successful: ${collections.length} collections, ping: ${pingTime}ms`);
        } catch (error) {
          this.logger.warn(`✗ Database operation failed: ${error.message}`);
          operationTest = {
            collectionsListed: 0,
            pingTime: '0ms',
            status: 'failed',
            type: 'listCollections',
            error: error.message,
          };
        }
      } else {
        this.logger.warn(`Database not connected (readyState: ${readyState})`);
      }

      const healthResult = {
        status,
        database: connectionDetails.name,
        host: connectionDetails.host,
        port: connectionDetails.port,
        readyState,
        collections,
        connectionDetails,
        operationTest,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(`Database health check completed: ${status}`);
      return healthResult;
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      return {
        status: 'error',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private getConnectionStatus(readyState: number): string {
    switch (readyState) {
      case 0:
        return 'disconnected';
      case 1:
        return 'connected';
      case 2:
        return 'connecting';
      case 3:
        return 'disconnecting';
      default:
        return 'unknown';
    }
  }
}
