import { ApiProperty } from '@nestjs/swagger';

export class SystemDeptDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty()
  order!: number;

  @ApiProperty({ required: false })
  leader?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class SystemDeptTreeDto extends SystemDeptDto {
  @ApiProperty({ type: () => [SystemDeptTreeDto] })
  children!: readonly SystemDeptTreeDto[];
}

export class SystemDeptOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty()
  order!: number;
}

export class SystemDeptQueryDto {
  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty({ required: false })
  enabled?: boolean | string;
}

export class CreateSystemDeptDto {
  @ApiProperty({ example: 'engineering' })
  code!: string;

  @ApiProperty({ example: 'Engineering' })
  name!: string;

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty({ required: false, default: 0 })
  order?: number;

  @ApiProperty({ required: false })
  leader?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false, default: true })
  enabled?: boolean;
}

export class UpdateSystemDeptDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  parentId?: string | null;

  @ApiProperty({ required: false })
  order?: number;

  @ApiProperty({ required: false })
  leader?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;
}

export class UpdateSystemDeptOrderItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  order!: number;
}

export class UpdateSystemDeptOrderDto {
  @ApiProperty({ type: () => [UpdateSystemDeptOrderItemDto] })
  items!: readonly UpdateSystemDeptOrderItemDto[];
}

export class SystemDeptOrderMutationResultDto {
  @ApiProperty()
  updatedCount!: number;

  @ApiProperty({ type: () => [SystemDeptDto] })
  items!: readonly SystemDeptDto[];
}
