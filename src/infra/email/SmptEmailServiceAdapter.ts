import nodemailer, { Transporter } from 'nodemailer';
import { ConfigDomain } from "../config/ConfigDomain";
import { ConfigEmail } from "../config/ConfigEmail";
import { EmailPort } from "./EmailPort";

export class SmtpEmailServiceAdapter extends EmailPort {
    private transporter: Transporter;

    constructor(
    ) {
        super();
        const { email, password } = ConfigEmail.getEmail();
        
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: { user: email, pass: password },
        });
    }

    async sendEmail(
        toEmail: string, 
        subject: string, 
        htmlContent: string
    ): Promise<void> {
        const baseUrl = ConfigDomain.getDomain();

        const finalHtml = htmlContent.replace('{{BASE_URL}}', baseUrl);

        await this.transporter.sendMail({
            from: ConfigEmail.getEmail().email,
            to: toEmail,
            subject: subject,
            html: finalHtml,
        });
    }


async sendVerificationEmail(toEmail: string, token: string): Promise<void> {
    try {
        const baseUrl = ConfigDomain.getDomain();
        // Ajustado para apontar para /auth/verify-email
        const verificationLink = `${baseUrl}/auth/verify-email?token=${token}`;
        
        const subject = "Verificação de Conta";
        const htmlContent = `
            <h1>Confirme seu cadastro</h1>
            <p>Olá! Para completar seu cadastro, clique no link abaixo:</p>
            <a href="${verificationLink}" style="...">
                Confirmar meu e-mail
            </a>
            <p>Se você não solicitou este e-mail, ignore-o.</p>
        `;

        const info = await this.transporter.sendMail({
            from: ConfigEmail.getEmail().email,
            to: toEmail,
            subject: subject,
            html: htmlContent,
        });
        
        console.log("E-mail enviado com sucesso! Message ID:", info.messageId);
    } catch (error: any) {
        console.error("ERRO AO ENVIAR E-MAIL:", error);
        throw error;
    }
}

}