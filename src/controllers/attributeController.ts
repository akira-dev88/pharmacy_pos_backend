// controllers/AttributeController.ts

import type {
  Request,
  Response
} from 'express';

import {
  AttributeModel
} from '../models/Attribute';

import type {
  AuthRequest
} from '../middleware/auth';

export class AttributeController {

  // CREATE
  static create = (
    req: AuthRequest,
    res: Response
  ): void => {

    try {

      const {
        name,
        display_name,
        data_type
      } = req.body;

      if (
        !name ||
        !display_name ||
        !data_type
      ) {

        res.status(400).json({
          success: false,
          error: 'All fields required'
        });

        return;
      }

      const attribute =
        AttributeModel.create({
          name,
          display_name,
          data_type
        });

      res.status(201).json({
        success: true,
        data: attribute
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // LIST
  static index = (
    req: Request,
    res: Response
  ): void => {

    try {

      const attributes =
        AttributeModel.findAll();

      res.json({
        success: true,
        data: attributes
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // DELETE
  static destroy = (
    req: AuthRequest,
    res: Response
  ): void => {

    try {

      const uuid =
        String(req.params.uuid);

      const deleted =
        AttributeModel.delete(uuid);

      if (!deleted) {

        res.status(404).json({
          success: false,
          error: 'Attribute not found'
        });

        return;
      }

      res.json({
        success: true,
        message: 'Attribute deleted'
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}