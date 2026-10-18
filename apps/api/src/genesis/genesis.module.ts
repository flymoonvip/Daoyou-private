import { Module } from '@nestjs/common';
import {
  CreateCharacterController,
  GenerateCharacterController,
  GenerateFatesController,
  SaveCharacterController,
} from './genesis.controller.js';
import { GenesisService } from './genesis.service.js';
@Module({
  controllers: [
    CreateCharacterController,
    GenerateCharacterController,
    GenerateFatesController,
    SaveCharacterController,
  ],
  providers: [GenesisService],
})
export class GenesisModule {}
