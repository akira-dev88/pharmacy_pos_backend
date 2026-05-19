import type { Request, Response } from 'express';
import { ReportModel } from '../models/Report';
import type { AuthRequest } from '../middleware/auth';

export class ReportController {
  // Dashboard summary
  static dashboard = (req: AuthRequest, res: Response): void => {
    try {
      const dashboard = ReportModel.getDashboard();
      res.json(dashboard);
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Top products
  static topProducts = (req: AuthRequest, res: Response): void => {
    try {
      const products = ReportModel.getTopProducts();
      res.json(products);
    } catch (error) {
      console.error('Top products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Stock report
  static stock = (req: AuthRequest, res: Response): void => {
    try {
      const stockReport = ReportModel.getStockReport();
      res.json(stockReport);
    } catch (error: any) {
      console.error('Stock report error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  // Profit estimation
  static profit = (req: AuthRequest, res: Response): void => {
    try {
      const profitData = ReportModel.getProfit();
      res.json(profitData);
    } catch (error) {
      console.error('Profit report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Sales trend (last 7 days)
  static salesTrend = (req: AuthRequest, res: Response): void => {
    try {
      const trend = ReportModel.getSalesTrend();
      res.json(trend);
    } catch (error) {
      console.error('Sales trend error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Profit trend (last 7 days)
  static profitTrend = (req: AuthRequest, res: Response): void => {
    try {
      const trend = ReportModel.getProfitTrend();
      res.json(trend);
    } catch (error) {
      console.error('Profit trend error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Sales by payment method
  static salesByPayment = (req: AuthRequest, res: Response): void => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      const data = ReportModel.getSalesByPaymentMethod(startDate, endDate);
      res.json(data);
    } catch (error) {
      console.error('Sales by payment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Daily sales summary
  static dailySales = (req: AuthRequest, res: Response): void => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const summary = ReportModel.getDailySalesSummary(days);
      res.json(summary);
    } catch (error) {
      console.error('Daily sales error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Product sales report
  static productSales = (req: AuthRequest, res: Response): void => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      const report = ReportModel.getProductSalesReport(startDate, endDate);
      res.json(report);
    } catch (error) {
      console.error('Product sales report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Customer purchase report
  static customerPurchases = (req: AuthRequest, res: Response): void => {
    try {
      const report = ReportModel.getCustomerPurchaseReport();
      res.json(report);
    } catch (error) {
      console.error('Customer purchase report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
