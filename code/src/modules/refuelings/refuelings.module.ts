import { Module } from "@nestjs/common";
import { RefuelingsController } from "./controllers/refuelings.controller";
import { RefuelingsService } from "./services/refuelings.service";

@Module({
  controllers: [RefuelingsController],
  providers: [RefuelingsService],
  exports: [RefuelingsService],
})
export class RefuelingsModule {}
