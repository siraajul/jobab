import { Global, Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { IntentClassifier } from './intent-classifier';

@Global()
@Module({
  controllers: [CommentsController],
  providers: [CommentsService, IntentClassifier],
  exports: [CommentsService, IntentClassifier],
})
export class CommentsModule {}
