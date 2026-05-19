import db from '../database/connection';
import crypto from 'crypto';
import os from 'os';

// Get unique machine ID from hardware info
function getMachineId(): string {
  const info = os.hostname() + os.cpus()[0]?.model + os.totalmem();
  return crypto.createHash('md5').update(info).digest('hex');
}

export class LicenseService {

  static generateKey(customerName: string): string {
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    const hash = crypto.createHash('md5')
      .update(customerName + random + 'INSTANTBILL2026')
      .digest('hex')
      .substring(0, 4)
      .toUpperCase();
    return `IB-${random}-${hash}`;
  }

  static activate(licenseKey: string): { success: boolean; error?: string } {
    try {
      if (!licenseKey.match(/^IB-[A-F0-9]{8}-[A-F0-9]{4}$/)) {
        return { success: false, error: 'Invalid license key format' };
      }

      const currentMachineId = getMachineId();

      const existing = db.prepare('SELECT * FROM license LIMIT 1').get() as any;
      if (existing) {
        if (existing.machine_id === currentMachineId) {
          return { success: true };
        }
        return { success: false, error: 'License already activated on another machine' };
      }

      db.prepare(`
        INSERT INTO license (license_key, machine_id, activated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(licenseKey, currentMachineId);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static isLicensed(): boolean {
    try {
      const license = db.prepare('SELECT * FROM license LIMIT 1').get() as any;
      if (!license) return false;

      const currentMachineId = getMachineId();
      return license.machine_id === currentMachineId;
    } catch {
      return false;
    }
  }
}