import db from '../database/connection';

import { v4 as uuidv4 } from 'uuid';

import type {
    AuditActionType,
  AuditLog,
  CreateAuditLogInput
} from '../types';

export class AuditLogModel {

  // =========================
  // CREATE
  // =========================

  static create(
    input: CreateAuditLogInput
  ): AuditLog {

    const auditUuid =
      uuidv4();

    db.prepare(`

      INSERT INTO audit_logs (

        audit_uuid,

        action_type,

        entity_type,

        entity_uuid,

        reference_uuid,

        user_uuid,

        details,

        ip_address

      ) VALUES (

        ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(

      auditUuid,

      input.action_type,

      input.entity_type,

      input.entity_uuid || null,

      input.reference_uuid || null,

      input.user_uuid || null,

      input.details || null,

      input.ip_address || null
    );

    return this.findById(
      auditUuid
    )!;
  }

  // =========================
  // FIND BY UUID
  // =========================

  static findById(
    uuid: string
  ): AuditLog | undefined {

    return db.prepare(`

      SELECT *

      FROM audit_logs

      WHERE audit_uuid = ?
    `).get(
      uuid
    ) as AuditLog | undefined;
  }

  // =========================
  // LIST
  // =========================

  static findAll(): AuditLog[] {

    return db.prepare(`

      SELECT *

      FROM audit_logs

      ORDER BY created_at DESC
    `).all() as AuditLog[];
  }

  // =========================
  // FILTER
  // =========================

  static findByAction(
    action: AuditActionType
  ): AuditLog[] {

    return db.prepare(`

      SELECT *

      FROM audit_logs

      WHERE action_type = ?

      ORDER BY created_at DESC
    `).all(
      action
    ) as AuditLog[];
  }
}