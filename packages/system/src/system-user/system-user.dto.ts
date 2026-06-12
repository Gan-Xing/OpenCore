import { ApiProperty } from '@nestjs/swagger';

export class UserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ type: [String] })
  roleCodes!: readonly string[];

  @ApiProperty({ required: false, nullable: true })
  deptId?: string;

  @ApiProperty()
  enabled!: boolean;
}

export class CreateUserDto {
  @ApiProperty({ example: 'operator' })
  username!: string;

  @ApiProperty({ example: 'Operations User' })
  displayName!: string;

  @ApiProperty()
  password!: string;

  @ApiProperty({ type: [String], default: [] })
  roleCodes!: readonly string[];

  @ApiProperty({ required: false, nullable: true })
  deptId?: string | null;

  @ApiProperty({ required: false, default: true })
  enabled?: boolean;
}

export class UpdateUserDto {
  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty({ required: false })
  password?: string;

  @ApiProperty({ required: false, type: [String] })
  roleCodes?: readonly string[];

  @ApiProperty({ required: false, nullable: true })
  deptId?: string | null;

  @ApiProperty({ required: false })
  enabled?: boolean;
}
