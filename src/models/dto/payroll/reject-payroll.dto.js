import { IsString, IsNotEmpty } from 'class-validator';

export class RejectPayrollDto {
    @IsString()
    @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
    reason;
}
