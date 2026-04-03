import { Type } from 'class-transformer';
import { IsOptional, IsNumber, Min, Max, IsString, IsBoolean, IsIn, IsInt } from 'class-validator';

export class UpdateFaceRecognitionConfigDto {
    @IsOptional()
    @Type(() => Number)
    @Min(0)
    @Max(1)
    recognitionThreshold;

    @IsOptional()
    @IsString()
    similarityMetric;

    @IsOptional()
    @IsInt()
    @Min(1)
    maxEmbeddingsPerUser;

    @IsOptional()
    @Type(() => Number)
    @Min(0)
    @Max(1)
    spoofThreshold;

    @IsOptional()
    @IsString()
    @IsIn(['MULTI_FRAME', 'SINGLE_FRAME', 'ADVANCED'])
    livenessMode;

    @IsOptional()
    @IsInt()
    @Min(1)
    requiredFrames;

    @IsOptional()
    @IsInt()
    @Min(1)
    captureIntervalMs;

    @IsOptional()
    @IsInt()
    @Min(1)
    faceDetectionMinSize;

    @IsOptional()
    @IsInt()
    @Min(1)
    maxFacesAllowed;

    @IsOptional()
    @IsString()
    arcfaceModelName;

    @IsOptional()
    @IsString()
    antiSpoofModelVersion;

    @IsOptional()
    @IsBoolean()
    saveAttendanceImage;
}
