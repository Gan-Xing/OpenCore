import { ApiProperty } from '@nestjs/swagger';

export class MenuSummaryDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  path!: string;

  @ApiProperty({ required: false })
  permissionCode?: string;

  @ApiProperty()
  stage!: string;

  @ApiProperty()
  order!: number;
}

export class CreateMenuDto {
  @ApiProperty({ example: 'system.examples' })
  key!: string;

  @ApiProperty({ example: 'Examples' })
  title!: string;

  @ApiProperty({ example: '/system/examples' })
  path!: string;

  @ApiProperty({ required: false })
  permissionCode?: string;

  @ApiProperty()
  order!: number;
}

export class UpdateMenuDto {
  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  path?: string;

  @ApiProperty({ nullable: true, required: false })
  permissionCode?: string | null;

  @ApiProperty({ required: false })
  order?: number;
}
