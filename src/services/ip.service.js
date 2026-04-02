import { AttendanceAllowedIpRepository } from '../repositories/attendance-allowed-ip.repository.js';
import { Netmask } from 'netmask';

const VPN_DETECT_URL = 'http://ip-api.com/json';

export class IpService {
  constructor() {
    this.allowedIpRepo = new AttendanceAllowedIpRepository();
  }

  async validate(clientIp, securityConfig) {
    if (!securityConfig.requireIpCheck) return true;

    const allowedIps = await this.allowedIpRepo.findAllActive();
    if (!allowedIps.length) return false;

    return allowedIps.some((entry) => {
      try {
        return new Netmask(entry.ipRange).contains(clientIp);
      } catch {
        return entry.ipRange === clientIp;
      }
    });
  }

  // Trả về true nếu phát hiện VPN/Proxy/Hosting
  async detectVpn(clientIp) {
    try {
      console.log(clientIp);
      
      const res = await fetch(
        `${VPN_DETECT_URL}/${clientIp}?fields=status,proxy,hosting,query`,
        { signal: AbortSignal.timeout(5000) }, // không để treo request
      );
      const data = await res.json();
      // proxy = VPN/Proxy/Tor, hosting = datacenter (AWS, GCP...)
      return data.status === 'success' && (data.proxy || data.hosting);
    } catch {
      // Nếu service detect lỗi → không chặn user
      return false;
    }
  }

  validateLocation(location, securityConfig) {
    if (!securityConfig.requireLocationCheck) return true;
    if (!securityConfig.officeLatitude || !securityConfig.officeLongitude)
      return true;

    const dist = this._haversineMeters(
      location.lat,
      location.lng,
      Number(securityConfig.officeLatitude),
      Number(securityConfig.officeLongitude),
    );

    return dist <= (securityConfig.locationRadiusMeters ?? 100);
  }

  _haversineMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
