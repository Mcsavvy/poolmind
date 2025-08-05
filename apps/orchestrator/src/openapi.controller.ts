import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { type Response } from 'express';
import { Public } from './auth/decorators/public.decorator';

@ApiTags('OpenAPI')
@Controller('api')
@Public()
export class OpenApiController {
  @Get('openapi.json')
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Download OpenAPI schema',
    description: 'Downloads the complete OpenAPI schema as a JSON file',
  })
  @ApiResponse({
    status: 200,
    description: 'OpenAPI schema downloaded successfully',
    schema: {
      type: 'object',
      description: 'OpenAPI 3.0 specification',
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        error: {
          type: 'string',
          example: 'Failed to generate OpenAPI schema',
        },
      },
    },
  })
  async downloadOpenApiSchema(@Res() res: Response): Promise<void> {
    try {
      // Get the OpenAPI document from the global context
      // This is set during application bootstrap
      const document = (global as any).openApiDocument;

      if (!document) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'OpenAPI schema not available',
        });
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="openapi.json"',
      );
      res.status(HttpStatus.OK).json(document);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: `Failed to generate OpenAPI schema: ${error}`,
      });
    }
  }
}
