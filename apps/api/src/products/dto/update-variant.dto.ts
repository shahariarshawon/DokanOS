import { PartialType } from '@nestjs/swagger';
import { CreateVariantDto } from './create-variant.dto.js';

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}
