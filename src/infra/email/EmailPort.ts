export abstract class EmailPort {
    abstract sendEmail(toEmail: string, subject: string, htmlContent: string):Promise<void>
    abstract sendVerificationEmail(toEmail: string, token: string): Promise<void>;
}