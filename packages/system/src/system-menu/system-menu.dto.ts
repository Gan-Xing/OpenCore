import { ApiProperty } from '@nestjs/swagger';
import {
  MENU_STATUSES,
  MENU_TYPES,
  type MenuStatus,
  type MenuType,
} from '@opencore/contracts';

export class MenuSummaryDto {
  @ApiProperty()
  key!: string;

  @ApiProperty({ nullable: true, required: false })
  parentKey?: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: MENU_TYPES })
  type!: MenuType;

  @ApiProperty()
  path!: string;

  @ApiProperty({ required: false })
  icon?: string;

  @ApiProperty({ required: false })
  component?: string;

  @ApiProperty({ required: false })
  permissionCode?: string;

  @ApiProperty()
  stage!: string;

  @ApiProperty()
  order!: number;

  @ApiProperty({ enum: MENU_STATUSES })
  status!: MenuStatus;

  @ApiProperty()
  cache!: boolean;

  @ApiProperty()
  hidden!: boolean;
}

export class CreateMenuDto {
  @ApiProperty({ example: 'system.examples' })
  key!: string;

  @ApiProperty({ nullable: true, required: false })
  parentKey?: string | null;

  @ApiProperty({ example: 'Examples' })
  title!: string;

  @ApiProperty({ enum: MENU_TYPES, required: false })
  type?: MenuType;

  @ApiProperty({ example: '/system/examples' })
  path!: string;

  @ApiProperty({ required: false })
  icon?: string;

  @ApiProperty({ required: false })
  component?: string;

  @ApiProperty({ required: false })
  permissionCode?: string;

  @ApiProperty()
  order!: number;

  @ApiProperty({ enum: MENU_STATUSES, required: false })
  status?: MenuStatus;

  @ApiProperty({ required: false })
  cache?: boolean;

  @ApiProperty({ required: false })
  hidden?: boolean;
}

export class UpdateMenuDto {
  @ApiProperty({ nullable: true, required: false })
  parentKey?: string | null;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ enum: MENU_TYPES, required: false })
  type?: MenuType;

  @ApiProperty({ required: false })
  path?: string;

  @ApiProperty({ nullable: true, required: false })
  icon?: string | null;

  @ApiProperty({ nullable: true, required: false })
  component?: string | null;

  @ApiProperty({ nullable: true, required: false })
  permissionCode?: string | null;

  @ApiProperty({ required: false })
  order?: number;

  @ApiProperty({ enum: MENU_STATUSES, required: false })
  status?: MenuStatus;

  @ApiProperty({ required: false })
  cache?: boolean;

  @ApiProperty({ required: false })
  hidden?: boolean;
}
