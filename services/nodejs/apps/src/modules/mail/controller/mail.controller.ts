import { NextFunction, Request, Response } from 'express';
import {
  InternalServerError,
  NotFoundError,
} from '../../../libs/errors/http.errors';
import { EmailTemplateType, MailBody, SmtpConfig } from '../middlewares/types';
import { MailModel } from '../schema/mailInfo.schema';
import {
  accountCreation,
  appUserInvite,
  loginWithOTPRequest,
  resetPassword,
  suspiciousLoginAttempt,
} from '../utils/emailTemplates';
import nodemailer from 'nodemailer';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../libs/services/logger.service';
import { AppConfig } from '../../tokens_manager/config/config';
import Handlebars from 'handlebars';
import { marked } from 'marked';

const renderer = new marked.Renderer();
renderer.heading = (text, level) => `<h${level}>${text}</h${level}>`;
marked.use({ renderer });
@injectable()
export class MailController {
  constructor(
    @inject('AppConfig') private config: AppConfig,
    @inject('Logger') private logger: Logger,
  ) {}
  private renderMarkdownEmail(
    template: NonNullable<AppConfig['platformSettings']>['systemEmailTemplate'],
    templateData: Record<string, any>,
  ) {
    const bodyTemplate = Handlebars.compile(template.markdown);
    const subjectTemplate = Handlebars.compile(template.subject);
    const compiledMarkdown = bodyTemplate(templateData);
    const compiledSubject = subjectTemplate(templateData).trim();
    const htmlBody = marked.parse(compiledMarkdown);
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>${compiledSubject || 'Notification'}</title>
    <style>
      body {
        font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        background: #f5f5f7;
        margin: 0;
        padding: 24px;
        color: #0f172a;
      }
      .email-wrapper {
        max-width: 640px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 10px 35px rgba(15,23,42,0.08);
      }
      .email-wrapper h1,
      .email-wrapper h2,
      .email-wrapper h3 {
        color: #0f172a;
      }
      .email-wrapper a {
        color: #2563eb;
      }
      .email-wrapper hr {
        border: none;
        border-top: 1px solid #e2e8f0;
        margin: 24px 0;
      }
      .email-footer {
        text-align: center;
        font-size: 12px;
        color: #64748b;
        margin-top: 24px;
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      ${htmlBody}
    </div>
    <div class="email-footer">
      Sent via Thero
    </div>
  </body>
</html>`;
    return {
      subject: compiledSubject || template.subject,
      html,
    };
  }

  private resolveCustomTemplate(
    emailTemplateType: string,
    templateData?: Record<string, any>,
  ):
    | {
        subject: string;
        html: string;
      }
    | null {
    const systemTemplate = this.config.platformSettings?.systemEmailTemplate;
    if (
      !systemTemplate?.enabled ||
      emailTemplateType !== EmailTemplateType.AppuserInvite ||
      !templateData
    ) {
      return null;
    }
    try {
      return this.renderMarkdownEmail(systemTemplate, templateData);
    } catch (error) {
      this.logger.warn('Failed to render custom markdown email template, falling back to default', {
        error,
      });
      return null;
    }
  }

  async sendMail(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    let result;
    try {
      const body = req.body;
      if (!this.config.smtp) {
        throw new NotFoundError('Smtp Configuration not set');
      }
      result = await this.emailSender(body, this.config.smtp);
      if (!result.status) {
        throw new InternalServerError(result.data || 'Error sending mail');
      }
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  getEmailContent(
    emailTemplateType: string,
    templateData: Record<string, any>,
  ) {
    let emailContent;
    this.logger.info('emailTemplateType', emailTemplateType);
    switch (emailTemplateType) {
      case EmailTemplateType.LoginWithOtp:
        emailContent = loginWithOTPRequest(templateData);
        return emailContent;

      case EmailTemplateType.AccountCreation:
        emailContent = accountCreation(templateData);
        return emailContent;

      case EmailTemplateType.SuspiciousLoginAttempt:
        emailContent = suspiciousLoginAttempt(templateData);
        return emailContent;

      case EmailTemplateType.ResetPassword:
        emailContent = resetPassword(templateData);
        return emailContent;

      case EmailTemplateType.AppuserInvite:
        emailContent = appUserInvite(templateData);
        return emailContent;

      default:
        throw 'Unknown Template';
    }
  }

  async emailSender(bodyData: MailBody, smtpConfig: SmtpConfig) {
    try {
      const fromEmailDomain = smtpConfig.fromEmail;
      const attachments = bodyData.attachments || [];
      const customTemplate = this.resolveCustomTemplate(
        bodyData.emailTemplateType!,
        bodyData.templateData!,
      );
      const emailContent = customTemplate
        ? customTemplate.html
        : this.getEmailContent(bodyData.emailTemplateType!, bodyData.templateData!);
      const subject =
        customTemplate?.subject || bodyData.subject || 'Notification from Thero';

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port || 587,
        secure: false,
        ...(smtpConfig.password
          ? {
              auth: {
                user: smtpConfig.username,
                pass: smtpConfig.password, // Included only if password exists
              },
            }
          : {
              auth: {
                user: smtpConfig.username, // Include only the username
              },
            }),
      });

      await transporter.sendMail({
        from: fromEmailDomain,
        to: bodyData.sendEmailTo,
        cc: bodyData.sendCcTo,
        subject,
        html: emailContent,
        attachments: attachments,
      });

      const mailEntry = new MailModel({
        subject: bodyData.subject,
        from: bodyData.fromEmailDomain,
        to: bodyData.sendEmailTo,
        cc: bodyData.sendCcTo ? bodyData.sendCcTo : [],
        emailTemplateType: bodyData.emailTemplateType,
      });

      await mailEntry.save();

      return { status: true, data: 'Email sent' };
    } catch (error) {
      this.logger.error('Mail send error', { error });
      return {
        status: false,
        error: 'Failed to send email',
      }; // Return a response instead of throwing
    }
  }
}
