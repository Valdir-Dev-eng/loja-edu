import { UserAuthController } from "../controller/UserAuthController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { IRequest, ServerPort, middleWare } from "../server/ServerPort";
import { UserValidator } from "../validators/UserValidator";
import { SessionInjection, UserAuthRouter } from "./UserAuthRouter";

export interface OnboardingInjection {
    onboardingInput: ReturnType<UserValidator["validateOnboarding"]>;
}

export class OnboardingRouter {
    constructor(
        private server: ServerPort,
        private controller: UserAuthController,
        private validator: UserValidator,
        private authRouter: UserAuthRouter
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter(
            "post",
            "/auth/onboarding",
            this.authRouter.requireSession,
            this.validateOnboardingInput,
            this.completeOnboarding
        );
    }

    private validateOnboardingInput: middleWare = async (req, res, next) => {
        try {
            const onboardingInput = this.validator.validateOnboarding(req.body);
            (req as IRequest<any, any, any, OnboardingInjection>).onboardingInput = onboardingInput;
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private completeOnboarding: middleWare = async (req, res) => {
        try {
            const { authenticatedUser, onboardingInput } = req as IRequest<
                any,
                any,
                any,
                SessionInjection & OnboardingInjection
            >;
            const result = await this.controller.completeOnboarding(authenticatedUser.id, onboardingInput);
            return res.status(200).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            return res.status(status).json(body);
        }
    };
}
