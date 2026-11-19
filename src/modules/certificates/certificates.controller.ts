import { Request, Response, NextFunction } from 'express';
import { CertificatesService } from './certificates.service';
import { sendSuccess, sendCreated } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';

export class CertificatesController {
  static async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      if (!code) {
        throw ApiError.badRequest('Certificate verification code is required');
      }

      const certificate = await CertificatesService.verifyCertificate(code);
      return sendSuccess(res, certificate, 'Certificate verified successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMyCertificates(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students can view earned certificates');
      }

      const certificates = await CertificatesService.getStudentCertificates(studentId);
      return sendSuccess(res, certificates, 'Certificates fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, courseId, grade } = req.body;
      if (!studentId || !courseId) {
        throw ApiError.badRequest('studentId and courseId are required');
      }

      const certificate = await CertificatesService.issueCertificate(studentId, courseId, grade);
      return sendCreated(res, certificate, 'Certificate issued successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = req.query.search as string;

      const result = await CertificatesService.getAllCertificates({ page, limit, search });
      return sendSuccess(res, result.certificates, 'Certificates fetched', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }
}
