import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function configureApp(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('PixelMart API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}

export { configureApp };
