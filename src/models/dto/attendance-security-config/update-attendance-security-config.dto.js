export class UpdateAttendanceSecurityConfigDto {
  requireIpCheck;
  allowPublicNetwork;
  requireLocationCheck;
  officeLatitude;
  officeLongitude;
  locationRadiusMeters;
  requireSingleFace;
  blockVpn;
  applyTo;
  targetIds;
}
