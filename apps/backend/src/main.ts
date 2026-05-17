import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { PORT_ENV } from './config/constants'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: '*' })
  await app.listen(process.env[PORT_ENV] ?? 3000)
}
void bootstrap()
